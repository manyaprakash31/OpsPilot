import { 
  User, 
  OperationalRequestSummary, 
  OperationalRequestDetail, 
  Approval, 
  AuditEvent, 
  DashboardStats,
  InventoryItem,
  Supplier,
  Clarification
} from '../types';

const getApiBase = (): string => {
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    const cleanUrl = envUrl.trim().replace(/\/+$/, '');
    return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
  }
  return '/api';
};

const API_BASE = getApiBase();

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('opspilot_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('opspilot_token', token);
    } else {
      localStorage.removeItem('opspilot_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Clear token on 401
      this.setToken(null);
    }

    if (!response.ok) {
      let errorMsg = `HTTP Error ${response.status}`;
      try {
        const errorData = await response.json();
        errorMsg = errorData.detail || errorMsg;
      } catch {
        // use default message
      }
      throw new Error(errorMsg);
    }

    return response.json();
  }

  // Auth
  async login(username: string, password: string): Promise<{ access_token: string; user: User }> {
    const res = await this.request<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    this.setToken(res.access_token);
    return res;
  }

  async logout(): Promise<void> {
    try {
      if (this.token) {
        await this.request('/auth/logout', { method: 'POST' });
      }
    } catch {
      // Ignore network errors during logout
    } finally {
      this.setToken(null);
    }
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  // Requests
  async getRequests(params?: { status?: string; priority?: string; search?: string }): Promise<OperationalRequestSummary[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.priority) query.append('priority', params.priority);
    if (params?.search) query.append('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<OperationalRequestSummary[]>(`/requests${qs}`);
  }

  async getRequest(id: number): Promise<OperationalRequestDetail> {
    return this.request<OperationalRequestDetail>(`/requests/${id}`);
  }

  async createManualRequest(data: { title: string; raw_content: string; request_type?: string; priority?: string }): Promise<OperationalRequestDetail> {
    return this.request<OperationalRequestDetail>('/requests/manual', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createEmailRequest(data: { sender: string; subject: string; body: string }): Promise<OperationalRequestDetail> {
    return this.request<OperationalRequestDetail>('/requests/email', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async correctFact(requestId: number, fieldName: string, newValue: any, correctionReason: string): Promise<OperationalRequestDetail> {
    return this.request<OperationalRequestDetail>(`/requests/${requestId}/correct-fact`, {
      method: 'POST',
      body: JSON.stringify({
        field_name: fieldName,
        new_value: newValue,
        correction_reason: correctionReason,
      }),
    });
  }

  async transitionState(requestId: number, newStatus: string, reason?: string): Promise<OperationalRequestDetail> {
    return this.request<OperationalRequestDetail>(`/requests/${requestId}/transition`, {
      method: 'POST',
      body: JSON.stringify({
        new_status: newStatus,
        reason,
      }),
    });
  }

  async selectRecommendation(requestId: number, recommendationId: number): Promise<OperationalRequestDetail> {
    return this.request<OperationalRequestDetail>(`/requests/${requestId}/select-recommendation?recommendation_id=${recommendationId}`, {
      method: 'POST',
    });
  }

  async addClarification(requestId: number, message: string): Promise<Clarification> {
    return this.request<Clarification>(`/requests/${requestId}/clarifications`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  // Approvals
  async getApprovals(statusFilter: string = 'pending'): Promise<Approval[]> {
    return this.request<Approval[]>(`/approvals?status_filter=${statusFilter}`);
  }

  async decideApproval(approvalId: number, action: 'approve' | 'reject', rejectionReason?: string): Promise<Approval> {
    return this.request<Approval>(`/approvals/${approvalId}/decision`, {
      method: 'POST',
      body: JSON.stringify({
        action,
        rejection_reason: rejectionReason,
      }),
    });
  }

  // Audit
  async getAuditTrail(params?: { request_id?: number; is_ai?: boolean; action?: string }): Promise<AuditEvent[]> {
    const query = new URLSearchParams();
    if (params?.request_id !== undefined) query.append('request_id', params.request_id.toString());
    if (params?.is_ai !== undefined) query.append('is_ai', params.is_ai.toString());
    if (params?.action) query.append('action', params.action);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<AuditEvent[]>(`/audit${qs}`);
  }

  // Dashboard
  async getDashboardMetrics(): Promise<DashboardStats> {
    return this.request<DashboardStats>('/dashboard/metrics');
  }

  async getDashboardQueue(): Promise<OperationalRequestSummary[]> {
    return this.request<OperationalRequestSummary[]>('/dashboard/queue');
  }

  // Reference data
  async getInventory(): Promise<InventoryItem[]> {
    return this.request<InventoryItem[]>('/reference/inventory');
  }

  async getSuppliers(): Promise<Supplier[]> {
    return this.request<Supplier[]>('/reference/suppliers');
  }
}

export const api = new ApiClient();
