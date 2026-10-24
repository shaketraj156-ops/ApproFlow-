from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from app.models.entities import (
    Application, ApplicationStageHistory, WorkflowStage, Profile
)
from app.core.exceptions import InvalidTransitionException, NotFoundException
from app.services.sla_service import calculate_due_date
from app.services.priority_service import calculate_priority_score
from app.services.audit_service import record_audit_log

def get_least_loaded_officer(db: Session, role_needed: str, region: str) -> Optional[UUID]:
    """Finds the least-loaded active AICTE officer in the region."""
    subq = (
        db.query(Application.owner_id, func.count(Application.id).label("load"))
        .filter(Application.decision == None)
        .group_by(Application.owner_id)
        .subquery()
    )
    
    officer = (
        db.query(Profile)
        .outerjoin(subq, Profile.id == subq.c.owner_id)
        .filter(
            Profile.role == "aicte_officer",
            Profile.is_active == True,
            (Profile.region == region) | (Profile.officer_level == "NATIONAL_HEAD")
        )
        .order_by(func.coalesce(subq.c.load, 0).asc())
        .first()
    )
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
    # 1. Fetch Application
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise NotFoundException(f"Application {application_id} not found")

    # 2. Fetch current and next stage configurations
    curr_stage = db.query(WorkflowStage).filter(WorkflowStage.code == app.current_stage_code).first()
    target_stage = db.query(WorkflowStage).filter(WorkflowStage.code == to_stage_code).first()
    
    if not target_stage or not target_stage.active:
        raise InvalidTransitionException(f"Target stage '{to_stage_code}' is not active or does not exist")

    allowed_next = curr_stage.next_stages if curr_stage else []
    if to_stage_code not in allowed_next and not (curr_stage and curr_stage.is_terminal):
        raise InvalidTransitionException(
            f"Cannot move application from '{app.current_stage_code}' to '{to_stage_code}'. Allowed: {allowed_next}"
        )

    # 3. Check terminal requirements
    if target_stage.is_terminal or target_stage.requires_decision:
        if not decision:
            raise InvalidTransitionException("Moving to a terminal stage requires a decision (e.g. APPROVED, REJECTED)")
        app.decision = decision
        app.decision_date = datetime.utcnow()
        app.decision_remarks = decision_remarks

    # 4. Handle deficiency counter
    if app.current_stage_code in ("SCRUTINY", "RE_SCRUTINY") and outcome == "DEFICIENCY_FOUND":
        app.deficiency_count += 1

    old_state = {
        "stage": app.current_stage_code,
        "owner_id": str(app.owner_id) if app.owner_id else None,
        "priority_score": float(app.priority_score)
    }

    # 5. Close current open history record
    now_utc = datetime.utcnow()
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

    # 7. Open new history record
    due_at = calculate_due_date(now_utc, target_stage.sla_days)
    new_hist = ApplicationStageHistory(
        application_id=app.id,
        stage_code=to_stage_code,
        owner_id=new_owner_id,
        entered_at=now_utc,
        due_at=due_at
    )
    db.add(new_hist)

    # 8. Update Application & recalculate priority
    app.current_stage_code = to_stage_code
    app.owner_id = new_owner_id
    age_days = (now_utc - app.created_at).days if app.created_at else 0
    app.priority_score = calculate_priority_score(
        overdue_days=0,
        intake_requested=app.intake_requested,
        deficiency_count=app.deficiency_count,
        age_days=age_days
    )

    # 9. Record Audit Log
    new_state = {
        "stage": to_stage_code,
        "owner_id": str(new_owner_id) if new_owner_id else None,
        "priority_score": float(app.priority_score),
        "due_at": due_at.isoformat()
    }
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

    db.commit()
    db.refresh(app)
    return app
