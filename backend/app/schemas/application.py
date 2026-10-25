from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, List, Literal
from datetime import datetime
from uuid import UUID

# Codes are upper-case words joined by underscores, e.g. EVC, RE_SCRUTINY, DEFICIENCY_FOUND.
CODE_PATTERN = r"^[A-Z][A-Z0-9_]{1,49}$"

Decision = Literal["APPROVED", "REJECTED", "APPROVED_WITH_CONDITIONS"]


class ApplicationBase(BaseModel):
    application_number: str
    region: str
    application_type: str = "EXTENSION_OF_APPROVAL"
    intake_requested: int = 60

class ApplicationCreate(BaseModel):
    application_number: str = Field(min_length=3, max_length=64, pattern=r"^[A-Za-z0-9][A-Za-z0-9._/-]*$")
    institution_id: UUID
    region: str = Field(min_length=2, max_length=50, pattern=CODE_PATTERN)
    application_type: str = Field(default="EXTENSION_OF_APPROVAL", pattern=CODE_PATTERN)
    intake_requested: int = Field(default=60, ge=0, le=10000)

class MoveStageRequest(BaseModel):
    to_stage: str = Field(pattern=CODE_PATTERN)
    notes: Optional[str] = Field(default=None, max_length=2000)
    outcome: Optional[str] = Field(default=None, pattern=CODE_PATTERN)
    decision: Optional[Decision] = None
    decision_remarks: Optional[str] = Field(default=None, max_length=2000)

class AssignOfficerRequest(BaseModel):
    officer_id: UUID

class HoldApplicationRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=1000)

    @field_validator("reason")
    @classmethod
    def _not_blank(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("reason must not be blank")
        return v

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
