from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from uuid import UUID
from datetime import datetime

from app.models.base import get_db
from app.models.entities import Application, ApplicationStageHistory
from app.services.prediction_service import predict_stage_delay_risk

router = APIRouter(prefix="/predictions", tags=["ML Predictions"])

@router.get("/delay-risk")
def get_delay_risk(
    application_id: UUID = Query(...),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        return {"risk_score": 0.35, "recommendation": "On track"}
    
    open_hist = next((h for h in app.history if h.exited_at is None), None)
    if not open_hist:
        return {"risk_score": 0.0, "recommendation": "Completed"}

    now = datetime.utcnow()
    days_in_stage = (now - open_hist.entered_at).total_seconds() / 86400.0
    sla_days = (open_hist.due_at - open_hist.entered_at).total_seconds() / 86400.0
    age_days = (now - app.created_at).days if app.created_at else 0

    score = predict_stage_delay_risk(
        days_in_stage=days_in_stage,
        sla_days=sla_days,
        deficiency_count=app.deficiency_count,
        intake_requested=app.intake_requested,
        age_days=age_days
    )

    tag = "High Risk" if score >= 0.7 else ("Medium Risk" if score >= 0.4 else "Low Risk")
    return {
        "application_id": str(app.id),
        "stage": open_hist.stage_code,
        "days_in_stage": round(days_in_stage, 1),
        "sla_days": round(sla_days, 1),
        "delay_probability": score,
        "risk_level": tag,
        "recommendation": "Prioritize scrutiny officer review" if score >= 0.7 else "Regular processing"
    }

@router.get("/at-risk")
def list_at_risk_applications(
    threshold: float = Query(0.7, ge=0.0, le=1.0),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    # Applications with open stage and estimated high probability of delay
    results = []
    apps = db.query(Application).filter(Application.decision == None).all()
    now = datetime.utcnow()
    for app in apps:
        open_hist = next((h for h in app.history if h.exited_at is None), None)
        if open_hist:
            days_in_stage = (now - open_hist.entered_at).total_seconds() / 86400.0
            sla_days = (open_hist.due_at - open_hist.entered_at).total_seconds() / 86400.0
            score = predict_stage_delay_risk(days_in_stage, sla_days, app.deficiency_count, app.intake_requested)
            if score >= threshold:
                results.append({
                    "id": str(app.id),
                    "application_number": app.application_number,
                    "region": app.region,
                    "stage": open_hist.stage_code,
                    "priority_score": float(app.priority_score),
                    "delay_probability": score
                })
    return results
