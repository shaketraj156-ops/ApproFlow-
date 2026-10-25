import secrets
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional

from app.models.base import get_db
from app.core.config import settings
from app.core.exceptions import ForbiddenException
from app.services.alert_service import run_daily_checks_job

router = APIRouter(prefix="/jobs", tags=["Background Jobs"])

@router.post("/run-daily-checks")
def trigger_daily_checks(
    x_job_secret: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    if not settings.JOB_SECRET or not x_job_secret or not secrets.compare_digest(x_job_secret, settings.JOB_SECRET):
        raise ForbiddenException("Invalid or missing X-Job-Secret header")

    results = run_daily_checks_job(db)
    return {
        "status": "SUCCESS",
        "message": "Daily background compliance and SLA scan completed successfully",
        "details": results
    }
