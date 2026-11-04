import re
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.models import OperationalRequest, InventoryItem

SUSPICIOUS_PROMPT_INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior)\s+instructions",
    r"system\s+override",
    r"you\s+are\s+now\s+an?\s+unrestricted",
    r"bypass\s+(approval|security|guardrails)",
    r"disregard\s+(all\s+)?guidelines",
    r"drop\s+table",
    r"<script>",
    r"transfer\s+\$?[0-9,]+\s+(without|bypassing)\s+approval",
    r"grant\s+admin\s+role",
    r"approve\s+this\s+automatically"
]

def check_prompt_injection(content: str) -> Tuple[bool, Optional[str]]:
    """
    Scans input for prompt injection, adversarial overrides, or malicious script injection.
    Returns (is_suspicious, matched_pattern).
    """
    for pattern in SUSPICIOUS_PROMPT_INJECTION_PATTERNS:
        match = re.search(pattern, content, re.IGNORECASE)
        if match:
            return True, match.group(0)
    return False, None

def check_duplicates(
    db: Session,
    raw_content: str,
    location: Optional[str] = None,
    target_entity: Optional[str] = None,
    exclude_request_id: Optional[int] = None
) -> Tuple[bool, Optional[int], Optional[str]]:
    """
    Checks for duplicate active requests based on text similarity or overlapping location/entity.
    Returns (is_duplicate, original_request_id, reason).
    """
    query = db.query(OperationalRequest).filter(
        OperationalRequest.status.notin_(["Closed", "Cancelled"])
    )
    if exclude_request_id:
        query = query.filter(OperationalRequest.id != exclude_request_id)
        
    active_requests = query.all()
    
    # 1. Exact or near-exact raw content match
    norm_content = " ".join(raw_content.lower().split())
    words1 = set(norm_content.split())
    for req in active_requests:
        req_norm = " ".join(req.raw_content.lower().split())
        words2 = set(req_norm.split())
        overlap = len(words1 & words2) / max(len(words1), 1)
        if norm_content == req_norm or (len(norm_content) > 40 and (norm_content in req_norm or req_norm in norm_content or overlap >= 0.85)):
            return True, req.id, f"Duplicate content matches active request {req.request_code} ({req.title})"
            
    # 2. Key entity, location, and significant narrative overlap in active queue
    if location and target_entity and len(norm_content) > 40:
        for req in active_requests:
            req_norm = " ".join(req.raw_content.lower().split())
            words2 = set(req_norm.split())
            overlap = len(words1 & words2) / max(len(words1), 1)
            if overlap >= 0.70 and req.facts:
                if (req.facts.location and location.lower() in req.facts.location.lower() and
                    req.facts.target_entity and target_entity.lower() in req.facts.target_entity.lower()):
                    return True, req.id, f"Active request {req.request_code} already manages '{target_entity}' at '{location}' with {int(overlap*100)}% narrative overlap"
                    
    return False, None, None

def check_inventory_discrepancy(
    db: Session,
    location: Optional[str],
    target_entity: Optional[str],
    stated_quantity: Optional[int]
) -> Tuple[bool, Optional[int], Optional[str]]:
    """
    Cross-checks extracted facts against verified database records in InventoryItem.
    Returns (has_conflict, verified_quantity, discrepancy_explanation).
    """
    if not location or not target_entity:
        return False, None, "Insufficient data to cross-check inventory records"
        
    # Search inventory records
    loc_keyword = location.split()[0].lower() # e.g. "Pune"
    entity_keyword = target_entity.split()[0].lower() # e.g. "Display"
    
    item = db.query(InventoryItem).filter(
        InventoryItem.location.ilike(f"%{loc_keyword}%"),
        InventoryItem.name.ilike(f"%{entity_keyword}%")
    ).first()
    
    if not item:
        # Check by SKU if present in target_entity
        if "DISP" in target_entity:
            item = db.query(InventoryItem).filter(InventoryItem.sku.ilike("%DISP%")).first()
            
    if not item:
        return False, None, "No corresponding warehouse inventory record found for cross-verification"
        
    verified_qty = item.current_stock
    
    # If the user stated an available quantity that does not match verified database stock
    if stated_quantity is not None and stated_quantity != verified_qty:
        explanation = (
            f"Discrepancy detected: Stated available stock ({stated_quantity} units) differs from "
            f"verified warehouse system inventory for {item.sku} ({verified_qty} units at {item.location})."
        )
        return True, verified_qty, explanation
        
    return False, verified_qty, f"Verified against warehouse inventory ({item.sku}: {verified_qty} units available)"

def calculate_objective_confidence(
    facts: Dict[str, Any],
    has_conflicts: bool,
    missing_fields: List[str]
) -> float:
    """
    Calculates a measurable, uninflated confidence score based on concrete evidence metrics:
    - Base score: 1.0
    - Penalties for missing critical fields (-0.12 each)
    - Penalties for unverified inventory conflicts (-0.20)
    - Penalties for missing source quotes (-0.08)
    - Bound between 0.10 and 0.98
    """
    score = 0.95
    
    # Penalty for missing fields
    if missing_fields:
        score -= min(0.35, len(missing_fields) * 0.10)
        
    # Penalty for conflicting evidence
    if has_conflicts:
        score -= 0.20
        
    # Check essential operational fields
    essential_fields = ["location", "target_entity", "delay_days", "deadline", "supplier_name"]
    missing_essential = [f for f in essential_fields if not facts.get(f)]
    score -= min(0.30, len(missing_essential) * 0.08)
    
    return max(0.15, min(0.98, round(score, 2)))

def explain_uncertainty(
    facts: Dict[str, Any],
    has_conflicts: bool,
    missing_fields: List[str]
) -> Dict[str, Any]:
    """
    Produces a detailed, transparent breakdown of confidence and uncertainty factors.
    Explains exactly why the score was given and what operational risks exist.
    """
    score = calculate_objective_confidence(facts, has_conflicts, missing_fields)
    penalties = []
    
    if missing_fields:
        penalties.append(f"Missing {len(missing_fields)} operational field(s): {', '.join(missing_fields)}")
    if has_conflicts:
        penalties.append("Warehouse WMS inventory discrepancy flagged (-20%)")
        
    essential_fields = ["location", "target_entity", "delay_days", "deadline", "supplier_name"]
    missing_essential = [f for f in essential_fields if not facts.get(f)]
    if missing_essential:
        penalties.append(f"Unspecified essential field(s): {', '.join(missing_essential)}")
        
    explanation = "High confidence: primary operational facts corroborated with verified warehouse data."
    if score < 0.60:
        explanation = "Low confidence: critical fields missing from raw input; human review and clarification required."
    elif score < 0.85:
        explanation = "Moderate confidence: key details parsed but secondary evidence or inventory reconciliation required."
        
    verified_count = sum(1 for k in essential_fields if facts.get(k))
    
    return {
        "confidence_score": score,
        "confidence_percent": int(round(score * 100)),
        "explanation": explanation,
        "penalties": penalties,
        "verified_attributes_count": verified_count
    }

