from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import date, datetime
from uuid import UUID

class ExpertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    name: str
    email: str
    phone: Optional[str] = None
    domain: str
    region: str
    active: bool
    current_load: int

class EvcSuggestionRequest(BaseModel):
    application_id: UUID
    target_date: date
    committee_size: int = 3

class EvcProposalResponse(BaseModel):
    scheduled_date: date
    experts: List[ExpertResponse]
    clash_detected: bool = False

class EvcCreateRequest(BaseModel):
    application_id: UUID
    scheduled_date: date
    expert_ids: List[UUID]
    lead_expert_id: Optional[UUID] = None
    remarks: Optional[str] = None

class EvcVisitResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    application_id: UUID
    scheduled_date: date
    status: str
    remarks: Optional[str] = None
    created_at: datetime
