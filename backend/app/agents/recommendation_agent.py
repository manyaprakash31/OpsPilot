import json
import logging
from typing import Dict, Any, List
from app.agents.base import get_llm_provider

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """
You are the OpsPilot Recommendation Agent.
Generate feasible, evidence-grounded action alternatives to resolve the operational crisis.
For each option provide:
- action_key: short identifier string
- title: clear action title
- description: specific operational plan
- feasibility: "high" | "medium" | "low"
- estimated_cost: numeric floating point currency amount
- pros: string[]
- cons: string[]
- trade_offs: concise explanation of what is traded off
- required_approvals: string[] of roles required (e.g. ["lead_approver", "operations_manager"])
Return strictly a JSON array of options.
"""

def generate_recommendations(
    facts: Dict[str, Any],
    risk: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """
    Generates actionable alternatives grounded in verified facts.
    """
    provider = get_llm_provider()
    user_payload = json.dumps({
        "facts": facts,
        "risk": risk
    })
    
    try:
        raw_output = provider.generate_completion(SYSTEM_PROMPT, user_payload)
        parsed = json.loads(raw_output)
        if not isinstance(parsed, list):
            parsed = [parsed]
    except Exception as e:
        logger.error(f"Recommendation generation fallback: {e}")
        parsed = [
            {
                "action_key": "standard_expedite",
                "title": "Authorize Supplier Air Expedite",
                "description": "Engage priority courier to air-freight deficit units.",
                "feasibility": "high",
                "estimated_cost": 35000.0,
                "pros": ["Direct delivery within 48h"],
                "cons": ["Premium freight surcharge"],
                "trade_offs": "Cost vs speed",
                "required_approvals": ["lead_approver"]
            }
        ]
        
    results = []
    for item in parsed:
        results.append({
            "action_key": item.get("action_key", "mitigation_option"),
            "title": item.get("title", "Operational Mitigation"),
            "description": item.get("description", ""),
            "feasibility": item.get("feasibility", "medium"),
            "estimated_cost": float(item.get("estimated_cost", 0.0)),
            "pros": json.dumps(item.get("pros", [])),
            "cons": json.dumps(item.get("cons", [])),
            "trade_offs": item.get("trade_offs", ""),
            "required_approvals": json.dumps(item.get("required_approvals", ["operations_manager"])),
            "is_selected": False
        })
    return results
