import type {
  OrganizationDto,
  OrganizationMembershipDto,
  OrganizationOnboardingStatusDto,
  OrganizationProfileDto,
  ReminderRuleDto
} from '@starter/shared-types';

const rawApiUrl = import.meta.env.VITE_API_URL;

if (!rawApiUrl) {
  throw new Error('Missing required VITE_API_URL');
}

const API_URL = rawApiUrl.replace(/\/$/, '');

interface ApiErrorPayload {
  success?: boolean;
  error?: {
    message?: string;
  };
}

const request = async <T>(path: string, init: RequestInit): Promise<T> => {
  const headers = new Headers(init.headers ?? {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers
  });

  const rawBody = await response.text();
  let payload: (T & ApiErrorPayload) | null = null;

  if (rawBody) {
    try {
      payload = JSON.parse(rawBody) as T & ApiErrorPayload;
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `Request failed with status ${response.status}`);
  }

  return (payload ?? ({} as T));
};

export const organizationApi = {
  create: async (
    accessToken: string,
    input: {
      name: string;
      type: 'clinic' | 'office' | 'esthetic_center' | 'professional_cabinet' | 'other';
      contactEmail?: string;
      phone?: string;
      address?: string;
      city?: string;
      country?: string;
    }
  ): Promise<{ organization: OrganizationDto; membership: OrganizationMembershipDto }> => {
    const result = await request<{ success: true; data: { organization: OrganizationDto; membership: OrganizationMembershipDto } }>(
      '/organizations',
      {
        method: 'POST',
        body: JSON.stringify(input),
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    return result.data;
  },

  getProfile: async (accessToken: string, organizationId: string): Promise<OrganizationProfileDto> => {
    const result = await request<{ success: true; data: OrganizationProfileDto }>(`/organizations/${organizationId}/profile`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    return result.data;
  },

  updateProfile: async (
    accessToken: string,
    organizationId: string,
    input: {
      name: string;
      displayName?: string;
      type: 'clinic' | 'office' | 'esthetic_center' | 'professional_cabinet' | 'other';
      contactEmail?: string;
      phone?: string;
      address?: string;
      city: string;
      country: string;
      description?: string;
      logoUrl?: string;
      timezone: string;
      locale?: string;
      currency?: string;
    }
  ): Promise<OrganizationProfileDto> => {
    const result = await request<{ success: true; data: OrganizationProfileDto }>(`/organizations/${organizationId}/profile`, {
      method: 'PATCH',
      body: JSON.stringify(input),
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    return result.data;
  },

  getOnboardingStatus: async (accessToken: string, organizationId: string): Promise<OrganizationOnboardingStatusDto> => {
    const result = await request<{ success: true; data: OrganizationOnboardingStatusDto }>(
      `/organizations/${organizationId}/onboarding-status`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    return result.data;
  },

  getDashboardSummary: async (
    accessToken: string,
    organizationId: string
  ): Promise<{
    generatedAt: string;
    appointmentsToday: number;
    appointmentsNext7Days: number;
    recentCancellations: number;
    activeProfessionals: number;
    linkedPatients: number;
    activeWaitlistRequests: number;
  }> => {
    const result = await request<{
      success: true;
      data: {
        generatedAt: string;
        appointmentsToday: number;
        appointmentsNext7Days: number;
        recentCancellations: number;
        activeProfessionals: number;
        linkedPatients: number;
        activeWaitlistRequests: number;
      };
    }>(`/organizations/${organizationId}/dashboard-summary`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    return result.data;
  },

  listReminderRules: async (accessToken: string, organizationId: string): Promise<ReminderRuleDto[]> => {
    const result = await request<{ success: true; data: ReminderRuleDto[] }>(`/organizations/${organizationId}/reminder-rules`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    return result.data;
  },

  createReminderRule: async (accessToken: string, organizationId: string, input: { triggerHoursBefore: number; channel: 'in_app' | 'email' | 'push' }): Promise<ReminderRuleDto> => {
    const result = await request<{ success: true; data: ReminderRuleDto }>(`/organizations/${organizationId}/reminder-rules`, {
      method: 'POST',
      body: JSON.stringify(input),
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    return result.data;
  },

  updateReminderRuleStatus: async (accessToken: string, organizationId: string, ruleId: string, status: 'active' | 'inactive'): Promise<ReminderRuleDto> => {
    const result = await request<{ success: true; data: ReminderRuleDto }>(`/organizations/${organizationId}/reminder-rules/${ruleId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    return result.data;
  },

  getInviteLink: async (accessToken: string, organizationId: string): Promise<{ inviteUrl: string; token: string; qrValue: string; updatedAt: string }> => {
    const result = await request<{ success: true; data: { inviteUrl: string; token: string; qrValue: string; updatedAt: string } }>(`/organizations/${organizationId}/invite-link`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    return result.data;
  },

  regenerateInviteLink: async (accessToken: string, organizationId: string): Promise<{ inviteUrl: string; token: string; qrValue: string; updatedAt: string }> => {
    const result = await request<{ success: true; data: { inviteUrl: string; token: string; qrValue: string; updatedAt: string } }>(`/organizations/${organizationId}/invite-link/regenerate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    return result.data;
  },

  listPlans: async (accessToken: string): Promise<Array<{
    id: string;
    code: string;
    name: string;
    price: number;
    currency: string;
    maxProfessionalsActive: number;
    status: 'active' | 'inactive';
    description: string | null;
  }>> => {
    const result = await request<{ success: true; data: Array<{
      id: string;
      code: string;
      name: string;
      price: number;
      currency: string;
      maxProfessionalsActive: number;
      status: 'active' | 'inactive';
      description: string | null;
    }> }>('/plans', {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    return result.data;
  },

  getSubscription: async (accessToken: string, organizationId: string): Promise<{
    subscription: {
      id: string;
      status: 'trial' | 'active' | 'past_due' | 'suspended' | 'canceled';
      provider: string;
      startedAt: string | null;
      expiresAt: string | null;
      autoRenew: boolean;
    };
    plan: {
      id: string;
      code: string;
      name: string;
      price: number;
      currency: string;
      maxProfessionalsActive: number;
      status: 'active' | 'inactive';
      description: string | null;
    };
    limits: { maxProfessionalsActive: number };
  }> => {
    const result = await request<{ success: true; data: {
      subscription: {
        id: string;
        status: 'trial' | 'active' | 'past_due' | 'suspended' | 'canceled';
        provider: string;
        startedAt: string | null;
        expiresAt: string | null;
        autoRenew: boolean;
      };
      plan: {
        id: string;
        code: string;
        name: string;
        price: number;
        currency: string;
        maxProfessionalsActive: number;
        status: 'active' | 'inactive';
        description: string | null;
      };
      limits: { maxProfessionalsActive: number };
    } }>(`/organizations/${organizationId}/subscription`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    return result.data;
  },

  checkoutSubscription: async (accessToken: string, organizationId: string, planId: string): Promise<{ checkoutUrl: string; subscriptionId: string; status: string }> => {
    const result = await request<{ success: true; data: { checkoutUrl: string; subscriptionId: string; status: string } }>(`/organizations/${organizationId}/subscription/checkout`, {
      method: 'POST',
      body: JSON.stringify({ planId }),
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    return result.data;
  },

};
