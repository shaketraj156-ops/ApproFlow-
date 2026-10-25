from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.core.clock import utcnow
from app.models.base import get_db
from app.models.entities import ComplianceDocument
from app.schemas.compliance import ComplianceDocumentCreate, ComplianceDocumentResponse
from app.core.exceptions import NotFoundException, ForbiddenException
from app.core.security import CurrentUser, get_current_user

router = APIRouter(prefix="/compliance-documents", tags=["Compliance Documents"])

INSTITUTION_ROLES = ("institution_admin", "institution_staff")

@router.get("", response_model=List[ComplianceDocumentResponse])
def list_compliance_documents(
    institution_id: Optional[UUID] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    query = db.query(ComplianceDocument)
    if current_user.role in INSTITUTION_ROLES:
        # Institutions only ever see their own documents, whatever filter they send.
        institution_id = current_user.institution_id
    if institution_id:
        query = query.filter(ComplianceDocument.institution_id == institution_id)
    if status:
        query = query.filter(ComplianceDocument.status == status)
    
    docs = query.order_by(ComplianceDocument.valid_until.asc()).all()
    return [ComplianceDocumentResponse.model_validate(d) for d in docs]

@router.post("", response_model=ComplianceDocumentResponse)
def add_compliance_document(
    payload: ComplianceDocumentCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    if current_user.role in INSTITUTION_ROLES:
        if str(payload.institution_id) != str(current_user.institution_id):
            raise ForbiddenException("Cannot add documents for another institution")
    elif current_user.role not in ("aicte_officer", "system_admin"):
        raise ForbiddenException("Role is not authorized to add compliance documents")
    doc = ComplianceDocument(
        institution_id=payload.institution_id,
        application_id=payload.application_id,
        title=payload.title,
        document_type=payload.document_type,
        valid_from=payload.valid_from,
        valid_until=payload.valid_until,
        storage_path=payload.storage_path,
        status="VALID",
        created_at=utcnow()
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return ComplianceDocumentResponse.model_validate(doc)
