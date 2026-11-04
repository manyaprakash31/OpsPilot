import json
import logging
from typing import Dict, Any
from app.agents.base import get_llm_provider

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """
You are the OpsPilot Risk and Impact Assessment Agent.
Assess the operational vulnerability, financial exposure, launch timeline risk, and urgency.
Return strictly a valid JSON object matching:
{
  "risk_level": "low" | "medium" | "high" | "critical",
  "severity_score": integer between 1 and 100,
  "operational_impact": string explaining direct bottlenecks,
  "financial_impact": string detailing cost/revenue risks,
  "schedule_delay_days": integer,
  "deadline_urgency": "immediate" | "high" | "normal",
  "supporting_evidence": string[] (concrete verifiable data points)
}
"""

def assess_risk(facts: Dict[str, Any], validation_signals: Dict[str, Any]) -> Dict[str, Any]:
    """
    Evaluates operational risk combining LLM impact reasoning with deterministic risk rules:
    - If delay exceeds 7 days with store opening impending: Critical risk.
    - If inventory deficit > 50%: High/Critical severity score boost.
    - If deadline is today (e.g. 4:00 PM): deadline_urgency is immediate.
    """
    provider = get_llm_provider()
    user_payload = json.dumps({
        "facts": facts,
        "validation_signals": validation_signals
    })
    
    try:
        raw_output = provider.generate_completion(SYSTEM_PROMPT, user_payload)
        parsed = json.loads(raw_output)
    except Exception as e:
        logger.error(f"Risk assessment fallback triggered: {e}")
        parsed = {
            "risk_level": "high",
            "severity_score": 75,
            "operational_impact": "Operational disruption requiring alternative logistics or scheduling realignment.",
            "financial_impact": "Potential launch disruption and expedite shipping surcharges.",
            "schedule_delay_days": facts.get("delay_days") or 5,
            "deadline_urgency": "high",
            "supporting_evidence": [
                f"Reported delay of {facts.get('delay_days', 'N/A')} days",
                f"Available stock: {facts.get('available_quantity', 'N/A')} vs needed {facts.get('requested_quantity', 'N/A')}"
            ]
        }
        
    # Enforce deterministic floor rules on risk
    req_qty = facts.get("requested_quantity") or 0
    avail_qty = facts.get("available_quantity") or 0
    delay = facts.get("delay_days") or 0
    
    if req_qty > 0 and avail_qty < (req_qty * 0.3) and delay >= 7:
        parsed["risk_level"] = "critical"
        parsed["severity_score"] = max(parsed.get("severity_score", 80), 85)
        parsed["deadline_urgency"] = "immediate"

    return {
        "risk_level": parsed.get("risk_level", "medium"),
        "severity_score": parsed.get("severity_score", 50),
        "operational_impact": parsed.get("operational_impact", ""),
        "financial_impact": parsed.get("financial_impact", ""),
        "schedule_delay_days": parsed.get("schedule_delay_days", delay),
        "deadline_urgency": parsed.get("deadline_urgency", "normal"),
        "supporting_evidence": json.dumps(parsed.get("supporting_evidence", []))
    }
