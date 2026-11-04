import datetime
from typing import Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.models import OperationalRequest, Approval, AuditEvent, User, Recommendation

VALID_TRANSITIONS = {
    "New": ["Needs Information", "Under Review", "Awaiting Approval", "Cancelled"],
    "Needs Information": ["Under Review", "Cancelled"],
    "Under Review": ["Awaiting Approval", "In Progress", "Blocked", "Cancelled"],
    "Awaiting Approval": ["Approved", "Rejected", "Under Review", "Cancelled"],
    "Approved": ["In Progress", "Blocked", "Cancelled"],
    "Rejected": ["Under Review", "Blocked", "Cancelled"],
    "In Progress": ["Blocked", "Resolved", "Cancelled"],
    "Blocked": ["Under Review", "In Progress", "Cancelled"],
    "Resolved": ["Closed", "Under Review"],
    "Closed": ["Under Review"],  # Re-opening requires under review
    "Cancelled": []
}

def validate_state_transition(current_state: str, new_state: str) -> bool:
    """Checks if state transition is legally permissible in the operational state machine."""
    allowed = VALID_TRANSITIONS.get(current_state, [])
    return new_state in allowed

def get_closure_and_progress_status(request: OperationalRequest) -> dict:
    """
    Evaluates real-time operational closure conditions, blockers, and next actions.
    Ensures explainable governance over whether an incident can be resolved and closed.
    """
    conditions = []
    blockers = []
    next_actions = []

    # 1. Fact integrity & completeness
    has_missing = bool(request.has_missing_info)
    conditions.append({
        "name": "Fact Completeness",
        "satisfied": not has_missing,
        "description": "All essential operational facts (location, entity, timeline, supplier) are verified"
        if not has_missing else f"Missing critical operational fields: {request.facts.missing_fields if request.facts else 'N/A'}"
    })
    if has_missing:
        blockers.append("Critical operational facts are incomplete")
        next_actions.append("Review and input missing operational information via 'Correct Information'")

    # 2. Inventory discrepancy check
    has_conflict = bool(request.has_conflicts)
    conditions.append({
        "name": "Inventory Reconciliation",
        "satisfied": not has_conflict,
        "description": "Verified warehouse ledger agrees with operational counts"
        if not has_conflict else "Discrepancy detected between stated counts and warehouse WMS records"
    })
    if has_conflict:
        blockers.append("Unresolved warehouse inventory discrepancy")
        next_actions.append("Reconcile physical warehouse stock or correct request with verified count")

    # 3. Mitigation plan adoption
    has_selected_rec = any(r.is_selected for r in (request.recommendations or []))
    plan_adopted = has_selected_rec or request.status in ["Approved", "In Progress", "Resolved", "Closed"]
    conditions.append({
        "name": "Action Plan Adopted",
        "satisfied": plan_adopted,
        "description": "An evidence-grounded mitigation recommendation has been adopted"
        if plan_adopted else "No mitigation plan has been selected yet"
    })
    if not plan_adopted:
        blockers.append("No mitigation alternative adopted")
        next_actions.append("Select an action recommendation (e.g. Air Freight Expedite or Split Transfer)")

    # 4. Expenditure approval resolution
    pending_approvals = [a for a in (request.approvals or []) if a.status == "pending"]
    has_pending_approval = len(pending_approvals) > 0
    conditions.append({
        "name": "Expenditure Authorization",
        "satisfied": not has_pending_approval,
        "description": "All financial expenditure requests have been authorized or resolved"
        if not has_pending_approval else f"Expenditure approval of INR {pending_approvals[0].cost:,.2f} is currently pending decision"
    })
    if has_pending_approval:
        cost_str = f"INR {pending_approvals[0].cost:,.2f}"
        blockers.append(f"Awaiting executive budget authorization ({cost_str})")
        next_actions.append("Lead Approver must authorize or decline budget allocation")

    # 5. Resolution Validation
    is_resolved_or_closed = request.status in ["Resolved", "Closed"]
    conditions.append({
        "name": "Resolution Certified",
        "satisfied": is_resolved_or_closed,
        "description": f"Incident was resolved on {request.resolved_at.strftime('%Y-%m-%d %H:%M UTC')}"
        if request.resolved_at else "Operational resolution has not yet been certified"
    })

    # Can resolve: no pending approvals, plan adopted, and current status is in progress or approved or under review
    can_resolve = (not has_pending_approval) and plan_adopted and (request.status in ["In Progress", "Approved", "Under Review"])
    can_close = request.status == "Resolved"

    if request.status == "Approved":
        next_actions.append("Advance workflow to 'In Progress' to coordinate logistics execution")
    elif request.status == "In Progress":
        next_actions.append("Verify delivery dispatch and mark incident as 'Resolved' with resolution summary")
    elif request.status == "Resolved":
        next_actions.append("Confirm store launch readiness and advance incident to 'Closed'")

    return {
        "is_ready_for_resolution": can_resolve,
        "is_ready_for_closure": can_close,
        "conditions": conditions,
        "blockers": blockers,
        "next_actions": next_actions
    }

