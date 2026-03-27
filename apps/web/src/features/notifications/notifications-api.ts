import type { PushDeviceDto, PushPlatform } from '@starter/shared-types';

const rawApiUrl = import.meta.env.VITE_API_URL;

if (!rawApiUrl) {
  throw new Error('VITE_API_URL is required to initialize notifications API client');
}

const API_URL = rawApiUrl.replace(/\/$/, '');

interface ApiErrorShape {
  error?: {
    message?: string;
  };
}

const parseResponseBody = async <T>(response: Response): Promise<(T & ApiErrorShape) | null> => {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as T & ApiErrorShape;
  } catch {
    return null;
  }
};

const request = async <T>(path: string, init: RequestInit): Promise<T> => {
  const headers = new Headers(init.headers ?? {});
  if (!(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_URL}${path}`, { ...init, credentials: 'include', headers });
  const payload = await parseResponseBody<T>(response);

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `Request failed with status ${response.status}`);
  }

  if (!payload) {
    throw new Error('Unexpected empty response body');
  }

  return payload;
};

export const notificationsApi = {
  registerDevice: async (accessToken: string, input: { token: string; platform: PushPlatform; channel: 'web_push' | 'mobile_push' }): Promise<PushDeviceDto> => {
    const result = await request<{ success: true; data: { device: PushDeviceDto } }>('/push/devices', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(input)
    });
    return result.data.device;
  },
  unregisterDevice: async (accessToken: string, token: string): Promise<void> => {
    await request('/push/devices', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ token })
    });
  },
  listMyDevices: async (accessToken: string): Promise<PushDeviceDto[]> => {
    const result = await request<{ success: true; data: { devices: PushDeviceDto[] } }>('/push/devices', {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return result.data.devices;
  },
  sendTestToMe: async (accessToken: string, input: { title: string; body: string; data?: Record<string, string> }): Promise<{ sent: number; failed: number; invalidatedTokens: number }> => {
    const result = await request<{ success: true; data: { sent: number; failed: number; invalidatedTokens: number } }>('/push/send-test', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(input)
    });
    return result.data;
  }
};
