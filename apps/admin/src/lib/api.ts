// Admin API Client
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  plan: 'free' | 'pro' | 'enterprise';
  createdAt: string;
  lastLoginAt: string | null;
  usage: {
    cloudLlmRequests: number;
    byokRequests: number;
    voiceCommands: number;
    savedWorkflows: number;
  };
  customLimits?: Record<string, number>;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  limits: Record<string, number>;
  isActive: boolean;
}

export interface DashboardStats {
  totalUsers: number;
  proUsers: number;
  enterpriseUsers: number;
  mrr: number;
  growth: {
    totalUsers: string;
    proUsers: string;
    enterpriseUsers: string;
    mrr: string;
  };
}

export interface RecentActivity {
  id: string;
  type: 'signup' | 'upgrade' | 'downgrade' | 'payment' | 'api_call';
  userId: string;
  userEmail: string;
  description: string;
  timestamp: string;
}

class AdminAPI {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    // Also store in sessionStorage for persistence across page navigations
    if (typeof window !== 'undefined') {
      if (token) {
        sessionStorage.setItem('admin_api_token', token);
      } else {
        sessionStorage.removeItem('admin_api_token');
      }
    }
  }

  getToken(): string | null {
    // Try instance variable first, then sessionStorage
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('admin_api_token');
      if (stored) {
        this.token = stored;
        return stored;
      }
    }
    return null;
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `API error: ${response.status}`);
    }

    return response.json();
  }

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    return this.fetch('/api/admin/dashboard/stats');
  }

  async getRecentActivity(limit = 10): Promise<RecentActivity[]> {
    return this.fetch(`/api/admin/dashboard/activity?limit=${limit}`);
  }

  // Users
  async getUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    plan?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ users: User[]; total: number; pages: number }> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.search) searchParams.set('search', params.search);
    if (params?.plan) searchParams.set('plan', params.plan);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);

    return this.fetch(`/api/admin/users?${searchParams.toString()}`);
  }

  async getUser(id: string): Promise<User> {
    return this.fetch(`/api/admin/users/${id}`);
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    return this.fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async updateUserPlan(id: string, plan: 'free' | 'pro' | 'enterprise'): Promise<User> {
    return this.fetch(`/api/admin/users/${id}/plan`, {
      method: 'PUT',
      body: JSON.stringify({ plan }),
    });
  }

  async setCustomLimits(id: string, limits: Record<string, number>): Promise<User> {
    return this.fetch(`/api/admin/users/${id}/limits`, {
      method: 'PUT',
      body: JSON.stringify({ limits }),
    });
  }

  async deleteUser(id: string): Promise<void> {
    return this.fetch(`/api/admin/users/${id}`, {
      method: 'DELETE',
    });
  }

  // Plans
  async getPlans(): Promise<Plan[]> {
    return this.fetch('/api/admin/plans');
  }

  async updatePlan(id: string, data: Partial<Plan>): Promise<Plan> {
    return this.fetch(`/api/admin/plans/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async updatePlanPricing(id: string, price: number): Promise<Plan> {
    return this.fetch(`/api/admin/plans/${id}/pricing`, {
      method: 'PUT',
      body: JSON.stringify({ price }),
    });
  }

  // Analytics
  async getUsageAnalytics(params?: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'week' | 'month';
  }): Promise<{
    llmRequests: { date: string; count: number }[];
    voiceCommands: { date: string; count: number }[];
    workflows: { date: string; count: number }[];
    activeUsers: { date: string; count: number }[];
  }> {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.groupBy) searchParams.set('groupBy', params.groupBy);

    return this.fetch(`/api/admin/analytics/usage?${searchParams.toString()}`);
  }

  async getRevenueAnalytics(params?: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'week' | 'month';
  }): Promise<{
    revenue: { date: string; amount: number }[];
    subscriptions: { date: string; new: number; churned: number }[];
  }> {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.groupBy) searchParams.set('groupBy', params.groupBy);

    return this.fetch(`/api/admin/analytics/revenue?${searchParams.toString()}`);
  }

  // Enterprise
  async getEnterpriseCustomers(): Promise<User[]> {
    return this.fetch('/api/admin/enterprise/customers');
  }

  async createEnterpriseInvite(email: string, customLimits?: Record<string, number>): Promise<{ inviteCode: string }> {
    return this.fetch('/api/admin/enterprise/invite', {
      method: 'POST',
      body: JSON.stringify({ email, customLimits }),
    });
  }
}

export const adminApi = new AdminAPI();
