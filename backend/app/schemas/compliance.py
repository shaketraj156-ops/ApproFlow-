from pydantic import BaseModel, ConfigDict, Field, model_validator
from typing import Optional, Literal
from datetime import date, datetime
from uuid import UUID

class UndertakingCreate(BaseModel):
    application_id: UUID
    title: str = Field(min_length=3, max_length=255)
    description: Optional[str] = Field(default=None, max_length=4000)
    due_date: date

class UndertakingSubmit(BaseModel):
    document_path: str = Field(min_length=1, max_length=1024)
    remarks: Optional[str] = Field(default=None, max_length=2000)

class UndertakingVerify(BaseModel):
    decision: Literal["VERIFIED", "REJECTED"]
    remarks: Optional[str] = Field(default=None, max_length=2000)

class UndertakingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    application_id: UUID
    title: str
    description: Optional[str] = None
    due_date: date
    status: str
    submitted_at: Optional[datetime] = None
    verified_at: Optional[datetime] = None
    verified_by: Optional[UUID] = None
    document_path: Optional[str] = None
    remarks: Optional[str] = None
    created_at: datetime

class ComplianceDocumentCreate(BaseModel):
    institution_id: UUID
    application_id: Optional[UUID] = None
    title: str = Field(min_length=3, max_length=255)
    document_type: str = Field(min_length=2, max_length=100)
    valid_from: date
    valid_until: date
    storage_path: Optional[str] = Field(default=None, max_length=1024)

    @model_validator(mode="after")
    def _validity_window(self):
        if self.valid_until < self.valid_from:
            raise ValueError("valid_until must not be earlier than valid_from")
        return self

class ComplianceDocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    institution_id: UUID
    application_id: Optional[UUID] = None
    title: str
    document_type: str
    valid_from: date
    valid_until: date
    status: str
    storage_path: Optional[str] = None
    verified: bool
    created_at: datetime
