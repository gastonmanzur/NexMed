import type { AuthUserDto, AvatarDto } from '@starter/shared-types';

const rawApiUrl = import.meta.env.VITE_API_URL;

if (!rawApiUrl) {
  throw new Error('Missing required VITE_API_URL');
}

const API_URL = rawApiUrl.replace(/\/$/, '');

interface AuthResponse {
  success: true;
  data: {
    accessToken: string;
    user: AuthUserDto;
  };
}

interface ApiErrorPayload {
  success?: boolean;
  error?: {
    message?: string;
  };
}

const request = async <T>(path: string, init: RequestInit): Promise<T> => {
  const headers = new Headers(init.headers ?? {});
  if (!(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers
  });

  const contentType = response.headers.get('content-type') ?? '';
  const isJsonResponse = contentType.includes('application/json');
  const rawBody = await response.text();

  let payload: (T & ApiErrorPayload) | null = null;
  if (isJsonResponse && rawBody.length > 0) {
    try {
      payload = JSON.parse(rawBody) as T & ApiErrorPayload;
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `Request failed with status ${response.status}`);
  }

  if (payload === null) {
    return {} as T;
  }

  return payload;
};

export const authApi = {
  register: async (email: string, password: string): Promise<void> => {
    await request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) });
  },
  login: async (email: string, password: string): Promise<AuthResponse['data']> => {
    const result = await request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    return result.data;
  },
  loginGoogle: async ({ idToken, photoURL }: { idToken: string; photoURL?: string | null }): Promise<AuthResponse['data']> => {
    const result = await request<AuthResponse>('/auth/google', { method: 'POST', body: JSON.stringify({ idToken, photoURL }) });
    return result.data;
  },
  refresh: async (): Promise<AuthResponse['data']> => {
    const result = await request<AuthResponse>('/auth/refresh', { method: 'POST' });
    return result.data;
  },
  forgotPassword: async (email: string): Promise<void> => {
    await request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
  },
  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    await request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, newPassword }) });
  },
  changePassword: async (accessToken: string, currentPassword: string, newPassword: string): Promise<void> => {
    await request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  },
  logout: async (): Promise<void> => {
    await request('/auth/logout', { method: 'POST' });
  },
  logoutAll: async (accessToken: string): Promise<void> => {
    await request('/auth/logout-all', { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } });
  },
  me: async (accessToken: string): Promise<AuthUserDto> => {
    const result = await request<{ success: true; data: AuthUserDto }>('/auth/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return result.data;
  },
  verifyEmail: async (token: string): Promise<void> => {
    await request(`/auth/verify-email?token=${encodeURIComponent(token)}`, { method: 'GET' });
  },
  uploadMyAvatar: async (accessToken: string, avatarFile: File): Promise<AvatarDto | null> => {
    const formData = new FormData();
    formData.append('avatar', avatarFile);

    const result = await request<{ success: true; data: { avatar: AvatarDto | null } }>('/avatars/me', {
      method: 'POST',
      body: formData,
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    return result.data.avatar;
  },
  deleteMyAvatar: async (accessToken: string): Promise<void> => {
    await request('/avatars/me', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  }
};
