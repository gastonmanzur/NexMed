import type { ProfessionalDto } from '@starter/shared-types';

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

export const professionalsApi = {
  list: async (accessToken: string, organizationId: string): Promise<ProfessionalDto[]> => {
    const result = await request<{ success: true; data: ProfessionalDto[] }>(`/organizations/${organizationId}/professionals`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    return result.data;
  },

  getById: async (accessToken: string, organizationId: string, professionalId: string): Promise<ProfessionalDto> => {
    const result = await request<{ success: true; data: ProfessionalDto }>(
      `/organizations/${organizationId}/professionals/${professionalId}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    return result.data;
  },

  create: async (
    accessToken: string,
    organizationId: string,
    input: {
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      licenseNumber?: string;
      notes?: string;
      specialtyIds?: string[];
    }
  ): Promise<ProfessionalDto> => {
    const result = await request<{ success: true; data: ProfessionalDto }>(`/organizations/${organizationId}/professionals`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(input)
    });

    return result.data;
  },

  update: async (
    accessToken: string,
    organizationId: string,
    professionalId: string,
    input: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      licenseNumber?: string;
      notes?: string;
      status?: 'active' | 'inactive' | 'archived';
      specialtyIds?: string[];
    }
  ): Promise<ProfessionalDto> => {
    const result = await request<{ success: true; data: ProfessionalDto }>(
      `/organizations/${organizationId}/professionals/${professionalId}`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(input)
      }
    );

    return result.data;
  },

  updateStatus: async (
    accessToken: string,
    organizationId: string,
    professionalId: string,
    status: 'active' | 'inactive' | 'archived'
  ): Promise<ProfessionalDto> => {
    const result = await request<{ success: true; data: ProfessionalDto }>(
      `/organizations/${organizationId}/professionals/${professionalId}/status`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ status })
      }
    );

    return result.data;
  }
};
