from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional
from uuid import UUID

class WorkflowStageBase(BaseModel):
    code: str
    name: str
    sequence_order: int
    sla_days: int
    owner_role: str
    next_stages: List[str]
    is_terminal: bool = False
    requires_decision: bool = False
    active: bool = True

class WorkflowStageUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=100)
    sla_days: Optional[int] = Field(default=None, ge=0, le=365)
    owner_role: Optional[str] = Field(default=None, min_length=2, max_length=50)
    next_stages: Optional[List[str]] = Field(default=None, max_length=20)
    active: Optional[bool] = None

class WorkflowStageResponse(WorkflowStageBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID

class EscalationRuleSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: Optional[UUID] = None
    level: int
    overdue_days: int
    target_role: str
    active: bool = True

class AlertRuleSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: Optional[UUID] = None
    code: str
    name: str
    entity_type: str
    offsets_days: List[int]
    active: bool = True
