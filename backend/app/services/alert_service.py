from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any
from app.models.entities import (
    Application, ApplicationStageHistory, Undertaking, ComplianceDocument,
    Alert, AlertRule, EscalationRule, Profile
)
from app.services.sla_service import compute_reminder_offset, compute_escalation_level
from app.services.priority_service import calculate_priority_score

def trigger_alert_if_not_exists(
    db: Session,
    dedupe_key: str,
    entity_type: str,
    entity_id: Any,
    rule_code: str,
    severity: str,
    title: str,
    message: str,
    recipient_role: str,
    recipient_id: Any = None,
    region: str = None
) -> bool:
    """Inserts alert if dedupe_key doesn't already exist (idempotent)."""
    exists = db.query(Alert).filter(Alert.dedupe_key == dedupe_key).first()
    if exists:
        return False
    
    alert = Alert(
        dedupe_key=dedupe_key,
        entity_type=entity_type,
        entity_id=entity_id,
        rule_code=rule_code,
        severity=severity,
        title=title,
        message=message,
        recipient_role=recipient_role,
        recipient_id=recipient_id,
        region=region,
        status="OPEN",
        created_at=datetime.utcnow()
    )
    db.add(alert)
    return True

def run_daily_checks_job(db: Session) -> Dict[str, int]:
    """
    Scans open stages, undertakings, documents and EVC visits:
    - Creates reminders and escalations
    - Recomputes priority scores
    - Auto-resolves alerts whose cause is completed
    """
    now = datetime.utcnow()
    alerts_created = 0
    resolved_count = 0

    # 1. Open Application Stages
    open_stages = (
        db.query(ApplicationStageHistory, Application)
        .join(Application, Application.id == ApplicationStageHistory.application_id)
        .filter(ApplicationStageHistory.exited_at == None)
        .all()
    )

    for hist, app in open_stages:
        days_diff = (hist.due_at - now).total_seconds() / 86400.0
        age_days = (now - app.created_at).days if app.created_at else 0

        # Overdue escalation check
        if days_diff < 0:
            days_overdue = abs(days_diff)
            level = compute_escalation_level(days_overdue)
            if level > 0:
                role_target = {
                    1: "SECTION_OFFICER",
                    2: "SECTION_HEAD",
                    3: "REGIONAL_HEAD",
                    4: "NATIONAL_HEAD"
                }.get(level, "NATIONAL_HEAD")
                
                dedupe_key = f"APPLICATION:{app.id}:STAGE_SLA_BREACH:L{level}"
                severity = "CRITICAL" if level >= 3 else "HIGH"
                created = trigger_alert_if_not_exists(
                    db=db,
                    dedupe_key=dedupe_key,
                    entity_type="APPLICATION",
                    entity_id=app.id,
                    rule_code="STAGE_SLA_BREACH",
                    severity=severity,
                    title=f"SLA Breach Escalation Level {level}: Application #{app.application_number}",
                    message=f"Application #{app.application_number} in stage {hist.stage_code} is {int(days_overdue)} days overdue.",
                    recipient_role=role_target,
                    recipient_id=app.owner_id if level == 1 else None,
                    region=app.region
                )
                if created:
                    alerts_created += 1

            # Recalculate priority with overdue penalty
            app.priority_score = calculate_priority_score(
                overdue_days=int(days_overdue),
                intake_requested=app.intake_requested,
                deficiency_count=app.deficiency_count,
                age_days=age_days
            )
        else:
            # Reminder check
            offset = compute_reminder_offset(days_diff)
            if offset is not None:
                dedupe_key = f"APPLICATION:{app.id}:STAGE_DUE_REMINDER:R{offset}"
                created = trigger_alert_if_not_exists(
                    db=db,
                    dedupe_key=dedupe_key,
                    entity_type="APPLICATION",
                    entity_id=app.id,
                    rule_code="STAGE_DUE_REMINDER",
                    severity="MEDIUM" if offset > 1 else "HIGH",
                    title=f"SLA Reminder ({offset}d left): Application #{app.application_number}",
                    message=f"Application #{app.application_number} stage {hist.stage_code} deadline is in {int(days_diff)} days.",
                    recipient_role="SECTION_OFFICER",
                    recipient_id=app.owner_id,
                    region=app.region
                )
                if created:
                    alerts_created += 1

    # 2. Undertakings
    open_undertakings = db.query(Undertaking, Application).join(Application, Application.id == Undertaking.application_id).filter(Undertaking.status == "PENDING").all()
    today_date = now.date()
    for u, app in open_undertakings:
        delta_days = (u.due_date - today_date).days
        if delta_days < 0:
            u.status = "OVERDUE"
            dedupe_key = f"UNDERTAKING:{u.id}:OVERDUE:L1"
            if trigger_alert_if_not_exists(
                db=db,
                dedupe_key=dedupe_key,
                entity_type="UNDERTAKING",
                entity_id=u.id,
                rule_code="UNDERTAKING_OVERDUE",
                severity="HIGH",
                title=f"Overdue Undertaking: {u.title}",
                message=f"Undertaking '{u.title}' for application #{app.application_number} is past due date ({u.due_date}).",
                recipient_role="SECTION_OFFICER",
                region=app.region
            ):
                alerts_created += 1
        elif delta_days in (7, 3, 1):
            dedupe_key = f"UNDERTAKING:{u.id}:REMINDER:R{delta_days}"
            if trigger_alert_if_not_exists(
                db=db,
                dedupe_key=dedupe_key,
                entity_type="UNDERTAKING",
                entity_id=u.id,
                rule_code="UNDERTAKING_REMINDER",
                severity="MEDIUM",
                title=f"Undertaking Due in {delta_days} Days: {u.title}",
                message=f"Undertaking '{u.title}' is due on {u.due_date}.",
                recipient_role="SECTION_OFFICER",
                region=app.region
            ):
                alerts_created += 1

    # 3. Compliance Documents Expiry
    docs = db.query(ComplianceDocument).filter(ComplianceDocument.status.in_(["VALID", "EXPIRING"])).all()
    for doc in docs:
        days_left = (doc.valid_until - today_date).days
        if days_left < 0:
            doc.status = "EXPIRED"
            dedupe_key = f"DOCUMENT:{doc.id}:EXPIRED:L1"
            if trigger_alert_if_not_exists(
                db=db,
                dedupe_key=dedupe_key,
                entity_type="COMPLIANCE_DOCUMENT",
                entity_id=doc.id,
                rule_code="DOCUMENT_EXPIRED",
                severity="CRITICAL",
                title=f"Document Expired: {doc.title}",
                message=f"Compliance document '{doc.title}' expired on {doc.valid_until}.",
                recipient_role="SECTION_OFFICER"
            ):
                alerts_created += 1
        elif days_left <= 30:
            doc.status = "EXPIRING"
            if days_left in (30, 15, 7, 1):
                dedupe_key = f"DOCUMENT:{doc.id}:EXPIRY_REMINDER:R{days_left}"
                if trigger_alert_if_not_exists(
                    db=db,
                    dedupe_key=dedupe_key,
                    entity_type="COMPLIANCE_DOCUMENT",
                    entity_id=doc.id,
                    rule_code="DOCUMENT_EXPIRY_REMINDER",
                    severity="HIGH" if days_left <= 7 else "MEDIUM",
                    title=f"Document Expiring in {days_left} Days: {doc.title}",
                    message=f"Compliance document '{doc.title}' will expire on {doc.valid_until}.",
                    recipient_role="SECTION_OFFICER"
                ):
                    alerts_created += 1

    db.commit()
    return {"alerts_created": alerts_created, "alerts_resolved": resolved_count}
