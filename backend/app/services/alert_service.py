import logging
from typing import Any, Dict, List, Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.clock import utcnow, as_utc
from app.core.config import settings
from app.models.entities import (
    Application, ApplicationStageHistory, Undertaking, ComplianceDocument,
    Alert, AlertRule, EscalationRule
)
from app.services.sla_service import compute_reminder_offset, compute_escalation_level
from app.services.priority_service import calculate_priority_score

logger = logging.getLogger("approflow.alerts")

# Fallback ladder used only when the escalation_rules table has no active rows.
DEFAULT_ESCALATION_TARGETS = {1: "SECTION_OFFICER", 2: "SECTION_HEAD", 3: "REGIONAL_HEAD", 4: "NATIONAL_HEAD"}
STAGE_ALERT_CODES = ("STAGE_SLA_BREACH", "STAGE_DUE_REMINDER")


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
    region: Optional[str] = None
) -> bool:
    """Inserts alert if dedupe_key doesn't already exist (idempotent, also under concurrent runs)."""
    if db.query(Alert.id).filter(Alert.dedupe_key == dedupe_key).first():
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
        created_at=utcnow()
    )
    # A savepoint, so losing a race against another run (unique dedupe_key) only drops this alert.
    try:
        with db.begin_nested():
            db.add(alert)
    except IntegrityError:
        return False
    return True


def _load_escalation_rules(db: Session) -> List[EscalationRule]:
    return db.query(EscalationRule).filter(EscalationRule.active == True).order_by(EscalationRule.level.asc()).all()


def _escalation_for(days_overdue: float, rules: List[EscalationRule]):
    """Returns (level, target_role). Uses the configured rules; falls back to the built-in ladder."""
    if rules:
        matched = [r for r in rules if days_overdue >= r.overdue_days]
        if not matched:
            return 0, None
        top = max(matched, key=lambda r: r.level)
        return top.level, top.target_role
    level = compute_escalation_level(days_overdue)
    return level, DEFAULT_ESCALATION_TARGETS.get(level)


def _reminder_offsets(db: Session, rule_code: str) -> List[int]:
    rule = db.query(AlertRule).filter(AlertRule.code == rule_code, AlertRule.active == True).first()
    if rule and rule.offsets_days:
        return [o for o in rule.offsets_days if o > 0] or settings.reminder_offset_list
    return settings.reminder_offset_list


def run_daily_checks_job(db: Session) -> Dict[str, int]:
    """
    Scans open stages, undertakings, documents and EVC visits:
    - Creates reminders and escalations
    - Recomputes priority scores
    - Auto-resolves alerts whose cause is gone
    All-or-nothing: if anything fails the transaction is rolled back and the error re-raised.
    """
    try:
        counts = _run_checks(db)
        db.commit()
        return counts
    except Exception:
        db.rollback()
        logger.exception("Daily checks rolled back")
        raise


