from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.models.base import get_db
from app.models.entities import Alert
from app.schemas.alert import AlertResponse, AlertSummary
from app.core.security import CurrentUser, get_current_user
from app.core.exceptions import NotFoundException

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.get("", response_model=List[AlertResponse])
def get_alerts(
    status: Optional[str] = Query("OPEN"),
    severity: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    query = db.query(Alert)
    if status:
        query = query.filter(Alert.status == status)
    if severity:
        query = query.filter(Alert.severity == severity)
    
    if current_user.role == "aicte_officer" and current_user.officer_level != "NATIONAL_HEAD":
        if current_user.region:
            query = query.filter((Alert.region == current_user.region) | (Alert.region == None))

    alerts = query.order_by(Alert.created_at.desc()).limit(100).all()
    return [AlertResponse.model_validate(a) for a in alerts]

@router.get("/summary", response_model=AlertSummary)
def get_alert_summary(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    query = db.query(Alert)
    if current_user.role == "aicte_officer" and current_user.officer_level != "NATIONAL_HEAD":
        if current_user.region:
            query = query.filter((Alert.region == current_user.region) | (Alert.region == None))

    open_c = query.filter(Alert.status == "OPEN").count()
    crit_c = query.filter(Alert.status == "OPEN", Alert.severity == "CRITICAL").count()
    ack_c = query.filter(Alert.status == "ACKNOWLEDGED").count()

    return AlertSummary(
        open_count=open_c,
        critical_count=crit_c,
        acknowledged_count=ack_c,
        total_active=open_c + ack_c
    )

@router.post("/{id}/acknowledge", response_model=AlertResponse)
def acknowledge_alert(
    id: UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    alert = db.query(Alert).filter(Alert.id == id).first()
    if not alert:
        raise NotFoundException("Alert not found")
    alert.status = "ACKNOWLEDGED"
    alert.acknowledged_at = datetime.utcnow()
    alert.acknowledged_by = UUID(current_user.id) if current_user.id else None
    db.commit()
    db.refresh(alert)
    return AlertResponse.model_validate(alert)

@router.post("/{id}/resolve", response_model=AlertResponse)
def resolve_alert(
    id: UUID = Path(...),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    alert = db.query(Alert).filter(Alert.id == id).first()
    if not alert:
        raise NotFoundException("Alert not found")
    alert.status = "RESOLVED"
    alert.resolved_at = datetime.utcnow()
    db.commit()
    db.refresh(alert)
    return AlertResponse.model_validate(alert)
