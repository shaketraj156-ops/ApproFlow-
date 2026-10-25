import logging
import re
from fastapi import APIRouter, Depends, Path, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Literal, Optional

from app.models.base import get_db
from app.core.permissions import require_roles
from app.core.security import CurrentUser
from app.core.exceptions import ServiceUnavailableException
from app.schemas.report import (
    KpiSummaryResponse, FunnelStageItem, BottleneckHeatmapItem, RegionSummaryItem, OfficerWorkloadItem
)
from app.models.entities import Application
from app.services.report_service import get_kpi_summary, export_report_csv, get_region_summary, get_officer_workload

logger = logging.getLogger("approflow.reports")

READ_ROLES = ["aicte_officer", "auditor"]

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])



def _user_region(user: CurrentUser) -> Optional[str]:
    """Regional officers only see their own region; national head, auditors and admins see all."""
    if user.role == "aicte_officer" and user.officer_level != "NATIONAL_HEAD":
        return user.region or "__none__"  # an officer without a region matches nothing
    return None


@router.get("/kpis", response_model=KpiSummaryResponse)
def get_kpis(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_roles(READ_ROLES))
):
    return get_kpi_summary(db, region=_user_region(current_user))

@router.get("/region-summary", response_model=List[RegionSummaryItem])
def get_region_summary_report(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_roles(READ_ROLES))
):
    return get_region_summary(db, region=_user_region(current_user))

@router.get("/officer-workload", response_model=List[OfficerWorkloadItem])
def get_officer_workload_report(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_roles(READ_ROLES))
):
    return get_officer_workload(db, region=_user_region(current_user))

@router.get("/funnel", response_model=List[FunnelStageItem])
def get_funnel_report(
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_roles(READ_ROLES))
):
    try:
        rows = db.execute(text("SELECT stage_code, stage_name, sequence_order, application_count, total_intake_requested, avg_priority_score FROM v_pipeline_funnel ORDER BY sequence_order")).fetchall()
    except SQLAlchemyError:
        # Say so honestly instead of returning made-up numbers.
        logger.exception("v_pipeline_funnel query failed (has database/views/008_reports_views.sql been run?)")
        raise ServiceUnavailableException("Funnel report is unavailable right now")
    return [
        FunnelStageItem(
            stage_code=r[0],
            stage_name=r[1],
            sequence_order=r[2],
            application_count=r[3] or 0,
            total_intake_requested=r[4] or 0,
            avg_priority_score=float(r[5] or 0.0)
        ) for r in rows
    ]

@router.get("/bottlenecks", response_model=List[BottleneckHeatmapItem])
def get_bottlenecks(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_roles(READ_ROLES))
):
    region = _user_region(current_user)
    sql = "SELECT region, stage_code, stage_name, pending_count, avg_days_in_stage, breach_count, breach_rate_pct FROM v_stage_bottlenecks"
    params = {}
    if region:
        sql += " WHERE region = :region"
        params["region"] = region
    try:
        rows = db.execute(text(sql), params).fetchall()
    except SQLAlchemyError:
        logger.exception("v_stage_bottlenecks query failed (has database/views/008_reports_views.sql been run?)")
        raise ServiceUnavailableException("Bottleneck report is unavailable right now")
    return [
        BottleneckHeatmapItem(
            region=r[0],
            stage_code=r[1],
            stage_name=r[2],
            pending_count=r[3] or 0,
            avg_days_in_stage=float(r[4] or 0.0),
            breach_count=r[5] or 0,
            breach_rate_pct=float(r[6] or 0.0)
        ) for r in rows
    ]

@router.get("/{name}/export")
def export_report(
    name: Literal["applications"] = Path(..., description="Report to export"),
    format: Literal["csv"] = Query("csv"),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_roles(READ_ROLES))
):
    """Exports the applications the caller is allowed to see (CSV only for now)."""
    query = db.query(Application)
    region = _user_region(current_user)
    if region:
        query = query.filter(Application.region == region)
    rows = [
        {
            "application_number": a.application_number,
            "region": a.region,
            "stage": a.current_stage_code,
            "priority_score": float(a.priority_score),
            "deficiency_count": a.deficiency_count,
            "decision": a.decision or "",
        }
        for a in query.order_by(Application.priority_score.desc()).limit(5000).all()
    ]
    if not rows:
        rows = [{"application_number": "", "region": "", "stage": "", "priority_score": "", "deficiency_count": "", "decision": ""}]
    safe_name = re.sub(r"[^A-Za-z0-9_-]", "_", name)[:60] or "report"
    return Response(
        content=export_report_csv(rows),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}.csv"'}
    )
