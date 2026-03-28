import type { SpecialtyDto } from '@starter/shared-types';

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

export const specialtiesApi = {
  list: async (accessToken: string, organizationId: string): Promise<SpecialtyDto[]> => {
    const result = await request<{ success: true; data: SpecialtyDto[] }>(`/organizations/${organizationId}/specialties`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    return result.data;
  },

  getById: async (accessToken: string, organizationId: string, specialtyId: string): Promise<SpecialtyDto> => {
    const result = await request<{ success: true; data: SpecialtyDto }>(
      `/organizations/${organizationId}/specialties/${specialtyId}`,
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
    input: { name: string; description?: string }
  ): Promise<SpecialtyDto> => {
    const result = await request<{ success: true; data: SpecialtyDto }>(`/organizations/${organizationId}/specialties`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(input)
    });

    return result.data;
  },

  update: async (
    accessToken: string,
    organizationId: string,
    specialtyId: string,
    input: { name?: string; description?: string; status?: 'active' | 'inactive' | 'archived' }
  ): Promise<SpecialtyDto> => {
    const result = await request<{ success: true; data: SpecialtyDto }>(
      `/organizations/${organizationId}/specialties/${specialtyId}`,
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
    specialtyId: string,
    status: 'active' | 'inactive' | 'archived'
  ): Promise<SpecialtyDto> => {
    const result = await request<{ success: true; data: SpecialtyDto }>(
      `/organizations/${organizationId}/specialties/${specialtyId}/status`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ status })
      }
    );

    return result.data;
  }
};
