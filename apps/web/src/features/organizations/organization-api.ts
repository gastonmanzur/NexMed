import type {
  OrganizationPatientDetailDto,
  OrganizationPatientListItemDto,
  OrganizationDto,
  OrganizationMembershipDto,
  OrganizationOnboardingStatusDto,
  OrganizationProfileDto,
  ReminderRuleDto,
  OrganizationHealthInsuranceDto
} from '@starter/shared-types';

const rawApiUrl = import.meta.env.VITE_API_URL;

if (!rawApiUrl) {
  throw new Error('Missing required VITE_API_URL');
}

const API_URL = rawApiUrl.replace(/\/$/, '');
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

interface ApiErrorPayload {
  success?: boolean;
  error?: {
    message?: string;
  };
}


export interface InternalMessageDto {
  _id: string;
  id?: string;
  organizationId: string;
  appointmentId?: string | { _id: string } | null;
  patientProfileId?: string | { _id?: string; firstName?: string; lastName?: string } | null;
  professionalId?: string | { _id?: string; firstName?: string; lastName?: string; displayName?: string } | null;
  type: string;
  title: string;
  message: string;
  status: 'unread' | 'read' | 'resolved';
  createdAt: string;
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly url: string,
    public readonly rawBody: string
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

const request = async <T>(path: string, init: RequestInit): Promise<T> => {
  const headers = new Headers(init.headers ?? {});
  if (!(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const url = `${API_URL}${path}`;
  const response = await fetch(url, {
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
    throw new ApiRequestError(
      payload?.error?.message ?? `Request failed with status ${response.status}`,
      response.status,
      url,
      rawBody
    );
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
      province?: string;
      postalCode?: string;
      country: string;
      latitude?: number;
      longitude?: number;
      locationLabel?: string;
      locationPublic?: boolean;
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

  listInternalMessages: async (accessToken: string, organizationId: string, query?: { status?: 'unread' | 'read' | 'resolved'; appointmentId?: string; limit?: number }): Promise<InternalMessageDto[]> => {
    const params = new URLSearchParams();
    if (query?.status) params.set('status', query.status);
    if (query?.appointmentId) params.set('appointmentId', query.appointmentId);
    if (query?.limit) params.set('limit', String(query.limit));
    const qs = params.toString();
    const result = await request<{ success: true; data: InternalMessageDto[] }>(`/organizations/${organizationId}/internal-messages${qs ? `?${qs}` : ''}`, { method: 'GET', headers: { Authorization: `Bearer ${accessToken}` } });
    return result.data;
  },
  markInternalMessageRead: async (accessToken: string, organizationId: string, messageId: string): Promise<InternalMessageDto> => {
    const result = await request<{ success: true; data: InternalMessageDto }>(`/organizations/${organizationId}/internal-messages/${messageId}/read`, { method: 'PATCH', headers: { Authorization: `Bearer ${accessToken}` } });
    return result.data;
  },
  resolveInternalMessage: async (accessToken: string, organizationId: string, messageId: string): Promise<InternalMessageDto> => {
    const result = await request<{ success: true; data: InternalMessageDto }>(`/organizations/${organizationId}/internal-messages/${messageId}/resolve`, { method: 'PATCH', headers: { Authorization: `Bearer ${accessToken}` } });
    return result.data;
  },
  listPatients: async (accessToken: string, organizationId: string, search?: string): Promise<OrganizationPatientListItemDto[]> => {
    const query = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
    const result = await request<{ success: true; data: OrganizationPatientListItemDto[] }>(`/organizations/${organizationId}/patients${query}`, { method: 'GET', headers: { Authorization: `Bearer ${accessToken}` } });
    return result.data;
  },
  getPatientDetail: async (accessToken: string, organizationId: string, patientProfileId: string): Promise<OrganizationPatientDetailDto> => {
    const result = await request<{ success: true; data: OrganizationPatientDetailDto }>(`/organizations/${organizationId}/patients/${patientProfileId}`, { method: 'GET', headers: { Authorization: `Bearer ${accessToken}` } });
    return result.data;
  },


  listHealthInsurances: async (accessToken: string, organizationId: string): Promise<OrganizationHealthInsuranceDto[]> => {
    const result = await request<{ success: true; data: OrganizationHealthInsuranceDto[] }>(`/organizations/${organizationId}/health-insurances`, { method: 'GET', headers: { Authorization: `Bearer ${accessToken}` } });
    return result.data;
  },
  createHealthInsurance: async (accessToken: string, organizationId: string, input: { name: string; status?: 'active' | 'inactive'; requiresMemberNumber?: boolean; requiresPlan?: boolean; notes?: string; plans?: OrganizationHealthInsuranceDto['plans'] }): Promise<OrganizationHealthInsuranceDto> => {
    const result = await request<{ success: true; data: OrganizationHealthInsuranceDto }>(`/organizations/${organizationId}/health-insurances`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(input) });
    return result.data;
  },
  updateHealthInsurance: async (accessToken: string, organizationId: string, id: string, input: Partial<OrganizationHealthInsuranceDto>): Promise<OrganizationHealthInsuranceDto> => {
    const result = await request<{ success: true; data: OrganizationHealthInsuranceDto }>(`/organizations/${organizationId}/health-insurances/${id}`, { method: 'PATCH', headers: { Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(input) });
    return result.data;
  },
  listReminderRules: async (accessToken: string, organizationId: string): Promise<ReminderRuleDto[]> => {
    const result = await request<{ success: true; data: ReminderRuleDto[] }>(`/organizations/${organizationId}/reminder-rules`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    return result.data;
  },

  createReminderRule: async (accessToken: string, organizationId: string, input: { offsetValue: number; offsetUnit: 'minutes' | 'hours' | 'days'; channel: 'in_app' | 'email' | 'push' }): Promise<ReminderRuleDto> => {
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
    displayPriceUsd: number;
    billingPriceArs: number;
    displayCurrency: 'USD';
    billingCurrency: 'ARS';
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
      displayPriceUsd: number;
      billingPriceArs: number;
      displayCurrency: 'USD';
      billingCurrency: 'ARS';
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

  getSubscription: async (accessToken: string, organizationId: string, options?: { sync?: boolean }): Promise<{
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
      displayPriceUsd: number;
      billingPriceArs: number;
      displayCurrency: 'USD';
      billingCurrency: 'ARS';
      price: number;
      currency: string;
      maxProfessionalsActive: number;
      status: 'active' | 'inactive';
      description: string | null;
    };
    limits: { maxProfessionalsActive: number };
  }> => {
    const query = options?.sync ? '?sync=true' : '';
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
        displayPriceUsd: number;
        billingPriceArs: number;
        displayCurrency: 'USD';
        billingCurrency: 'ARS';
        price: number;
        currency: string;
        maxProfessionalsActive: number;
        status: 'active' | 'inactive';
        description: string | null;
      };
      limits: { maxProfessionalsActive: number };
    } }>(`/organizations/${organizationId}/subscription${query}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    return result.data;
  },

  validateSubscriptionDiscount: async (accessToken: string, organizationId: string, planId: string, code: string): Promise<{
    valid: boolean;
    code?: string;
    discountType?: 'percentage' | 'fixed';
    discountValue?: number;
    originalAmount?: number;
    discountAmount?: number;
    finalAmount?: number;
    currency?: string;
    message: string;
  }> => {
    const result = await request<{ success: true; data: {
      valid: boolean;
      code?: string;
      discountType?: 'percentage' | 'fixed';
      discountValue?: number;
      originalAmount?: number;
      discountAmount?: number;
      finalAmount?: number;
      currency?: string;
      message: string;
    } }>(`/organizations/${organizationId}/subscription/discount/validate`, {
      method: 'POST',
      body: JSON.stringify({ planId, code }),
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    return result.data;
  },

  checkoutSubscription: async (accessToken: string, organizationId: string, planId: string, discountCode?: string): Promise<{
    subscriptionId: string;
    status: string;
    checkoutUrl?: string;
    url?: string;
    initPoint?: string;
    requiresPayment?: boolean;
    subscriptionStatus?: string;
    message?: string;
    redirectUrl?: string;
  }> => {
    const result = await request<{ success: true; data: {
      subscriptionId: string;
      status: string;
      checkoutUrl?: string;
      url?: string;
      initPoint?: string;
      requiresPayment?: boolean;
      subscriptionStatus?: string;
      message?: string;
      redirectUrl?: string;
    } }>(`/organizations/${organizationId}/subscription/checkout`, {
      method: 'POST',
      body: JSON.stringify({ planId, ...(discountCode ? { discountCode } : {}) }),
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    return result.data;
  },

  uploadLogo: async (accessToken: string, organizationId: string, logoFile: File): Promise<OrganizationProfileDto> => {
    if (logoFile.size > MAX_IMAGE_BYTES) {
      throw new Error('El logo excede el tamaño máximo de 2MB.');
    }

    const formData = new FormData();
    formData.append('logo', logoFile);

    const result = await request<{ success: true; data: OrganizationProfileDto }>(`/organizations/${organizationId}/logo`, {
      method: 'POST',
      body: formData,
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    return result.data;
  },

  deleteLogo: async (accessToken: string, organizationId: string): Promise<OrganizationProfileDto> => {
    const result = await request<{ success: true; data: OrganizationProfileDto }>(`/organizations/${organizationId}/logo`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    return result.data;
  },

};

export const organizationWhatsAppApi = {
  getSettings: async (accessToken: string, organizationId: string) => {
    const result = await request<{ success: true; data: import('@starter/shared-types').OrganizationWhatsAppSettingsDto | null }>(`/organizations/${organizationId}/whatsapp-settings`, { method: 'GET', headers: { Authorization: `Bearer ${accessToken}` } });
    return result.data;
  },
  updateSettings: async (accessToken: string, organizationId: string, input: {
    enabled: boolean;
    provider: 'manual' | 'noop' | 'meta_cloud_api';
    displayPhoneNumber?: string | null;
    meta?: { phoneNumberId?: string | null; businessAccountId?: string | null; apiVersion?: string | null; accessToken?: string | null };
    templates: { appointmentConfirmation?: string | null; appointmentReminder?: string | null; appointmentCancellation?: string | null; appointmentRescheduled?: string | null };
    reminderHoursBefore: number;
    secondReminderHoursBefore?: number | null;
  }) => {
    const result = await request<{ success: true; data: import('@starter/shared-types').OrganizationWhatsAppSettingsDto }>(`/organizations/${organizationId}/whatsapp-settings`, { method: 'PUT', headers: { Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(input) });
    return result.data;
  }
};
