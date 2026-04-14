const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

const request = async <T>(path: string, init: RequestInit): Promise<T> => {
  const headers = new Headers(init.headers ?? {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_URL}${path}`, { ...init, credentials: 'include', headers });
  const payload = (await response.json()) as T & { error?: { message: string } };
  if (!response.ok) {
    throw new Error(payload.error?.message ?? 'Unexpected request error');
  }
  return payload;
};

interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export type CommercialStatus = 'trial' | 'active' | 'past_due' | 'suspended' | 'canceled';
export type OrganizationStatus = 'onboarding' | 'active' | 'inactive' | 'suspended' | 'blocked';

export interface AdminSummary {
  totalOrganizations: number;
  activeOrganizations: number;
  trialOrganizations: number;
  paidOrganizations: number;
  suspendedOrPastDueOrganizations: number;
  estimatedMonthlyRevenue: number;
  recentOrganizations: Array<{
    id: string;
    name: string;
    status: OrganizationStatus;
    subscriptionStatus: CommercialStatus;
    createdAt: string;
  }>;
  expiringTrials: Array<{
    organizationId: string;
    organizationName: string;
    expiresAt: string | null;
    daysRemaining: number | null;
  }>;
  problematicSubscriptions: Array<{
    organizationId: string;
    organizationName: string;
    status: CommercialStatus;
    expiresAt: string | null;
  }>;
}

export interface AdminOrganizationItem {
  id: string;
  name: string;
  status: OrganizationStatus;
  subscriptionStatus: CommercialStatus;
  subscriptionPlanId: string | null;
  subscriptionPlanName: string | null;
  trialEndsAt: string | null;
  trialDaysRemaining: number | null;
  professionalsCount: number;
  patientsCount: number;
  createdAt: string;
}

export interface AdminOrganizationDetail {
  organization: {
    id: string;
    name: string;
    displayName: string | null;
    type: string;
    status: OrganizationStatus;
    logoUrl: string | null;
    createdAt: string;
    onboardingCompleted: boolean;
  };
  commercial: {
    subscriptionStatus: CommercialStatus;
    provider: string | null;
    trialEndsAt: string | null;
    trialDaysRemaining: number | null;
    autoRenew: boolean;
  };
  subscription: null | {
    id: string;
    status: CommercialStatus;
    provider: string;
    providerReference: string | null;
    startedAt: string | null;
    expiresAt: string | null;
    plan: null | {
      id: string;
      code: string;
      name: string;
      price: number;
      currency: string;
      maxProfessionalsActive: number;
    };
  };
  usage: {
    professionalsCount: number;
    patientsCount: number;
    appointmentsCount: number;
  };
  owner: null | {
    userId: string;
    role: 'owner' | 'admin';
    fullName: string;
    email: string;
  };
  settings: null | {
    betaEnabled: boolean;
    betaNotes: string | null;
  };
  actions: {
    canUpdateCommercialStatus: boolean;
    canSuspendOrReactivate: boolean;
    canExtendTrial: boolean;
    pendingActionsNote: string;
  };
}

export interface AdminSubscriptionItem {
  id: string;
  organizationId: string;
  organizationName: string;
  status: CommercialStatus;
  planId: string;
  planName: string | null;
  monthlyAmount: number | null;
  currency: string | null;
  provider: string;
  startedAt: string | null;
  renewalOrExpiryAt: string | null;
  isPaymentIssue: boolean;
}

export const adminApi = {
  getSummary: async (accessToken: string): Promise<AdminSummary> => {
    const result = await request<{ success: true; data: AdminSummary }>('/admin/summary', {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return result.data;
  },

  listOrganizations: async (accessToken: string, query: URLSearchParams): Promise<Paginated<AdminOrganizationItem>> => {
    const result = await request<{ success: true; data: Paginated<AdminOrganizationItem> }>(`/admin/organizations?${query.toString()}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return result.data;
  },

  getOrganization: async (accessToken: string, organizationId: string): Promise<AdminOrganizationDetail> => {
    const result = await request<{ success: true; data: AdminOrganizationDetail }>(`/admin/organizations/${organizationId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return result.data;
  },

  listSubscriptions: async (accessToken: string, query: URLSearchParams): Promise<Paginated<AdminSubscriptionItem>> => {
    const result = await request<{ success: true; data: Paginated<AdminSubscriptionItem> }>(`/admin/subscriptions?${query.toString()}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return result.data;
  },

  updateOrganizationStatus: async (
    accessToken: string,
    organizationId: string,
    input: { status: OrganizationStatus; onboardingCompleted?: boolean }
  ): Promise<void> => {
    await request(`/admin/organizations/${organizationId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(input)
    });
  }
};