def _run_checks(db: Session) -> Dict[str, int]:
    now = utcnow()
    today_date = now.date()  # UTC date; undertakings and documents use plain dates
    alerts_created = 0

    escalation_rules = _load_escalation_rules(db)
    stage_offsets = _reminder_offsets(db, "STAGE_DUE_REMINDER")

    # 1. Open application stages. Applications on hold have their SLA clock paused, and
    #    decided applications have nothing left to chase.
    open_stages = (
        db.query(ApplicationStageHistory, Application)
        .join(Application, Application.id == ApplicationStageHistory.application_id)
        .filter(
            ApplicationStageHistory.exited_at == None,
            Application.decision == None,
            Application.is_on_hold == False,
        )
        .all()
    )

    for hist, app in open_stages:
        due_at = as_utc(hist.due_at)
        created_at = as_utc(app.created_at)
        days_diff = (due_at - now).total_seconds() / 86400.0
        age_days = (now - created_at).days if created_at else 0
        overdue_days = 0

        if days_diff < 0:
            days_overdue = abs(days_diff)
            overdue_days = int(days_overdue)
            level, role_target = _escalation_for(days_overdue, escalation_rules)
            if level > 0 and role_target:
                created = trigger_alert_if_not_exists(
                    db=db,
                    dedupe_key=f"APPLICATION:{app.id}:STAGE_SLA_BREACH:L{level}",
                    entity_type="APPLICATION",
                    entity_id=app.id,
                    rule_code="STAGE_SLA_BREACH",
                    severity="CRITICAL" if level >= 3 else "HIGH",
                    title=f"SLA Breach Escalation Level {level}: Application #{app.application_number}",
                    message=f"Application #{app.application_number} in stage {hist.stage_code} is {int(days_overdue)} days overdue.",
                    recipient_role=role_target,
                    recipient_id=app.owner_id if level == 1 else None,
                    region=app.region
                )
                alerts_created += int(created)
        else:
            offset = compute_reminder_offset(days_diff, stage_offsets)
            if offset is not None:
                created = trigger_alert_if_not_exists(
                    db=db,
                    dedupe_key=f"APPLICATION:{app.id}:STAGE_DUE_REMINDER:R{offset}",
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
                alerts_created += int(created)

        # Priority depends on overdue days and age, so it is refreshed for every open application.
        app.priority_score = calculate_priority_score(
            overdue_days=overdue_days,
            intake_requested=app.intake_requested,
            deficiency_count=app.deficiency_count,
            age_days=age_days
        )

    # 2. Undertakings
    undertaking_offsets = _reminder_offsets(db, "UNDERTAKING_REMINDER")
    open_undertakings = (
        db.query(Undertaking, Application)
        .join(Application, Application.id == Undertaking.application_id)
        .filter(Undertaking.status == "PENDING")
        .all()
    )
    for u, app in open_undertakings:
        delta_days = (u.due_date - today_date).days
        if delta_days < 0:
            u.status = "OVERDUE"
            alerts_created += int(trigger_alert_if_not_exists(
                db=db,
                dedupe_key=f"UNDERTAKING:{u.id}:OVERDUE:L1",
                entity_type="UNDERTAKING",
                entity_id=u.id,
                rule_code="UNDERTAKING_OVERDUE",
                severity="HIGH",
                title=f"Overdue Undertaking: {u.title}",
                message=f"Undertaking '{u.title}' for application #{app.application_number} is past due date ({u.due_date}).",
                recipient_role="SECTION_OFFICER",
                region=app.region
            ))
        elif delta_days in undertaking_offsets:
            alerts_created += int(trigger_alert_if_not_exists(
                db=db,
                dedupe_key=f"UNDERTAKING:{u.id}:REMINDER:R{delta_days}",
                entity_type="UNDERTAKING",
                entity_id=u.id,
                rule_code="UNDERTAKING_REMINDER",
                severity="MEDIUM",
                title=f"Undertaking Due in {delta_days} Days: {u.title}",
                message=f"Undertaking '{u.title}' is due on {u.due_date}.",
                recipient_role="SECTION_OFFICER",
                region=app.region
            ))

    # 3. Compliance Documents Expiry
    window = settings.DOCUMENT_EXPIRING_DAYS
    reminder_days = sorted({d for d in (window, 15, 7, 1) if 0 < d <= window}, reverse=True)
    docs = db.query(ComplianceDocument).filter(ComplianceDocument.status.in_(["VALID", "EXPIRING"])).all()
    for doc in docs:
        days_left = (doc.valid_until - today_date).days
        if days_left < 0:
            doc.status = "EXPIRED"
            alerts_created += int(trigger_alert_if_not_exists(
                db=db,
                dedupe_key=f"DOCUMENT:{doc.id}:EXPIRED:L1",
                entity_type="COMPLIANCE_DOCUMENT",
                entity_id=doc.id,
                rule_code="DOCUMENT_EXPIRED",
                severity="CRITICAL",
                title=f"Document Expired: {doc.title}",
                message=f"Compliance document '{doc.title}' expired on {doc.valid_until}.",
                recipient_role="SECTION_OFFICER"
            ))
        elif days_left <= window:
            doc.status = "EXPIRING"
            if days_left in reminder_days:
                alerts_created += int(trigger_alert_if_not_exists(
                    db=db,
                    dedupe_key=f"DOCUMENT:{doc.id}:EXPIRY_REMINDER:R{days_left}",
                    entity_type="COMPLIANCE_DOCUMENT",
                    entity_id=doc.id,
                    rule_code="DOCUMENT_EXPIRY_REMINDER",
                    severity="HIGH" if days_left <= 7 else "MEDIUM",
                    title=f"Document Expiring in {days_left} Days: {doc.title}",
                    message=f"Compliance document '{doc.title}' will expire on {doc.valid_until}.",
                    recipient_role="SECTION_OFFICER"
                ))
        else:
            doc.status = "VALID"  # renewed: validity was extended beyond the warning window

    db.flush()
    resolved = _auto_resolve_alerts(db, now)
    return {"alerts_created": alerts_created, "alerts_resolved": resolved}


def _auto_resolve_alerts(db: Session, now) -> int:
    """Closes alerts whose cause is gone: stage moved on, undertaking handled, document renewed."""
    resolved = 0
    active = db.query(Alert).filter(Alert.status.in_(["OPEN", "ACKNOWLEDGED"])).all()

    for alert in active:
        cause_gone = False

        if alert.entity_type == "APPLICATION" and alert.rule_code in STAGE_ALERT_CODES:
            app = db.query(Application).filter(Application.id == alert.entity_id).first()
            open_hist = (
                db.query(ApplicationStageHistory)
                .filter(ApplicationStageHistory.application_id == alert.entity_id,
                        ApplicationStageHistory.exited_at == None)
                .first()
            )
            if not app or app.decision or not open_hist:
                cause_gone = True
            else:
                # The stage that triggered the alert has been left; the alert belongs to an earlier stage visit.
                cause_gone = as_utc(open_hist.entered_at) > as_utc(alert.created_at)

        elif alert.entity_type == "UNDERTAKING":
            u = db.query(Undertaking).filter(Undertaking.id == alert.entity_id).first()
            cause_gone = (not u) or u.status in ("SUBMITTED", "VERIFIED", "WAIVED")

        elif alert.entity_type == "COMPLIANCE_DOCUMENT":
            doc = db.query(ComplianceDocument).filter(ComplianceDocument.id == alert.entity_id).first()
            cause_gone = (not doc) or doc.status == "VALID"

        if cause_gone:
            alert.status = "RESOLVED"
            alert.resolved_at = now
            resolved += 1

    return resolved
