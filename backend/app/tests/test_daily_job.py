import uuid
from datetime import timedelta

from app.core.clock import utcnow
from app.models import entities as m
from app.services.alert_service import run_daily_checks_job
from app.services.workflow_service import move_application_stage


def _alerts(db, **filters):
    return db.query(m.Alert).filter_by(**filters).all()


def test_overdue_application_gets_an_escalation_alert(db, make_application):
    # 10-day SLA, entered 15 days ago -> 5 days overdue -> level 2
    app = make_application(entered_days_ago=15, sla_days=10)
    result = run_daily_checks_job(db)

    assert result["alerts_created"] == 1
    alert = _alerts(db, entity_id=app.id)[0]
    assert alert.rule_code == "STAGE_SLA_BREACH"
    assert alert.dedupe_key.endswith(":L2")
    assert alert.recipient_role == "SECTION_HEAD"


def test_running_the_job_twice_does_not_duplicate_alerts(db, make_application):
    make_application(entered_days_ago=15, sla_days=10)
    run_daily_checks_job(db)
    second = run_daily_checks_job(db)

    assert second["alerts_created"] == 0
    assert db.query(m.Alert).count() == 1


def test_application_due_soon_gets_a_reminder(db, make_application):
    # due in ~2 days -> smallest reached offset is 3
    app = make_application(entered_days_ago=8, sla_days=10)
    run_daily_checks_job(db)
    alert = _alerts(db, entity_id=app.id)[0]
    assert alert.rule_code == "STAGE_DUE_REMINDER"
    assert alert.dedupe_key.endswith(":R3")


def test_on_track_application_gets_no_alert(db, make_application):
    make_application(entered_days_ago=1, sla_days=30)
    assert run_daily_checks_job(db)["alerts_created"] == 0


def test_applications_on_hold_are_skipped(db, make_application):
    make_application(entered_days_ago=40, sla_days=10, is_on_hold=True)
    assert run_daily_checks_job(db)["alerts_created"] == 0


def test_decided_applications_are_never_reported_overdue(db, make_application):
    app = make_application(stage="SCRUTINY", entered_days_ago=2, sla_days=10)
    move_application_stage(db, app.id, "DECIDED", decision="APPROVED")
    assert run_daily_checks_job(db)["alerts_created"] == 0


def test_alert_is_resolved_when_the_application_moves_on(db, make_application):
    app = make_application(entered_days_ago=15, sla_days=10)
    run_daily_checks_job(db)
    assert _alerts(db, entity_id=app.id)[0].status == "OPEN"

    move_application_stage(db, app.id, "EVC")
    result = run_daily_checks_job(db)

    assert result["alerts_resolved"] == 1
    assert _alerts(db, entity_id=app.id)[0].status == "RESOLVED"


def test_overdue_undertaking_is_flagged_once(db, make_application):
    app = make_application(entered_days_ago=1, sla_days=30)
    u = m.Undertaking(id=uuid.uuid4(), application_id=app.id, title="Lease deed",
                      due_date=(utcnow() - timedelta(days=3)).date(), status="PENDING")
    db.add(u)
    db.commit()

    first = run_daily_checks_job(db)
    db.refresh(u)
    assert u.status == "OVERDUE"
    assert first["alerts_created"] == 1
    assert run_daily_checks_job(db)["alerts_created"] == 0


def test_undertaking_alert_resolves_after_submission(db, make_application):
    app = make_application(entered_days_ago=1, sla_days=30)
    u = m.Undertaking(id=uuid.uuid4(), application_id=app.id, title="Lease deed",
                      due_date=(utcnow() - timedelta(days=3)).date(), status="PENDING")
    db.add(u)
    db.commit()
    run_daily_checks_job(db)

    u.status = "SUBMITTED"
    db.commit()
    assert run_daily_checks_job(db)["alerts_resolved"] == 1


def test_documents_are_marked_expiring_and_expired(db, seed):
    today = utcnow().date()
    expiring = m.ComplianceDocument(id=uuid.uuid4(), institution_id=seed["institution"].id, title="Lease",
                                    document_type="LEASE", valid_from=today - timedelta(days=300),
                                    valid_until=today + timedelta(days=7))
    expired = m.ComplianceDocument(id=uuid.uuid4(), institution_id=seed["institution"].id, title="Fire NOC",
                                   document_type="NOC", valid_from=today - timedelta(days=400),
                                   valid_until=today - timedelta(days=2))
    healthy = m.ComplianceDocument(id=uuid.uuid4(), institution_id=seed["institution"].id, title="Trust deed",
                                   document_type="TRUST", valid_from=today, valid_until=today + timedelta(days=400))
    db.add_all([expiring, expired, healthy])
    db.commit()

    run_daily_checks_job(db)
    for doc in (expiring, expired, healthy):
        db.refresh(doc)
    assert (expiring.status, expired.status, healthy.status) == ("EXPIRING", "EXPIRED", "VALID")


def test_priority_grows_with_overdue_days(db, make_application):
    app = make_application(entered_days_ago=25, sla_days=10)
    before = float(app.priority_score)
    run_daily_checks_job(db)
    db.refresh(app)
    assert float(app.priority_score) > before
