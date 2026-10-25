from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import exists, and_
from typing import Literal, Optional
from uuid import UUID

from app.core.clock import utcnow, as_utc
from app.models.base import get_db
from app.models.entities import (
    Application, ApplicationStageHistory, WorkflowStage, Institution, Profile
)
from app.schemas.application import (
    ApplicationCreate, ApplicationResponse, PaginatedApplicationsResponse,
    MoveStageRequest, AssignOfficerRequest, HoldApplicationRequest
)
from app.core.security import CurrentUser, get_current_user
from app.core.permissions import require_roles, verify_region_access
from app.core.exceptions import (
    NotFoundException, ForbiddenException, ConflictException, ValidationErrorException
)
from app.services.workflow_service import move_application_stage, get_least_loaded_officer
from app.services.prediction_service import predict_stage_delay_risk
from app.services.priority_service import calculate_priority_score
from app.services.sla_service import calculate_due_date
from app.services.audit_service import record_audit_log

router = APIRouter(prefix="/applications", tags=["Applications"])

OFFICER_ROLES = ["aicte_officer"]
INITIAL_STAGE_CODE = "SUBMITTED"


def _is_institution_user(user: CurrentUser) -> bool:
    return user.role in ("institution_admin", "institution_staff")


def _actor_id(user: CurrentUser) -> Optional[UUID]:
    try:
        return UUID(user.id)
    except (TypeError, ValueError):
        return None


def _get_accessible_application(db: Session, app_id: UUID, user: CurrentUser, for_update: bool = False) -> Application:
    """Loads an application and enforces region (officers) / ownership (institutions) access."""
    query = db.query(Application).filter(Application.id == app_id)
    if for_update:
        query = query.with_for_update()
    app = query.first()
    if not app:
        raise NotFoundException(f"Application {app_id} not found")
    if _is_institution_user(user):
        if not user.institution_id or str(app.institution_id) != str(user.institution_id):
            raise ForbiddenException("Unauthorized to access another institution's application")
    elif not verify_region_access(user, app.region):
        raise ForbiddenException("Unauthorized to access application outside assigned region")
    return app


