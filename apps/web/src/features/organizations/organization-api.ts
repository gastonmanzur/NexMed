import type { OrganizationDto, OrganizationMembershipDto } from '@starter/shared-types';

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
  }
};
