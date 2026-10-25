from fastapi import APIRouter, Depends, Path
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.models.base import get_db
from app.models.entities import Expert, EvcVisit
from app.schemas.evc import (
    ExpertResponse, EvcSuggestionRequest, EvcProposalResponse,
    EvcCreateRequest, EvcVisitResponse, EvcRescheduleRequest, EvcCancelRequest
)
from app.core.security import CurrentUser, get_current_user
from app.core.permissions import require_roles
from app.services.evc_service import (
    suggest_evc_committees, confirm_evc_visit, create_evc_visit,
    reschedule_evc_visit, cancel_evc_visit, complete_evc_visit
)
from app.services.audit_service import record_audit_log

READ_ROLES = ["aicte_officer", "auditor"]
WRITE_ROLES = ["aicte_officer"]

# Reading is open to officers and auditors; every write below additionally requires WRITE_ROLES.
router = APIRouter(
    prefix="/evc-visits",
    tags=["EVC Scheduling"],
    dependencies=[Depends(require_roles(READ_ROLES))],
)


def _audit(db: Session, user: CurrentUser, visit: EvcVisit, action: str) -> None:
    try:
        actor = UUID(user.id)
    except (TypeError, ValueError):
        actor = None
    record_audit_log(
        db, "EVC_VISIT", visit.id, action, actor_id=actor, actor_role=user.role,
        new_state={"status": visit.status, "scheduled_date": visit.scheduled_date.isoformat()},
    )
    db.commit()


@router.post("/suggest", response_model=List[EvcProposalResponse])
def suggest_evc(
    payload: EvcSuggestionRequest,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_roles(WRITE_ROLES)),
):
    proposals = suggest_evc_committees(
        db=db,
        application_id=payload.application_id,
        target_date=payload.target_date,
        committee_size=payload.committee_size
    )
    return [
        EvcProposalResponse(
            scheduled_date=p["scheduled_date"],
            experts=[ExpertResponse.model_validate(e) for e in p["experts"]],
            clash_detected=p["clash_detected"]
        ) for p in proposals
    ]

@router.get("", response_model=List[EvcVisitResponse])
def list_evc_visits(db: Session = Depends(get_db)):
    visits = db.query(EvcVisit).order_by(EvcVisit.scheduled_date.asc()).all()
    return [EvcVisitResponse.model_validate(v) for v in visits]

@router.post("", response_model=EvcVisitResponse, status_code=201)
def schedule_evc_visit(
    payload: EvcCreateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_roles(WRITE_ROLES)),
):
    visit = create_evc_visit(
        db,
        application_id=payload.application_id,
        scheduled_date=payload.scheduled_date,
        expert_ids=payload.expert_ids,
        lead_expert_id=payload.lead_expert_id,
        remarks=payload.remarks,
    )
    _audit(db, current_user, visit, "CREATE")
    return EvcVisitResponse.model_validate(visit)

@router.post("/{id}/confirm", response_model=EvcVisitResponse)
def confirm_visit(
    id: UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_roles(WRITE_ROLES)),
):
    visit = confirm_evc_visit(db, id)
    _audit(db, current_user, visit, "CONFIRM")
    return EvcVisitResponse.model_validate(visit)

@router.post("/{id}/reschedule", response_model=EvcVisitResponse)
def reschedule_visit(
    payload: EvcRescheduleRequest,
    id: UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_roles(WRITE_ROLES)),
):
    visit = reschedule_evc_visit(db, id, payload.scheduled_date, payload.remarks)
    _audit(db, current_user, visit, "RESCHEDULE")
    return EvcVisitResponse.model_validate(visit)

@router.post("/{id}/cancel", response_model=EvcVisitResponse)
def cancel_visit(
    payload: EvcCancelRequest,
    id: UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_roles(WRITE_ROLES)),
):
    visit = cancel_evc_visit(db, id, payload.reason)
    _audit(db, current_user, visit, "CANCEL")
    return EvcVisitResponse.model_validate(visit)

@router.post("/{id}/complete", response_model=EvcVisitResponse)
def complete_visit(
    id: UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_roles(WRITE_ROLES)),
):
    visit = complete_evc_visit(db, id)
    _audit(db, current_user, visit, "COMPLETE")
    return EvcVisitResponse.model_validate(visit)


# GET /experts, as listed in the API contract.
experts_router = APIRouter(
    prefix="/experts",
    tags=["EVC Scheduling"],
    dependencies=[Depends(require_roles(READ_ROLES))],
)

@experts_router.get("", response_model=List[ExpertResponse])
def list_experts(db: Session = Depends(get_db)):
    experts = db.query(Expert).order_by(Expert.region.asc(), Expert.name.asc()).all()
    return [ExpertResponse.model_validate(e) for e in experts]
