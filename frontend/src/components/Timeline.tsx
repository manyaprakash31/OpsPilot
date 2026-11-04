import React from 'react';
import { AuditEvent } from '../types';
import { Bot, User, AlertTriangle, CheckCircle, ShieldAlert, FileText, ArrowRight } from 'lucide-react';

interface TimelineProps {
  events: AuditEvent[];
  compact?: boolean;
}

export const Timeline: React.FC<TimelineProps> = ({ events, compact = false }) => {
  if (!events || events.length === 0) {
    return (
      <div className="py-8 text-center text-ink-muted text-sm border border-dashed border-paper-border bg-paper-surface">
        No audit events recorded for this operational item yet.
      </div>
    );
  }

  const formatTimestamp = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return {
        date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };
    } catch {
      return { date: '—', time: isoString };
    }
  };

  const getActionBadge = (action: string, isAi: boolean) => {
    if (action.includes('SECURITY') || action.includes('INJECTION')) {
      return {
        icon: <ShieldAlert className="w-3.5 h-3.5 text-white" />,
        color: 'bg-opstatus-critical text-white',
        border: 'border-opstatus-critical',
        label: 'SECURITY ALERT'
      };
    }
    if (action.includes('DISCREPANCY') || action.includes('CONFLICT')) {
      return {
        icon: <AlertTriangle className="w-3.5 h-3.5 text-white" />,
        color: 'bg-accent text-white',
        border: 'border-accent',
        label: 'CONFLICT FLAGGED'
      };
    }
    if (action.includes('CORRECTED')) {
      return {
        icon: <User className="w-3.5 h-3.5 text-white" />,
        color: 'bg-sage-dark text-white',
        border: 'border-sage-dark',
        label: 'HUMAN CORRECTION'
      };
    }
    if (action.includes('APPROVAL_GRANTED')) {
      return {
        icon: <CheckCircle className="w-3.5 h-3.5 text-white" />,
        color: 'bg-opstatus-success text-white',
        border: 'border-opstatus-success',
        label: 'APPROVED'
      };
    }
    if (action.includes('APPROVAL_REJECTED')) {
      return {
        icon: <AlertTriangle className="w-3.5 h-3.5 text-white" />,
        color: 'bg-opstatus-critical text-white',
        border: 'border-opstatus-critical',
        label: 'REJECTED'
      };
    }
    if (isAi) {
      return {
        icon: <Bot className="w-3.5 h-3.5 text-ink" />,
        color: 'bg-sage-light text-ink border border-sage',
        border: 'border-sage',
        label: 'AI AGENT'
      };
    }
    return {
      icon: <FileText className="w-3.5 h-3.5 text-ink" />,
      color: 'bg-paper-hover text-ink border border-paper-border',
      border: 'border-paper-border',
      label: 'HUMAN ACTION'
    };
  };

  return (
    <div className="relative pl-6 space-y-6">
      {/* Narrow vertical event rail */}
      <div 
        className="absolute top-2 bottom-2 left-2.5 w-[2px] bg-paper-border" 
        aria-hidden="true" 
      />

      {events.map((event, idx) => {
        const { date, time } = formatTimestamp(event.created_at);
        const badge = getActionBadge(event.action, event.is_ai);

        return (
          <div key={event.id || idx} className="relative group">
            {/* Event Marker on Rail */}
            <div 
              className={`absolute -left-6 top-1 w-5 h-5 rounded flex items-center justify-center ${badge.color} shadow-subtle z-10 transition-transform group-hover:scale-110`}
            >
              {badge.icon}
            </div>

            {/* Event Item Card */}
            <div className="bg-paper-card border border-paper-border p-3.5 text-sm transition-all hover:border-ink-muted">
              {/* Header: Compact timestamp, Actor, AI/Human badge */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-paper-border pb-2 mb-2">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-semibold uppercase tracking-wider px-1.5 py-0.5 border border-paper-border bg-paper-surface text-ink-muted">
                    {badge.label}
                  </span>
                  <span className="font-sans font-medium text-ink">
                    {event.actor_name}
                  </span>
                  <span className="font-mono text-xs text-ink-faint">
                    [{event.actor_role}]
                  </span>
                </div>

                <div className="font-mono text-xs text-ink-faint tabular-nums flex items-center space-x-2">
                  <span>{date}</span>
                  <span className="text-paper-border">•</span>
                  <span>{time}</span>
                </div>
              </div>

              {/* Action Description */}
              <div className="text-ink font-medium mb-1">
                {event.action.replace(/_/g, ' ')}
              </div>

              {/* Diff / Value Change (if any) */}
              {(event.previous_value !== null && event.previous_value !== undefined || 
                event.new_value !== null && event.new_value !== undefined) && (
                <div className="my-2 p-2 bg-paper-surface border border-paper-line text-xs font-mono space-y-1">
                  {event.previous_value && (
                    <div className="flex items-start space-x-2 text-ink-muted">
                      <span className="text-opstatus-critical font-bold select-none">- PREV:</span>
                      <span className="line-through">{event.previous_value}</span>
                    </div>
                  )}
                  {event.new_value && (
                    <div className="flex items-start space-x-2 text-ink">
                      <span className="text-opstatus-success font-bold select-none">+ NEW:</span>
                      <span className="font-semibold">{event.new_value}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Reason / Context */}
              {event.reason && (
                <div className="text-xs text-ink-muted mt-1.5 italic flex items-center gap-1.5">
                  <span className="font-sans not-italic font-semibold text-ink-faint uppercase text-[10px] tracking-wider">Note:</span>
                  <span>{event.reason}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
