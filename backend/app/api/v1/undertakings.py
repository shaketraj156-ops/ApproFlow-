from fastapi import APIRouter, Depends, Path
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.core.clock import utcnow
from app.models.base import get_db
from app.models.entities import Undertaking, Application
from app.schemas.compliance import (
    UndertakingCreate, UndertakingSubmit, UndertakingVerify, UndertakingResponse
)
from app.core.security import CurrentUser, get_current_user
from app.core.permissions import require_roles, verify_region_access
from app.core.exceptions import (
    NotFoundException, ForbiddenException, ConflictException, ValidationErrorException
)
from app.services.audit_service import record_audit_log

router = APIRouter(prefix="/undertakings", tags=["Undertakings"])

INSTITUTION_ROLES = ("institution_admin", "institution_staff")
VALID_STATUSES = {"PENDING", "SUBMITTED", "VERIFIED", "OVERDUE", "WAIVED"}


def _actor_id(user: CurrentUser) -> Optional[UUID]:
    try:
        return UUID(user.id)
    except (TypeError, ValueError):
        return None


def _validate_storage_path(path: str) -> str:
    """Document paths point into private storage; refuse anything that could escape it."""
    cleaned = path.strip()
    segments = cleaned.replace("\\", "/").split("/")
    if not cleaned or cleaned.startswith("/") or "://" in cleaned or ".." in segments:
        raise ValidationErrorException("document_path must be a relative storage path")
    return cleaned


def _load_undertaking(db: Session, undertaking_id: UUID) -> tuple:
    undertaking = db.query(Undertaking).filter(Undertaking.id == undertaking_id).with_for_update().first()
    if not undertaking:
        raise NotFoundException("Undertaking not found")
    app = db.query(Application).filter(Application.id == undertaking.application_id).first()
    if not app:
        raise NotFoundException("Application for this undertaking not found")
    return undertaking, app


@router.get("", response_model=List[UndertakingResponse])
def list_undertakings(
    application_id: Optional[UUID] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    if status and status.upper() not in VALID_STATUSES:
        raise ValidationErrorException(f"status must be one of {sorted(VALID_STATUSES)}")

    query = db.query(Undertaking).join(Application, Application.id == Undertaking.application_id)
    if current_user.role in INSTITUTION_ROLES:
        if not current_user.institution_id:
            return []
        query = query.filter(Application.institution_id == current_user.institution_id)
    elif current_user.role == "aicte_officer" and current_user.officer_level != "NATIONAL_HEAD":
        query = query.filter(Application.region == current_user.region)
    if application_id:
        query = query.filter(Undertaking.application_id == application_id)
    if status:
        query = query.filter(Undertaking.status == status.upper())

    undertakings = query.order_by(Undertaking.due_date.asc()).all()
    return [UndertakingResponse.model_validate(u) for u in undertakings]

@router.post("", response_model=UndertakingResponse, status_code=201)
def create_undertaking(
    payload: UndertakingCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_roles(["aicte_officer"]))
):
    app = db.query(Application).filter(Application.id == payload.application_id).first()
    if not app:
        raise NotFoundException("Application not found")
    if not verify_region_access(current_user, app.region):
        raise ForbiddenException("Unauthorized to add undertakings outside assigned region")
    if payload.due_date < utcnow().date():
        raise ValidationErrorException("due_date cannot be in the past")

    try:
        undertaking = Undertaking(
            application_id=payload.application_id,
            title=payload.title.strip(),
            description=payload.description,
            due_date=payload.due_date,
            status="PENDING",
            created_at=utcnow()
        )
        db.add(undertaking)
        db.flush()
        record_audit_log(
            db, "UNDERTAKING", undertaking.id, "CREATE",
            actor_id=_actor_id(current_user), actor_role=current_user.role,
            new_state={"status": "PENDING", "due_date": payload.due_date.isoformat()},
        )
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(undertaking)
    return UndertakingResponse.model_validate(undertaking)

@router.post("/{id}/submit", response_model=UndertakingResponse)
def submit_undertaking_evidence(
    id: UUID = Path(...),
    payload: UndertakingSubmit = ...,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_roles(list(INSTITUTION_ROLES)))
):
    document_path = _validate_storage_path(payload.document_path)
    try:
        undertaking, owner_app = _load_undertaking(db, id)
        if current_user.role != "system_admin" and str(owner_app.institution_id) != str(current_user.institution_id):
            raise ForbiddenException("Undertaking belongs to another institution")
        # PENDING, or OVERDUE (late evidence is still evidence); not already submitted or closed.
        if undertaking.status not in ("PENDING", "OVERDUE"):
            raise ConflictException(f"Evidence cannot be submitted for a {undertaking.status} undertaking")

        undertaking.status = "SUBMITTED"
        undertaking.submitted_at = utcnow()
        undertaking.document_path = document_path
        undertaking.updated_at = utcnow()
        if payload.remarks:
            undertaking.remarks = payload.remarks
        record_audit_log(
            db, "UNDERTAKING", undertaking.id, "SUBMIT",
            actor_id=_actor_id(current_user), actor_role=current_user.role,
            new_state={"status": "SUBMITTED"},
        )
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(undertaking)
    return UndertakingResponse.model_validate(undertaking)

@router.post("/{id}/verify", response_model=UndertakingResponse)
def verify_undertaking(
    id: UUID = Path(...),
    payload: UndertakingVerify = ...,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_roles(["aicte_officer"]))
):
    if payload.decision == "REJECTED" and not (payload.remarks and payload.remarks.strip()):
        raise ValidationErrorException("remarks are required when rejecting an undertaking")
    try:
        undertaking, app = _load_undertaking(db, id)
        if not verify_region_access(current_user, app.region):
            raise ForbiddenException("Unauthorized to verify undertakings outside assigned region")
        if undertaking.status != "SUBMITTED":
            raise ConflictException(f"Only a SUBMITTED undertaking can be verified or rejected (current status: {undertaking.status})")

        # A rejected submission goes back to PENDING so the institution can resubmit.
        undertaking.status = "VERIFIED" if payload.decision == "VERIFIED" else "PENDING"
        undertaking.verified_at = utcnow()
        undertaking.verified_by = _actor_id(current_user)
        undertaking.updated_at = utcnow()
        if payload.remarks:
            undertaking.remarks = payload.remarks
        record_audit_log(
            db, "UNDERTAKING", undertaking.id, payload.decision,
            actor_id=_actor_id(current_user), actor_role=current_user.role,
            new_state={"status": undertaking.status},
        )
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(undertaking)
    return UndertakingResponse.model_validate(undertaking)
