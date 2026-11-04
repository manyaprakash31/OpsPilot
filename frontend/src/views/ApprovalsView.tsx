import React, { useState } from 'react';
import { Approval, User } from '../types';
import { api } from '../api/client';
import { 
  CheckSquare, 
  AlertCircle, 
  ShieldCheck, 
  Check, 
  X, 
  Clock, 
  ArrowUpRight,
  AlertTriangle
} from 'lucide-react';

interface ApprovalsViewProps {
  approvals: Approval[];
  currentUser: User | null;
  onSelectRequest: (requestId: number) => void;
  onRefreshApprovals: () => void;
}

export const ApprovalsView: React.FC<ApprovalsViewProps> = ({
  approvals,
  currentUser,
  onSelectRequest,
  onRefreshApprovals,
}) => {
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [decisionAction, setDecisionAction] = useState<'approve' | 'reject'>('approve');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canApprove = currentUser && ['lead_approver', 'operations_manager'].includes(currentUser.role);

  const filteredApprovals = approvals.filter((a) => {
    if (filter === 'all') return true;
    return a.status === filter;
  });

  const handleDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApproval) return;

    if (decisionAction === 'reject' && !rejectionReason.trim()) {
      setErrorMsg('A detailed operational rejection reason is strictly required.');
      return;
    }

    setProcessing(true);
    setErrorMsg(null);
    try {
      await api.decideApproval(selectedApproval.id, decisionAction, rejectionReason);
      setSelectedApproval(null);
      setRejectionReason('');
      onRefreshApprovals();
    } catch (err: any) {
      setErrorMsg(err.message || 'Decision failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Editorial Header */}
      <div className="border-b border-paper-border pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-ink-faint font-semibold flex items-center gap-2">
            <span>GOVERNANCE & FINANCIAL CONTROLS</span>
            <span>•</span>
            <span className="text-accent font-bold">EXECUTIVE AUTHORIZATION QUEUE</span>
          </div>
          <h2 className="font-serif text-3xl font-bold text-ink mt-1">
            Expenditure & Action Approvals
          </h2>
          <p className="text-sm text-ink-muted mt-1 max-w-2xl font-sans">
            Enforces strict separation of duties and budget sign-off. Operational AI recommendations never self-authorize financial disbursements.
          </p>
        </div>

        {/* RBAC Persona Alert */}
        <div className={`p-3 border text-xs font-mono rounded ${
          canApprove ? 'bg-sage-light/60 border-sage text-sage-dark' : 'bg-paper-hover border-paper-border text-ink-muted'
        }`}>
          <div className="font-bold flex items-center gap-1.5 uppercase">
            <ShieldCheck className="w-4 h-4" />
            <span>Role: {currentUser?.role}</span>
          </div>
          <div className="text-[11px] mt-0.5">
            {canApprove ? 'Authorized to approve or reject expenditures' : 'Observer only (Requires Lead Approver role)'}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-paper-border">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`py-2 px-4 font-mono text-xs uppercase tracking-wider border-b-2 font-semibold transition-all ${
              filter === tab
                ? 'border-accent text-accent bg-paper-surface'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Approvals List */}
      <div className="space-y-4">
        {filteredApprovals.length === 0 ? (
          <div className="p-12 text-center bg-paper-card border border-paper-border text-ink-muted text-sm font-sans">
            No {filter} approvals in the operational queue.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredApprovals.map((appr) => (
              <div 
                key={appr.id}
                className="bg-paper-card border border-paper-border p-5 shadow-subtle hover:border-ink-muted transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-paper-border pb-3 mb-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-ink">
                        ITEM REF #{appr.request_id}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-mono uppercase font-bold border ${
                        appr.status === 'pending'
                          ? 'bg-accent-faint text-accent border-accent-border'
                          : appr.status === 'approved'
                          ? 'bg-opstatus-success/10 text-opstatus-success border-opstatus-success/30'
                          : 'bg-opstatus-critical/10 text-opstatus-critical border-opstatus-critical/30'
                      }`}>
                        {appr.status}
                      </span>
                    </div>
                    <h3 className="font-serif text-xl font-bold text-ink mt-1">
                      {appr.requested_action}
                    </h3>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-mono uppercase text-ink-faint block">Authorized Budget Cost</span>
                    <span className="font-mono text-2xl font-bold text-accent tabular-nums">
                      INR {appr.cost.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans mb-4">
                  <div className="p-3 bg-paper-surface border border-paper-line space-y-1">
                    <span className="font-mono text-[10px] uppercase font-bold text-ink-faint block">Operational Justification</span>
                    <p className="text-ink leading-relaxed">{appr.justification}</p>
                  </div>
                  <div className="p-3 bg-paper-surface border border-paper-line space-y-1">
                    <span className="font-mono text-[10px] uppercase font-bold text-ink-faint block">Evidence Basis</span>
                    <p className="text-ink-muted leading-relaxed">{appr.evidence_summary}</p>
                  </div>
                </div>

                {appr.status === 'rejected' && appr.rejection_reason && (
                  <div className="mb-4 p-3 bg-opstatus-critical/10 border border-opstatus-critical/30 text-xs font-mono text-opstatus-critical">
                    <span className="font-bold uppercase block mb-0.5">Rejection Decision Audit:</span>
                    <p className="italic">"{appr.rejection_reason}"</p>
                    <span className="text-[10px] text-ink-faint block mt-1">Workflow automatically reverted to 'Under Review' for alternative mitigation.</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-paper-border text-xs font-mono">
                  <span className="text-ink-faint">
                    Submitted {new Date(appr.created_at).toLocaleString('en-GB')}
                  </span>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onSelectRequest(appr.request_id)}
                      className="px-3 py-1.5 border border-paper-border bg-paper hover:bg-paper-hover text-ink transition-colors flex items-center gap-1 font-semibold"
                    >
                      <span>View Full Incident</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>

                    {appr.status === 'pending' && canApprove && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedApproval(appr);
                            setDecisionAction('reject');
                          }}
                          className="px-3 py-1.5 border border-opstatus-critical text-opstatus-critical hover:bg-opstatus-critical hover:text-white transition-colors font-semibold uppercase"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => {
                            setSelectedApproval(appr);
                            setDecisionAction('approve');
                          }}
                          className="px-4 py-1.5 bg-opstatus-success text-white hover:bg-opacity-90 transition-colors font-semibold uppercase shadow-subtle"
                        >
                          Approve
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Decision Modal */}
      {selectedApproval && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-paper-card border-2 border-ink max-w-lg w-full p-6 shadow-panel">
            <div className="flex items-center justify-between border-b border-paper-border pb-3 mb-4">
              <h3 className="font-serif text-xl font-bold text-ink">
                {decisionAction === 'approve' ? 'Confirm Approval Authorization' : 'Decline Action Approval'}
              </h3>
              <button 
                onClick={() => setSelectedApproval(null)}
                className="text-ink-faint hover:text-ink text-sm font-mono"
              >
                [ESC]
              </button>
            </div>

            {errorMsg && (
              <div className="mb-3 p-2 bg-opstatus-critical/10 border border-opstatus-critical/30 text-opstatus-critical text-xs font-mono">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleDecision} className="space-y-4 text-xs font-mono">
              <div className="p-3 bg-paper border border-paper-line space-y-1">
                <div><span className="text-ink-faint">Action:</span> <strong className="text-ink">{selectedApproval.requested_action}</strong></div>
                <div><span className="text-ink-faint">Cost:</span> <strong className="text-accent">INR {selectedApproval.cost.toLocaleString()}</strong></div>
              </div>

              {decisionAction === 'reject' && (
                <div>
                  <label className="block uppercase text-opstatus-critical mb-1 font-bold">
                    Mandatory Rejection Explanation
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={4}
                    placeholder="Specify why this expenditure is declined. Rejection transitions request back to 'Under Review'..."
                    className="w-full p-2 bg-paper border border-opstatus-critical/50 text-ink font-sans focus:outline-none"
                    required
                  />
                </div>
              )}

              {decisionAction === 'approve' && (
                <p className="font-sans text-xs text-ink-muted leading-relaxed">
                  By clicking approve, you authorize disbursement of INR {selectedApproval.cost.toLocaleString()}. Your sign-off will be recorded permanently in the incident audit trail.
                </p>
              )}

              <div className="flex justify-end space-x-2 pt-2 border-t border-paper-border">
                <button
                  type="button"
                  onClick={() => setSelectedApproval(null)}
                  className="px-3 py-1.5 border border-paper-border text-ink hover:bg-paper-hover"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className={`px-4 py-1.5 font-semibold text-white transition-colors ${
                    decisionAction === 'approve' ? 'bg-opstatus-success hover:bg-opacity-90' : 'bg-opstatus-critical hover:bg-opacity-90'
                  }`}
                >
                  {processing ? 'Processing...' : decisionAction === 'approve' ? 'Authorize' : 'Decline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
