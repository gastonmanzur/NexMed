import type {
  AvailabilityExceptionDto,
  AvailabilityExceptionStatus,
  AvailabilityExceptionType,
  AvailabilityRuleDto,
  AvailabilityRuleStatus,
  CalculatedAvailabilityDto
} from '@starter/shared-types';

const rawApiUrl = import.meta.env.VITE_API_URL;

if (!rawApiUrl) {
  throw new Error('Missing required VITE_API_URL');
}

const API_URL = rawApiUrl.replace(/\/$/, '');

interface ApiErrorPayload {
  success?: boolean;
  error?: { message?: string };
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

  return payload ?? ({} as T);
};

const basePath = (organizationId: string, professionalId: string): string =>
  `/organizations/${organizationId}/professionals/${professionalId}`;

export const availabilityApi = {
  listRules: async (accessToken: string, organizationId: string, professionalId: string): Promise<AvailabilityRuleDto[]> => {
    const result = await request<{ success: true; data: AvailabilityRuleDto[] }>(
      `${basePath(organizationId, professionalId)}/availability-rules`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    return result.data;
  },

  createRule: async (
    accessToken: string,
    organizationId: string,
    professionalId: string,
    input: {
      weekday: number;
      startTime: string;
      endTime: string;
      appointmentDurationMinutes: number;
      bufferMinutes?: number;
    }
  ): Promise<AvailabilityRuleDto> => {
    const result = await request<{ success: true; data: AvailabilityRuleDto }>(
      `${basePath(organizationId, professionalId)}/availability-rules`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(input)
      }
    );

    return result.data;
  },

  updateRuleStatus: async (
    accessToken: string,
    organizationId: string,
    professionalId: string,
    ruleId: string,
    status: AvailabilityRuleStatus
  ): Promise<AvailabilityRuleDto> => {
    const result = await request<{ success: true; data: AvailabilityRuleDto }>(
      `${basePath(organizationId, professionalId)}/availability-rules/${ruleId}/status`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ status })
      }
    );

    return result.data;
  },

  listExceptions: async (
    accessToken: string,
    organizationId: string,
    professionalId: string
  ): Promise<AvailabilityExceptionDto[]> => {
    const result = await request<{ success: true; data: AvailabilityExceptionDto[] }>(
      `${basePath(organizationId, professionalId)}/availability-exceptions`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    return result.data;
  },

  createException: async (
    accessToken: string,
    organizationId: string,
    professionalId: string,
    input: {
      date: string;
      type: AvailabilityExceptionType;
      startTime?: string;
      endTime?: string;
      reason?: string;
    }
  ): Promise<AvailabilityExceptionDto> => {
    const result = await request<{ success: true; data: AvailabilityExceptionDto }>(
      `${basePath(organizationId, professionalId)}/availability-exceptions`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(input)
      }
    );

    return result.data;
  },

  updateExceptionStatus: async (
    accessToken: string,
    organizationId: string,
    professionalId: string,
    exceptionId: string,
    status: AvailabilityExceptionStatus
  ): Promise<AvailabilityExceptionDto> => {
    const result = await request<{ success: true; data: AvailabilityExceptionDto }>(
      `${basePath(organizationId, professionalId)}/availability-exceptions/${exceptionId}/status`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ status })
      }
    );

    return result.data;
  },

  getCalculatedAvailability: async (
    accessToken: string,
    organizationId: string,
    professionalId: string,
    startDate: string,
    endDate: string
  ): Promise<CalculatedAvailabilityDto> => {
    const query = new URLSearchParams({ startDate, endDate });
    const result = await request<{ success: true; data: CalculatedAvailabilityDto }>(
      `${basePath(organizationId, professionalId)}/availability?${query.toString()}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    return result.data;
  }
};