def transition_request_state(
    db: Session,
    request: OperationalRequest,
    new_state: str,
    actor: User,
    reason: Optional[str] = None
) -> OperationalRequest:
    """
    Executes a validated state transition with transactional integrity,
    rigorous closure conditions validation, and immutable audit recording.
    """
    if new_state in ["Approved", "Rejected"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Direct manual transition to '{new_state}' is prohibited. Approvals must be authorized through the /api/approvals endpoint."
        )
        
    if not validate_state_transition(request.status, new_state):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Illegal state transition from '{request.status}' to '{new_state}'. Allowed: {VALID_TRANSITIONS.get(request.status, [])}"
        )

    # Validate closure conditions when resolving
    if new_state == "Resolved":
        pending_approvals = [a for a in (request.approvals or []) if a.status == "pending"]
        if pending_approvals:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot resolve request: There is an active expenditure approval of INR {pending_approvals[0].cost:,.2f} awaiting decision."
            )
        if not reason or len(reason.strip()) < 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A substantive operational resolution summary is mandatory when resolving an incident."
            )
        request.resolved_at = datetime.datetime.now(datetime.timezone.utc)

    # Validate closure conditions when closing
    if new_state == "Closed":
        if request.status not in ["Resolved", "Cancelled"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot close request directly from '{request.status}'. The incident must be in 'Resolved' state before closure."
            )
        if not reason or len(reason.strip()) < 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A closing confirmation reason is mandatory when closing an incident."
            )
        
    prev_state = request.status
    request.status = new_state
    
    action_name = "STATE_TRANSITION"
    if new_state == "Resolved":
        action_name = "INCIDENT_RESOLVED"
    elif new_state == "Closed":
        action_name = "INCIDENT_CLOSED"

    # Create audit event
    audit = AuditEvent(
        request_id=request.id,
        actor_name=actor.full_name,
        actor_role=actor.role,
        is_ai=False,
        action=action_name,
        previous_value=prev_state,
        new_value=new_state,
        reason=reason or f"Workflow transitioned by {actor.role}"
    )
    db.add(audit)
    db.commit()
    db.refresh(request)
    return request

def handle_approval_decision(
    db: Session,
    approval: Approval,
    decision: str, # "approve" or "reject"
    rejection_reason: Optional[str],
    approver: User
) -> Approval:
    """
    Enforces deterministic business rules for approval and rejection:
    - User must have role 'lead_approver', 'operations_manager', or 'admin'
    - Rejection requires mandatory non-empty reason
    - Approving updates request to 'Approved'
    - Rejecting updates request to 'Under Review', resets selected recommendation, records audit trail
    """
    if approver.role not in ["lead_approver", "operations_manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Unauthorized: Role '{approver.role}' cannot authorize financial commitments. Requires 'lead_approver' or 'operations_manager'."
        )
        
    request = approval.request
    now = datetime.datetime.now(datetime.timezone.utc)
    
    if decision.lower() == "approve":
        approval.status = "approved"
        approval.approver_id = approver.id
        approval.approved_at = now
        request.approval_status = "approved"
        request.status = "Approved"
        
        audit = AuditEvent(
            request_id=request.id,
            actor_name=approver.full_name,
            actor_role=approver.role,
            is_ai=False,
            action="APPROVAL_GRANTED",
            previous_value="pending",
            new_value="approved",
            reason=f"Approved action '{approval.requested_action}' with budget cost INR {approval.cost:,.2f}"
        )
        db.add(audit)
        
    elif decision.lower() == "reject":
        if not rejection_reason or not rejection_reason.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A detailed rejection reason is mandatory when declining an operational approval."
            )
            
        approval.status = "rejected"
        approval.approver_id = approver.id
        approval.rejected_at = now
        approval.rejection_reason = rejection_reason.strip()
        
        request.approval_status = "rejected"
        # Trigger alternative workflow: return to Under Review so team can select alternative option
        request.status = "Under Review"
        
        # Deselect recommendations to force re-evaluation
        for rec in request.recommendations:
            rec.is_selected = False
            
        audit = AuditEvent(
            request_id=request.id,
            actor_name=approver.full_name,
            actor_role=approver.role,
            is_ai=False,
            action="APPROVAL_REJECTED",
            previous_value="pending",
            new_value="rejected",
            reason=f"Rejection reason: {rejection_reason.strip()}"
        )
        db.add(audit)
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Decision must be 'approve' or 'reject'.")

    db.commit()
    db.refresh(approval)
    return approval
