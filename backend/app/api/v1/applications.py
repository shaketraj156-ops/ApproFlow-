from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID
from datetime import datetime

from app.models.base import get_db
from app.models.entities import Application, ApplicationStageHistory, WorkflowStage
from app.schemas.application import (
    ApplicationCreate, ApplicationResponse, PaginatedApplicationsResponse,
    MoveStageRequest, AssignOfficerRequest, HoldApplicationRequest
)
from app.core.security import CurrentUser, get_current_user
from app.core.permissions import require_roles, verify_region_access
from app.core.exceptions import NotFoundException, ForbiddenException
from app.services.workflow_service import move_application_stage
from app.services.prediction_service import predict_stage_delay_risk

router = APIRouter(prefix="/applications", tags=["Applications"])

@router.get("", response_model=PaginatedApplicationsResponse)
def list_applications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    stage: Optional[str] = None,
    region: Optional[str] = None,
    search: Optional[str] = None,
    is_overdue: Optional[bool] = None,
    sort: str = "-priority_score",
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    query = db.query(Application)

    # Scoping by role & region
    if current_user.role in ("institution_admin", "institution_staff") and current_user.institution_id:
        query = query.filter(Application.institution_id == current_user.institution_id)
    elif current_user.role == "aicte_officer" and current_user.officer_level != "NATIONAL_HEAD":
        if current_user.region:
            query = query.filter(Application.region == current_user.region)

    if stage:
        query = query.filter(Application.current_stage_code == stage)
    if region:
        query = query.filter(Application.region == region)
    if search:
        query = query.filter(Application.application_number.ilike(f"%{search}%"))

    if sort == "-priority_score":
        query = query.order_by(Application.priority_score.desc())
    else:
        query = query.order_by(Application.created_at.desc())

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    
    # Enrich with days_left & delay_risk_score
    resp_items = []
    now = datetime.utcnow()
    for app in items:
        app_resp = ApplicationResponse.model_validate(app)
        open_hist = next((h for h in app.history if h.exited_at is None), None)
        if open_hist:
            diff = (open_hist.due_at - now).total_seconds() / 86400.0
            app_resp.days_left = int(diff)
            days_in_stage = (now - open_hist.entered_at).total_seconds() / 86400.0
            sla_days = (open_hist.due_at - open_hist.entered_at).total_seconds() / 86400.0
            app_resp.delay_risk_score = predict_stage_delay_risk(
                days_in_stage=days_in_stage,
                sla_days=sla_days,
                deficiency_count=app.deficiency_count,
                intake_requested=app.intake_requested
            )
        resp_items.append(app_resp)

    return PaginatedApplicationsResponse(
        items=resp_items,
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size if total > 0 else 0
    )

@router.get("/{id}", response_model=ApplicationResponse)
def get_application(
    id: UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    app = db.query(Application).filter(Application.id == id).first()
    if not app:
        raise NotFoundException(f"Application {id} not found")
    
    if not verify_region_access(current_user, app.region):
        raise ForbiddenException("Unauthorized to access application outside assigned region")

    app_resp = ApplicationResponse.model_validate(app)
    open_hist = next((h for h in app.history if h.exited_at is None), None)
    if open_hist:
        diff = (open_hist.due_at - datetime.utcnow()).total_seconds() / 86400.0
        app_resp.days_left = int(diff)
    return app_resp

@router.post("/{id}/move", response_model=ApplicationResponse)
def move_application(
    id: UUID = Path(...),
    payload: MoveStageRequest = ...,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    updated = move_application_stage(
        db=db,
        application_id=id,
        to_stage_code=payload.to_stage,
        actor_id=UUID(current_user.id) if current_user.id else None,
        actor_role=current_user.role,
        outcome=payload.outcome,
        notes=payload.notes,
        decision=payload.decision,
        decision_remarks=payload.decision_remarks
    )
    return ApplicationResponse.model_validate(updated)

@router.post("/{id}/assign", response_model=ApplicationResponse)
def assign_application_officer(
    id: UUID = Path(...),
    payload: AssignOfficerRequest = ...,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    app = db.query(Application).filter(Application.id == id).first()
    if not app:
        raise NotFoundException("Application not found")
    app.owner_id = payload.officer_id
    db.commit()
    db.refresh(app)
    return ApplicationResponse.model_validate(app)

@router.post("/{id}/hold", response_model=ApplicationResponse)
def hold_application(
    id: UUID = Path(...),
    payload: HoldApplicationRequest = ...,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    app = db.query(Application).filter(Application.id == id).first()
    if not app:
        raise NotFoundException("Application not found")
    app.is_on_hold = True
    app.hold_reason = payload.reason
    db.commit()
    db.refresh(app)
    return ApplicationResponse.model_validate(app)

@router.post("/{id}/resume", response_model=ApplicationResponse)
def resume_application(
    id: UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    app = db.query(Application).filter(Application.id == id).first()
    if not app:
        raise NotFoundException("Application not found")
    app.is_on_hold = False
    app.hold_reason = None
    db.commit()
    db.refresh(app)
    return ApplicationResponse.model_validate(app)
