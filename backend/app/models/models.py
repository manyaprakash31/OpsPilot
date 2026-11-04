import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Float, DateTime, ForeignKey
)
from sqlalchemy.orm import relationship
from app.database import Base

def get_utc_now():
    return datetime.datetime.now(datetime.timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(30), nullable=False, default="operator")  # operator, operations_manager, lead_approver, admin
    is_active = Column(Boolean, default=True)
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=get_utc_now)

    requests_created = relationship("OperationalRequest", back_populates="created_by", foreign_keys="OperationalRequest.created_by_id")
    approvals_requested = relationship("Approval", back_populates="requested_by", foreign_keys="Approval.requested_by_id")
    approvals_decided = relationship("Approval", back_populates="approver", foreign_keys="Approval.approver_id")


class OperationalRequest(Base):
    __tablename__ = "operational_requests"

    id = Column(Integer, primary_key=True, index=True)
    request_code = Column(String(30), unique=True, index=True, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    raw_content = Column(Text, nullable=False)
    intake_source = Column(String(30), default="email")  # email, manual, api
    request_type = Column(String(50), nullable=False)   # delayed_delivery, inventory_shortage, supplier_issue, urgent_approval, customer_commitment
    
    # Explicit workflow states
    # New, Needs Information, Under Review, Awaiting Approval, Approved, Rejected, In Progress, Blocked, Resolved, Closed, Cancelled
    status = Column(String(40), default="New", index=True, nullable=False)
    priority = Column(String(20), default="medium", index=True, nullable=False)  # low, medium, high, critical
    
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by = relationship("User", back_populates="requests_created", foreign_keys=[created_by_id])
    
    created_at = Column(DateTime, default=get_utc_now, index=True)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)
    resolved_at = Column(DateTime, nullable=True)
    
    # Flags and validation signals
    requires_approval = Column(Boolean, default=False)
    approval_status = Column(String(20), default="none")  # none, pending, approved, rejected
    has_conflicts = Column(Boolean, default=False)
    has_missing_info = Column(Boolean, default=False)
    is_duplicate = Column(Boolean, default=False)
    duplicate_of_id = Column(Integer, ForeignKey("operational_requests.id"), nullable=True)
    
    # Relationships
    facts = relationship("ExtractedFacts", back_populates="request", uselist=False, cascade="all, delete-orphan")
    risk = relationship("RiskAssessment", back_populates="request", uselist=False, cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="request", cascade="all, delete-orphan")
    approvals = relationship("Approval", back_populates="request", cascade="all, delete-orphan")
    audit_events = relationship("AuditEvent", back_populates="request", cascade="all, delete-orphan", order_by="AuditEvent.created_at.desc()")
    clarifications = relationship("Clarification", back_populates="request", cascade="all, delete-orphan")
    communication_drafts = relationship("CommunicationDraft", back_populates="request", cascade="all, delete-orphan")


class ExtractedFacts(Base):
    __tablename__ = "extracted_facts"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("operational_requests.id"), nullable=False, unique=True)
    request = relationship("OperationalRequest", back_populates="facts")

    issue_type = Column(String(100), nullable=False)
    location = Column(String(100), nullable=True)
    target_entity = Column(String(150), nullable=True)  # Item/Equipment/Asset
    requested_quantity = Column(Integer, nullable=True)
    available_quantity = Column(Integer, nullable=True)  # From verified DB
    delay_days = Column(Integer, nullable=True)
    deadline = Column(String(100), nullable=True)
    supplier_name = Column(String(150), nullable=True)
    estimated_cost = Column(Float, nullable=True)
    
    dependencies = Column(Text, nullable=True)     # JSON array string
    missing_fields = Column(Text, nullable=True)   # JSON array string
    source_spans = Column(Text, nullable=True)     # JSON object mapping field -> source quote
    conflict_details = Column(Text, nullable=True) # JSON object describing discrepancies
    confidence_score = Column(Float, default=0.0)  # Objective measurable validation score
    
    is_corrected = Column(Boolean, default=False)
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)


