from pydantic import BaseModel, ConfigDict, Field, model_validator
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
    committee_size: int = Field(default=3, ge=1, le=10)

class EvcProposalResponse(BaseModel):
    scheduled_date: date
    experts: List[ExpertResponse]
    clash_detected: bool = False

class EvcCreateRequest(BaseModel):
    application_id: UUID
    scheduled_date: date
    expert_ids: List[UUID] = Field(min_length=1, max_length=10)
    lead_expert_id: Optional[UUID] = None
    remarks: Optional[str] = Field(default=None, max_length=2000)

    @model_validator(mode="after")
    def _experts_consistent(self):
        if len(set(self.expert_ids)) != len(self.expert_ids):
            raise ValueError("expert_ids must not contain duplicates")
        if self.lead_expert_id and self.lead_expert_id not in self.expert_ids:
            raise ValueError("lead_expert_id must be one of expert_ids")
        return self

class EvcRescheduleRequest(BaseModel):
    scheduled_date: date
    remarks: Optional[str] = Field(default=None, max_length=2000)

class EvcCancelRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=1000)

class EvcVisitResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    application_id: UUID
    scheduled_date: date
    status: str
    remarks: Optional[str] = None
    created_at: datetime
