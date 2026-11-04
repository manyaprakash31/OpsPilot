from typing import Dict, Any, List
from app.models.models import OperationalRequest, ExtractedFacts, RiskAssessment

def draft_communications(request: OperationalRequest) -> List[Dict[str, str]]:
    """
    Generates structured, professional operational communication drafts
    tailored to the specific incident facts and current workflow status.
    """
    facts = request.facts
    supplier_name = facts.supplier_name if facts and facts.supplier_name else "Supplier Partner"
    target_entity = facts.target_entity if facts and facts.target_entity else "Required Inventory"
    location = facts.location if facts and facts.location else "Launch Site"
    delay_days = facts.delay_days if facts and facts.delay_days else 0
    available_qty = facts.available_quantity if facts and facts.available_quantity is not None else 0
    requested_qty = facts.requested_quantity if facts and facts.requested_quantity is not None else 0
    deadline = facts.deadline if facts and facts.deadline else "immediately"

    drafts = []

    # 1. Supplier Urgent Expedite Notice
    drafts.append({
        "draft_type": "supplier_followup",
        "recipient": f"dispatch@{supplier_name.lower().replace(' ', '')}.com",
        "subject": f"[URGENT - CRITICAL SLA] {request.request_code} - Delivery Delay Escalation for {location}",
        "body": (
            f"Dear {supplier_name} Account Team,\n\n"
            f"This is an urgent notice regarding purchase order fulfillment for {target_entity} at our {location} facility. "
            f"Your team reported an impending {delay_days}-day delay on the committed delivery of {requested_qty} units.\n\n"
            f"This location is scheduled for grand opening next week. Our current onsite verified stock is only {available_qty} units, "
            f"leaving an unacceptable deficit of {requested_qty - available_qty} units.\n\n"
            f"Please provide by {deadline}:\n"
            f"1. Immediate confirmation of air-freight or express dispatch feasibility from your secondary regional depots.\n"
            f"2. Contact details for your logistics dispatch coordinator.\n"
            f"3. Root-cause documentation for our corporate SLA audit.\n\n"
            f"Regards,\nOpsPilot Operations Command Center"
        )
    })

    # 2. Executive Leadership Alert
    drafts.append({
        "draft_type": "executive_summary",
        "recipient": "operations-leadership@opspilot.internal",
        "subject": f"[OPS ADVISORY] Store Launch Risk Exposure: {location} ({request.request_code})",
        "body": (
            f"EXECUTIVE SUMMARY:\n"
            f"Location: {location}\n"
            f"Disruption: {delay_days}-day supplier delay on {target_entity}.\n"
            f"Inventory Status: {available_qty} units verified on-site vs {requested_qty} needed.\n"
            f"Risk Level: {request.priority.upper()} - Impending launch schedule compromise.\n"
            f"Mitigation Status: Action alternatives have been generated and cost authorization is pending review. "
            f"Target decision deadline: {deadline}.\n\n"
            f"Logged in OpsPilot system under record {request.request_code}."
        )
    })

    # 3. Store Manager Action Memo
    drafts.append({
        "draft_type": "store_manager_brief",
        "recipient": f"storemanager.{location.lower().replace(' ', '')[:6]}@opspilot.internal",
        "subject": f"Operational Briefing: Display Unit Allocation & Launch Readiness ({request.request_code})",
        "body": (
            f"Store Management Team ({location}),\n\n"
            f"Central Operations has prioritized your launch equipment shortfall. We have verified {available_qty} display units "
            f"physically in your local warehouse.\n\n"
            f"Action Directives:\n"
            f"1. Direct visual merchandising crews to prioritize the {available_qty} available units for the primary entrance aisles.\n"
            f"2. Hold secondary zone fixture assembly pending the arrival of expedited units.\n"
            f"3. Stand by for final logistics tracking numbers following approval today.\n\n"
            f"OpsPilot Support Team"
        )
    })

    return drafts
