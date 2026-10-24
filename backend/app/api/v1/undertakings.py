from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.models.base import get_db
from app.models.entities import Undertaking
from app.schemas.compliance import (
    UndertakingCreate, UndertakingSubmit, UndertakingVerify, UndertakingResponse
)
from app.core.security import CurrentUser, get_current_user
from app.core.exceptions import NotFoundException

router = APIRouter(prefix="/undertakings", tags=["Undertakings"])

@router.get("", response_model=List[UndertakingResponse])
def list_undertakings(
    application_id: Optional[UUID] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Undertaking)
    if application_id:
        query = query.filter(Undertaking.application_id == application_id)
    if status:
        query = query.filter(Undertaking.status == status)
    
    undertakings = query.order_by(Undertaking.due_date.asc()).all()
    return [UndertakingResponse.model_validate(u) for u in undertakings]

@router.post("", response_model=UndertakingResponse)
def create_undertaking(payload: UndertakingCreate, db: Session = Depends(get_db)):
    undertaking = Undertaking(
        application_id=payload.application_id,
        title=payload.title,
        description=payload.description,
        due_date=payload.due_date,
        status="PENDING",
        created_at=datetime.utcnow()
    )
    db.add(undertaking)
    db.commit()
    db.refresh(undertaking)
    return UndertakingResponse.model_validate(undertaking)

@router.post("/{id}/submit", response_model=UndertakingResponse)
def submit_undertaking_evidence(
    id: UUID = Path(...),
    payload: UndertakingSubmit = ...,
    db: Session = Depends(get_db)
):
    undertaking = db.query(Undertaking).filter(Undertaking.id == id).first()
    if not undertaking:
        raise NotFoundException("Undertaking not found")
    undertaking.status = "SUBMITTED"
    undertaking.submitted_at = datetime.utcnow()
    undertaking.document_path = payload.document_path
    if payload.remarks:
        undertaking.remarks = payload.remarks
    db.commit()
    db.refresh(undertaking)
    return UndertakingResponse.model_validate(undertaking)

@router.post("/{id}/verify", response_model=UndertakingResponse)
def verify_undertaking(
    id: UUID = Path(...),
    payload: UndertakingVerify = ...,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    undertaking = db.query(Undertaking).filter(Undertaking.id == id).first()
    if not undertaking:
        raise NotFoundException("Undertaking not found")
    undertaking.status = "VERIFIED" if payload.decision == "VERIFIED" else "PENDING"
    undertaking.verified_at = datetime.utcnow()
    undertaking.verified_by = UUID(current_user.id) if current_user.id else None
    if payload.remarks:
        undertaking.remarks = payload.remarks
    db.commit()
    db.refresh(undertaking)
    return UndertakingResponse.model_validate(undertaking)
