import React, { useState, useEffect } from 'react';
import { 
  User, 
  DashboardStats, 
  OperationalRequestSummary, 
  OperationalRequestDetail, 
  Approval, 
  AuditEvent 
} from './types';
import { api } from './api/client';
import { Navigation } from './components/Navigation';
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { InboxView } from './views/InboxView';
import { RequestDetailView } from './views/RequestDetailView';
import { ApprovalsView } from './views/ApprovalsView';
import { AuditView } from './views/AuditView';
import { ReferenceView } from './views/ReferenceView';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [selectedRequestDetail, setSelectedRequestDetail] = useState<OperationalRequestDetail | null>(null);

  // Global state
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [queue, setQueue] = useState<OperationalRequestSummary[]>([]);
  const [requests, setRequests] = useState<OperationalRequestSummary[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Check existing session on mount — strictly no silent auto-login
  useEffect(() => {
    const verifySession = async () => {
      const existingToken = api.getToken();
      if (existingToken) {
        try {
          const user = await api.getMe();
          setCurrentUser(user);
        } catch {
          // Token expired or invalid
          api.setToken(null);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    };
    verifySession();
  }, []);

  // Fetch application data once authenticated
  const refreshData = async () => {
    if (!api.getToken()) return;
    try {
      const [m, q, reqs, appr, aud] = await Promise.all([
        api.getDashboardMetrics(),
        api.getDashboardQueue(),
        api.getRequests(),
        api.getApprovals('all'),
        api.getAuditTrail(),
      ]);
      setStats(m);
      setQueue(q);
      setRequests(reqs);
      setApprovals(appr);
      setAuditEvents(aud);
    } catch (err: any) {
      console.error('Error refreshing ops data', err);
      if (err.message && (err.message.includes('401') || err.message.includes('credentials') || err.message.includes('terminated'))) {
        setCurrentUser(null);
        api.setToken(null);
      }
    }
  };

  useEffect(() => {
    if (currentUser) {
      refreshData();
    }
  }, [currentUser]);

  // When selectedRequestId changes, fetch full detail
  useEffect(() => {
    if (selectedRequestId !== null && currentUser) {
      const fetchDetail = async () => {
        try {
          const detail = await api.getRequest(selectedRequestId);
          setSelectedRequestDetail(detail);
        } catch (err) {
          console.error('Failed to load request detail', err);
        }
      };
      fetchDetail();
    } else {
      setSelectedRequestDetail(null);
    }
  }, [selectedRequestId, currentUser]);

  const handleSelectRequest = (id: number) => {
    setSelectedRequestId(id);
    setCurrentView('detail');
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } finally {
      setCurrentUser(null);
      setSelectedRequestId(null);
      setSelectedRequestDetail(null);
      setCurrentView('dashboard');
    }
  };

  const pendingApprovalsCount = approvals.filter((a) => a.status === 'pending').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-paper font-mono text-xs text-ink-muted">
        Verifying cryptographic session...
      </div>
    );
  }

  // If not authenticated, require explicit login
  if (!currentUser) {
    return (
      <LoginView 
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          refreshData();
        }} 
      />
    );
  }

  return (
    <div className="flex min-h-screen bg-paper text-ink font-sans">
      {/* Persistent Navigation Rail */}
      <Navigation
        currentView={currentView}
        onNavigate={(view) => {
          setCurrentView(view);
          if (view !== 'detail') setSelectedRequestId(null);
        }}
        currentUser={currentUser}
        onLogout={handleLogout}
        pendingApprovalsCount={pendingApprovalsCount}
      />

      {/* Main Operational View Content Area */}
      <main className="flex-1 overflow-y-auto">
        {currentView === 'dashboard' && (
          <DashboardView
            stats={stats}
            queue={queue}
            onSelectRequest={handleSelectRequest}
            onNavigateToInbox={() => setCurrentView('inbox')}
          />
        )}

        {currentView === 'inbox' && (
          <InboxView
            requests={requests}
            onSelectRequest={handleSelectRequest}
            onRefreshRequests={refreshData}
          />
        )}

        {currentView === 'detail' && selectedRequestDetail && (
          <RequestDetailView
            request={selectedRequestDetail}
            currentUser={currentUser}
            onBack={() => {
              setSelectedRequestId(null);
              setCurrentView('dashboard');
            }}
            onRefresh={async () => {
              if (selectedRequestId !== null) {
                const updated = await api.getRequest(selectedRequestId);
                setSelectedRequestDetail(updated);
              }
              refreshData();
            }}
          />
        )}

        {currentView === 'approvals' && (
          <ApprovalsView
            approvals={approvals}
            currentUser={currentUser}
            onSelectRequest={handleSelectRequest}
            onRefreshApprovals={refreshData}
          />
        )}

        {currentView === 'audit' && (
          <AuditView
            events={auditEvents}
            onSelectRequest={handleSelectRequest}
          />
        )}

        {currentView === 'reference' && (
          <ReferenceView />
        )}
      </main>
    </div>
  );
};
