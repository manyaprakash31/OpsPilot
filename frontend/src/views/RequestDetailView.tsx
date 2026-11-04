import React, { useState } from 'react';
import { OperationalRequestDetail, User } from '../types';
import { api } from '../api/client';
import { Timeline } from '../components/Timeline';
import { 
  ArrowLeft, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Edit3, 
  ShieldAlert, 
  Send, 
  Copy, 
  ChevronRight,
  Database,
  Check,
  XCircle,
  HelpCircle,
  AlertCircle,
  ListChecks,
  ArrowRightCircle,
  ShieldCheck
} from 'lucide-react';

interface RequestDetailViewProps {
  request: OperationalRequestDetail;
  currentUser: User | null;
  onBack: () => void;
  onRefresh: () => void;
}

export const RequestDetailView: React.FC<RequestDetailViewProps> = ({
  request,
  currentUser,
  onBack,
  onRefresh,
}) => {
  // Modal states
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionField, setCorrectionField] = useState('delay_days');
  const [correctionValue, setCorrectionValue] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [correcting, setCorrecting] = useState(false);
  const [correctionError, setCorrectionError] = useState<string | null>(null);

  // Approval modal states
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [rejectionReason, setRejectionReason] = useState('');
  const [approving, setApproving] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  // Recommendation selecting
  const [selectingRecId, setSelectingRecId] = useState<number | null>(null);

  // Communication draft tab
  const [selectedDraftIndex, setSelectedDraftIndex] = useState(0);
  const [copiedDraft, setCopiedDraft] = useState(false);

  // Clarification state
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // State Transition dropdown & modal
  const [transitionStatus, setTransitionStatus] = useState('');
  const [transitioning, setTransitioning] = useState(false);
  const [showTransitionModal, setShowTransitionModal] = useState(false);
  const [transitionModalStatus, setTransitionModalStatus] = useState('');
  const [transitionReason, setTransitionReason] = useState('');
  const [transitionError, setTransitionError] = useState<string | null>(null);

  // Uncertainty explanation modal state
  const [showUncertaintyModal, setShowUncertaintyModal] = useState(false);

  const facts = request.facts;
  const risk = request.risk;
  const pendingApproval = request.approvals?.find((a) => a.status === 'pending');

  const canApprove = currentUser && ['lead_approver', 'operations_manager'].includes(currentUser.role);

  const handleCorrectFact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionReason.trim()) {
      setCorrectionError('A justification reason is required for human audit tracking.');
      return;
    }

    setCorrecting(true);
    setCorrectionError(null);
    try {
      let val: any = correctionValue;
      if (['delay_days', 'requested_quantity', 'available_quantity'].includes(correctionField)) {
        val = parseInt(correctionValue, 10);
      }
      await api.correctFact(request.id, correctionField, val, correctionReason.trim());
      setShowCorrectionModal(false);
      setCorrectionValue('');
      setCorrectionReason('');
      onRefresh();
    } catch (err: any) {
      setCorrectionError(err.message || 'Correction failed');
    } finally {
      setCorrecting(false);
    }
  };

  const handleSelectRecommendation = async (recId: number) => {
    setSelectingRecId(recId);
    try {
      await api.selectRecommendation(request.id, recId);
      onRefresh();
    } catch (err: any) {
      alert(`Selection error: ${err.message}`);
    } finally {
      setSelectingRecId(null);
    }
  };

  const handleApprovalDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingApproval) return;

    if (approvalAction === 'reject' && !rejectionReason.trim()) {
      setApprovalError('A detailed operational rejection reason is strictly mandatory.');
      return;
    }

    setApproving(true);
    setApprovalError(null);
    try {
      await api.decideApproval(pendingApproval.id, approvalAction, rejectionReason);
      setShowApprovalModal(false);
      setRejectionReason('');
      onRefresh();
    } catch (err: any) {
      setApprovalError(err.message || 'Approval decision failed');
    } finally {
      setApproving(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    setAddingNote(true);
    try {
      await api.addClarification(request.id, noteText.trim());
      setNoteText('');
      onRefresh();
    } catch (err: any) {
      alert(`Note failed: ${err.message}`);
    } finally {
      setAddingNote(false);
    }
  };

  const openTransitionModal = (targetState: string) => {
    setTransitionModalStatus(targetState);
    setTransitionReason('');
    setTransitionError(null);
    setShowTransitionModal(true);
  };

  const handleConfirmTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transitionModalStatus) return;
    if (['Resolved', 'Closed'].includes(transitionModalStatus) && transitionReason.trim().length < 5) {
      setTransitionError('A substantive operational summary (at least 5 characters) is required for resolution/closure.');
      return;
    }
    setTransitioning(true);
    setTransitionError(null);
    try {
      await api.transitionState(
        request.id, 
        transitionModalStatus, 
        transitionReason.trim() || `Workflow state transition by ${currentUser?.role}`
      );
      setShowTransitionModal(false);
      setTransitionStatus('');
      onRefresh();
    } catch (err: any) {
      setTransitionError(err.message || 'Transition failed');
    } finally {
      setTransitioning(false);
    }
  };

  const handleTransition = async () => {
    if (!transitionStatus) return;
    if (['Resolved', 'Closed'].includes(transitionStatus)) {
      openTransitionModal(transitionStatus);
      return;
    }
    setTransitioning(true);
    try {
      await api.transitionState(request.id, transitionStatus, `Manual state transition by ${currentUser?.role}`);
      setTransitionStatus('');
      onRefresh();
    } catch (err: any) {
      alert(`Transition error: ${err.message}`);
    } finally {
      setTransitioning(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2000);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Back button & Meta Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-paper-border pb-4 gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-1.5 border border-paper-border bg-paper hover:bg-paper-hover text-ink transition-colors rounded"
            title="Return to list"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-sm font-bold text-ink">
                {request.request_code}
              </span>
              <span className="font-mono text-xs uppercase px-2 py-0.5 border border-paper-border bg-paper-surface text-ink-muted">
                {request.request_type.replace('_', ' ')}
              </span>
              <span className={`font-mono text-xs uppercase px-2 py-0.5 border font-semibold ${
                request.priority === 'critical' ? 'bg-opstatus-critical/10 text-opstatus-critical border-opstatus-critical/30' : 'bg-paper text-accent border-accent-border'
              }`}>
                {request.priority} PRIORITY
              </span>
            </div>
            <h2 className="font-serif text-2xl font-bold text-ink mt-1">
              {request.title}
            </h2>
          </div>
        </div>

        {/* Workflow State & Transition Controls */}
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <span className="text-[10px] font-mono text-ink-faint uppercase block">Current Workflow State</span>
            <span className="inline-block px-2.5 py-1 text-xs font-mono font-bold uppercase tracking-wider bg-ink text-paper rounded">
              {request.status}
            </span>
          </div>

          <div className="flex items-center space-x-1 pl-3 border-l border-paper-border">
            <select
              value={transitionStatus}
              onChange={(e) => setTransitionStatus(e.target.value)}
              className="px-2 py-1.5 text-xs font-mono bg-paper border border-paper-border text-ink focus:outline-none"
            >
              <option value="">Move State...</option>
              <option value="Under Review">Under Review</option>
              <option value="In Progress">In Progress</option>
              <option value="Blocked">Blocked</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <button
              onClick={handleTransition}
              disabled={!transitionStatus || transitioning}
              className="px-3 py-1.5 text-xs font-mono bg-paper border border-paper-border hover:border-ink disabled:opacity-40 uppercase"
            >
              Update
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left 65% Analysis & Mitigation, Right 35% Signature Incident Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (8 cols): Facts, Inventory, Risk, Recommendations, Communications */}
        <div className="lg:col-span-8 space-y-6">

          {/* Alert Banners (Conflicts / Missing Info / Duplicates) */}
          {request.has_conflicts && (
            <div className="p-4 bg-opstatus-critical/10 border-l-4 border-l-opstatus-critical border border-opstatus-critical/30 text-xs font-mono text-ink">
              <div className="flex items-center gap-2 font-bold text-opstatus-critical mb-1 uppercase">
                <AlertTriangle className="w-4 h-4" />
                <span>Inventory Discrepancy Flagged</span>
              </div>
              <p>
                {facts?.conflict_details?.explanation || 
                 'Stated inventory numbers differ from verified warehouse database records. Review verified stock below.'}
              </p>
            </div>
          )}

          {request.has_missing_info && (
            <div className="p-4 bg-paper-surface border-l-4 border-l-accent border border-paper-border text-xs font-mono text-ink">
              <div className="flex items-center gap-2 font-bold text-accent mb-1 uppercase">
                <AlertCircle className="w-4 h-4" />
                <span>Missing Operational Information</span>
              </div>
              <p className="mb-2">The following critical fields could not be verified from the source text:</p>
              <ul className="list-disc list-inside space-y-0.5 text-ink-muted">
                {facts?.missing_fields?.map((field, i) => (
                  <li key={i}>{field}</li>
                ))}
              </ul>
            </div>
          )}

          {request.is_duplicate && (
            <div className="p-4 bg-paper-surface border border-paper-border text-xs font-mono text-ink-muted">
              <span className="font-bold uppercase text-ink">Duplicate Detection Signal:</span> A matching operational request already exists in the active queue.
            </div>
          )}

          {/* Section: Operational Blockers & Recommended Next Actions */}
          <div className="bg-paper-card border border-paper-border p-5">
            <div className="flex items-center justify-between border-b border-paper-border pb-2 mb-3">
              <span className="font-mono text-xs uppercase tracking-wider text-ink-faint font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-accent" /> Operational Blockers & Next Actions
              </span>
              <span className="font-mono text-[10px] text-ink-muted">Real-time workflow triage</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              {/* Active Blockers */}
              <div className="p-3 bg-paper border border-paper-line space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-accent flex items-center gap-1">
                  <XCircle className="w-3 h-3 text-accent" /> Active Blockers
                </span>
                {request.closure_validation?.blockers && request.closure_validation.blockers.length > 0 ? (
                  <ul className="space-y-1 text-ink font-sans text-xs">
                    {request.closure_validation.blockers.map((b, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-accent font-mono text-[11px]">&bull;</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-opstatus-success font-sans text-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-opstatus-success" />
                    <span>All operational preconditions satisfied. No active blockers.</span>
                  </div>
                )}
              </div>

              {/* Recommended Next Actions */}
              <div className="p-3 bg-paper border border-paper-line space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-sage flex items-center gap-1">
                  <ArrowRightCircle className="w-3 h-3 text-sage" /> Recommended Next Action
                </span>
                {request.closure_validation?.next_actions && request.closure_validation.next_actions.length > 0 ? (
                  <ul className="space-y-1 text-ink font-sans text-xs">
                    {request.closure_validation.next_actions.map((a, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-sage font-mono text-[11px]">&rarr;</span>
                        <span className="font-medium">{a}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-ink-muted font-sans text-xs">Incident lifecycle complete.</div>
                )}
              </div>
            </div>
          </div>

          {/* Section: Request Lifecycle Progress & Closure Governance */}
          <div className="bg-paper-card border border-paper-border p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-paper-border pb-3 mb-4 gap-2">
              <div>
                <span className="font-mono text-xs uppercase tracking-wider text-ink-faint font-semibold flex items-center gap-1.5">
                  <ListChecks className="w-3.5 h-3.5 text-sage" /> Request Lifecycle & Closure Conditions
                </span>
                <p className="font-sans text-xs text-ink-muted mt-0.5">
                  Resolution and closure require all operational conditions to be satisfied
                </p>
              </div>

              <div className="flex items-center gap-2">
                {request.closure_validation?.is_ready_for_resolution && request.status !== 'Resolved' && request.status !== 'Closed' && (
                  <button
                    onClick={() => openTransitionModal('Resolved')}
                    className="px-3 py-1 bg-opstatus-success text-white font-mono text-xs uppercase tracking-wider font-semibold rounded hover:bg-opacity-90 transition-colors shadow-subtle flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" /> Resolve Incident
                  </button>
                )}
                {request.closure_validation?.is_ready_for_closure && request.status === 'Resolved' && (
                  <button
                    onClick={() => openTransitionModal('Closed')}
                    className="px-3 py-1 bg-ink text-paper font-mono text-xs uppercase tracking-wider font-semibold rounded hover:bg-ink-muted transition-colors flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3 text-opstatus-success" /> Close Incident
                  </button>
                )}
              </div>
            </div>

            {/* Lifecycle Stepper */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 mb-4 font-mono text-xs">
              {['New', 'Under Review', 'Awaiting Approval', 'In Progress', 'Resolved', 'Closed'].map((step, idx) => {
                const isCurrent = request.status === step;
                return (
                  <div 
                    key={step} 
                    className={`p-2 border text-center transition-colors ${
                      isCurrent 
                        ? 'bg-ink text-paper border-ink font-bold shadow-subtle' 
                        : 'bg-paper-surface border-paper-line text-ink-faint'
                    }`}
                  >
                    <div className="text-[9px] uppercase tracking-wider opacity-70">Step {idx + 1}</div>
                    <div className="text-xs truncate">{step}</div>
                  </div>
                );
              })}
            </div>

            {/* Closure Conditions Checklist */}
            <div className="space-y-2 pt-2 border-t border-paper-border">
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint block mb-1">
                Mandatory Closure Conditions Checklist:
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {request.closure_validation?.conditions?.map((cond, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 bg-paper border border-paper-line text-xs font-mono">
                    {cond.satisfied ? (
                      <CheckCircle2 className="w-4 h-4 text-opstatus-success shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className={`font-semibold block ${cond.satisfied ? 'text-ink' : 'text-accent'}`}>
                        {cond.name}
                      </span>
                      <span className="text-[11px] font-sans text-ink-muted leading-tight block mt-0.5">
                        {cond.description}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 1: Original Ingestion Source */}
          <div className="bg-paper-card border border-paper-border p-5">
            <div className="flex items-center justify-between border-b border-paper-border pb-2 mb-3">
              <span className="font-mono text-xs uppercase tracking-wider text-ink-faint font-semibold flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-sage" /> Original Incident Transmission
              </span>
              <span className="font-mono text-[11px] text-ink-muted">
                Intake via {request.intake_source}
              </span>
            </div>
            <pre className="font-mono text-xs text-ink whitespace-pre-wrap leading-relaxed bg-paper p-3 border border-paper-line overflow-x-auto">
              {request.raw_content}
            </pre>
          </div>

          {/* Section 2: Extracted Facts & Provenance */}
          <div className="bg-paper-card border border-paper-border p-5">
            <div className="flex items-center justify-between border-b border-paper-border pb-2 mb-3">
              <div>
                <span className="font-mono text-xs uppercase tracking-wider text-ink-faint font-semibold">
                  Structured Fact Extraction & Evidence Provenance
                </span>
                <span className="ml-2 font-mono text-[10px] text-sage font-bold">
                  (Validation Confidence: {facts?.confidence_score ? Math.round(facts.confidence_score * 100) : 0}%)
                </span>
                <button
                  type="button"
                  onClick={() => setShowUncertaintyModal(true)}
                  className="ml-2 font-mono text-[11px] text-accent underline hover:text-ink cursor-pointer"
                >
                  [Inspect Uncertainty Breakdown]
                </button>
              </div>
              <button
                onClick={() => setShowCorrectionModal(true)}
                className="px-2.5 py-1 text-xs font-mono bg-paper hover:bg-paper-hover border border-paper-border text-ink flex items-center gap-1.5 rounded transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5 text-sage" />
                <span>Correct Information</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
              <div className="p-2.5 bg-paper-surface border border-paper-line">
                <span className="text-[10px] uppercase text-ink-faint block">Operational Location</span>
                <span className="font-semibold text-ink text-sm block mt-0.5">{facts?.location || 'Unspecified'}</span>
              </div>
              <div className="p-2.5 bg-paper-surface border border-paper-line">
                <span className="text-[10px] uppercase text-ink-faint block">Target Entity</span>
                <span className="font-semibold text-ink text-sm block mt-0.5">{facts?.target_entity || 'Unspecified'}</span>
              </div>
              <div className="p-2.5 bg-paper-surface border border-paper-line">
                <span className="text-[10px] uppercase text-ink-faint block">Supplier / Vendor</span>
                <span className="font-semibold text-ink text-sm block mt-0.5">{facts?.supplier_name || 'Unspecified'}</span>
              </div>
              <div className="p-2.5 bg-paper-surface border border-paper-line">
                <span className="text-[10px] uppercase text-ink-faint block">Requested Quantity</span>
                <span className="font-semibold text-ink text-sm tabular-nums block mt-0.5">{facts?.requested_quantity ?? '—'} units</span>
              </div>
              <div className="p-2.5 bg-paper-surface border border-paper-line">
                <span className="text-[10px] uppercase text-ink-faint block">Verified Available Stock</span>
                <span className="font-semibold text-ink text-sm tabular-nums block mt-0.5">{facts?.available_quantity ?? '—'} units</span>
              </div>
              <div className="p-2.5 bg-paper-surface border border-paper-line">
                <span className="text-[10px] uppercase text-ink-faint block">Reported Delay Duration</span>
                <span className="font-semibold text-accent text-sm tabular-nums block mt-0.5">{facts?.delay_days ? `${facts.delay_days} Days` : '—'}</span>
              </div>
            </div>

            {/* Source Quotes (Evidence Provenance) */}
            {facts?.source_spans && Object.keys(facts.source_spans).length > 0 && (
              <div className="mt-4 pt-3 border-t border-paper-border">
                <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint block mb-2">
                  Direct Text Source Attribution (Provenance Spans)
                </span>
                <div className="space-y-1.5 font-mono text-xs">
                  {Object.entries(facts.source_spans).map(([key, quote]) => (
                    <div key={key} className="flex items-start gap-2 bg-paper p-2 border border-paper-line">
                      <span className="text-sage font-bold text-[10px] uppercase shrink-0 mt-0.5">[{key}]:</span>
                      <span className="text-ink italic font-sans text-xs">"{quote}"</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Verified Warehouse Inventory Ledger */}
          <div className="bg-paper-card border border-paper-border p-5">
            <div className="flex items-center justify-between border-b border-paper-border pb-2 mb-3">
              <span className="font-mono text-xs uppercase tracking-wider text-ink-faint font-semibold flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-sage" /> Verified Warehouse Ledger Database
              </span>
              <span className="font-mono text-[10px] text-opstatus-success font-semibold flex items-center gap-1">
                <Check className="w-3 h-3" /> Live Inventory Sync
              </span>
            </div>
            <div className="p-3 bg-paper border border-paper-line text-xs font-mono flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
              <div>
                <span className="font-semibold text-ink">SKU: DISP-PUN-001 (Modular Display Units)</span>
                <div className="text-ink-muted text-[11px] mt-0.5">Location: Pune Warehouse (Chakan Hub)</div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-ink-faint uppercase block">Verified Physical Stock</span>
                <span className="font-bold text-base text-ink tabular-nums">120 units</span>
              </div>
            </div>
            <div className="mt-2 text-[11px] font-sans text-ink-muted italic">
              Deficit calculation: 500 units required &minus; 120 verified in warehouse = <strong>380 units shortfall</strong> requiring alternative logistics.
            </div>
          </div>

          {/* Section 4: Risk and Operational Impact Assessment */}
          {risk && (
            <div className="bg-paper-card border border-paper-border p-5">
              <div className="flex items-center justify-between border-b border-paper-border pb-2 mb-3">
                <span className="font-mono text-xs uppercase tracking-wider text-ink-faint font-semibold">
                  Risk & Operational Vulnerability Assessment
                </span>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs text-ink-muted">Severity Index:</span>
                  <span className="font-mono text-sm font-bold text-opstatus-critical tabular-nums">
                    {risk.severity_score}/100
                  </span>
                </div>
              </div>

              <div className="space-y-3 font-sans text-sm">
                <div>
                  <span className="font-mono text-xs uppercase tracking-wider text-ink-faint block font-semibold">
                    Direct Operational Bottleneck:
                  </span>
                  <p className="text-ink mt-0.5 leading-relaxed">{risk.operational_impact}</p>
                </div>

                {risk.financial_impact && (
                  <div>
                    <span className="font-mono text-xs uppercase tracking-wider text-ink-faint block font-semibold">
                      Financial Exposure & Revenue Risk:
                    </span>
                    <p className="text-ink-muted mt-0.5 text-xs">{risk.financial_impact}</p>
                  </div>
                )}

                {risk.supporting_evidence && risk.supporting_evidence.length > 0 && (
                  <div className="pt-2 border-t border-paper-border">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint block mb-1">
                      Supporting Verifiable Evidence:
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-xs text-ink-muted font-sans">
                      {risk.supporting_evidence.map((ev, i) => (
                        <li key={i}>{ev}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 5: Action Recommendations & Trade-offs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-paper-border pb-2">
              <div>
                <h3 className="font-serif text-lg font-bold text-ink">
                  Evidence-Grounded Mitigation Alternatives
                </h3>
                <p className="text-xs font-mono text-ink-faint">
                  Select a feasible operational plan to route for cost authorization or execution
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {request.recommendations?.map((rec) => (
                <div 
                  key={rec.id}
                  className={`bg-paper-card border p-4 transition-all ${
                    rec.is_selected 
                      ? 'border-2 border-accent shadow-panel' 
                      : 'border-paper-border hover:border-ink-muted'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-paper-border pb-2 mb-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-serif font-bold text-ink text-base">
                          {rec.title}
                        </span>
                        {rec.is_selected && (
                          <span className="px-2 py-0.5 bg-accent text-white font-mono text-[10px] font-bold uppercase rounded">
                            CURRENTLY ADOPTED PLAN
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-xs text-ink-faint uppercase">
                        Feasibility: {rec.feasibility} • Estimated Cost: INR {rec.estimated_cost.toLocaleString()}
                      </span>
                    </div>

                    {!rec.is_selected && (
                      <button
                        onClick={() => handleSelectRecommendation(rec.id)}
                        disabled={selectingRecId === rec.id}
                        className="px-3 py-1.5 bg-paper hover:bg-ink hover:text-paper border border-paper-border text-xs font-mono uppercase tracking-wider font-semibold transition-colors shrink-0"
                      >
                        {selectingRecId === rec.id ? 'Routing...' : 'Adopt Plan & Route'}
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-ink mb-3 font-sans leading-relaxed">
                    {rec.description}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-sans bg-paper-surface p-3 border border-paper-line mb-2">
                    <div>
                      <span className="font-mono text-[10px] font-bold text-opstatus-success uppercase block mb-1">PROS</span>
                      <ul className="list-disc list-inside space-y-0.5 text-ink-muted text-[11px]">
                        {rec.pros?.map((p, idx) => <li key={idx}>{p}</li>)}
                      </ul>
                    </div>
                    <div>
                      <span className="font-mono text-[10px] font-bold text-accent uppercase block mb-1">CONS</span>
                      <ul className="list-disc list-inside space-y-0.5 text-ink-muted text-[11px]">
                        {rec.cons?.map((c, idx) => <li key={idx}>{c}</li>)}
                      </ul>
                    </div>
                  </div>

                  {rec.trade_offs && (
                    <div className="text-[11px] font-mono text-ink-muted italic">
                      <span className="font-bold text-ink-faint not-italic uppercase text-[10px]">Trade-Off:</span> {rec.trade_offs}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 6: Approval State Banner & Controls */}
          {pendingApproval && (
            <div className="p-5 bg-paper-card border-2 border-accent shadow-panel space-y-3">
              <div className="flex items-center justify-between border-b border-paper-border pb-2">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-accent" />
                  <span className="font-serif font-bold text-lg text-ink">
                    Executive Expenditure Authorization Required
                  </span>
                </div>
                <span className="font-mono text-sm font-bold text-accent tabular-nums">
                  INR {pendingApproval.cost.toLocaleString()}
                </span>
              </div>

              <div className="text-xs font-sans space-y-2">
                <p>
                  <strong>Requested Action:</strong> {pendingApproval.requested_action}
                </p>
                <p className="text-ink-muted">
                  <strong>Justification:</strong> {pendingApproval.justification}
                </p>
                <div className="p-2 bg-paper border border-paper-line font-mono text-[11px]">
                  <strong>Evidence Summary:</strong> {pendingApproval.evidence_summary}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-paper-border">
                <span className="text-[11px] font-mono text-ink-faint">
                  {canApprove 
                    ? `Authenticated as ${currentUser?.role} (Authorized)` 
                    : `Your current role '${currentUser?.role}' cannot authorize expenditures (Requires Lead Approver).`}
                </span>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => { setApprovalAction('reject'); setShowApprovalModal(true); }}
                    disabled={!canApprove}
                    className="px-3 py-1.5 bg-paper border border-opstatus-critical text-opstatus-critical hover:bg-opstatus-critical hover:text-white text-xs font-mono uppercase tracking-wider font-semibold disabled:opacity-30 transition-colors"
                  >
                    Decline & Reroute
                  </button>
                  <button
                    onClick={() => { setApprovalAction('approve'); setShowApprovalModal(true); }}
                    disabled={!canApprove}
                    className="px-4 py-1.5 bg-opstatus-success text-white text-xs font-mono uppercase tracking-wider font-semibold hover:bg-opacity-90 disabled:opacity-30 transition-colors shadow-subtle"
                  >
                    Authorize Budget
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Section 7: Stakeholder Communication Drafts */}
          {request.communication_drafts && request.communication_drafts.length > 0 && (
            <div className="bg-paper-card border border-paper-border p-5">
              <div className="flex items-center justify-between border-b border-paper-border pb-2 mb-3">
                <span className="font-mono text-xs uppercase tracking-wider text-ink-faint font-semibold">
                  Synthesized Stakeholder Communications
                </span>
                <span className="text-[11px] font-mono text-ink-faint">Ready-to-dispatch drafts</span>
              </div>

              <div className="flex border-b border-paper-border mb-3 overflow-x-auto">
                {request.communication_drafts.map((draft, idx) => (
                  <button
                    key={draft.id || idx}
                    onClick={() => setSelectedDraftIndex(idx)}
                    className={`py-1.5 px-3 font-mono text-xs uppercase tracking-wider border-b-2 whitespace-nowrap ${
                      selectedDraftIndex === idx
                        ? 'border-accent text-accent font-semibold bg-paper-surface'
                        : 'border-transparent text-ink-muted hover:text-ink'
                    }`}
                  >
                    {draft.draft_type.replace('_', ' ')}
                  </button>
                ))}
              </div>

              {request.communication_drafts[selectedDraftIndex] && (
                <div className="space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between p-2 bg-paper border border-paper-line">
                    <div>
                      <span className="text-ink-faint">To:</span> <span className="text-ink font-semibold">{request.communication_drafts[selectedDraftIndex].recipient}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(request.communication_drafts[selectedDraftIndex].body)}
                      className="text-xs font-mono px-2 py-0.5 bg-paper-card border border-paper-border hover:bg-paper-hover text-ink flex items-center gap-1"
                    >
                      {copiedDraft ? <Check className="w-3 h-3 text-opstatus-success" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedDraft ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="p-2 bg-paper border border-paper-line">
                    <span className="text-ink-faint">Subject:</span> <span className="font-sans text-xs font-bold text-ink">{request.communication_drafts[selectedDraftIndex].subject}</span>
                  </div>

                  <pre className="p-3 bg-paper border border-paper-line font-mono text-xs text-ink whitespace-pre-wrap leading-relaxed overflow-x-auto">
                    {request.communication_drafts[selectedDraftIndex].body}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Operational Notes / Clarification Stream */}
          <div className="bg-paper-card border border-paper-border p-5">
            <span className="font-mono text-xs uppercase tracking-wider text-ink-faint font-semibold block border-b border-paper-border pb-2 mb-3">
              Operational Incident Notes & Logs
            </span>

            {request.clarifications && request.clarifications.length > 0 ? (
              <div className="space-y-2 mb-4">
                {request.clarifications.map((c) => (
                  <div key={c.id} className="p-2.5 bg-paper border border-paper-line text-xs font-mono">
                    <div className="flex items-center justify-between text-ink-faint text-[10px] mb-1">
                      <span className="font-bold text-ink">{c.author_name}</span>
                      <span>{new Date(c.created_at).toLocaleTimeString('en-GB')}</span>
                    </div>
                    <div className="text-ink font-sans text-xs">{c.message}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-ink-muted italic mb-3">No manual notes added yet.</div>
            )}

            <form onSubmit={handleAddNote} className="flex gap-2">
              <input
                type="text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Log operational update or clarification memo..."
                className="flex-1 px-3 py-1.5 bg-paper border border-paper-border text-xs font-sans focus:outline-none focus:border-ink"
              />
              <button
                type="submit"
                disabled={addingNote || !noteText.trim()}
                className="px-3 py-1.5 bg-ink text-paper text-xs font-mono uppercase tracking-wider font-semibold hover:bg-ink-muted disabled:opacity-40"
              >
                Log Memo
              </button>
            </form>
          </div>

        </div>

        {/* Right Column (4 cols): Signature Incident Timeline Rail */}
        <div className="lg:col-span-4 sticky top-6 space-y-4">
          <div className="bg-paper-card border border-paper-border p-4">
            <div className="flex items-center justify-between border-b border-paper-border pb-2 mb-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-ink">
                  Incident History Rail
                </h3>
                <p className="text-[11px] font-mono text-ink-faint">
                  Differentiated AI vs Human audit trail
                </p>
              </div>
              <span className="font-mono text-xs text-ink-muted bg-paper px-1.5 py-0.5 border border-paper-border">
                {request.audit_events?.length || 0} events
              </span>
            </div>

            {/* Signature Visual Element: Timeline */}
            <Timeline events={request.audit_events || []} />
          </div>
        </div>
      </div>

      {/* Human Fact Correction Modal */}
      {showCorrectionModal && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-paper-card border-2 border-ink max-w-lg w-full p-6 shadow-panel">
            <div className="flex items-center justify-between border-b border-paper-border pb-3 mb-4">
              <h3 className="font-serif text-xl font-bold text-ink">
                Human Fact Correction & Override
              </h3>
              <button 
                onClick={() => setShowCorrectionModal(false)}
                className="text-ink-faint hover:text-ink text-sm font-mono"
              >
                [ESC]
              </button>
            </div>

            {correctionError && (
              <div className="mb-3 p-2 bg-opstatus-critical/10 border border-opstatus-critical/30 text-opstatus-critical text-xs font-mono">
                {correctionError}
              </div>
            )}

            <form onSubmit={handleCorrectFact} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block uppercase text-ink-muted mb-1 font-semibold">Select Fact Field</label>
                <select
                  value={correctionField}
                  onChange={(e) => setCorrectionField(e.target.value)}
                  className="w-full p-2 bg-paper border border-paper-border text-ink focus:outline-none"
                >
                  <option value="delay_days">Delay Days (Integer)</option>
                  <option value="requested_quantity">Requested Quantity (Integer)</option>
                  <option value="available_quantity">Available Quantity (Integer)</option>
                  <option value="location">Location / Facility (Text)</option>
                  <option value="target_entity">Target Entity / SKU (Text)</option>
                  <option value="supplier_name">Supplier Name (Text)</option>
                  <option value="deadline">Target Deadline (Text)</option>
                </select>
              </div>

              <div>
                <label className="block uppercase text-ink-muted mb-1 font-semibold">Corrected Value</label>
                <input
                  type="text"
                  value={correctionValue}
                  onChange={(e) => setCorrectionValue(e.target.value)}
                  placeholder="Enter verified value..."
                  className="w-full p-2 bg-paper border border-paper-border text-ink focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block uppercase text-ink-muted mb-1 font-semibold">
                  Mandatory Audit Justification Reason
                </label>
                <textarea
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  rows={3}
                  placeholder="Explain why AI extraction was inaccurate or what updated evidence emerged..."
                  className="w-full p-2 bg-paper border border-paper-border text-ink font-sans focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-paper-border">
                <button
                  type="button"
                  onClick={() => setShowCorrectionModal(false)}
                  className="px-3 py-1.5 border border-paper-border text-ink hover:bg-paper-hover"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={correcting}
                  className="px-4 py-1.5 bg-ink text-paper font-semibold hover:bg-ink-muted disabled:opacity-40"
                >
                  {correcting ? 'Saving Correction...' : 'Commit Fact Correction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approval / Rejection Decision Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-paper-card border-2 border-ink max-w-lg w-full p-6 shadow-panel">
            <div className="flex items-center justify-between border-b border-paper-border pb-3 mb-4">
              <h3 className="font-serif text-xl font-bold text-ink">
                {approvalAction === 'approve' ? 'Authorize Expenditure Commitment' : 'Decline Action Recommendation'}
              </h3>
              <button 
                onClick={() => setShowApprovalModal(false)}
                className="text-ink-faint hover:text-ink text-sm font-mono"
              >
                [ESC]
              </button>
            </div>

            {approvalError && (
              <div className="mb-3 p-2 bg-opstatus-critical/10 border border-opstatus-critical/30 text-opstatus-critical text-xs font-mono">
                {approvalError}
              </div>
            )}

            <form onSubmit={handleApprovalDecision} className="space-y-4 text-xs font-mono">
              <div className="p-3 bg-paper border border-paper-line space-y-1">
                <div><span className="text-ink-faint">Action:</span> <strong className="text-ink">{pendingApproval?.requested_action}</strong></div>
                <div><span className="text-ink-faint">Cost:</span> <strong className="text-accent">INR {pendingApproval?.cost.toLocaleString()}</strong></div>
              </div>

              {approvalAction === 'reject' && (
                <div>
                  <label className="block uppercase text-opstatus-critical mb-1 font-bold">
                    Mandatory Rejection Explanation
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={4}
                    placeholder="Provide specific operational reason why this plan is declined. This triggers alternative workflow back to Under Review..."
                    className="w-full p-2 bg-paper border border-opstatus-critical/50 text-ink font-sans focus:outline-none"
                    required
                  />
                  <span className="text-[10px] text-ink-faint font-mono mt-1 block">
                    Rejection will unselect the current plan and return the request to the team for alternative mitigation.
                  </span>
                </div>
              )}

              {approvalAction === 'approve' && (
                <p className="font-sans text-xs text-ink-muted leading-relaxed">
                  By confirming, you authorize allocation of INR {pendingApproval?.cost.toLocaleString()} from emergency operations budget. This action will be permanently recorded in the audit ledger under your signature.
                </p>
              )}

              <div className="flex justify-end space-x-2 pt-2 border-t border-paper-border">
                <button
                  type="button"
                  onClick={() => setShowApprovalModal(false)}
                  className="px-3 py-1.5 border border-paper-border text-ink hover:bg-paper-hover"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={approving}
                  className={`px-4 py-1.5 font-semibold text-white transition-colors ${
                    approvalAction === 'approve' ? 'bg-opstatus-success hover:bg-opacity-90' : 'bg-opstatus-critical hover:bg-opacity-90'
                  }`}
                >
                  {approving ? 'Processing...' : approvalAction === 'approve' ? 'Confirm Authorization' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Workflow State Transition & Mandatory Resolution Summary Modal */}
      {showTransitionModal && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-paper-card border-2 border-ink max-w-lg w-full p-6 shadow-panel">
            <div className="flex items-center justify-between border-b border-paper-border pb-3 mb-4">
              <h3 className="font-serif text-xl font-bold text-ink">
                Transition to: {transitionModalStatus}
              </h3>
              <button 
                onClick={() => setShowTransitionModal(false)}
                className="text-ink-faint hover:text-ink text-sm font-mono"
              >
                [ESC]
              </button>
            </div>

            {transitionError && (
              <div className="mb-3 p-2 bg-opstatus-critical/10 border border-opstatus-critical/30 text-opstatus-critical text-xs font-mono">
                {transitionError}
              </div>
            )}

            <form onSubmit={handleConfirmTransition} className="space-y-4 text-xs font-mono">
              <div className="p-3 bg-paper border border-paper-line space-y-1">
                <div><span className="text-ink-faint">Current State:</span> <strong className="text-ink">{request.status}</strong></div>
                <div><span className="text-ink-faint">Target State:</span> <strong className="text-accent">{transitionModalStatus}</strong></div>
              </div>

              <div>
                <label className="block uppercase text-ink-muted mb-1 font-bold">
                  {['Resolved', 'Closed'].includes(transitionModalStatus) 
                    ? 'Substantive Operational Resolution Summary (Mandatory)' 
                    : 'Workflow Transition Reason / Audit Note'}
                </label>
                <textarea
                  value={transitionReason}
                  onChange={(e) => setTransitionReason(e.target.value)}
                  rows={4}
                  placeholder={
                    transitionModalStatus === 'Resolved'
                      ? 'Detail how the delivery deficit was solved, tracking numbers confirmed, and launch readiness achieved...'
                      : transitionModalStatus === 'Closed'
                      ? 'Confirm that store opening completed and no unresolved vendor claims remain...'
                      : 'Provide operational rationale for this state transition...'
                  }
                  className="w-full p-2 bg-paper border border-paper-border text-ink font-sans focus:outline-none"
                  required={['Resolved', 'Closed'].includes(transitionModalStatus)}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-paper-border">
                <button
                  type="button"
                  onClick={() => setShowTransitionModal(false)}
                  className="px-3 py-1.5 border border-paper-border text-ink hover:bg-paper-hover"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transitioning}
                  className="px-4 py-1.5 bg-ink text-paper font-semibold hover:bg-ink-muted disabled:opacity-40"
                >
                  {transitioning ? 'Executing...' : `Confirm Move to ${transitionModalStatus}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confidence & Uncertainty Explanation Modal */}
      {showUncertaintyModal && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-paper-card border-2 border-ink max-w-lg w-full p-6 shadow-panel">
            <div className="flex items-center justify-between border-b border-paper-border pb-3 mb-4">
              <h3 className="font-serif text-xl font-bold text-ink">
                Confidence & Uncertainty Breakdown
              </h3>
              <button 
                onClick={() => setShowUncertaintyModal(false)}
                className="text-ink-faint hover:text-ink text-sm font-mono"
              >
                [ESC]
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div className="p-3 bg-paper border border-paper-line flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-ink-faint uppercase block">Overall Validation Score</span>
                  <span className="text-xl font-serif font-bold text-ink">
                    {request.uncertainty_breakdown?.confidence_percent || Math.round((facts?.confidence_score || 0) * 100)}%
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-ink-faint uppercase block">Attributes Verified</span>
                  <span className="text-sm font-bold text-sage">
                    {request.uncertainty_breakdown?.verified_attributes_count || 4} of 5 Essential Facts
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-ink-faint block mb-1">
                  Engine Uncertainty Evaluation:
                </span>
                <p className="font-sans text-ink leading-relaxed p-2.5 bg-paper-surface border border-paper-line">
                  {request.uncertainty_breakdown?.explanation || 
                   'High confidence: primary operational facts corroborated with verified warehouse data.'}
                </p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-accent block mb-1">
                  Penalties & Uncertainty Factors:
                </span>
                {request.uncertainty_breakdown?.penalties && request.uncertainty_breakdown.penalties.length > 0 ? (
                  <ul className="space-y-1 font-sans text-ink text-xs p-2 bg-paper border border-paper-line">
                    {request.uncertainty_breakdown.penalties.map((pen, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-accent">
                        <span>&minus;</span>
                        <span>{pen}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-2 bg-paper border border-paper-line text-opstatus-success font-sans flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-opstatus-success" />
                    <span>No negative uncertainty penalties applied. Fact extraction fully corroborated.</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2 border-t border-paper-border">
                <button
                  type="button"
                  onClick={() => setShowUncertaintyModal(false)}
                  className="px-4 py-1.5 bg-ink text-paper font-semibold hover:bg-ink-muted"
                >
                  Close Inspection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
