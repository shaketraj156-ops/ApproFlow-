from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from uuid import UUID

from app.models.entities import (
    Application, ApplicationStageHistory, WorkflowStage, Profile
)
from app.core.clock import utcnow, as_utc
from app.core.exceptions import (
    InvalidTransitionException, NotFoundException, ValidationErrorException
)
from app.services.sla_service import calculate_due_date
from app.services.priority_service import calculate_priority_score
from app.services.audit_service import record_audit_log

def get_least_loaded_officer(db: Session, role_needed: str, region: str) -> Optional[UUID]:
    """Finds the least-loaded active AICTE officer in the region, preferring the stage's owner level."""
    subq = (
        db.query(Application.owner_id, func.count(Application.id).label("load"))
        .filter(Application.decision == None)
        .group_by(Application.owner_id)
        .subquery()
    )

    def _pick(level: Optional[str]):
        q = (
            db.query(Profile)
            .outerjoin(subq, Profile.id == subq.c.owner_id)
            .filter(
                Profile.role == "aicte_officer",
                Profile.is_active == True,
                (Profile.region == region) | (Profile.officer_level == "NATIONAL_HEAD")
            )
        )
        if level:
            q = q.filter(Profile.officer_level == level)
        return q.order_by(func.coalesce(subq.c.load, 0).asc()).first()

    # Prefer an officer at the stage's owner level; fall back to any officer in the region.
    officer = _pick(role_needed) or _pick(None)
    return officer.id if officer else None

def move_application_stage(
    db: Session,
    application_id: UUID,
    to_stage_code: str,
    actor_id: Optional[UUID] = None,
    actor_role: Optional[str] = None,
    outcome: Optional[str] = None,
    notes: Optional[str] = None,
    decision: Optional[str] = None,
    decision_remarks: Optional[str] = None
) -> Application:
    """Moves an application to the next stage atomically; any failure rolls the whole move back."""
    try:
        app = _move(
            db, application_id, to_stage_code, actor_id, actor_role,
            outcome, notes, decision, decision_remarks,
        )
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(app)
    return app


def _move(
    db: Session,
    application_id: UUID,
    to_stage_code: str,
    actor_id: Optional[UUID],
    actor_role: Optional[str],
    outcome: Optional[str],
    notes: Optional[str],
    decision: Optional[str],
    decision_remarks: Optional[str],
) -> Application:
    # 1. Fetch Application. The row lock makes two simultaneous moves of the same
    #    application run one after the other instead of both reading the old stage.
    app = (
        db.query(Application)
        .filter(Application.id == application_id)
        .with_for_update()
        .first()
    )
    if not app:
        raise NotFoundException(f"Application {application_id} not found")

    if app.is_on_hold:
        raise InvalidTransitionException("Application is on hold; resume it before moving stages")
    if app.decision:
        raise InvalidTransitionException("Application already has a final decision")

    # 2. Fetch current and next stage configurations
    curr_stage = db.query(WorkflowStage).filter(WorkflowStage.code == app.current_stage_code).first()
    target_stage = db.query(WorkflowStage).filter(WorkflowStage.code == to_stage_code).first()

    if not target_stage or not target_stage.active:
        raise InvalidTransitionException(f"Target stage '{to_stage_code}' is not active or does not exist")

    allowed_next = curr_stage.next_stages if curr_stage else []
    if to_stage_code not in allowed_next:
        raise InvalidTransitionException(
            f"Cannot move application from '{app.current_stage_code}' to '{to_stage_code}'. Allowed: {allowed_next}"
        )

    # 3. Check terminal requirements
    now_utc = utcnow()
    is_decision_stage = bool(target_stage.is_terminal or target_stage.requires_decision)
    if is_decision_stage:
        if not decision:
            raise InvalidTransitionException("Moving to a terminal stage requires a decision (e.g. APPROVED, REJECTED)")
        app.decision = decision
        app.decision_date = now_utc
        app.decision_remarks = decision_remarks
    elif decision:
        raise ValidationErrorException("A decision can only be recorded when moving to a decision stage")

    # 4. Handle deficiency counter
    if app.current_stage_code in ("SCRUTINY", "RE_SCRUTINY") and outcome == "DEFICIENCY_FOUND":
        app.deficiency_count += 1

    old_state = {
        "stage": app.current_stage_code,
        "owner_id": str(app.owner_id) if app.owner_id else None,
        "priority_score": float(app.priority_score)
    }

    # 5. Close current open history record
    open_hist = (
        db.query(ApplicationStageHistory)
        .filter(ApplicationStageHistory.application_id == app.id, ApplicationStageHistory.exited_at == None)
        .first()
    )
    if open_hist:
        open_hist.exited_at = now_utc
        open_hist.outcome = outcome
        if notes:
            open_hist.notes = notes

    # 6. Assign new owner if needed
    new_owner_id = get_least_loaded_officer(db, target_stage.owner_role, app.region) or app.owner_id

    # 7. Record the new stage. A decision stage ends the process, so its history row is
    #    written already closed; otherwise it would sit "open" with a 0-day SLA and be
    #    reported as overdue forever.
    due_at = calculate_due_date(now_utc, target_stage.sla_days)
    db.add(ApplicationStageHistory(
        application_id=app.id,
        stage_code=to_stage_code,
        owner_id=new_owner_id,
        entered_at=now_utc,
        due_at=due_at,
        exited_at=now_utc if is_decision_stage else None,
        outcome=decision if is_decision_stage else None,
    ))

    # 8. Update Application & recalculate priority
    app.current_stage_code = to_stage_code
    app.owner_id = new_owner_id
    app.updated_at = now_utc
    created_at = as_utc(app.created_at)
    age_days = (now_utc - created_at).days if created_at else 0
    app.priority_score = calculate_priority_score(
        overdue_days=0,
        intake_requested=app.intake_requested,
        deficiency_count=app.deficiency_count,
        age_days=age_days
    )

    # 9. Record Audit Log (same transaction as the move itself)
    new_state = {
        "stage": to_stage_code,
        "owner_id": str(new_owner_id) if new_owner_id else None,
        "priority_score": float(app.priority_score),
        "due_at": due_at.isoformat()
    }
    if is_decision_stage:
        new_state["decision"] = decision
    record_audit_log(
        db=db,
        entity_type="APPLICATION",
        entity_id=app.id,
        action="MOVE_STAGE",
        actor_id=actor_id,
        actor_role=actor_role,
        old_state=old_state,
        new_state=new_state
    )
    return app
