import React from 'react';
import { DashboardStats, OperationalRequestSummary } from '../types';
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  FileWarning, 
  ArrowUpRight, 
  Layers, 
  ShieldAlert,
  Flame,
  CheckCheck
} from 'lucide-react';

interface DashboardViewProps {
  stats: DashboardStats | null;
  queue: OperationalRequestSummary[];
  onSelectRequest: (id: number) => void;
  onNavigateToInbox: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  queue,
  onSelectRequest,
  onNavigateToInbox,
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Awaiting Approval':
        return 'bg-accent-faint text-accent border-accent-border font-semibold';
      case 'Needs Information':
        return 'bg-paper-hover text-ink-muted border-paper-border';
      case 'Under Review':
        return 'bg-sage-light text-sage-dark border-sage';
      case 'Approved':
      case 'Resolved':
      case 'Closed':
        return 'bg-opstatus-success/10 text-opstatus-success border-opstatus-success/30';
      case 'Blocked':
      case 'Rejected':
        return 'bg-opstatus-critical/10 text-opstatus-critical border-opstatus-critical/30';
      default:
        return 'bg-paper-surface text-ink border-paper-border';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'text-opstatus-critical font-bold';
      case 'high':
        return 'text-accent font-semibold';
      default:
        return 'text-ink-muted';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-paper-border pb-6 gap-4">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-ink-faint font-semibold flex items-center gap-2">
            <span>OPERATIONAL SITUATION REPORT</span>
            <span>•</span>
            <span className="text-sage font-medium">LIVE DATABASE SYNCHRONIZED</span>
          </div>
          <h2 className="font-serif text-3xl font-bold text-ink mt-1">
            Operations Command Dashboard
          </h2>
          <p className="text-sm text-ink-muted mt-1 max-w-2xl font-sans">
            Continuous synthesis of supply disruptions, warehouse stock discrepancies, and critical expenditure approvals.
          </p>
        </div>

        <button
          onClick={onNavigateToInbox}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-ink text-paper text-xs font-mono uppercase tracking-wider rounded hover:bg-ink-muted transition-colors shadow-subtle shrink-0"
        >
          <span>Intake New Incident</span>
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      {/* Database Derived Metrics Ledger */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Metric 1 */}
        <div className="bg-paper-card border border-paper-border p-4 flex flex-col justify-between">
          <div className="font-mono text-[11px] uppercase tracking-wider text-ink-faint flex items-center justify-between">
            <span>Total Requests</span>
            <Layers className="w-3.5 h-3.5 text-ink-subtle" />
          </div>
          <div className="mt-3">
            <span className="font-mono text-2xl font-bold tabular-nums text-ink">
              {stats?.total_requests ?? '—'}
            </span>
          </div>
          <div className="mt-1 text-[11px] font-sans text-ink-muted">
            All logged incidents
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-paper-card border border-paper-border p-4 flex flex-col justify-between border-l-4 border-l-accent">
          <div className="font-mono text-[11px] uppercase tracking-wider text-ink-faint flex items-center justify-between">
            <span>Pending Approvals</span>
            <AlertCircle className="w-3.5 h-3.5 text-accent" />
          </div>
          <div className="mt-3">
            <span className="font-mono text-2xl font-bold tabular-nums text-accent">
              {stats?.pending_approvals ?? '—'}
            </span>
          </div>
          <div className="mt-1 text-[11px] font-sans text-ink-muted">
            Requires lead sign-off
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-paper-card border border-paper-border p-4 flex flex-col justify-between border-l-4 border-l-opstatus-critical">
          <div className="font-mono text-[11px] uppercase tracking-wider text-ink-faint flex items-center justify-between">
            <span>Critical / High Risk</span>
            <Flame className="w-3.5 h-3.5 text-opstatus-critical" />
          </div>
          <div className="mt-3">
            <span className="font-mono text-2xl font-bold tabular-nums text-opstatus-critical">
              {stats?.high_risk_requests ?? '—'}
            </span>
          </div>
          <div className="mt-1 text-[11px] font-sans text-ink-muted">
            Severe launch exposure
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-paper-card border border-paper-border p-4 flex flex-col justify-between">
          <div className="font-mono text-[11px] uppercase tracking-wider text-ink-faint flex items-center justify-between">
            <span>Needs Info / Blocked</span>
            <FileWarning className="w-3.5 h-3.5 text-ink-subtle" />
          </div>
          <div className="mt-3">
            <span className="font-mono text-2xl font-bold tabular-nums text-ink">
              {(stats?.overdue_requests ?? 0) + (stats?.blocked_count ?? 0)}
            </span>
          </div>
          <div className="mt-1 text-[11px] font-sans text-ink-muted">
            Missing vendor facts
          </div>
        </div>

