from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Approval, OperationalRequest, User, AuditEvent
from app.schemas.schemas import ApprovalResponse, ApprovalDecisionRequest, ApprovalEscalateRequest
from app.auth.deps import get_current_user, require_role
from app.agents.workflow_engine import handle_approval_decision

router = APIRouter(prefix="/approvals", tags=["Approvals Workflow"])

@router.get("", response_model=List[ApprovalResponse])
def list_approvals(
    status_filter: Optional[str] = "pending",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lists approval requests. Default to 'pending' queue for operations managers and approvers.
    """
    query = db.query(Approval)
    if status_filter:
        query = query.filter(Approval.status == status_filter)
    approvals = query.order_by(Approval.created_at.desc()).all()
    return approvals

@router.post("/{approval_id}/decision", response_model=ApprovalResponse)
def decide_approval(
    approval_id: int,
    decision_in: ApprovalDecisionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Authorizes or rejects an expenditure request.
    Restricted to Lead Approver, Operations Manager, or Admin.
    Rejections trigger alternative workflow back to 'Under Review' and require non-empty explanation.
    """
    approval = db.query(Approval).filter(Approval.id == approval_id).first()
    if not approval:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Approval request not found")

    if approval.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Approval has already been resolved with status '{approval.status}'."
        )

    updated_approval = handle_approval_decision(
        db=db,
        approval=approval,
        decision=decision_in.action,
        rejection_reason=decision_in.rejection_reason,
        approver=current_user
    )
    return updated_approval

@router.post("/{approval_id}/escalate", response_model=ApprovalResponse)
def escalate_approval(
    approval_id: int,
    body: ApprovalEscalateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Escalates a pending approval approaching SLA/deadline to executive leadership.
    Elevates request priority to critical and records an immutable audit event.
    """
    approval = db.query(Approval).filter(Approval.id == approval_id).first()
    if not approval:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Approval request not found")

    if approval.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot escalate approval with status '{approval.status}'. Only pending approvals can be escalated."
        )

    reason = body.escalation_reason.strip()
    if not reason:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A substantive escalation reason is mandatory.")

    # Update parent request priority to critical and append evidence
    request = approval.request
    request.priority = "critical"
    approval.evidence_summary = f"[ESCALATED by {current_user.full_name} ({current_user.role})]: {reason} | {approval.evidence_summary}"

    audit = AuditEvent(
        request_id=request.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        is_ai=False,
        action="APPROVAL_ESCALATED",
        previous_value="normal_pending",
        new_value=f"ESCALATED_CRITICAL: INR {approval.cost:,.2f}",
        reason=reason
    )
    db.add(audit)
    db.commit()
    db.refresh(approval)
    return approval