def _escape_like(value: str) -> str:
    """Stops user-typed % and _ from acting as wildcards in a LIKE search."""
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _enrich(app: Application, now, with_risk: bool) -> ApplicationResponse:
    resp = ApplicationResponse.model_validate(app)
    open_hist = next((h for h in app.history if h.exited_at is None), None)
    if open_hist and not app.decision:
        due_at = as_utc(open_hist.due_at)
        entered_at = as_utc(open_hist.entered_at)
        resp.days_left = int((due_at - now).total_seconds() // 86400)
        if with_risk:
            created_at = as_utc(app.created_at)
            resp.delay_risk_score = predict_stage_delay_risk(
                days_in_stage=(now - entered_at).total_seconds() / 86400.0,
                sla_days=(due_at - entered_at).total_seconds() / 86400.0,
                deficiency_count=app.deficiency_count,
                intake_requested=app.intake_requested,
                age_days=(now - created_at).days if created_at else 0,
            )
    return resp


@router.post("", response_model=ApplicationResponse, status_code=201)
def create_application(
    payload: ApplicationCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Registers an application in the first workflow stage. Institutions can only file for themselves."""
    if _is_institution_user(current_user):
        if not current_user.institution_id or str(payload.institution_id) != str(current_user.institution_id):
            raise ForbiddenException("Cannot file an application for another institution")
    elif current_user.role not in ("aicte_officer", "system_admin"):
        raise ForbiddenException("Role is not authorized to create applications")

    institution = db.query(Institution).filter(Institution.id == payload.institution_id).first()
    if not institution or not institution.is_active:
        raise ValidationErrorException("Institution not found or inactive")
    if institution.region != payload.region:
        raise ValidationErrorException(f"Region must match the institution's region ({institution.region})")
    if db.query(Application.id).filter(Application.application_number == payload.application_number).first():
        raise ConflictException(f"Application number '{payload.application_number}' already exists")

    stage = db.query(WorkflowStage).filter(WorkflowStage.code == INITIAL_STAGE_CODE, WorkflowStage.active == True).first()
    if not stage:
        raise ConflictException(f"Workflow is not configured: stage {INITIAL_STAGE_CODE} is missing or inactive")

    try:
        now = utcnow()
        owner_id = get_least_loaded_officer(db, stage.owner_role, payload.region)
        app = Application(
            application_number=payload.application_number,
            institution_id=payload.institution_id,
            region=payload.region,
            application_type=payload.application_type,
            intake_requested=payload.intake_requested,
            current_stage_code=stage.code,
            owner_id=owner_id,
            priority_score=calculate_priority_score(0, payload.intake_requested, 0, 0),
            created_at=now,
            updated_at=now,
        )
        db.add(app)
        db.flush()
        db.add(ApplicationStageHistory(
            application_id=app.id,
            stage_code=stage.code,
            owner_id=owner_id,
            entered_at=now,
            due_at=calculate_due_date(now, stage.sla_days),
        ))
        record_audit_log(
            db, "APPLICATION", app.id, "CREATE",
            actor_id=_actor_id(current_user), actor_role=current_user.role,
            new_state={"stage": stage.code, "application_number": app.application_number},
        )
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(app)
    return _enrich(app, utcnow(), with_risk=False)


@router.get("", response_model=PaginatedApplicationsResponse)
def list_applications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    stage: Optional[str] = Query(None, max_length=50),
    region: Optional[str] = Query(None, max_length=50),
    search: Optional[str] = Query(None, max_length=100),
    is_overdue: Optional[bool] = None,
    sort: Literal["-priority_score", "-created_at"] = "-priority_score",
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    query = db.query(Application).options(selectinload(Application.history))
    now = utcnow()

    # Scoping by role & region
    if _is_institution_user(current_user):
        if not current_user.institution_id:
            query = query.filter(False)
        else:
            query = query.filter(Application.institution_id == current_user.institution_id)
    elif current_user.role == "aicte_officer" and current_user.officer_level != "NATIONAL_HEAD":
        # An officer without a region sees nothing rather than everything.
        query = query.filter(Application.region == current_user.region)

    if stage:
        query = query.filter(Application.current_stage_code == stage)
    if region:
        query = query.filter(Application.region == region)
    if search:
        query = query.filter(Application.application_number.ilike(f"%{_escape_like(search.strip())}%", escape="\\"))
    if is_overdue is not None:
        overdue = exists().where(and_(
            ApplicationStageHistory.application_id == Application.id,
            ApplicationStageHistory.exited_at == None,
            ApplicationStageHistory.due_at < now,
        ))
        query = query.filter(overdue & (Application.decision == None) if is_overdue else ~overdue)

    if sort == "-priority_score":
        query = query.order_by(Application.priority_score.desc(), Application.created_at.desc())
    else:
        query = query.order_by(Application.created_at.desc())

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedApplicationsResponse(
        items=[_enrich(a, now, with_risk=True) for a in items],
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
    app = _get_accessible_application(db, id, current_user)
    return _enrich(app, utcnow(), with_risk=False)

@router.post("/{id}/move", response_model=ApplicationResponse)
def move_application(
    id: UUID = Path(...),
    payload: MoveStageRequest = ...,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_roles(OFFICER_ROLES))
):
    _get_accessible_application(db, id, current_user)
    updated = move_application_stage(
        db=db,
        application_id=id,
        to_stage_code=payload.to_stage,
        actor_id=_actor_id(current_user),
        actor_role=current_user.role,
        outcome=payload.outcome,
        notes=payload.notes,
        decision=payload.decision,
        decision_remarks=payload.decision_remarks
    )
    return _enrich(updated, utcnow(), with_risk=False)

@router.post("/{id}/assign", response_model=ApplicationResponse)
def assign_application_officer(
    id: UUID = Path(...),
    payload: AssignOfficerRequest = ...,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_roles(OFFICER_ROLES))
):
    app = _get_accessible_application(db, id, current_user, for_update=True)
    if app.decision:
        raise ConflictException("Application already has a final decision")

    officer = db.query(Profile).filter(Profile.id == payload.officer_id).first()
    if not officer or officer.role != "aicte_officer" or not officer.is_active:
        raise ValidationErrorException("Assignee must be an active AICTE officer")
    if officer.officer_level != "NATIONAL_HEAD" and officer.region != app.region:
        raise ValidationErrorException("Assignee must belong to the application's region")

    try:
        old_owner = app.owner_id
        app.owner_id = officer.id
        app.updated_at = utcnow()
        # Keep the open stage's owner in step, so workload views and alerts follow the new owner.
        open_hist = (
            db.query(ApplicationStageHistory)
            .filter(ApplicationStageHistory.application_id == app.id, ApplicationStageHistory.exited_at == None)
            .first()
        )
        if open_hist:
            open_hist.owner_id = officer.id
        record_audit_log(
            db, "APPLICATION", app.id, "ASSIGN",
            actor_id=_actor_id(current_user), actor_role=current_user.role,
            old_state={"owner_id": str(old_owner) if old_owner else None},
            new_state={"owner_id": str(officer.id)},
        )
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(app)
    return _enrich(app, utcnow(), with_risk=False)

@router.post("/{id}/hold", response_model=ApplicationResponse)
def hold_application(
    id: UUID = Path(...),
    payload: HoldApplicationRequest = ...,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_roles(OFFICER_ROLES))
):
    app = _get_accessible_application(db, id, current_user, for_update=True)
    if app.decision:
        raise ConflictException("A decided application cannot be put on hold")
    if app.is_on_hold:
        raise ConflictException("Application is already on hold")
    try:
        app.is_on_hold = True
        app.hold_reason = payload.reason
        app.updated_at = utcnow()
        record_audit_log(
            db, "APPLICATION", app.id, "HOLD",
            actor_id=_actor_id(current_user), actor_role=current_user.role,
            new_state={"is_on_hold": True, "reason": payload.reason},
        )
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(app)
    return _enrich(app, utcnow(), with_risk=False)

@router.post("/{id}/resume", response_model=ApplicationResponse)
def resume_application(
    id: UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_roles(OFFICER_ROLES))
):
    app = _get_accessible_application(db, id, current_user, for_update=True)
    if not app.is_on_hold:
        raise ConflictException("Application is not on hold")
    try:
        app.is_on_hold = False
        app.hold_reason = None
        app.updated_at = utcnow()
        record_audit_log(
            db, "APPLICATION", app.id, "RESUME",
            actor_id=_actor_id(current_user), actor_role=current_user.role,
            new_state={"is_on_hold": False},
        )
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(app)
    return _enrich(app, utcnow(), with_risk=False)
