"""
Test fixtures. Tests run against an in-memory SQLite database, so they need no Postgres.

SQLite stands in for Postgres here: JSONB is compiled as plain JSON and the one Postgres ARRAY
column (alert_rules.offsets_days) is stored as JSON. Row locks (`FOR UPDATE`) are ignored
by SQLite, so concurrency behaviour is not covered by these tests.
"""
import uuid
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import JSON, create_engine, event
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.clock import utcnow
from app.core.config import settings
from app.core.security import CurrentUser, get_current_user
from app.main import app as fastapi_app
from app.models.base import Base, get_db
from app.models import entities as m


@compiles(JSONB, "sqlite")
def _jsonb_as_json(type_, compiler, **kw):
    return "JSON"


@pytest.fixture()
def db():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)

    @event.listens_for(engine, "connect")
    def _fk_on(dbapi_conn, _):
        dbapi_conn.execute("PRAGMA foreign_keys=ON")

    # alert_rules.offsets_days is a Postgres ARRAY; store it as JSON in SQLite.
    m.AlertRule.__table__.c.offsets_days.type = JSON()
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, autoflush=False)()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture()
def seed(db):
    """A small, consistent world: stages, one institution, officers, experts and one application."""
    stages = [
        m.WorkflowStage(code="SUBMITTED", name="Submitted", sequence_order=1, sla_days=5, owner_role="SCRUTINY_OFFICER",
                        next_stages=["SCRUTINY"]),
        m.WorkflowStage(code="SCRUTINY", name="Scrutiny", sequence_order=2, sla_days=10, owner_role="SCRUTINY_OFFICER",
                        next_stages=["RE_SCRUTINY", "EVC", "DECIDED"]),
        m.WorkflowStage(code="RE_SCRUTINY", name="Re-scrutiny", sequence_order=3, sla_days=7, owner_role="SCRUTINY_OFFICER",
                        next_stages=["EVC", "DECIDED"]),
        m.WorkflowStage(code="EVC", name="EVC", sequence_order=4, sla_days=15, owner_role="REGIONAL_HEAD",
                        next_stages=["DECIDED"]),
        m.WorkflowStage(code="DECIDED", name="Decided", sequence_order=5, sla_days=0, owner_role="NATIONAL_HEAD",
                        next_stages=[], is_terminal=True, requires_decision=True),
    ]
    inst = m.Institution(id=uuid.uuid4(), code="INST1", name="Test Institute", region="NORTH")
    officer = m.Profile(id=uuid.uuid4(), email="o@test.in", full_name="Officer", role="aicte_officer",
                        officer_level="SECTION_OFFICER", region="NORTH")
    other_officer = m.Profile(id=uuid.uuid4(), email="w@test.in", full_name="West Officer", role="aicte_officer",
                              officer_level="SECTION_OFFICER", region="WEST")
    experts = [m.Expert(id=uuid.uuid4(), name=f"Expert {i}", email=f"e{i}@test.in", domain="Engineering", region="NORTH")
               for i in range(4)]
    db.add_all(stages + [inst, officer, other_officer] + experts)
    db.commit()
    return {"institution": inst, "officer": officer, "other_officer": other_officer, "experts": experts}


@pytest.fixture()
def make_application(db, seed):
    def _make(number="APP-1", stage="SCRUTINY", entered_days_ago=0, sla_days=10, **kwargs):
        now = utcnow()
        app = m.Application(
            id=uuid.uuid4(), application_number=number, institution_id=seed["institution"].id,
            region=kwargs.pop("region", "NORTH"), current_stage_code=stage, owner_id=seed["officer"].id,
            created_at=now - timedelta(days=entered_days_ago), **kwargs,
        )
        db.add(app)
        db.flush()
        db.add(m.ApplicationStageHistory(
            application_id=app.id, stage_code=stage, owner_id=seed["officer"].id,
            entered_at=now - timedelta(days=entered_days_ago),
            due_at=now - timedelta(days=entered_days_ago) + timedelta(days=sla_days),
        ))
        db.commit()
        return app
    return _make


@pytest.fixture()
def as_user(db):
    """Returns a function that makes API calls as a given user; resets overrides afterwards."""
    def _override_db():
        yield db

    fastapi_app.dependency_overrides[get_db] = _override_db
    settings.ALLOW_DEV_AUTH = False
    client = TestClient(fastapi_app, raise_server_exceptions=False)

    def _as(user_id=None, role="aicte_officer", officer_level="SECTION_OFFICER", region="NORTH", institution_id=None):
        user_id = user_id or uuid.uuid4()
        # Audit rows reference profiles, so a real user always has one (the signup trigger creates it).
        if not db.get(m.Profile, user_id):
            db.add(m.Profile(id=user_id, email=f"{user_id}@test.in", full_name="Test user", role=role,
                             officer_level=officer_level, region=region))
            db.commit()
        fastapi_app.dependency_overrides[get_current_user] = lambda: CurrentUser(
            id=str(user_id), email="t@test.in", role=role,
            officer_level=officer_level, region=region,
            institution_id=institution_id,
        )
        return client

    yield _as
    fastapi_app.dependency_overrides.clear()
