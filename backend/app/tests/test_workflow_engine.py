import pytest

from app.core.exceptions import InvalidTransitionException, NotFoundException, ValidationErrorException
from app.models import entities as m
from app.services.workflow_service import move_application_stage


def _open_rows(db, app_id):
    return db.query(m.ApplicationStageHistory).filter(
        m.ApplicationStageHistory.application_id == app_id,
        m.ApplicationStageHistory.exited_at == None,
    ).all()


def test_valid_move_closes_old_stage_and_opens_new_one(db, make_application):
    app = make_application(stage="SCRUTINY")
    moved = move_application_stage(db, app.id, "EVC")

    assert moved.current_stage_code == "EVC"
    open_rows = _open_rows(db, app.id)
    assert [r.stage_code for r in open_rows] == ["EVC"]  # exactly one open stage
    assert open_rows[0].due_at > open_rows[0].entered_at
    assert db.query(m.AuditLog).filter(m.AuditLog.entity_id == app.id, m.AuditLog.action == "MOVE_STAGE").count() == 1


def test_move_to_stage_not_in_next_stages_is_rejected(db, make_application):
    app = make_application(stage="SCRUTINY")
    with pytest.raises(InvalidTransitionException):
        move_application_stage(db, app.id, "SUBMITTED")
    db.refresh(app)
    assert app.current_stage_code == "SCRUTINY"


def test_decision_stage_requires_a_decision(db, make_application):
    app = make_application(stage="SCRUTINY")
    with pytest.raises(InvalidTransitionException):
        move_application_stage(db, app.id, "DECIDED")


def test_decision_is_recorded_and_no_open_stage_is_left(db, make_application):
    app = make_application(stage="SCRUTINY")
    moved = move_application_stage(db, app.id, "DECIDED", decision="APPROVED", decision_remarks="ok")

    assert moved.decision == "APPROVED"
    assert moved.decision_date is not None
    # A decided application must not keep an open stage, or it would be reported overdue forever.
    assert _open_rows(db, app.id) == []


def test_decision_cannot_be_given_for_a_normal_stage(db, make_application):
    app = make_application(stage="SCRUTINY")
    with pytest.raises(ValidationErrorException):
        move_application_stage(db, app.id, "EVC", decision="APPROVED")


def test_decided_application_cannot_move_again(db, make_application):
    app = make_application(stage="SCRUTINY")
    move_application_stage(db, app.id, "DECIDED", decision="REJECTED")
    with pytest.raises(InvalidTransitionException):
        move_application_stage(db, app.id, "EVC")


def test_application_on_hold_cannot_move(db, make_application):
    app = make_application(stage="SCRUTINY", is_on_hold=True)
    with pytest.raises(InvalidTransitionException):
        move_application_stage(db, app.id, "EVC")


def test_inactive_target_stage_is_rejected(db, make_application):
    app = make_application(stage="SCRUTINY")
    db.query(m.WorkflowStage).filter(m.WorkflowStage.code == "EVC").update({"active": False})
    db.commit()
    with pytest.raises(InvalidTransitionException):
        move_application_stage(db, app.id, "EVC")


def test_deficiency_outcome_increments_counter(db, make_application):
    app = make_application(stage="SCRUTINY")
    moved = move_application_stage(db, app.id, "RE_SCRUTINY", outcome="DEFICIENCY_FOUND")
    assert moved.deficiency_count == 1


def test_unknown_application_is_not_found(db, seed):
    import uuid
    with pytest.raises(NotFoundException):
        move_application_stage(db, uuid.uuid4(), "EVC")


def test_failed_move_leaves_nothing_half_written(db, make_application):
    app = make_application(stage="SCRUTINY")
    with pytest.raises(InvalidTransitionException):
        move_application_stage(db, app.id, "DECIDED")  # no decision supplied
    db.refresh(app)
    assert app.current_stage_code == "SCRUTINY"
    assert app.decision is None
    assert [r.stage_code for r in _open_rows(db, app.id)] == ["SCRUTINY"]
