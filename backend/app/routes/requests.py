import json
import datetime
from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import (
    User,
    OperationalRequest,
    ExtractedFacts,
    RiskAssessment,
    Recommendation,
    Approval,
    AuditEvent,
    Clarification,
    CommunicationDraft
)
from app.schemas.schemas import (
    RequestCreateManual,
    RequestCreateEmail,
    OperationalRequestSummary,
    OperationalRequestDetail,
    FactCorrectionRequest,
    StateTransitionRequest,
    ClarificationCreate,
    ClarificationResponse,
    ClosureValidationResult,
    UncertaintyBreakdown
)
from app.auth.deps import get_current_user
from app.agents.intake_agent import process_intake
from app.agents.risk_agent import assess_risk
from app.agents.recommendation_agent import generate_recommendations
from app.agents.communication_agent import draft_communications
from app.agents.workflow_engine import transition_request_state, get_closure_and_progress_status
from app.agents.validator import check_inventory_discrepancy, calculate_objective_confidence, explain_uncertainty

router = APIRouter(prefix="/requests", tags=["Operational Requests"])

def _generate_request_code(db: Session) -> str:
    count = db.query(OperationalRequest).count() + 1
    year = datetime.datetime.now(datetime.timezone.utc).year
    return f"REQ-{year}-{count:03d}"

def _format_detail_response(req: OperationalRequest) -> OperationalRequestDetail:
    """Helper to convert database request entity to full detail response with JSON deserialization."""
    facts_data = None
    if req.facts:
        facts_data = {
            "id": req.facts.id,
            "request_id": req.facts.request_id,
            "issue_type": req.facts.issue_type,
            "location": req.facts.location,
            "target_entity": req.facts.target_entity,
            "requested_quantity": req.facts.requested_quantity,
            "available_quantity": req.facts.available_quantity,
            "delay_days": req.facts.delay_days,
            "deadline": req.facts.deadline,
            "supplier_name": req.facts.supplier_name,
            "estimated_cost": req.facts.estimated_cost,
            "dependencies": json.loads(req.facts.dependencies or "[]"),
            "missing_fields": json.loads(req.facts.missing_fields or "[]"),
            "source_spans": json.loads(req.facts.source_spans or "{}"),
            "conflict_details": json.loads(req.facts.conflict_details or "{}"),
            "confidence_score": req.facts.confidence_score,
            "is_corrected": req.facts.is_corrected,
            "created_at": req.facts.created_at,
            "updated_at": req.facts.updated_at
        }
        
    risk_data = None
    if req.risk:
        risk_data = {
            "id": req.risk.id,
            "request_id": req.risk.request_id,
            "risk_level": req.risk.risk_level,
            "severity_score": req.risk.severity_score,
            "operational_impact": req.risk.operational_impact,
            "financial_impact": req.risk.financial_impact,
            "schedule_delay_days": req.risk.schedule_delay_days,
            "deadline_urgency": req.risk.deadline_urgency,
            "supporting_evidence": json.loads(req.risk.supporting_evidence or "[]"),
            "created_at": req.risk.created_at
        }
        
    recs_data = []
    for r in req.recommendations:
        recs_data.append({
            "id": r.id,
            "request_id": r.request_id,
            "action_key": r.action_key,
            "title": r.title,
            "description": r.description,
            "feasibility": r.feasibility,
            "estimated_cost": r.estimated_cost,
            "pros": json.loads(r.pros or "[]"),
            "cons": json.loads(r.cons or "[]"),
            "trade_offs": r.trade_offs,
            "required_approvals": json.loads(r.required_approvals or "[]"),
            "is_selected": r.is_selected,
            "created_at": r.created_at
        })
        
    closure_data = get_closure_and_progress_status(req)

    uncertainty_data = None
    if req.facts:
        facts_for_calc = {
            "location": req.facts.location,
            "target_entity": req.facts.target_entity,
            "delay_days": req.facts.delay_days,
            "deadline": req.facts.deadline,
            "supplier_name": req.facts.supplier_name,
            "requested_quantity": req.facts.requested_quantity,
            "available_quantity": req.facts.available_quantity
        }
        missing_list = json.loads(req.facts.missing_fields or "[]")
        uncertainty_data = explain_uncertainty(facts_for_calc, req.has_conflicts, missing_list)

    return OperationalRequestDetail(
        id=req.id,
        request_code=req.request_code,
        title=req.title,
        raw_content=req.raw_content,
        intake_source=req.intake_source,
        request_type=req.request_type,
        status=req.status,
        priority=req.priority,
        has_conflicts=req.has_conflicts,
        has_missing_info=req.has_missing_info,
        is_duplicate=req.is_duplicate,
        duplicate_of_id=req.duplicate_of_id,
        requires_approval=req.requires_approval,
        approval_status=req.approval_status,
        created_at=req.created_at,
        updated_at=req.updated_at,
        created_by=req.created_by,
        facts=facts_data,
        risk=risk_data,
        recommendations=recs_data,
        approvals=req.approvals,
        audit_events=req.audit_events,
        clarifications=req.clarifications,
        communication_drafts=req.communication_drafts,
        closure_validation=closure_data,
        uncertainty_breakdown=uncertainty_data
    )

