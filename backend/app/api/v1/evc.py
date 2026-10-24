from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from datetime import datetime

from app.models.base import get_db
from app.models.entities import Expert, EvcVisit, EvcVisitExpert
from app.schemas.evc import (
    ExpertResponse, EvcSuggestionRequest, EvcProposalResponse,
    EvcCreateRequest, EvcVisitResponse
)
from app.core.security import CurrentUser, get_current_user
from app.core.exceptions import NotFoundException
from app.services.evc_service import suggest_evc_committees, confirm_evc_visit

router = APIRouter(prefix="/evc-visits", tags=["EVC Scheduling"])

@router.post("/suggest", response_model=List[EvcProposalResponse])
def suggest_evc(payload: EvcSuggestionRequest, db: Session = Depends(get_db)):
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

@router.post("", response_model=EvcVisitResponse)
def schedule_evc_visit(payload: EvcCreateRequest, db: Session = Depends(get_db)):
    visit = EvcVisit(
        application_id=payload.application_id,
        scheduled_date=payload.scheduled_date,
        status="PROPOSED",
        remarks=payload.remarks,
        created_at=datetime.utcnow()
    )
    db.add(visit)
    db.flush()

    for expert_id in payload.expert_ids:
        ve = EvcVisitExpert(
            evc_visit_id=visit.id,
            expert_id=expert_id,
            is_lead=(expert_id == payload.lead_expert_id)
        )
        db.add(ve)

    db.commit()
    db.refresh(visit)
    return EvcVisitResponse.model_validate(visit)

@router.post("/{id}/confirm", response_model=EvcVisitResponse)
def confirm_visit(id: UUID = Path(...), db: Session = Depends(get_db)):
    confirmed = confirm_evc_visit(db, id)
    return EvcVisitResponse.model_validate(confirmed)
