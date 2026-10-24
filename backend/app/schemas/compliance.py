from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import date, datetime
from uuid import UUID

class UndertakingCreate(BaseModel):
    application_id: UUID
    title: str
    description: Optional[str] = None
    due_date: date

class UndertakingSubmit(BaseModel):
    document_path: str
    remarks: Optional[str] = None

class UndertakingVerify(BaseModel):
    decision: str  # VERIFIED, REJECTED
    remarks: Optional[str] = None

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
    title: str
    document_type: str
    valid_from: date
    valid_until: date
    storage_path: Optional[str] = None

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