@router.get("", response_model=List[OperationalRequestSummary])
def list_requests(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    request_type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves operational requests filtered by query parameters."""
    query = db.query(OperationalRequest)
    
    if status:
        query = query.filter(OperationalRequest.status == status)
    if priority:
        query = query.filter(OperationalRequest.priority == priority)
    if request_type:
        query = query.filter(OperationalRequest.request_type == request_type)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (OperationalRequest.title.ilike(search_filter)) |
            (OperationalRequest.request_code.ilike(search_filter)) |
            (OperationalRequest.raw_content.ilike(search_filter))
        )
        
    requests = query.order_by(OperationalRequest.created_at.desc()).all()
    return requests

@router.get("/{request_id}", response_model=OperationalRequestDetail)
def get_request_detail(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves full request details including facts, risk, recommendations, approvals, and audit trail."""
    req = db.query(OperationalRequest).filter(OperationalRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    return _format_detail_response(req)

@router.post("/manual", response_model=OperationalRequestDetail)
def create_manual_request(
    request_in: RequestCreateManual,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submits a manual operational request and coordinates bounded agents."""
    return _execute_intake_pipeline(
        db=db,
        title=request_in.title,
        raw_content=request_in.raw_content,
        intake_source="manual",
        request_type=request_in.request_type,
        priority=request_in.priority,
        current_user=current_user
    )

@router.post("/email", response_model=OperationalRequestDetail)
def create_email_request(
    email_in: RequestCreateEmail,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Intakes an operational request from raw email content and coordinates bounded agents."""
    raw_text = f"From: {email_in.sender}\nSubject: {email_in.subject}\n\n{email_in.body}"
    return _execute_intake_pipeline(
        db=db,
        title=email_in.subject,
        raw_content=raw_text,
        intake_source="email",
        request_type="delayed_delivery",
        priority="high",
        current_user=current_user
    )

def _execute_intake_pipeline(
    db: Session,
    title: str,
    raw_content: str,
    intake_source: str,
    request_type: str,
    priority: str,
    current_user: User
) -> OperationalRequestDetail:
    # 1. Run Intake Agent
    intake_result = process_intake(db, raw_content=raw_content, source=intake_source)
    facts_dict = intake_result["extracted_facts"]
    val_signals = intake_result["validation_signals"]

    # 2. Run Risk Agent
    risk_dict = assess_risk(facts_dict, val_signals)
    effective_priority = risk_dict["risk_level"]

    # 3. Create OperationalRequest record
    request_code = _generate_request_code(db)
    
    # Initial status
    initial_status = "New"
    if val_signals["has_missing_info"]:
        initial_status = "Needs Information"
    if val_signals["is_duplicate"]:
        # Prevent spawning redundant active incidents in queues while preserving audit record
        initial_status = "Cancelled"
        
    req = OperationalRequest(
        request_code=request_code,
        title=title,
        description=facts_dict.get("target_entity", title),
        raw_content=raw_content,
        intake_source=intake_source,
        request_type=facts_dict.get("issue_type", request_type),
        status=initial_status,
        priority=effective_priority,
        created_by_id=current_user.id,
        has_conflicts=val_signals["has_conflicts"],
        has_missing_info=val_signals["has_missing_info"],
        is_duplicate=val_signals["is_duplicate"],
        duplicate_of_id=val_signals["duplicate_of_id"],
        requires_approval=False
    )
    db.add(req)
    db.flush() # populate req.id

    # 4. Save ExtractedFacts
    facts = ExtractedFacts(
        request_id=req.id,
        issue_type=facts_dict.get("issue_type", "delayed_delivery"),
        location=facts_dict.get("location"),
        target_entity=facts_dict.get("target_entity"),
        requested_quantity=facts_dict.get("requested_quantity"),
        available_quantity=facts_dict.get("available_quantity"),
        delay_days=facts_dict.get("delay_days"),
        deadline=facts_dict.get("deadline"),
        supplier_name=facts_dict.get("supplier_name"),
        dependencies=facts_dict.get("dependencies"),
        missing_fields=facts_dict.get("missing_fields"),
        source_spans=facts_dict.get("source_spans"),
        conflict_details=facts_dict.get("conflict_details"),
        confidence_score=facts_dict.get("confidence_score", 0.0),
        is_corrected=False
    )
    db.add(facts)

    # 5. Save RiskAssessment
    risk = RiskAssessment(
        request_id=req.id,
        risk_level=risk_dict["risk_level"],
        severity_score=risk_dict["severity_score"],
        operational_impact=risk_dict["operational_impact"],
        financial_impact=risk_dict["financial_impact"],
        schedule_delay_days=risk_dict["schedule_delay_days"],
        deadline_urgency=risk_dict["deadline_urgency"],
        supporting_evidence=risk_dict["supporting_evidence"]
    )
    db.add(risk)

    # 6. Generate and save recommendations
    recs_list = generate_recommendations(facts_dict, risk_dict)
    for r in recs_list:
        rec_obj = Recommendation(
            request_id=req.id,
            action_key=r["action_key"],
            title=r["title"],
            description=r["description"],
            feasibility=r["feasibility"],
            estimated_cost=r["estimated_cost"],
            pros=r["pros"],
            cons=r["cons"],
            trade_offs=r["trade_offs"],
            required_approvals=r["required_approvals"],
            is_selected=False
        )
        db.add(rec_obj)

    # 7. Generate Communication Drafts
    drafts = draft_communications(req)
    for d in drafts:
        draft_obj = CommunicationDraft(
            request_id=req.id,
            draft_type=d["draft_type"],
            recipient=d["recipient"],
            subject=d["subject"],
            body=d["body"],
            status="draft"
        )
        db.add(draft_obj)

    # 8. Record initial intake audit events
    audit_intake = AuditEvent(
        request_id=req.id,
        actor_name="OpsPilot Intake Agent",
        actor_role="AI_AGENT",
        is_ai=True,
        action="INTAKE_FACTS_EXTRACTED",
        previous_value=None,
        new_value=f"Extracted {facts_dict.get('target_entity')} at {facts_dict.get('location')} (Confidence: {facts_dict.get('confidence_score')})",
        reason="Automated intake parsing and evidence extraction"
    )
    db.add(audit_intake)

    if val_signals["is_suspicious_prompt"]:
        audit_sec = AuditEvent(
            request_id=req.id,
            actor_name="OpsPilot Security Guardrail",
            actor_role="SECURITY_AGENT",
            is_ai=True,
            action="SECURITY_ALERT_INJECTION_DETECTED",
            previous_value=None,
            new_value=val_signals["matched_pattern"],
            reason="Hostile prompt injection pattern neutralized in incoming operational content"
        )
        db.add(audit_sec)

    if val_signals["has_conflicts"]:
        audit_conflict = AuditEvent(
            request_id=req.id,
            actor_name="OpsPilot Inventory Verifier",
            actor_role="SYSTEM_AGENT",
            is_ai=True,
            action="INVENTORY_DISCREPANCY_FLAGGED",
            previous_value=str(facts_dict.get("requested_quantity")),
            new_value=str(facts_dict.get("available_quantity")),
            reason="Stated warehouse numbers disagree with verified warehouse database records"
        )
        db.add(audit_conflict)

    if val_signals["is_duplicate"] and val_signals["duplicate_of_id"]:
        orig = db.query(OperationalRequest).filter(OperationalRequest.id == val_signals["duplicate_of_id"]).first()
        if orig:
            audit_orig = AuditEvent(
                request_id=orig.id,
                actor_name="OpsPilot Duplicate Guard",
                actor_role="SYSTEM_AGENT",
                is_ai=True,
                action="DUPLICATE_INCIDENT_CORRELATED",
                previous_value=None,
                new_value=f"Correlated duplicate intake: {request_code}",
                reason=val_signals.get("duplicate_reason") or "Correlated duplicate intake without spawning redundant active ticket"
            )
            db.add(audit_orig)

    db.commit()
    db.refresh(req)
    return _format_detail_response(req)

@router.post("/{request_id}/correct-fact", response_model=OperationalRequestDetail)
def correct_extracted_fact(
    request_id: int,
    correction: FactCorrectionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Human-in-the-loop: allows authorized users to correct AI-extracted information.
    Records original value, corrected value, actor, timestamp, and audit trail.
    """
    req = db.query(OperationalRequest).filter(OperationalRequest.id == request_id).first()
    if not req or not req.facts:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request or facts not found")
        
    facts = req.facts
    field = correction.field_name
    
    if not hasattr(facts, field):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid fact field '{field}'")
        
    prev_val = getattr(facts, field)
    setattr(facts, field, correction.new_value)
    facts.is_corrected = True
    facts.updated_at = datetime.datetime.now(datetime.timezone.utc)
    
    # Audit log entry for human correction
    audit = AuditEvent(
        request_id=req.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        is_ai=False,
        action="FACT_CORRECTED_BY_HUMAN",
        previous_value=str(prev_val),
        new_value=str(correction.new_value),
        reason=correction.correction_reason
    )
    db.add(audit)

    # DYNAMIC REASSESSMENT TRIGGER:
    # When supplier delivery, quantities, or location change, trigger re-evaluation of
    # warehouse inventory conflicts, missing fields, objective confidence, risk, and communications.
    if field in ["delay_days", "requested_quantity", "available_quantity", "supplier_name", "location", "target_entity", "deadline"]:
        # 1. Re-check inventory discrepancy if location, entity, or available_quantity updated
        has_conflict, verified_qty, conflict_reason = check_inventory_discrepancy(
            db,
            location=facts.location,
            target_entity=facts.target_entity,
            stated_quantity=facts.available_quantity
        )
        req.has_conflicts = has_conflict
        if has_conflict:
            facts.conflict_details = json.dumps({
                "conflict_type": "INVENTORY_MISMATCH",
                "stated_quantity": facts.available_quantity,
                "verified_quantity": verified_qty,
                "explanation": conflict_reason
            })
        elif verified_qty is not None:
            facts.conflict_details = json.dumps({
                "conflict_type": "VERIFIED_MATCH",
                "verified_quantity": verified_qty,
                "explanation": conflict_reason
            })

        # 2. Re-calculate missing fields
        raw_missing = json.loads(facts.missing_fields or "[]")
        remaining_missing = []
        for mf in raw_missing:
            mf_lower = mf.lower()
            if "deadline" in mf_lower and facts.deadline:
                continue
            if "supplier" in mf_lower and facts.supplier_name:
                continue
            if "location" in mf_lower and facts.location:
                continue
            if "quantity" in mf_lower and facts.requested_quantity:
                continue
            remaining_missing.append(mf)
        facts.missing_fields = json.dumps(remaining_missing)
        req.has_missing_info = len(remaining_missing) > 0
        if not req.has_missing_info and req.status == "Needs Information":
            req.status = "Under Review"

        # 3. Recalculate objective confidence
        facts_dict = {
            "issue_type": facts.issue_type,
            "location": facts.location,
            "target_entity": facts.target_entity,
            "requested_quantity": facts.requested_quantity,
            "available_quantity": facts.available_quantity,
            "delay_days": facts.delay_days,
            "deadline": facts.deadline,
            "supplier_name": facts.supplier_name,
            "dependencies": json.loads(facts.dependencies or "[]"),
            "missing_fields": remaining_missing,
            "source_spans": json.loads(facts.source_spans or "{}"),
            "conflict_details": json.loads(facts.conflict_details or "{}")
        }
        new_conf = calculate_objective_confidence(facts_dict, req.has_conflicts, remaining_missing)
        facts.confidence_score = new_conf

        # 4. Re-run risk assessment with updated facts
        val_signals = {
            "is_suspicious_prompt": False,
            "matched_pattern": None,
            "is_duplicate": req.is_duplicate,
            "has_conflicts": req.has_conflicts,
            "has_missing_info": req.has_missing_info,
            "confidence_score": new_conf
        }
        reassessed_risk = assess_risk(facts_dict, val_signals)
        if req.risk:
            req.risk.risk_level = reassessed_risk["risk_level"]
            req.risk.severity_score = reassessed_risk["severity_score"]
            req.risk.operational_impact = reassessed_risk["operational_impact"]
            req.risk.financial_impact = reassessed_risk["financial_impact"]
            req.risk.schedule_delay_days = reassessed_risk["schedule_delay_days"]
            req.risk.deadline_urgency = reassessed_risk["deadline_urgency"]
            req.risk.supporting_evidence = reassessed_risk["supporting_evidence"]
        req.priority = reassessed_risk["risk_level"]

        # 5. Re-generate communication drafts tailored to corrected facts
        db.query(CommunicationDraft).filter(CommunicationDraft.request_id == req.id).delete()
        new_drafts = draft_communications(req)
        for d in new_drafts:
            db.add(CommunicationDraft(
                request_id=req.id,
                draft_type=d["draft_type"],
                recipient=d["recipient"],
                subject=d["subject"],
                body=d["body"],
                status="draft"
            ))

        # 6. Audit event for automated reassessment
        audit_reassess = AuditEvent(
            request_id=req.id,
            actor_name="OpsPilot Risk & Strategy Engine",
            actor_role="AI_AGENT",
            is_ai=True,
            action="AUTOMATED_REASSESSMENT_TRIGGERED",
            previous_value=f"Original value '{prev_val}' on '{field}'",
            new_value=f"Reassessed Risk: {reassessed_risk['risk_level'].upper()} ({reassessed_risk['severity_score']}/100, Delay: {facts.delay_days}d)",
            reason=f"Human fact correction on '{field}' triggered dynamic recalculation of operational impact, confidence ({int(round(new_conf*100))}%), and stakeholder communications"
        )
        db.add(audit_reassess)

    db.commit()
    db.refresh(req)
    return _format_detail_response(req)

@router.post("/{request_id}/transition", response_model=OperationalRequestDetail)
def transition_state(
    request_id: int,
    body: StateTransitionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Transitions workflow state according to deterministic backend state machine rules."""
    req = db.query(OperationalRequest).filter(OperationalRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
        
    req = transition_request_state(db, req, body.new_status, current_user, body.reason)
    return _format_detail_response(req)

@router.post("/{request_id}/select-recommendation", response_model=OperationalRequestDetail)
def select_recommendation(
    request_id: int,
    recommendation_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Selects an action recommendation. If action incurs costs, creates an approval record
    and transitions workflow to 'Awaiting Approval'.
    """
    req = db.query(OperationalRequest).filter(OperationalRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
        
    rec = db.query(Recommendation).filter(
        Recommendation.id == recommendation_id,
        Recommendation.request_id == request_id
    ).first()
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recommendation not found")

    # Mark selection
    for r in req.recommendations:
        r.is_selected = (r.id == rec.id)

    # Determine approval requirement
    if rec.estimated_cost > 0:
        req.requires_approval = True
        req.approval_status = "pending"
        req.status = "Awaiting Approval"
        
        # Create approval record
        approval = Approval(
            request_id=req.id,
            requested_action=rec.title,
            cost=rec.estimated_cost,
            justification=rec.description,
            evidence_summary=f"Selected mitigation '{rec.title}' to address {req.facts.target_entity if req.facts else 'incident'}. Cost INR {rec.estimated_cost:,.2f}.",
            status="pending",
            requested_by_id=current_user.id
        )
        db.add(approval)
        
        audit = AuditEvent(
            request_id=req.id,
            actor_name=current_user.full_name,
            actor_role=current_user.role,
            is_ai=False,
            action="APPROVAL_REQUESTED",
            previous_value=None,
            new_value=f"Cost INR {rec.estimated_cost:,.2f} for {rec.title}",
            reason=f"Recommended mitigation requires financial approval"
        )
        db.add(audit)
    else:
        req.requires_approval = False
        req.status = "In Progress"
        
        audit = AuditEvent(
            request_id=req.id,
            actor_name=current_user.full_name,
            actor_role=current_user.role,
            is_ai=False,
            action="RECOMMENDATION_ADOPTED_NO_COST",
            previous_value=None,
            new_value=rec.title,
            reason="Zero-cost operational plan adopted; proceeding without financial approval"
        )
        db.add(audit)

    db.commit()
    db.refresh(req)
    return _format_detail_response(req)

@router.post("/{request_id}/clarifications", response_model=ClarificationResponse)
def add_clarification(
    request_id: int,
    body: ClarificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Appends an operational note or clarification to the request incident log."""
    req = db.query(OperationalRequest).filter(OperationalRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
        
    clar = Clarification(
        request_id=req.id,
        author_name=current_user.full_name,
        message=body.message.strip(),
        is_system=False
    )
    db.add(clar)
    
    audit = AuditEvent(
        request_id=req.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        is_ai=False,
        action="CLARIFICATION_LOGGED",
        previous_value=None,
        new_value=body.message[:100],
        reason="Operational clarification recorded by operator"
    )
    db.add(audit)
    db.commit()
    db.refresh(clar)
    return ClarificationResponse.model_validate(clar)
