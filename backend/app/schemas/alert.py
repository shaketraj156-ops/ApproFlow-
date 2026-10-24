from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from uuid import UUID

class AlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    dedupe_key: str
    entity_type: str
    entity_id: UUID
    rule_code: str
    severity: str
    title: str
    message: str
    recipient_role: str
    recipient_id: Optional[UUID] = None
    region: Optional[str] = None
    status: str
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime

class AlertSummary(BaseModel):
    open_count: int
    critical_count: int
    acknowledged_count: int
    total_active: int
