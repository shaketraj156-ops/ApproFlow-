from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text, DateTime, ForeignKey, Date, JSON, Numeric, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.models.base import Base

class Institution(Base):
    __tablename__ = "institutions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    region = Column(String(50), nullable=False)
    address = Column(Text, nullable=True)
    contact_email = Column(String(255), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    applications = relationship("Application", back_populates="institution")
    documents = relationship("ComplianceDocument", back_populates="institution")

class Profile(Base):
    __tablename__ = "profiles"

    id = Column(UUID(as_uuid=True), primary_key=True)
    email = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="institution_staff")
    officer_level = Column(String(50), nullable=True)
    region = Column(String(50), nullable=True)
    institution_id = Column(UUID(as_uuid=True), ForeignKey("institutions.id"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

class WorkflowStage(Base):
    __tablename__ = "workflow_stages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    sequence_order = Column(Integer, nullable=False)
    sla_days = Column(Integer, nullable=False, default=7)
    owner_role = Column(String(50), nullable=False)
    next_stages = Column(JSONB, nullable=False, default=list)
    is_terminal = Column(Boolean, default=False)
    requires_decision = Column(Boolean, default=False)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow)

class Application(Base):
    __tablename__ = "applications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_number = Column(String(64), unique=True, nullable=False)
    institution_id = Column(UUID(as_uuid=True), ForeignKey("institutions.id"), nullable=False)
    region = Column(String(50), nullable=False)
    application_type = Column(String(50), nullable=False, default="EXTENSION_OF_APPROVAL")
    current_stage_code = Column(String(50), ForeignKey("workflow_stages.code"), nullable=False)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=True)
    priority_score = Column(Numeric(5, 2), default=0.00, nullable=False)
    deficiency_count = Column(Integer, default=0, nullable=False)
    intake_requested = Column(Integer, default=60, nullable=False)
    is_on_hold = Column(Boolean, default=False, nullable=False)
    hold_reason = Column(Text, nullable=True)
    decision = Column(String(50), nullable=True)
    decision_date = Column(DateTime(timezone=True), nullable=True)
    decision_remarks = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    institution = relationship("Institution", back_populates="applications")
    history = relationship("ApplicationStageHistory", back_populates="application", order_by="ApplicationStageHistory.entered_at")
    evc_visits = relationship("EvcVisit", back_populates="application")
    undertakings = relationship("Undertaking", back_populates="application")

class ApplicationStageHistory(Base):
    __tablename__ = "application_stage_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id = Column(UUID(as_uuid=True), ForeignKey("applications.id"), nullable=False)
    stage_code = Column(String(50), ForeignKey("workflow_stages.code"), nullable=False)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=True)
    entered_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    due_at = Column(DateTime(timezone=True), nullable=False)
    exited_at = Column(DateTime(timezone=True), nullable=True)
    outcome = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    application = relationship("Application", back_populates="history")

class Expert(Base):
    __tablename__ = "experts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    phone = Column(String(50), nullable=True)
    domain = Column(String(100), nullable=False)
    region = Column(String(50), nullable=False)
    active = Column(Boolean, default=True, nullable=False)
    max_visits_per_cycle = Column(Integer, default=5, nullable=False)
    current_load = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

class ExpertUnavailability(Base):
    __tablename__ = "expert_unavailability"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    expert_id = Column(UUID(as_uuid=True), ForeignKey("experts.id"), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

class EvcVisit(Base):
    __tablename__ = "evc_visits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id = Column(UUID(as_uuid=True), ForeignKey("applications.id"), nullable=False)
    scheduled_date = Column(Date, nullable=False)
    status = Column(String(50), default="PROPOSED", nullable=False)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    application = relationship("Application", back_populates="evc_visits")
    experts = relationship("EvcVisitExpert", back_populates="visit")

class EvcVisitExpert(Base):
    __tablename__ = "evc_visit_experts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    evc_visit_id = Column(UUID(as_uuid=True), ForeignKey("evc_visits.id"), nullable=False)
    expert_id = Column(UUID(as_uuid=True), ForeignKey("experts.id"), nullable=False)
    is_lead = Column(Boolean, default=False, nullable=False)
    confirmed = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    visit = relationship("EvcVisit", back_populates="experts")
    expert = relationship("Expert")

class Undertaking(Base):
    __tablename__ = "undertakings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id = Column(UUID(as_uuid=True), ForeignKey("applications.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(Date, nullable=False)
    status = Column(String(50), default="PENDING", nullable=False)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    verified_by = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=True)
    document_path = Column(Text, nullable=True)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    application = relationship("Application", back_populates="undertakings")

class ComplianceDocument(Base):
    __tablename__ = "compliance_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    institution_id = Column(UUID(as_uuid=True), ForeignKey("institutions.id"), nullable=False)
    application_id = Column(UUID(as_uuid=True), ForeignKey("applications.id"), nullable=True)
    title = Column(String(255), nullable=False)
    document_type = Column(String(100), nullable=False)
    valid_from = Column(Date, nullable=False)
    valid_until = Column(Date, nullable=False)
    status = Column(String(50), default="VALID", nullable=False)
    storage_path = Column(Text, nullable=True)
    verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    institution = relationship("Institution", back_populates="documents")

class AlertRule(Base):
    __tablename__ = "alert_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    entity_type = Column(String(50), nullable=False)
    offsets_days = Column(ARRAY(Integer), nullable=False, default=[7, 3, 1])
    active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

class EscalationRule(Base):
    __tablename__ = "escalation_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    level = Column(Integer, unique=True, nullable=False)
    overdue_days = Column(Integer, nullable=False)
    target_role = Column(String(50), nullable=False)
    active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dedupe_key = Column(String(255), unique=True, nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(UUID(as_uuid=True), nullable=False)
    rule_code = Column(String(50), nullable=False)
    severity = Column(String(20), default="MEDIUM", nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    recipient_role = Column(String(50), nullable=False)
    recipient_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=True)
    region = Column(String(50), nullable=True)
    status = Column(String(50), default="OPEN", nullable=False)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    acknowledged_by = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(UUID(as_uuid=True), nullable=False)
    action = Column(String(50), nullable=False)
    actor_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=True)
    actor_role = Column(String(50), nullable=True)
    old_state = Column(JSONB, nullable=True)
    new_state = Column(JSONB, nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
