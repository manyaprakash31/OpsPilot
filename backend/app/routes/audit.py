from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import AuditEvent, User
from app.schemas.schemas import AuditEventResponse
from app.auth.deps import get_current_user

router = APIRouter(prefix="/audit", tags=["Audit Trail"])

@router.get("", response_model=List[AuditEventResponse])
def get_audit_trail(
    request_id: Optional[int] = None,
    is_ai: Optional[bool] = None,
    action: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns immutable audit events tracking all consequential AI extractions,
    human corrections, state transitions, and approvals.
    """
    query = db.query(AuditEvent)
    if request_id is not None:
        query = query.filter(AuditEvent.request_id == request_id)
    if is_ai is not None:
        query = query.filter(AuditEvent.is_ai == is_ai)
    if action:
        query = query.filter(AuditEvent.action == action)
        
    events = query.order_by(AuditEvent.created_at.desc()).limit(limit).all()
    return events
