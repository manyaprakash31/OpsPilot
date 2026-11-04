import React, { useState } from 'react';
import { AuditEvent } from '../types';
import { 
  History, 
  Bot, 
  User, 
  ShieldAlert, 
  Search, 
  Filter, 
  ArrowRight,
  Download
} from 'lucide-react';

interface AuditViewProps {
  events: AuditEvent[];
  onSelectRequest: (id: number) => void;
}

export const AuditView: React.FC<AuditViewProps> = ({ events, onSelectRequest }) => {
  const [filterType, setFilterType] = useState<'all' | 'ai' | 'human'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEvents = events.filter((e) => {
    if (filterType === 'ai' && !e.is_ai) return false;
    if (filterType === 'human' && e.is_ai) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        e.action.toLowerCase().includes(term) ||
        e.actor_name.toLowerCase().includes(term) ||
        (e.reason && e.reason.toLowerCase().includes(term)) ||
        e.request_id.toString().includes(term)
      );
    }
    return true;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Editorial Header */}
      <div className="border-b border-paper-border pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-ink-faint font-semibold flex items-center gap-2">
            <span>IMMUTABLE SYSTEM OF RECORD</span>
            <span>•</span>
            <span className="text-sage font-bold">DECISION PROVENANCE</span>
          </div>
          <h2 className="font-serif text-3xl font-bold text-ink mt-1">
            Operational Audit Trail
          </h2>
          <p className="text-sm text-ink-muted mt-1 max-w-2xl font-sans">
            Every AI extraction, human correction, state transition, and approval authorization is permanently journaled with actor identity and before-and-after diffs.
          </p>
        </div>

        <div className="font-mono text-xs text-ink-faint bg-paper-card border border-paper-border p-2">
          <span>Total Journal Entries:</span> <strong className="text-ink">{events.length}</strong>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-paper-card border border-paper-border p-3">
        <div className="flex items-center space-x-1 w-full sm:w-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 font-mono text-xs uppercase tracking-wider font-semibold transition-colors ${
              filterType === 'all' ? 'bg-ink text-paper' : 'text-ink-muted hover:bg-paper-hover'
            }`}
          >
            All Events
          </button>
          <button
            onClick={() => setFilterType('ai')}
            className={`px-3 py-1.5 font-mono text-xs uppercase tracking-wider font-semibold transition-colors flex items-center gap-1.5 ${
              filterType === 'ai' ? 'bg-ink text-paper' : 'text-ink-muted hover:bg-paper-hover'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-sage" />
            <span>AI Agents Only</span>
          </button>
          <button
            onClick={() => setFilterType('human')}
            className={`px-3 py-1.5 font-mono text-xs uppercase tracking-wider font-semibold transition-colors flex items-center gap-1.5 ${
              filterType === 'human' ? 'bg-ink text-paper' : 'text-ink-muted hover:bg-paper-hover'
            }`}
          >
            <User className="w-3.5 h-3.5 text-accent" />
            <span>Human Actions Only</span>
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-ink-faint absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search action, actor, or reason..."
            className="w-full pl-8 pr-3 py-1.5 bg-paper border border-paper-border text-xs font-mono focus:outline-none focus:border-ink"
          />
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-paper-card border border-paper-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-paper-border bg-paper-surface font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                <th className="py-2.5 px-4 font-semibold">Timestamp (UTC)</th>
                <th className="py-2.5 px-4 font-semibold">Incident Ref</th>
                <th className="py-2.5 px-4 font-semibold">Actor & Role</th>
                <th className="py-2.5 px-4 font-semibold">Action & Event</th>
                <th className="py-2.5 px-4 font-semibold">Before & After Changes</th>
                <th className="py-2.5 px-4 font-semibold">Audit Justification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-border text-sm">
              {filteredEvents.map((evt) => (
                <tr key={evt.id} className="hover:bg-paper-hover transition-colors font-mono text-xs">
                  <td className="py-3 px-4 text-ink-faint whitespace-nowrap tabular-nums">
                    {new Date(evt.created_at).toISOString().replace('T', ' ').substring(0, 19)}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => onSelectRequest(evt.request_id)}
                      className="text-accent hover:underline font-bold"
                    >
                      REQ #{evt.request_id}
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-1.5">
                      {evt.is_ai ? (
                        <span className="p-1 bg-sage-light text-ink border border-sage rounded text-[10px] uppercase font-bold flex items-center gap-1">
                          <Bot className="w-3 h-3 text-sage-dark" /> AI
                        </span>
                      ) : (
                        <span className="p-1 bg-paper-hover text-ink border border-paper-border rounded text-[10px] uppercase font-bold flex items-center gap-1">
                          <User className="w-3 h-3 text-ink-muted" /> Human
                        </span>
                      )}
                      <div>
                        <div className="font-sans font-medium text-ink leading-tight">{evt.actor_name}</div>
                        <div className="text-[10px] text-ink-faint">[{evt.actor_role}]</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-bold text-ink">
                    {evt.action}
                  </td>
                  <td className="py-3 px-4 max-w-xs truncate text-[11px]">
                    {evt.previous_value || evt.new_value ? (
                      <div className="space-y-0.5">
                        {evt.previous_value && (
                          <div className="text-opstatus-critical line-through truncate">
                            - {evt.previous_value}
                          </div>
                        )}
                        {evt.new_value && (
                          <div className="text-opstatus-success font-semibold truncate">
                            + {evt.new_value}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-ink-faint">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-ink-muted font-sans text-xs max-w-sm">
                    {evt.reason || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
