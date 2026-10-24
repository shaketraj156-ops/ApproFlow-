from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from uuid import UUID

class ApplicationBase(BaseModel):
    application_number: str
    region: str
    application_type: str = "EXTENSION_OF_APPROVAL"
    intake_requested: int = 60

class ApplicationCreate(ApplicationBase):
    institution_id: UUID

class MoveStageRequest(BaseModel):
    to_stage: str
    notes: Optional[str] = None
    outcome: Optional[str] = None
    decision: Optional[str] = None
    decision_remarks: Optional[str] = None

class AssignOfficerRequest(BaseModel):
    officer_id: UUID

class HoldApplicationRequest(BaseModel):
    reason: str

class StageHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    stage_code: str
    owner_id: Optional[UUID] = None
    entered_at: datetime
    due_at: datetime
    exited_at: Optional[datetime] = None
    outcome: Optional[str] = None
    notes: Optional[str] = None

class ApplicationResponse(ApplicationBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    institution_id: UUID
    current_stage_code: str
    owner_id: Optional[UUID] = None
    priority_score: float
    deficiency_count: int
    is_on_hold: bool
    hold_reason: Optional[str] = None
    decision: Optional[str] = None
    decision_date: Optional[datetime] = None
    decision_remarks: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    days_left: Optional[int] = None
    delay_risk_score: Optional[float] = None

class PaginatedApplicationsResponse(BaseModel):
    items: List[ApplicationResponse]
    total: int
    page: int
    page_size: int
    pages: int
