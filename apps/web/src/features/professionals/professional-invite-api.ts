const rawApiUrl = import.meta.env.VITE_API_URL;
if (!rawApiUrl) throw new Error('Missing required VITE_API_URL');
const API_URL = rawApiUrl.replace(/\/$/, '');

interface ApiErrorPayload { error?: { message?: string } }
const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const headers = new Headers(init.headers ?? {});
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${API_URL}${path}`, { ...init, credentials: 'include', headers });
  const raw = await response.text();
  const payload = raw ? JSON.parse(raw) as T & ApiErrorPayload : null;
  if (!response.ok) throw new Error(payload?.error?.message ?? `Request failed with status ${response.status}`);
  return payload as T;
};

export interface ProfessionalInviteDetails {
  valid: true;
  professional: { displayName: string };
  organization: { name: string };
  email: string;
}

export const professionalInviteApi = {
  get: async (token: string): Promise<ProfessionalInviteDetails> => {
    const result = await request<{ success: true; data: ProfessionalInviteDetails }>(`/professional-invites/${encodeURIComponent(token)}`);
    return result.data;
  },
  accept: async (token: string, password: string, confirmPassword: string): Promise<{ message: string }> => {
    const result = await request<{ success: true; data: { message: string } }>(`/professional-invites/${encodeURIComponent(token)}/accept`, {
      method: 'POST',
      body: JSON.stringify({ password, confirmPassword })
    });
    return result.data;
  }
};
