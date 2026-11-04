import json
import datetime
from sqlalchemy.orm import Session
from app.database import Base, engine, SessionLocal
from app.models.models import (
    User,
    OperationalRequest,
    ExtractedFacts,
    RiskAssessment,
    Recommendation,
    Approval,
    AuditEvent,
    InventoryItem,
    Supplier,
    CommunicationDraft
)
from app.auth.security import hash_password

def seed_database():
    """Seeds initial users, inventory, suppliers, and Pune store launch scenario."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # 1. Seed Users if not present
        if db.query(User).count() == 0:
            users = [
                User(
                    username="operator",
                    email="operator@opspilot.internal",
                    full_name="Rajesh Sharma (Operations Specialist)",
                    hashed_password=hash_password("Operator123!"),
                    role="operator",
                    is_active=True
                ),
                User(
                    username="manager",
                    email="manager@opspilot.internal",
                    full_name="Priya Patel (Operations Manager)",
                    hashed_password=hash_password("Manager123!"),
                    role="operations_manager",
                    is_active=True
                ),
                User(
                    username="approver",
                    email="approver@opspilot.internal",
                    full_name="Vikramaditya Rao (VP Operations / Lead Approver)",
                    hashed_password=hash_password("Approver123!"),
                    role="lead_approver",
                    is_active=True
                ),
                User(
                    username="admin",
                    email="admin@opspilot.internal",
                    full_name="Platform Administrator",
                    hashed_password=hash_password("Admin123!"),
                    role="admin",
                    is_active=True
                )
            ]
            db.add_all(users)
            db.commit()

        # 2. Seed Verified Inventory
        if db.query(InventoryItem).count() == 0:
            items = [
                InventoryItem(
                    sku="DISP-PUN-001",
                    name="Modular Retail Display Units (Pune Store Spec)",
                    location="Pune Warehouse (Chakan Hub)",
                    current_stock=120,
                    reserved_stock=0,
                    unit="units",
                    unit_cost=4500.0,
                    last_verified_at=datetime.datetime.utcnow() - datetime.timedelta(hours=2)
                ),
                InventoryItem(
                    sku="DISP-MUM-001",
                    name="Modular Retail Display Units (West Zone Buffer)",
                    location="Mumbai Regional Depot (Bhiwandi)",
                    current_stock=350,
                    reserved_stock=100,
                    unit="units",
                    unit_cost=4500.0,
                    last_verified_at=datetime.datetime.utcnow() - datetime.timedelta(hours=5)
                ),
                InventoryItem(
                    sku="DISP-BLR-001",
                    name="Modular Retail Display Units (South Zone Hub)",
                    location="Bengaluru Logistics Park",
                    current_stock=220,
                    reserved_stock=40,
                    unit="units",
                    unit_cost=4500.0,
                    last_verified_at=datetime.datetime.utcnow() - datetime.timedelta(hours=8)
                ),
                InventoryItem(
                    sku="POS-PUN-002",
                    name="Touchscreen POS Terminals (Dual Screen)",
                    location="Pune Warehouse (Chakan Hub)",
                    current_stock=14,
                    reserved_stock=0,
                    unit="units",
                    unit_cost=28000.0,
                    last_verified_at=datetime.datetime.utcnow() - datetime.timedelta(hours=12)
                )
            ]
            db.add_all(items)
            db.commit()

        # 3. Seed Verified Suppliers
        if db.query(Supplier).count() == 0:
            suppliers = [
                Supplier(
                    code="APEX-FIX-01",
                    name="Apex Retail Fixtures Pvt Ltd",
                    contact_email="dispatch@apexfixtures.com",
                    phone="+91 20 6712 4000",
                    lead_time_days=14,
                    rating=4.5,
                    reliability_tier="Tier-1 Primary"
                ),
                Supplier(
                    code="LOG-BDA-01",
                    name="BlueDart Aviation Express Logistics",
                    contact_email="priority.cargo@bluedart.com",
                    phone="+91 22 2839 6000",
                    lead_time_days=2,
                    rating=4.8,
                    reliability_tier="Tier-1 Cargo"
                ),
                Supplier(
                    code="LOG-DEC-02",
                    name="Deccan QuickRoads Express Logistics",
                    contact_email="dispatch@deccanroads.in",
                    phone="+91 20 2567 1100",
                    lead_time_days=3,
                    rating=4.2,
                    reliability_tier="Tier-2 Ground"
                )
            ]
            db.add_all(suppliers)
            db.commit()

        # 4. Seed Primary Demonstration Case: Pune Store Launch Scenario
        if db.query(OperationalRequest).filter(OperationalRequest.request_code == "REQ-2026-001").count() == 0:
            operator_user = db.query(User).filter(User.username == "operator").first()
            approver_user = db.query(User).filter(User.username == "approver").first()
            
            pune_req = OperationalRequest(
                request_code="REQ-2026-001",
                title="Supplier Delay: 500 Display Units for Pune Store Launch",
                description="Display Units (SKU: DISP-PUN-001) for Pune Phoenix Marketcity launch",
                raw_content=(
                    "A supplier has reported that 500 display units required for a Pune store launch will be delayed by 10 days. "
                    "The store is scheduled to open next week, and only 120 units are currently available in the warehouse. "
                    "The team must assess the impact, identify alternatives, and obtain approval for additional costs by 4:00 PM."
                ),
                intake_source="email",
                request_type="delayed_delivery",
                status="Awaiting Approval",
                priority="critical",
                created_by_id=operator_user.id if operator_user else 1,
                has_conflicts=False,
                has_missing_info=False,
                is_duplicate=False,
                requires_approval=True,
                approval_status="pending",
                created_at=datetime.datetime.utcnow() - datetime.timedelta(hours=2)
            )
            db.add(pune_req)
            db.flush()

            # Facts
            pune_facts = ExtractedFacts(
                request_id=pune_req.id,
                issue_type="delayed_delivery",
                location="Pune Store (Phoenix Marketcity)",
                target_entity="Display Units (SKU: DISP-PUN-001)",
                requested_quantity=500,
                available_quantity=120,
                delay_days=10,
                deadline="Today by 4:00 PM IST (Grand Opening next week)",
                supplier_name="Apex Retail Fixtures Pvt Ltd",
                dependencies=json.dumps([
                    "Store visual merchandising signoff",
                    "Aisle electrical setup deadline",
                    "Committed marketing media campaign launch"
                ]),
                missing_fields=json.dumps([
                    "Supplier formal root cause report",
                    "Secondary supplier air freight confirmation"
                ]),
                source_spans=json.dumps({
                    "requested_quantity": "500 display units required for a Pune store launch",
                    "delay_days": "will be delayed by 10 days",
                    "available_quantity": "only 120 units are currently available in the warehouse",
                    "deadline": "obtain approval for additional costs by 4:00 PM"
                }),
                conflict_details=json.dumps({
                    "conflict_type": "VERIFIED_MATCH",
                    "verified_quantity": 120,
                    "explanation": "Verified against warehouse inventory (DISP-PUN-001: 120 units available at Pune Warehouse)"
                }),
                confidence_score=0.94,
                is_corrected=False
            )
            db.add(pune_facts)

            # Risk Assessment
            pune_risk = RiskAssessment(
                request_id=pune_req.id,
                risk_level="critical",
                severity_score=88,
                operational_impact="Severe bottleneck: Store opening scheduled for next week with only 24% of required display units (120/500). Launch date is compromised without expedited intervention.",
                financial_impact="Estimated INR 350,000 to 500,000 potential revenue loss per day of postponed opening, plus committed launch marketing costs.",
                schedule_delay_days=10,
                deadline_urgency="immediate",
                supporting_evidence=json.dumps([
                    "Warehouse records confirm current stock is 120 units (380 unit deficit).",
                    "Supplier delivery pushback exceeds store opening timeline by 6 days.",
                    "Cost approval deadline of 4:00 PM required to book air freight today."
                ])
            )
            db.add(pune_risk)

            # Recommendations
            rec1 = Recommendation(
                request_id=pune_req.id,
                action_key="air_freight_expedite",
                title="Air Freight Expedited Delivery (380 Units)",
                description="Authorize expedited air cargo from supplier's secondary manufacturing hub in Delhi directly to Pune facility within 48 hours.",
                feasibility="high",
                estimated_cost=42000.0,
                pros=json.dumps([
                    "Arrives 5 days prior to store opening",
                    "Meets full 500 unit requirement without changing launch scope",
                    "Contracted freight partner BlueDart Aviation has slot availability"
                ]),
                cons=json.dumps([
                    "Incurs premium freight surcharge of INR 42,000",
                    "Requires Lead Approver sign-off by 4:00 PM"
                ]),
                trade_offs="Trades INR 42,000 operational budget for 100% on-time store opening guarantee.",
                required_approvals=json.dumps(["lead_approver", "operations_manager"]),
                is_selected=True
            )
            rec2 = Recommendation(
                request_id=pune_req.id,
                action_key="inter_depot_transfer",
                title="Split Transfer from Mumbai Regional Depot",
                description="Transfer 250 units from Mumbai depot and 130 units from Bengaluru hub via overnight express road logistics.",
                feasibility="medium",
                estimated_cost=18500.0,
                pros=json.dumps([
                    "Cost-effective (INR 18,500 total logistics cost)",
                    "Arrives in 72 hours (well ahead of store launch)"
                ]),
                cons=json.dumps([
                    "Draws Mumbai depot safety buffer down to 15%",
                    "Requires coordinating two logistics legs"
                ]),
                trade_offs="Lower cost but increases regional stock depletion risk in Mumbai.",
                required_approvals=json.dumps(["operations_manager"]),
                is_selected=False
            )
            rec3 = Recommendation(
                request_id=pune_req.id,
                action_key="phased_launch",
                title="Phased Store Launch with Priority Aisles",
                description="Deploy the 120 available units exclusively to high-traffic front-of-store categories and open on schedule, backfilling secondary aisles when delayed stock lands.",
                feasibility="high",
                estimated_cost=0.0,
                pros=json.dumps([
                    "Zero additional logistics expenditure",
                    "Preserves scheduled store launch date"
                ]),
                cons=json.dumps([
                    "Incomplete visual merchandising in secondary zones",
                    "Requires store manager operational realignment"
                ]),
                trade_offs="Zero expenditure at the expense of partial aesthetic presentation during launch week.",
                required_approvals=json.dumps(["operations_manager"]),
                is_selected=False
            )
            db.add_all([rec1, rec2, rec3])

            # Pending Approval record
            approval = Approval(
                request_id=pune_req.id,
                requested_action="Air Freight Expedited Delivery (380 Units)",
                cost=42000.0,
                justification="Authorize emergency air freight with BlueDart to deliver 380 units in 48 hours, securing the Pune Phoenix Marketcity grand opening.",
                evidence_summary="Verified warehouse stock is 120 units (deficit 380 units). Delay is 10 days while opening is next week. Air freight costs INR 42,000 vs estimated INR 350,000/day launch delay loss.",
                status="pending",
                requested_by_id=operator_user.id if operator_user else 1,
                created_at=datetime.datetime.utcnow() - datetime.timedelta(hours=1)
            )
            db.add(approval)

            # Communication Drafts
            draft1 = CommunicationDraft(
                request_id=pune_req.id,
                draft_type="supplier_followup",
                recipient="dispatch@apexfixtures.com",
                subject="[URGENT - CRITICAL SLA] REQ-2026-001 - Delivery Delay Escalation for Pune Store (Phoenix Marketcity)",
                body=(
                    "Dear Apex Retail Fixtures Account Team,\n\n"
                    "This is an urgent escalation regarding purchase order fulfillment for Display Units (SKU: DISP-PUN-001) "
                    "at our Pune Store (Phoenix Marketcity) facility. Your team reported an impending 10-day delay on 500 units.\n\n"
                    "Our store is scheduled for grand opening next week and verified onsite warehouse stock is only 120 units.\n\n"
                    "Please confirm by Today 4:00 PM IST:\n"
                    "1. Priority release of 380 units to BlueDart Aviation at Delhi hub.\n"
                    "2. Formal root-cause audit statement for our vendor review board.\n\n"
                    "OpsPilot Operations Command Center"
                ),
                status="draft"
            )
            draft2 = CommunicationDraft(
                request_id=pune_req.id,
                draft_type="executive_summary",
                recipient="operations-leadership@opspilot.internal",
                subject="[OPS ADVISORY] Store Launch Risk Exposure: Pune Store (REQ-2026-001)",
                body=(
                    "EXECUTIVE SUMMARY:\n"
                    "Location: Pune Store (Phoenix Marketcity)\n"
                    "Disruption: 10-day supplier delay on 500 Display Units.\n"
                    "Stock: 120 verified in warehouse (deficit 380 units).\n"
                    "Mitigation: Air Freight expedite recommendation (INR 42,000) pending Lead Approver signoff by 4:00 PM.\n"
                    "OpsPilot Record: REQ-2026-001."
                ),
                status="draft"
            )
            db.add_all([draft1, draft2])

            # Audit events
            audits = [
                AuditEvent(
                    request_id=pune_req.id,
                    actor_name="OpsPilot Intake Agent",
                    actor_role="AI_AGENT",
                    is_ai=True,
                    action="INTAKE_FACTS_EXTRACTED",
                    previous_value=None,
                    new_value="Extracted 500 Display Units delay at Pune Store. Confidence score: 0.94",
                    reason="Automated intake parsing and source quote attribution",
                    created_at=datetime.datetime.utcnow() - datetime.timedelta(hours=2)
                ),
                AuditEvent(
                    request_id=pune_req.id,
                    actor_name="OpsPilot Inventory Verifier",
                    actor_role="SYSTEM_AGENT",
                    is_ai=True,
                    action="INVENTORY_VERIFIED",
                    previous_value=None,
                    new_value="DISP-PUN-001: 120 units verified in Chakan warehouse database",
                    reason="Cross-checked against verified warehouse inventory ledger",
                    created_at=datetime.datetime.utcnow() - datetime.timedelta(hours=2)
                ),
                AuditEvent(
                    request_id=pune_req.id,
                    actor_name="OpsPilot Risk Agent",
                    actor_role="AI_AGENT",
                    is_ai=True,
                    action="RISK_EVALUATED",
                    previous_value=None,
                    new_value="Severity 88/100 (CRITICAL) - Impending launch compromise",
                    reason="Calculated schedule deficit vs store opening proximity",
                    created_at=datetime.datetime.utcnow() - datetime.timedelta(hours=1, minutes=50)
                ),
                AuditEvent(
                    request_id=pune_req.id,
                    actor_name=operator_user.full_name if operator_user else "Rajesh Sharma",
                    actor_role="operator",
                    is_ai=False,
                    action="APPROVAL_REQUESTED",
                    previous_value=None,
                    new_value="Air Freight Expedited Delivery (380 Units) - INR 42,000",
                    reason="Recommended option selected by operator; routed to Lead Approver queue",
                    created_at=datetime.datetime.utcnow() - datetime.timedelta(hours=1)
                )
            ]
            db.add_all(audits)
            db.commit()

        # 5. Seed Additional Edge Case Requests
        if db.query(OperationalRequest).filter(OperationalRequest.request_code == "REQ-2026-002").count() == 0:
            operator_user = db.query(User).filter(User.username == "operator").first()
            
            # Request 2: Conflicting Inventory Numbers (Edge Case 2)
            req2 = OperationalRequest(
                request_code="REQ-2026-002",
                title="Inventory Count Discrepancy: Chakan Warehouse POS Terminals",
                description="POS Terminals count mismatch between store memo and warehouse ledger",
                raw_content="Store supervisor reports 35 POS terminals physically present at Chakan hub, but warehouse ledger reports only 14 units.",
                intake_source="manual",
                request_type="inventory_shortage",
                status="Under Review",
                priority="high",
                created_by_id=operator_user.id if operator_user else 1,
                has_conflicts=True,
                has_missing_info=False,
                is_duplicate=False,
                requires_approval=False,
                created_at=datetime.datetime.utcnow() - datetime.timedelta(hours=4)
            )
            db.add(req2)
            db.flush()
            
            req2_facts = ExtractedFacts(
                request_id=req2.id,
                issue_type="inventory_shortage",
                location="Pune Warehouse (Chakan Hub)",
                target_entity="Touchscreen POS Terminals (SKU: POS-PUN-002)",
                requested_quantity=35,
                available_quantity=14,
                delay_days=0,
                deadline="End of week",
                supplier_name="Hardware Corp",
                dependencies=json.dumps(["Cashier onboarding"]),
                missing_fields=json.dumps([]),
                source_spans=json.dumps({"stated_quantity": "reports 35 POS terminals"}),
                conflict_details=json.dumps({
                    "conflict_type": "INVENTORY_MISMATCH",
                    "stated_quantity": 35,
                    "verified_quantity": 14,
                    "explanation": "Discrepancy detected: Stated available stock (35 units) differs from verified warehouse system inventory for POS-PUN-002 (14 units at Pune Warehouse)."
                }),
                confidence_score=0.74,
                is_corrected=False
            )
            db.add(req2_facts)
            
            req2_audit = AuditEvent(
                request_id=req2.id,
                actor_name="OpsPilot Inventory Verifier",
                actor_role="SYSTEM_AGENT",
                is_ai=True,
                action="INVENTORY_DISCREPANCY_FLAGGED",
                previous_value="35",
                new_value="14",
                reason="Ledger mismatch flagged: physical audit required before deployment",
                created_at=datetime.datetime.utcnow() - datetime.timedelta(hours=4)
            )
            db.add(req2_audit)
            db.commit()

        # Request 3: Missing Information (Edge Case 1)
        if db.query(OperationalRequest).filter(OperationalRequest.request_code == "REQ-2026-003").count() == 0:
            operator_user = db.query(User).filter(User.username == "operator").first()
            
            req3 = OperationalRequest(
                request_code="REQ-2026-003",
                title="Gondola Shelving Late Delivery Notice",
                description="Supplier reports delay on gondola shelving without date or reason",
                raw_content="Vendor emailed saying shelving delivery will be late due to steel shortage. Please advise.",
                intake_source="email",
                request_type="supplier_issue",
                status="Needs Information",
                priority="medium",
                created_by_id=operator_user.id if operator_user else 1,
                has_conflicts=False,
                has_missing_info=True,
                is_duplicate=False,
                requires_approval=False,
                created_at=datetime.datetime.utcnow() - datetime.timedelta(hours=6)
            )
            db.add(req3)
            db.flush()
            
            req3_facts = ExtractedFacts(
                request_id=req3.id,
                issue_type="supplier_issue",
                location="Operational Facility",
                target_entity="Gondola Shelving",
                requested_quantity=None,
                available_quantity=None,
                delay_days=None,
                deadline=None,
                supplier_name=None,
                dependencies=json.dumps([]),
                missing_fields=json.dumps([
                    "Target resolution deadline",
                    "Supplier name / vendor ID",
                    "Operational site / store location",
                    "Specific delay duration in days",
                    "Order quantity"
                ]),
                source_spans=json.dumps({"issue_type": "shelving delivery will be late"}),
                conflict_details=json.dumps({}),
                confidence_score=0.42,
                is_corrected=False
            )
            db.add(req3_facts)
            
            req3_audit = AuditEvent(
                request_id=req3.id,
                actor_name="OpsPilot Intake Agent",
                actor_role="AI_AGENT",
                is_ai=True,
                action="MISSING_INFORMATION_FLAGGED",
                previous_value=None,
                new_value="5 critical fields missing",
                reason="Request routed to 'Needs Information' pending vendor clarification",
                created_at=datetime.datetime.utcnow() - datetime.timedelta(hours=6)
            )
            db.add(req3_audit)
            db.commit()

    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
    print("Database seeded successfully.")
