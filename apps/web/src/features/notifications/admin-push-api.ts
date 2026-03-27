const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

const request = async <T>(path: string, init: RequestInit): Promise<T> => {
  const headers = new Headers(init.headers ?? {});
  if (!(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_URL}${path}`, { ...init, credentials: 'include', headers });
  const payload = (await response.json()) as T & { error?: { message: string } };
  if (!response.ok) {
    throw new Error(payload.error?.message ?? 'Unexpected request error');
  }
  return payload;
};

export const adminPushApi = {
  sendToUser: async (accessToken: string, input: { targetUserId: string; title: string; body: string }): Promise<void> => {
    await request('/push/admin/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(input)
    });
  }
};
