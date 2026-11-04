import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field, ConfigDict

# User Schemas
class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    role: str = "operator"

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

# Facts Schemas
class ExtractedFactsBase(BaseModel):
    issue_type: str
    location: Optional[str] = None
    target_entity: Optional[str] = None
    requested_quantity: Optional[int] = None
    available_quantity: Optional[int] = None
    delay_days: Optional[int] = None
    deadline: Optional[str] = None
    supplier_name: Optional[str] = None
    estimated_cost: Optional[float] = None
    dependencies: Optional[List[str]] = []
    missing_fields: Optional[List[str]] = []
    source_spans: Optional[Dict[str, str]] = {}
    conflict_details: Optional[Dict[str, Any]] = {}
    confidence_score: float = 0.0
    is_corrected: bool = False

class FactCorrectionRequest(BaseModel):
    field_name: str
    new_value: Any
    correction_reason: str

class ExtractedFactsResponse(ExtractedFactsBase):
    id: int
    request_id: int
    created_at: datetime.datetime
    updated_at: Optional[datetime.datetime] = None

    model_config = ConfigDict(from_attributes=True)

# Risk Schemas
class RiskAssessmentResponse(BaseModel):
    id: int
    request_id: int
    risk_level: str
    severity_score: int
    operational_impact: str
    financial_impact: Optional[str] = None
    schedule_delay_days: int = 0
    deadline_urgency: str
    supporting_evidence: List[str] = []
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

# Recommendation Schemas
class RecommendationResponse(BaseModel):
    id: int
    request_id: int
    action_key: str
    title: str
    description: str
    feasibility: str
    estimated_cost: float
    pros: List[str] = []
    cons: List[str] = []
    trade_offs: Optional[str] = None
    required_approvals: List[str] = []
    is_selected: bool
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

# Approval Schemas
class ApprovalCreateRequest(BaseModel):
    requested_action: str
    cost: float
    justification: str
    evidence_summary: str

class ApprovalDecisionRequest(BaseModel):
    action: str = Field(..., description="'approve' or 'reject'")
    rejection_reason: Optional[str] = None

class ApprovalEscalateRequest(BaseModel):
    escalation_reason: str

class ApprovalResponse(BaseModel):
    id: int
    request_id: int
    requested_action: str
    cost: float
    justification: str
    evidence_summary: str
    status: str
    requested_by_id: int
    approver_id: Optional[int] = None
    approved_at: Optional[datetime.datetime] = None
    rejected_at: Optional[datetime.datetime] = None
    rejection_reason: Optional[str] = None
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

# Audit Event Schemas
class AuditEventResponse(BaseModel):
    id: int
    request_id: int
    actor_name: str
    actor_role: str
    is_ai: bool
    action: str
    previous_value: Optional[str] = None
    new_value: Optional[str] = None
    reason: Optional[str] = None
    metadata_json: Optional[str] = None
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

# Communication Draft Schemas
class CommunicationDraftCreate(BaseModel):
    draft_type: str
    recipient: str
    subject: str
    body: str

class CommunicationDraftResponse(BaseModel):
    id: int
    request_id: int
    draft_type: str
    recipient: str
    subject: str
    body: str
    status: str
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

# Clarification Schemas
class ClarificationCreate(BaseModel):
    message: str

class ClarificationResponse(BaseModel):
    id: int
    request_id: int
    author_name: str
    message: str
    is_system: bool
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

# Request Schemas
class RequestCreateManual(BaseModel):
    title: str
    raw_content: str
    request_type: str = "delayed_delivery"
    priority: str = "medium"

class RequestCreateEmail(BaseModel):
    sender: str
    subject: str
    body: str

class StateTransitionRequest(BaseModel):
    new_status: str
    reason: Optional[str] = None

class OperationalRequestSummary(BaseModel):
    id: int
    request_code: str
    title: str
    raw_content: str
    intake_source: str
    request_type: str
    status: str
    priority: str
    has_conflicts: bool
    has_missing_info: bool
    is_duplicate: bool
    duplicate_of_id: Optional[int] = None
    requires_approval: bool
    approval_status: str
    created_at: datetime.datetime
    updated_at: Optional[datetime.datetime] = None
    created_by: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)

# Closure & Uncertainty Schemas
class ClosureConditionItem(BaseModel):
    name: str
    satisfied: bool
    description: str

class ClosureValidationResult(BaseModel):
    is_ready_for_resolution: bool
    is_ready_for_closure: bool
    conditions: List[ClosureConditionItem] = []
    blockers: List[str] = []
    next_actions: List[str] = []

class UncertaintyBreakdown(BaseModel):
    confidence_score: float
    confidence_percent: int
    explanation: str
    penalties: List[str] = []
    verified_attributes_count: int

class OperationalRequestDetail(OperationalRequestSummary):
    facts: Optional[ExtractedFactsResponse] = None
    risk: Optional[RiskAssessmentResponse] = None
    recommendations: List[RecommendationResponse] = []
    approvals: List[ApprovalResponse] = []
    audit_events: List[AuditEventResponse] = []
    clarifications: List[ClarificationResponse] = []
    communication_drafts: List[CommunicationDraftResponse] = []
    closure_validation: Optional[ClosureValidationResult] = None
    uncertainty_breakdown: Optional[UncertaintyBreakdown] = None

    model_config = ConfigDict(from_attributes=True)

# Inventory & Supplier Schemas
class InventoryItemResponse(BaseModel):
    id: int
    sku: str
    name: str
    location: str
    current_stock: int
    reserved_stock: int
    unit: str
    unit_cost: float
    last_verified_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class SupplierResponse(BaseModel):
    id: int
    code: str
    name: str
    contact_email: str
    phone: Optional[str] = None
    lead_time_days: int
    rating: float
    reliability_tier: str

    model_config = ConfigDict(from_attributes=True)

# Dashboard Stats Schema
class DashboardStats(BaseModel):
    total_requests: int
    pending_approvals: int
    overdue_requests: int
    high_risk_requests: int
    in_progress_count: int
    resolved_count: int
    blocked_count: int

class ManagementSummary(BaseModel):
    executive_brief: str
    total_active_incidents: int
    critical_incidents: int
    pending_expenditure_total: float
    high_risk_sites: List[str]
    immediate_action_items: List[str]
    generated_at: datetime.datetime
