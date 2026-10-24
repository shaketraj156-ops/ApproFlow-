from fastapi import APIRouter, Depends, Path
from sqlalchemy.orm import Session
from typing import List
from app.models.base import get_db
from app.models.entities import WorkflowStage, AlertRule, EscalationRule
from app.schemas.workflow import (
    WorkflowStageResponse, WorkflowStageUpdate, EscalationRuleSchema, AlertRuleSchema
)
from app.core.security import CurrentUser, get_current_user
from app.core.permissions import require_roles
from app.core.exceptions import NotFoundException

router = APIRouter(prefix="/workflow", tags=["Workflow Config"])

@router.get("/stages", response_model=List[WorkflowStageResponse])
def get_workflow_stages(db: Session = Depends(get_db)):
    stages = db.query(WorkflowStage).order_by(WorkflowStage.sequence_order.asc()).all()
    return [WorkflowStageResponse.model_validate(s) for s in stages]

@router.put("/stages/{code}", response_model=WorkflowStageResponse)
def update_workflow_stage(
    code: str = Path(...),
    payload: WorkflowStageUpdate = ...,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_roles(["system_admin"]))
):
    stage = db.query(WorkflowStage).filter(WorkflowStage.code == code).first()
    if not stage:
        raise NotFoundException(f"Stage {code} not found")
    
    if payload.name is not None:
        stage.name = payload.name
    if payload.sla_days is not None:
        stage.sla_days = payload.sla_days
    if payload.owner_role is not None:
        stage.owner_role = payload.owner_role
    if payload.next_stages is not None:
        stage.next_stages = payload.next_stages
    if payload.active is not None:
        stage.active = payload.active

    db.commit()
    db.refresh(stage)
    return WorkflowStageResponse.model_validate(stage)

@router.get("/escalation-rules", response_model=List[EscalationRuleSchema])
def get_escalation_rules(db: Session = Depends(get_db)):
    rules = db.query(EscalationRule).order_by(EscalationRule.level.asc()).all()
    return [EscalationRuleSchema.model_validate(r) for r in rules]

@router.get("/alert-rules", response_model=List[AlertRuleSchema])
def get_alert_rules(db: Session = Depends(get_db)):
    rules = db.query(AlertRule).all()
    return [AlertRuleSchema.model_validate(r) for r in rules]
