from fastapi import APIRouter, Depends, Path
from sqlalchemy.orm import Session
from typing import List

from app.core.clock import utcnow
from app.models.base import get_db
from app.models.entities import WorkflowStage, AlertRule, EscalationRule, Application
from app.schemas.workflow import (
    WorkflowStageResponse, WorkflowStageUpdate, EscalationRuleSchema, AlertRuleSchema
)
from app.core.security import CurrentUser, get_current_user
from app.core.permissions import require_roles
from app.core.exceptions import NotFoundException, ValidationErrorException, ConflictException
from app.services.audit_service import record_audit_log

router = APIRouter(prefix="/workflow", tags=["Workflow Config"])

ADMIN = ["system_admin"]


def _actor(user: CurrentUser):
    from uuid import UUID
    try:
        return UUID(user.id)
    except (TypeError, ValueError):
        return None


@router.get("/stages", response_model=List[WorkflowStageResponse])
def get_workflow_stages(db: Session = Depends(get_db), _: CurrentUser = Depends(get_current_user)):
    stages = db.query(WorkflowStage).order_by(WorkflowStage.sequence_order.asc()).all()
    return [WorkflowStageResponse.model_validate(s) for s in stages]

@router.put("/stages/{code}", response_model=WorkflowStageResponse)
def update_workflow_stage(
    code: str = Path(..., max_length=50),
    payload: WorkflowStageUpdate = ...,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_roles(ADMIN))
):
    try:
        stage = db.query(WorkflowStage).filter(WorkflowStage.code == code).with_for_update().first()
        if not stage:
            raise NotFoundException(f"Stage {code} not found")
        before = {"sla_days": stage.sla_days, "next_stages": stage.next_stages, "active": stage.active}

        if payload.next_stages is not None:
            known = {s.code for s in db.query(WorkflowStage.code).all()}
            unknown = [c for c in payload.next_stages if c not in known]
            if unknown:
                raise ValidationErrorException("next_stages contains unknown stage codes", {"unknown": unknown})
            if code in payload.next_stages:
                raise ValidationErrorException("A stage cannot lead to itself")
            if stage.is_terminal and payload.next_stages:
                raise ValidationErrorException("A terminal stage cannot have next stages")
            stage.next_stages = list(dict.fromkeys(payload.next_stages))

        if payload.active is False and stage.active:
            if stage.is_terminal:
                raise ValidationErrorException("The terminal stage cannot be deactivated")
            in_stage = db.query(Application.id).filter(
                Application.current_stage_code == code, Application.decision == None
            ).count()
            if in_stage:
                raise ConflictException(f"{in_stage} open application(s) are in stage {code}; move them before deactivating it")
            stage.active = False
        elif payload.active is True:
            stage.active = True

        if payload.name is not None:
            stage.name = payload.name.strip()
        if payload.sla_days is not None:
            stage.sla_days = payload.sla_days
        if payload.owner_role is not None:
            stage.owner_role = payload.owner_role
        stage.updated_at = utcnow()

        record_audit_log(
            db, "WORKFLOW_STAGE", stage.id, "UPDATE",
            actor_id=_actor(current_user), actor_role=current_user.role,
            old_state=before,
            new_state={"sla_days": stage.sla_days, "next_stages": stage.next_stages, "active": stage.active},
        )
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(stage)
    return WorkflowStageResponse.model_validate(stage)

@router.get("/escalation-rules", response_model=List[EscalationRuleSchema])
def get_escalation_rules(db: Session = Depends(get_db), _: CurrentUser = Depends(get_current_user)):
    rules = db.query(EscalationRule).order_by(EscalationRule.level.asc()).all()
    return [EscalationRuleSchema.model_validate(r) for r in rules]

@router.put("/escalation-rules", response_model=List[EscalationRuleSchema])
def replace_escalation_rules(
    payload: List[EscalationRuleSchema],
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_roles(ADMIN))
):
    levels = [r.level for r in payload]
    if not payload:
        raise ValidationErrorException("At least one escalation rule is required")
    if len(set(levels)) != len(levels) or any(l < 1 for l in levels):
        raise ValidationErrorException("Escalation levels must be unique and start at 1")
    ordered = sorted(payload, key=lambda r: r.level)
    if any(r.overdue_days < 0 for r in ordered):
        raise ValidationErrorException("overdue_days cannot be negative")
    if any(b.overdue_days <= a.overdue_days for a, b in zip(ordered, ordered[1:])):
        raise ValidationErrorException("A higher escalation level must start later than the level below it")

    try:
        existing = {r.level: r for r in db.query(EscalationRule).all()}
        for rule in ordered:
            row = existing.pop(rule.level, None)
            if row is None:
                row = EscalationRule(level=rule.level)
                db.add(row)
            row.overdue_days = rule.overdue_days
            row.target_role = rule.target_role
            row.active = rule.active
        for leftover in existing.values():  # levels dropped from the list are switched off, not deleted
            leftover.active = False
        record_audit_log(
            db, "WORKFLOW_CONFIG", _config_id("escalation-rules"), "UPDATE",
            actor_id=_actor(current_user), actor_role=current_user.role,
            new_state={"levels": levels},
        )
        db.commit()
    except Exception:
        db.rollback()
        raise
    rules = db.query(EscalationRule).order_by(EscalationRule.level.asc()).all()
    return [EscalationRuleSchema.model_validate(r) for r in rules]

@router.get("/alert-rules", response_model=List[AlertRuleSchema])
def get_alert_rules(db: Session = Depends(get_db), _: CurrentUser = Depends(get_current_user)):
    rules = db.query(AlertRule).all()
    return [AlertRuleSchema.model_validate(r) for r in rules]

@router.put("/alert-rules", response_model=List[AlertRuleSchema])
def update_alert_rules(
    payload: List[AlertRuleSchema],
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_roles(ADMIN))
):
    for rule in payload:
        if not rule.offsets_days or any(o < 1 or o > 90 for o in rule.offsets_days):
            raise ValidationErrorException(f"Rule {rule.code}: offsets_days must be between 1 and 90")
        if len(set(rule.offsets_days)) != len(rule.offsets_days):
            raise ValidationErrorException(f"Rule {rule.code}: offsets_days must not repeat")

    try:
        existing = {r.code: r for r in db.query(AlertRule).all()}
        for rule in payload:
            row = existing.get(rule.code)
            if row is None:
                row = AlertRule(code=rule.code, entity_type=rule.entity_type, name=rule.name)
                db.add(row)
            row.name = rule.name
            row.entity_type = rule.entity_type
            row.offsets_days = sorted(rule.offsets_days, reverse=True)
            row.active = rule.active
        record_audit_log(
            db, "WORKFLOW_CONFIG", _config_id("alert-rules"), "UPDATE",
            actor_id=_actor(current_user), actor_role=current_user.role,
            new_state={"codes": [r.code for r in payload]},
        )
        db.commit()
    except Exception:
        db.rollback()
        raise
    rules = db.query(AlertRule).all()
    return [AlertRuleSchema.model_validate(r) for r in rules]


def _config_id(name: str):
    """Stable id for audit rows about a whole config table (they have no single row to point at)."""
    import uuid
    return uuid.uuid5(uuid.NAMESPACE_URL, f"approflow:config:{name}")
