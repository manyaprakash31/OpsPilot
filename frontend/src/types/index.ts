export type UserRole = 'operator' | 'operations_manager' | 'lead_approver' | 'admin';

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface ExtractedFacts {
  id?: number;
  request_id?: number;
  issue_type: string;
  location?: string | null;
  target_entity?: string | null;
  requested_quantity?: number | null;
  available_quantity?: number | null;
  delay_days?: number | null;
  deadline?: string | null;
  supplier_name?: string | null;
  estimated_cost?: number | null;
  dependencies: string[];
  missing_fields: string[];
  source_spans: Record<string, string>;
  conflict_details: Record<string, any>;
  confidence_score: number;
  is_corrected: boolean;
  created_at?: string;
  updated_at?: string | null;
}

export interface RiskAssessment {
  id: number;
  request_id: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  severity_score: number;
  operational_impact: string;
  financial_impact?: string | null;
  schedule_delay_days: number;
  deadline_urgency: 'immediate' | 'high' | 'normal';
  supporting_evidence: string[];
  created_at: string;
}

export interface Recommendation {
  id: number;
  request_id: number;
  action_key: string;
  title: string;
  description: string;
  feasibility: 'high' | 'medium' | 'low';
  estimated_cost: number;
  pros: string[];
  cons: string[];
  trade_offs?: string | null;
  required_approvals: string[];
  is_selected: boolean;
  created_at: string;
}

export interface Approval {
  id: number;
  request_id: number;
  requested_action: string;
  cost: number;
  justification: string;
  evidence_summary: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_by_id: number;
  approver_id?: number | null;
  approved_at?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  created_at: string;
}

export interface AuditEvent {
  id: number;
  request_id: number;
  actor_name: string;
  actor_role: string;
  is_ai: boolean;
  action: string;
  previous_value?: string | null;
  new_value?: string | null;
  reason?: string | null;
  metadata_json?: string | null;
  created_at: string;
}

export interface Clarification {
  id: number;
  request_id: number;
  author_name: string;
  message: string;
  is_system: boolean;
  created_at: string;
}

export interface CommunicationDraft {
  id: number;
  request_id: number;
  draft_type: string;
  recipient: string;
  subject: string;
  body: string;
  status: 'draft' | 'approved' | 'sent';
  created_at: string;
}

export interface OperationalRequestSummary {
  id: number;
  request_code: string;
  title: string;
  raw_content: string;
  intake_source: string;
  request_type: string;
  status: string;
  priority: string;
  has_conflicts: boolean;
  has_missing_info: boolean;
  is_duplicate: boolean;
  requires_approval: boolean;
  approval_status: string;
  created_at: string;
  updated_at?: string | null;
  created_by?: User | null;
}

export interface ClosureConditionItem {
  name: string;
  satisfied: boolean;
  description: string;
}

export interface ClosureValidationResult {
  is_ready_for_resolution: boolean;
  is_ready_for_closure: boolean;
  conditions: ClosureConditionItem[];
  blockers: string[];
  next_actions: string[];
}

export interface UncertaintyBreakdown {
  confidence_score: number;
  confidence_percent: number;
  explanation: string;
  penalties: string[];
  verified_attributes_count: number;
}

export interface OperationalRequestDetail extends OperationalRequestSummary {
  facts?: ExtractedFacts | null;
  risk?: RiskAssessment | null;
  recommendations: Recommendation[];
  approvals: Approval[];
  audit_events: AuditEvent[];
  clarifications: Clarification[];
  communication_drafts: CommunicationDraft[];
  closure_validation?: ClosureValidationResult;
  uncertainty_breakdown?: UncertaintyBreakdown;
}

export interface InventoryItem {
  id: number;
  sku: string;
  name: string;
  location: string;
  current_stock: number;
  reserved_stock: number;
  unit: string;
  unit_cost: number;
  last_verified_at: string;
}

export interface Supplier {
  id: number;
  code: string;
  name: string;
  contact_email: string;
  phone?: string | null;
  lead_time_days: number;
  rating: number;
  reliability_tier: string;
}

export interface DashboardStats {
  total_requests: number;
  pending_approvals: number;
  overdue_requests: number;
  high_risk_requests: number;
  in_progress_count: number;
  resolved_count: number;
  blocked_count: number;
}
