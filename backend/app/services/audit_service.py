from sqlalchemy.orm import Session
from typing import Any, Dict, Optional
from uuid import UUID
from datetime import datetime
from app.models.entities import AuditLog

def record_audit_log(
    db: Session,
    entity_type: str,
    entity_id: UUID,
    action: str,
    actor_id: Optional[UUID] = None,
    actor_role: Optional[str] = None,
    old_state: Optional[Dict[str, Any]] = None,
    new_state: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None
) -> AuditLog:
    log_entry = AuditLog(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        actor_id=actor_id,
        actor_role=actor_role,
        old_state=old_state,
        new_state=new_state,
        ip_address=ip_address,
        created_at=datetime.utcnow()
    )
    db.add(log_entry)
    return log_entry
