from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, selectinload
from typing import List, Dict, Any
from uuid import UUID

from app.core.clock import utcnow, as_utc
from app.models.base import get_db
from app.models.entities import Application
from app.core.permissions import require_roles, verify_region_access
from app.core.security import CurrentUser
from app.core.exceptions import NotFoundException, ForbiddenException
from app.services.prediction_service import predict_stage_delay_risk

router = APIRouter(prefix="/predictions", tags=["ML Predictions"])

READ_ROLES = ["aicte_officer", "auditor"]


def _score_application(app: Application, now) -> Dict[str, Any]:
    """Delay-risk inputs and score for an application's open stage, or None when nothing is open."""
    open_hist = next((h for h in app.history if h.exited_at is None), None)
    if not open_hist or app.decision:
        return None
    entered_at = as_utc(open_hist.entered_at)
    due_at = as_utc(open_hist.due_at)
    created_at = as_utc(app.created_at)
    days_in_stage = (now - entered_at).total_seconds() / 86400.0
    sla_days = (due_at - entered_at).total_seconds() / 86400.0
    score = predict_stage_delay_risk(
        days_in_stage=days_in_stage,
        sla_days=sla_days,
        deficiency_count=app.deficiency_count,
        intake_requested=app.intake_requested,
        age_days=(now - created_at).days if created_at else 0,
    )
    return {"stage": open_hist.stage_code, "days_in_stage": days_in_stage, "sla_days": sla_days, "score": score}


@router.get("/delay-risk")
def get_delay_risk(
    application_id: UUID = Query(...),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_roles(READ_ROLES))
) -> Dict[str, Any]:
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise NotFoundException("Application not found")
    if not verify_region_access(current_user, app.region):
        raise ForbiddenException("Unauthorized to access application outside assigned region")

    scored = _score_application(app, utcnow())
    if scored is None:
        return {"application_id": str(app.id), "delay_probability": 0.0, "risk_level": "None", "recommendation": "Completed"}

    score = scored["score"]
    return {
        "application_id": str(app.id),
        "stage": scored["stage"],
        "days_in_stage": round(scored["days_in_stage"], 1),
        "sla_days": round(scored["sla_days"], 1),
        "delay_probability": score,
        "risk_level": "High Risk" if score >= 0.7 else ("Medium Risk" if score >= 0.4 else "Low Risk"),
        "recommendation": "Prioritize scrutiny officer review" if score >= 0.7 else "Regular processing"
    }

@router.get("/at-risk")
def list_at_risk_applications(
    threshold: float = Query(0.7, ge=0.0, le=1.0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_roles(READ_ROLES))
) -> List[Dict[str, Any]]:
    # Applications with an open stage and estimated high probability of delay
    query = db.query(Application).options(selectinload(Application.history)).filter(
        Application.decision == None, Application.is_on_hold == False
    )
    if current_user.role == "aicte_officer" and current_user.officer_level != "NATIONAL_HEAD":
        query = query.filter(Application.region == current_user.region)

    now = utcnow()
    results = []
    for app in query.all():
        scored = _score_application(app, now)
        if scored and scored["score"] >= threshold:
            results.append({
                "id": str(app.id),
                "application_number": app.application_number,
                "region": app.region,
                "stage": scored["stage"],
                "priority_score": float(app.priority_score),
                "delay_probability": scored["score"],
            })
    results.sort(key=lambda r: r["delay_probability"], reverse=True)
    return results[:limit]
