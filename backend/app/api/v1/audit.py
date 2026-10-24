from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from uuid import UUID

from app.models.base import get_db
from app.models.entities import AuditLog
from app.core.security import CurrentUser, get_current_user
from app.core.permissions import require_roles

router = APIRouter(prefix="/audit-logs", tags=["Audit Trail"])

@router.get("")
def list_audit_logs(
    entity_type: Optional[str] = None,
    entity_id: Optional[UUID] = None,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_roles(["aicte_officer", "auditor", "system_admin"]))
) -> List[Dict[str, Any]]:
    query = db.query(AuditLog)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if entity_id:
        query = query.filter(AuditLog.entity_id == entity_id)

    logs = query.order_by(AuditLog.created_at.desc()).limit(limit).all()
    return [
        {
            "id": str(log.id),
            "entity_type": log.entity_type,
            "entity_id": str(log.entity_id),
            "action": log.action,
            "actor_id": str(log.actor_id) if log.actor_id else None,
            "actor_role": log.actor_role,
            "old_state": log.old_state,
            "new_state": log.new_state,
            "ip_address": log.ip_address,
            "created_at": log.created_at.isoformat()
        } for log in logs
    ]
