import type { AppointmentDto, ProfessionalDashboardDto, ProfessionalPanelMeDto } from '@starter/shared-types';

const rawApiUrl = import.meta.env.VITE_API_URL;

if (!rawApiUrl) {
  throw new Error('Missing required VITE_API_URL');
}

const API_URL = rawApiUrl.replace(/\/$/, '');

interface ApiErrorPayload {
  success?: boolean;
  error?: { message?: string };
}

const request = async <T>(path: string, accessToken: string, organizationId: string): Promise<T> => {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'x-organization-id': organizationId
    }
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

export const professionalApi = {
  me: async (accessToken: string, organizationId: string): Promise<ProfessionalPanelMeDto> => {
    const result = await request<{ success: true; data: ProfessionalPanelMeDto }>('/professional/me', accessToken, organizationId);
    return result.data;
  },

  dashboard: async (accessToken: string, organizationId: string): Promise<ProfessionalDashboardDto> => {
    const result = await request<{ success: true; data: ProfessionalDashboardDto }>('/professional/dashboard', accessToken, organizationId);
    return result.data;
  },

  appointments: async (accessToken: string, organizationId: string): Promise<AppointmentDto[]> => {
    const result = await request<{ success: true; data: AppointmentDto[] }>('/professional/appointments', accessToken, organizationId);
    return result.data;
  },

  waitingRoom: async (accessToken: string, organizationId: string): Promise<AppointmentDto[]> => {
    const result = await request<{ success: true; data: AppointmentDto[] }>('/professional/waiting-room', accessToken, organizationId);
    return result.data;
  }
};
