import React from 'react';
import { User } from '../types';
import { 
  LayoutDashboard, 
  Inbox, 
  CheckSquare, 
  History, 
  Database, 
  ShieldCheck, 
  LogOut,
  User as UserIcon
} from 'lucide-react';

interface NavigationProps {
  currentView: string;
  onNavigate: (view: string) => void;
  currentUser: User | null;
  onLogout: () => void;
  pendingApprovalsCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentView,
  onNavigate,
  currentUser,
  onLogout,
  pendingApprovalsCount,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Command Dashboard', icon: LayoutDashboard },
    { id: 'inbox', label: 'Operations Inbox', icon: Inbox },
    { 
      id: 'approvals', 
      label: 'Approvals Queue', 
      icon: CheckSquare,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined
    },
    { id: 'audit', label: 'Incident Audit Trail', icon: History },
    { id: 'reference', label: 'Master Reference Data', icon: Database },
  ];

  const formatRoleName = (role?: string) => {
    switch (role) {
      case 'lead_approver':
        return 'Lead Approver';
      case 'operations_manager':
        return 'Operations Manager';
      case 'operator':
        return 'Operations Specialist';
      case 'admin':
        return 'Platform Administrator';
      default:
        return role || 'Authorized User';
    }
  };

  return (
    <aside className="w-64 bg-paper-surface border-r border-paper-border flex flex-col justify-between shrink-0 h-screen sticky top-0 select-none">
      <div>
        {/* Brand Stamp */}
        <div className="p-5 border-b border-paper-border">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-widest text-ink-faint font-semibold">
              OPSPILOT // CONSOLE
            </span>
            <span className="inline-block w-2 h-2 rounded-full bg-opstatus-success animate-pulse" title="Engine Online" />
          </div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-ink mt-1">
            OpsPilot
          </h1>
          <p className="text-[11px] font-mono text-ink-muted mt-0.5">
            AI Operational Dispatch & Controls
          </p>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-mono uppercase tracking-wider rounded transition-colors text-left ${
                  isActive
                    ? 'bg-ink text-paper font-semibold shadow-subtle'
                    : 'text-ink-muted hover:bg-paper-hover hover:text-ink'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-accent' : 'text-ink-muted'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                    isActive ? 'bg-accent text-white' : 'bg-accent text-white'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Authenticated Identity & Secure Sign Out (Read-Only) */}
      <div className="p-4 border-t border-paper-border bg-paper space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-sage" /> Authenticated
            </span>
            <span className="text-[9px] font-mono uppercase text-sage-dark bg-sage-light px-1.5 py-0.2 border border-sage font-bold rounded">
              {currentUser?.role ? currentUser.role.replace('_', ' ') : 'USER'}
            </span>
          </div>

          {/* User Details Display Card (Strictly Read-Only) */}
          <div className="p-2.5 bg-paper-card border border-paper-border space-y-1">
            <div className="font-sans font-semibold text-xs text-ink truncate">
              {currentUser?.full_name || 'Authenticated Operator'}
            </div>
            <div className="font-mono text-[10px] text-ink-faint truncate">
              {formatRoleName(currentUser?.role)}
            </div>
            <div className="font-mono text-[9px] text-ink-faint truncate text-sage-dark">
              @{currentUser?.username || 'user'}
            </div>
          </div>
        </div>

        {/* Explicit Sign Out Action */}
        <button
          onClick={onLogout}
          className="w-full py-1.5 px-3 bg-paper hover:bg-paper-hover border border-paper-border text-ink-muted hover:text-ink font-mono text-xs uppercase tracking-wider font-semibold transition-colors flex items-center justify-center gap-1.5 rounded"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
