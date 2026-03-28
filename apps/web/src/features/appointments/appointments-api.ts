import type { AppointmentDto, AppointmentStatus } from '@starter/shared-types';

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

const basePath = (organizationId: string): string => `/organizations/${organizationId}/appointments`;

export const appointmentsApi = {
  list: async (
    accessToken: string,
    organizationId: string,
    params?: { professionalId?: string; status?: AppointmentStatus; from?: string; to?: string }
  ): Promise<AppointmentDto[]> => {
    const query = new URLSearchParams();
    if (params?.professionalId) query.set('professionalId', params.professionalId);
    if (params?.status) query.set('status', params.status);
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);

    const result = await request<{ success: true; data: AppointmentDto[] }>(
      `${basePath(organizationId)}${query.size > 0 ? `?${query.toString()}` : ''}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    return result.data;
  },

  getById: async (accessToken: string, organizationId: string, appointmentId: string): Promise<AppointmentDto> => {
    const result = await request<{ success: true; data: AppointmentDto }>(`${basePath(organizationId)}/${appointmentId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    return result.data;
  },

  create: async (
    accessToken: string,
    organizationId: string,
    input: {
      professionalId: string;
      specialtyId?: string;
      patientProfileId?: string;
      patientName: string;
      patientEmail?: string;
      patientPhone?: string;
      startAt: string;
      endAt?: string;
      notes?: string;
    }
  ): Promise<AppointmentDto> => {
    const result = await request<{ success: true; data: AppointmentDto }>(basePath(organizationId), {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(input)
    });

    return result.data;
  },

  cancel: async (
    accessToken: string,
    organizationId: string,
    appointmentId: string,
    reason?: string
  ): Promise<AppointmentDto> => {
    const result = await request<{ success: true; data: AppointmentDto }>(`${basePath(organizationId)}/${appointmentId}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ reason })
    });

    return result.data;
  },

  reschedule: async (
    accessToken: string,
    organizationId: string,
    appointmentId: string,
    input: {
      newProfessionalId?: string;
      newSpecialtyId?: string;
      newStartAt: string;
      newEndAt?: string;
      reason?: string;
    }
  ): Promise<{ original: AppointmentDto; replacement: AppointmentDto }> => {
    const result = await request<{ success: true; data: { original: AppointmentDto; replacement: AppointmentDto } }>(
      `${basePath(organizationId)}/${appointmentId}/reschedule`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(input)
      }
    );

    return result.data;
  }
};
