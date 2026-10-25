from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.orm import Session
from typing import List, Literal, Optional
from uuid import UUID

from app.core.clock import utcnow
from app.models.base import get_db
from app.models.entities import Alert
from app.schemas.alert import AlertResponse, AlertSummary
from app.core.security import CurrentUser
from app.core.exceptions import NotFoundException, ForbiddenException, ConflictException
from app.core.permissions import require_roles, verify_region_access

# Alerts are for AICTE staff; institutions never see them.
READ_ROLES = ["aicte_officer", "auditor"]
WRITE_ROLES = ["aicte_officer"]

router = APIRouter(prefix="/alerts", tags=["Alerts"])


def _scope_to_user(query, user: CurrentUser):
    """Regional officers see their region's alerts plus alerts that belong to no region."""
    if user.role == "aicte_officer" and user.officer_level != "NATIONAL_HEAD":
        query = query.filter((Alert.region == user.region) | (Alert.region == None))
    return query


@router.get("", response_model=List[AlertResponse])
def get_alerts(
    status: Optional[Literal["OPEN", "ACKNOWLEDGED", "RESOLVED"]] = Query("OPEN"),
    severity: Optional[Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]] = None,
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_roles(READ_ROLES))
):
    query = _scope_to_user(db.query(Alert), current_user)
    if status:
        query = query.filter(Alert.status == status)
    if severity:
        query = query.filter(Alert.severity == severity)

    alerts = query.order_by(Alert.created_at.desc()).limit(limit).all()
    return [AlertResponse.model_validate(a) for a in alerts]

@router.get("/summary", response_model=AlertSummary)
def get_alert_summary(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_roles(READ_ROLES))
):
    query = _scope_to_user(db.query(Alert), current_user)

    open_c = query.filter(Alert.status == "OPEN").count()
    crit_c = query.filter(Alert.status == "OPEN", Alert.severity == "CRITICAL").count()
    ack_c = query.filter(Alert.status == "ACKNOWLEDGED").count()

    return AlertSummary(
        open_count=open_c,
        critical_count=crit_c,
        acknowledged_count=ack_c,
        total_active=open_c + ack_c
    )


def _load_alert(db: Session, alert_id: UUID, user: CurrentUser) -> Alert:
    alert = db.query(Alert).filter(Alert.id == alert_id).with_for_update().first()
    if not alert:
        raise NotFoundException("Alert not found")
    if alert.region and not verify_region_access(user, alert.region):
        raise ForbiddenException("Unauthorized to act on alerts outside assigned region")
    return alert


@router.post("/{id}/acknowledge", response_model=AlertResponse)
def acknowledge_alert(
    id: UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_roles(WRITE_ROLES))
):
    try:
        alert = _load_alert(db, id, current_user)
        if alert.status != "OPEN":
            raise ConflictException(f"Only an OPEN alert can be acknowledged (current status: {alert.status})")
        alert.status = "ACKNOWLEDGED"
        alert.acknowledged_at = utcnow()
        try:
            alert.acknowledged_by = UUID(current_user.id)
        except (TypeError, ValueError):
            alert.acknowledged_by = None
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(alert)
    return AlertResponse.model_validate(alert)

@router.post("/{id}/resolve", response_model=AlertResponse)
def resolve_alert(
    id: UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_roles(WRITE_ROLES))
):
    try:
        alert = _load_alert(db, id, current_user)
        if alert.status == "RESOLVED":
            raise ConflictException("Alert is already resolved")
        alert.status = "RESOLVED"
        alert.resolved_at = utcnow()
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(alert)
    return AlertResponse.model_validate(alert)
