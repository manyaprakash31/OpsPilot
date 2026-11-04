import datetime
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import OperationalRequest, Approval, User
from app.schemas.schemas import DashboardStats, OperationalRequestSummary, ManagementSummary
from app.auth.deps import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Operational Dashboard"])

@router.get("/metrics", response_model=DashboardStats)
def get_dashboard_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns actual operational metrics derived strictly from persisted database records.
    Never uses hardcoded or placeholder metrics.
    """
    total = db.query(OperationalRequest).count()
    pending_appr = db.query(Approval).filter(Approval.status == "pending").count()
    high_risk = db.query(OperationalRequest).filter(
        OperationalRequest.priority.in_(["critical", "high"]),
        OperationalRequest.status.notin_(["Closed", "Resolved", "Cancelled"])
    ).count()
    overdue = db.query(OperationalRequest).filter(
        OperationalRequest.status.in_(["Blocked", "Needs Information"])
    ).count()
    in_prog = db.query(OperationalRequest).filter(OperationalRequest.status == "In Progress").count()
    resolved = db.query(OperationalRequest).filter(OperationalRequest.status.in_(["Resolved", "Closed"])).count()
    blocked = db.query(OperationalRequest).filter(OperationalRequest.status == "Blocked").count()

    return DashboardStats(
        total_requests=total,
        pending_approvals=pending_appr,
        overdue_requests=overdue,
        high_risk_requests=high_risk,
        in_progress_count=in_prog,
        resolved_count=resolved,
        blocked_count=blocked
    )

@router.get("/queue", response_model=List[OperationalRequestSummary])
def get_prioritized_queue(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns prioritized operational queue: active incidents requiring immediate operator attention,
    ordered by critical severity, awaiting approvals, and conflicts.
    """
    requests = db.query(OperationalRequest).filter(
        OperationalRequest.status.notin_(["Closed", "Cancelled"])
    ).order_by(
        OperationalRequest.priority == "critical",
        OperationalRequest.requires_approval.desc(),
        OperationalRequest.has_conflicts.desc(),
        OperationalRequest.created_at.desc()
    ).limit(20).all()
    
    return requests

@router.get("/management-summary", response_model=ManagementSummary)
def get_management_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generates an executive operational briefing across all active requests,
    summarizing capital commitments, critical store launches, and required leadership actions.
    """
    active_requests = db.query(OperationalRequest).filter(
        OperationalRequest.status.notin_(["Closed", "Cancelled"])
    ).all()

    total_active = len(active_requests)
    critical_count = sum(1 for r in active_requests if r.priority in ["critical", "high"])
    
    pending_approvals = db.query(Approval).filter(Approval.status == "pending").all()
    pending_expenditure = sum(a.cost for a in pending_approvals)

    high_risk_sites = list(set(
        r.facts.location for r in active_requests 
        if r.facts and r.facts.location and r.priority in ["critical", "high"]
    ))

    immediate_actions = []
    for appr in pending_approvals:
        immediate_actions.append(f"Authorize budget of INR {appr.cost:,.2f} for {appr.requested_action} ({appr.request.request_code})")
    
    for r in active_requests:
        if r.has_missing_info:
            immediate_actions.append(f"Operator follow-up needed for missing data on {r.request_code} ({r.title})")

    brief = (
        f"OpsPilot Executive Operations Briefing: {total_active} active incident(s) across operations, "
        f"with {critical_count} classified as high/critical priority. Total pending emergency capital allocation "
        f"stands at INR {pending_expenditure:,.2f} across {len(pending_approvals)} pending decision(s). "
        f"Key impacted facilities: {', '.join(high_risk_sites) if high_risk_sites else 'None'}."
    )

    return ManagementSummary(
        executive_brief=brief,
        total_active_incidents=total_active,
        critical_incidents=critical_count,
        pending_expenditure_total=pending_expenditure,
        high_risk_sites=high_risk_sites,
        immediate_action_items=immediate_actions[:5],
        generated_at=datetime.datetime.now(datetime.timezone.utc)
    )