        {/* Metric 5 */}
        <div className="bg-paper-card border border-paper-border p-4 flex flex-col justify-between">
          <div className="font-mono text-[11px] uppercase tracking-wider text-ink-faint flex items-center justify-between">
            <span>In Progress</span>
            <Clock className="w-3.5 h-3.5 text-ink-subtle" />
          </div>
          <div className="mt-3">
            <span className="font-mono text-2xl font-bold tabular-nums text-ink">
              {stats?.in_progress_count ?? '—'}
            </span>
          </div>
          <div className="mt-1 text-[11px] font-sans text-ink-muted">
            Active logistics execution
          </div>
        </div>

        {/* Metric 6 */}
        <div className="bg-paper-card border border-paper-border p-4 flex flex-col justify-between">
          <div className="font-mono text-[11px] uppercase tracking-wider text-ink-faint flex items-center justify-between">
            <span>Resolved / Closed</span>
            <CheckCheck className="w-3.5 h-3.5 text-opstatus-success" />
          </div>
          <div className="mt-3">
            <span className="font-mono text-2xl font-bold tabular-nums text-opstatus-success">
              {stats?.resolved_count ?? '—'}
            </span>
          </div>
          <div className="mt-1 text-[11px] font-sans text-ink-muted">
            Safely concluded cases
          </div>
        </div>
      </div>

      {/* Prioritized Operational Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-paper-border pb-2">
          <div>
            <h3 className="font-serif text-xl font-bold text-ink">
              Prioritized Operations Queue
            </h3>
            <p className="text-xs font-mono text-ink-faint">
              Ordered by urgency, approval dependencies, and warehouse discrepancy flags
            </p>
          </div>
          <span className="font-mono text-xs text-ink-muted bg-paper-hover px-2 py-1 border border-paper-border">
            {queue.length} Active Records
          </span>
        </div>

        {queue.length === 0 ? (
          <div className="p-8 text-center bg-paper-card border border-paper-border text-ink-muted text-sm">
            Operational queue is completely clear. No open incidents.
          </div>
        ) : (
          <div className="bg-paper-card border border-paper-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-paper-border bg-paper-surface font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                    <th className="py-2.5 px-4 font-semibold">Ref Code</th>
                    <th className="py-2.5 px-4 font-semibold">Title & Operational Entity</th>
                    <th className="py-2.5 px-4 font-semibold">Priority</th>
                    <th className="py-2.5 px-4 font-semibold">Workflow Status</th>
                    <th className="py-2.5 px-4 font-semibold">Evidence Signals</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-paper-border text-sm">
                  {queue.map((req) => (
                    <tr 
                      key={req.id}
                      onClick={() => onSelectRequest(req.id)}
                      className="hover:bg-paper-hover transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-ink">
                        {req.request_code}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-sans font-medium text-ink group-hover:text-accent transition-colors">
                          {req.title}
                        </div>
                        <div className="text-xs font-mono text-ink-faint mt-0.5 truncate max-w-md">
                          Source: {req.intake_source} • Type: {req.request_type.replace('_', ' ')}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs uppercase">
                        <span className={getPriorityBadge(req.priority)}>
                          {req.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 text-xs font-mono uppercase tracking-wider border ${getStatusBadge(req.status)}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">
                        <div className="flex flex-wrap gap-1.5">
                          {req.requires_approval && (
                            <span className="px-1.5 py-0.5 bg-accent-faint text-accent border border-accent-border text-[10px] uppercase font-bold">
                              APPROVAL PENDING
                            </span>
                          )}
                          {req.has_conflicts && (
                            <span className="px-1.5 py-0.5 bg-opstatus-critical/10 text-opstatus-critical border border-opstatus-critical/30 text-[10px] uppercase font-bold">
                              STOCK CONFLICT
                            </span>
                          )}
                          {req.has_missing_info && (
                            <span className="px-1.5 py-0.5 bg-paper-surface text-ink-muted border border-paper-border text-[10px] uppercase font-semibold">
                              MISSING INFO
                            </span>
                          )}
                          {req.is_duplicate && (
                            <span className="px-1.5 py-0.5 bg-paper-surface text-ink-faint border border-paper-border text-[10px] uppercase">
                              DUPLICATE
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-mono text-xs font-semibold text-accent group-hover:underline inline-flex items-center gap-1">
                          Inspect &rarr;
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