class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("operational_requests.id"), nullable=False, unique=True)
    request = relationship("OperationalRequest", back_populates="risk")

    risk_level = Column(String(20), nullable=False)  # low, medium, high, critical
    severity_score = Column(Integer, default=50)     # 1-100 score
    operational_impact = Column(Text, nullable=False)
    financial_impact = Column(Text, nullable=True)
    schedule_delay_days = Column(Integer, default=0)
    deadline_urgency = Column(String(20), default="normal") # immediate, high, normal
    supporting_evidence = Column(Text, nullable=False)      # JSON list of facts supporting score
    created_at = Column(DateTime, default=get_utc_now)


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("operational_requests.id"), nullable=False)
    request = relationship("OperationalRequest", back_populates="recommendations")

    action_key = Column(String(50), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    feasibility = Column(String(20), default="medium")  # high, medium, low
    estimated_cost = Column(Float, default=0.0)
    pros = Column(Text, nullable=True)        # JSON array
    cons = Column(Text, nullable=True)        # JSON array
    trade_offs = Column(Text, nullable=True)
    required_approvals = Column(Text, nullable=True) # JSON array of roles/thresholds
    is_selected = Column(Boolean, default=False)
    created_at = Column(DateTime, default=get_utc_now)


class Approval(Base):
    __tablename__ = "approvals"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("operational_requests.id"), nullable=False)
    request = relationship("OperationalRequest", back_populates="approvals")

    requested_action = Column(String(200), nullable=False)
    cost = Column(Float, nullable=False)
    justification = Column(Text, nullable=False)
    evidence_summary = Column(Text, nullable=False)
    
    # State: pending, approved, rejected
    status = Column(String(20), default="pending", nullable=False)
    
    requested_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    requested_by = relationship("User", back_populates="approvals_requested", foreign_keys=[requested_by_id])
    
    approver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approver = relationship("User", back_populates="approvals_decided", foreign_keys=[approver_id])
    
    approved_at = Column(DateTime, nullable=True)
    rejected_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=get_utc_now)


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("operational_requests.id"), nullable=False, index=True)
    request = relationship("OperationalRequest", back_populates="audit_events")

    actor_name = Column(String(100), nullable=False)
    actor_role = Column(String(50), nullable=False)
    is_ai = Column(Boolean, default=False)
    action = Column(String(100), nullable=False)
    previous_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    reason = Column(Text, nullable=True)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=get_utc_now, index=True)


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(150), nullable=False)
    location = Column(String(100), nullable=False, index=True)
    current_stock = Column(Integer, default=0, nullable=False)
    reserved_stock = Column(Integer, default=0, nullable=False)
    unit = Column(String(20), default="units")
    unit_cost = Column(Float, default=0.0)
    last_verified_at = Column(DateTime, default=get_utc_now)


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(150), nullable=False)
    contact_email = Column(String(120), nullable=False)
    phone = Column(String(50), nullable=True)
    lead_time_days = Column(Integer, default=7)
    rating = Column(Float, default=4.5)
    reliability_tier = Column(String(20), default="Tier-1")


class Clarification(Base):
    __tablename__ = "clarifications"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("operational_requests.id"), nullable=False)
    request = relationship("OperationalRequest", back_populates="clarifications")

    author_name = Column(String(100), nullable=False)
    message = Column(Text, nullable=False)
    is_system = Column(Boolean, default=False)
    created_at = Column(DateTime, default=get_utc_now)


class CommunicationDraft(Base):
    __tablename__ = "communication_drafts"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("operational_requests.id"), nullable=False)
    request = relationship("OperationalRequest", back_populates="communication_drafts")

    draft_type = Column(String(50), nullable=False) # supplier_followup, stakeholder_escalation, store_manager_brief, executive_summary
    recipient = Column(String(150), nullable=False)
    subject = Column(String(250), nullable=False)
    body = Column(Text, nullable=False)
    status = Column(String(20), default="draft")  # draft, approved, sent
    created_at = Column(DateTime, default=get_utc_now)


class RevokedToken(Base):
    __tablename__ = "revoked_tokens"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(500), unique=True, index=True, nullable=False)
    revoked_at = Column(DateTime, default=get_utc_now)

