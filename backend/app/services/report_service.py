from sqlalchemy.orm import Session
from sqlalchemy import exists, and_
from datetime import timedelta
from typing import Dict, Any, List, Optional
import io
import csv

from app.core.clock import utcnow, as_utc
from sqlalchemy.orm import selectinload
from app.models.entities import Application, ApplicationStageHistory, EvcVisit, Profile
from app.services.prediction_service import predict_stage_delay_risk


def _open_stage_exists(*conditions):
    return exists().where(and_(
        ApplicationStageHistory.application_id == Application.id,
        ApplicationStageHistory.exited_at == None,
        *conditions,
    ))


def get_kpi_summary(db: Session, region: Optional[str] = None) -> Dict[str, Any]:
    """Real numbers from the database. `region` limits every figure to one region."""
    now = utcnow()

    def apps():
        q = db.query(Application)
        return q.filter(Application.region == region) if region else q

    open_apps = apps().filter(Application.decision == None)
    # Applications on hold have their deadline clock paused (the daily job skips them too).
    running = open_apps.filter(Application.is_on_hold == False)
    overdue = running.filter(_open_stage_exists(ApplicationStageHistory.due_at < now)).count()
    due_this_week = running.filter(
        _open_stage_exists(ApplicationStageHistory.due_at >= now,
                           ApplicationStageHistory.due_at <= now + timedelta(days=7))
    ).count()

    durations = [
        (as_utc(decided) - as_utc(created)).total_seconds() / 86400.0
        for decided, created in apps()
        .filter(Application.decision_date != None)
        .with_entities(Application.decision_date, Application.created_at)
        .all()
        if decided and created
    ]

    evc_q = db.query(EvcVisit).filter(EvcVisit.status == "CONFIRMED", EvcVisit.scheduled_date >= now.date())
    if region:
        evc_q = evc_q.join(Application, Application.id == EvcVisit.application_id).filter(Application.region == region)

    return {
        "total_applications": apps().count(),
        "pending_actions": open_apps.count(),
        "overdue_count": overdue,
        "due_this_week": due_this_week,
        "avg_processing_days": round(sum(durations) / len(durations), 1) if durations else 0.0,
        "evc_scheduled_count": evc_q.count(),
    }


HIGH_RISK_THRESHOLD = 0.7


def _high_risk(app: Application, now) -> bool:
    open_hist = next((h for h in app.history if h.exited_at is None), None)
    if not open_hist:
        return False
    entered, due, created = as_utc(open_hist.entered_at), as_utc(open_hist.due_at), as_utc(app.created_at)
    score = predict_stage_delay_risk(
        days_in_stage=(now - entered).total_seconds() / 86400.0,
        sla_days=(due - entered).total_seconds() / 86400.0,
        deficiency_count=app.deficiency_count,
        intake_requested=app.intake_requested,
        age_days=(now - created).days if created else 0,
    )
    return score >= HIGH_RISK_THRESHOLD


def get_region_summary(db: Session, region: Optional[str] = None) -> List[Dict[str, Any]]:
    """One row per region: open applications, overdue, confirmed EVC visits, average days, delay-risk count."""
    now = utcnow()
    query = db.query(Application).options(selectinload(Application.history)).filter(Application.decision == None)
    if region:
        query = query.filter(Application.region == region)

    rows: Dict[str, Dict[str, Any]] = {}

    def row(name: str) -> Dict[str, Any]:
        return rows.setdefault(name, {"region": name, "pending_count": 0, "overdue_count": 0,
                                      "evc_scheduled": 0, "avg_days": 0.0, "high_risk_count": 0})

    for app in query.all():
        r = row(app.region)
        r["pending_count"] += 1
        open_hist = next((h for h in app.history if h.exited_at is None), None)
        if open_hist and as_utc(open_hist.due_at) < now:
            r["overdue_count"] += 1
        if not app.is_on_hold and _high_risk(app, now):
            r["high_risk_count"] += 1

    # Regions that only have decided applications still show up, with zeros.
    all_regions = db.query(Application.region).distinct()
    if region:
        all_regions = all_regions.filter(Application.region == region)
    for (name,) in all_regions.all():
        row(name)

    evc_q = (
        db.query(Application.region, EvcVisit.id)
        .join(EvcVisit, EvcVisit.application_id == Application.id)
        .filter(EvcVisit.status == "CONFIRMED", EvcVisit.scheduled_date >= now.date())
    )
    for name, _ in evc_q.all():
        if name in rows:
            rows[name]["evc_scheduled"] += 1

    stage_days: Dict[str, List[float]] = {}
    closed = (
        db.query(Application.region, ApplicationStageHistory.entered_at, ApplicationStageHistory.exited_at)
        .join(Application, Application.id == ApplicationStageHistory.application_id)
        .filter(ApplicationStageHistory.exited_at != None)
    )
    for name, entered, exited in closed.all():
        if name in rows and entered and exited:
            stage_days.setdefault(name, []).append((as_utc(exited) - as_utc(entered)).total_seconds() / 86400.0)
    for name, days in stage_days.items():
        rows[name]["avg_days"] = round(sum(days) / len(days), 1)

    return sorted(rows.values(), key=lambda r: r["region"])


def get_officer_workload(db: Session, region: Optional[str] = None) -> List[Dict[str, Any]]:
    """Open caseload, overdue files and average completed-stage time for each active AICTE officer."""
    now = utcnow()
    officers = db.query(Profile).filter(Profile.role == "aicte_officer", Profile.is_active == True)
    if region:
        officers = officers.filter(Profile.region == region)
    officers = officers.order_by(Profile.region.asc(), Profile.full_name.asc()).all()

    result = []
    for officer in officers:
        owned = (
            db.query(Application).options(selectinload(Application.history))
            .filter(Application.owner_id == officer.id, Application.decision == None)
            .all()
        )
        overdue = 0
        for app in owned:
            open_hist = next((h for h in app.history if h.exited_at is None), None)
            if open_hist and as_utc(open_hist.due_at) < now:
                overdue += 1
        durations = [
            (as_utc(exited) - as_utc(entered)).total_seconds() / 86400.0
            for entered, exited in db.query(ApplicationStageHistory.entered_at, ApplicationStageHistory.exited_at)
            .filter(ApplicationStageHistory.owner_id == officer.id, ApplicationStageHistory.exited_at != None).all()
            if entered and exited
        ]
        result.append({
            "id": str(officer.id), "name": officer.full_name, "email": officer.email,
            "region": officer.region, "level": officer.officer_level,
            "active_queue": len(owned), "overdue_count": overdue,
            "avg_completion_days": round(sum(durations) / len(durations), 1) if durations else 0.0,
        })
    return result


def _safe_cell(value: Any) -> Any:
    """Stops spreadsheet formula injection: a cell starting with = + - @ would be executed by Excel."""
    if isinstance(value, str) and value[:1] in ("=", "+", "-", "@", "\t", "\r"):
        return "'" + value
    return value


def export_report_csv(data: List[Dict[str, Any]]) -> str:
    if not data:
        return ""
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=list(data[0].keys()))
    writer.writeheader()
    for row in data:
        writer.writerow({k: _safe_cell(v) for k, v in row.items()})
    return output.getvalue()
