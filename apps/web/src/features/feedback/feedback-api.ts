const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

const request = async <T>(path: string, init: RequestInit): Promise<T> => {
  const headers = new Headers(init.headers ?? {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_URL}${path}`, { ...init, credentials: 'include', headers });
  const payload = (await response.json()) as T & { error?: { message: string } };
  if (!response.ok) {
    throw new Error(payload.error?.message ?? 'Unexpected request error');
  }

  return payload;
};

export type FeedbackCategory = 'bug' | 'ux' | 'feature_request' | 'content' | 'support' | 'other';
export type FeedbackSeverity = 'critical' | 'high' | 'medium' | 'low';
export type FeedbackStatus = 'new' | 'triaged' | 'planned' | 'resolved' | 'wont_fix';

export interface FeedbackItem {
  id: string;
  userId: string;
  organizationId: string | null;
  roleSnapshot: string | null;
  category: FeedbackCategory;
  severity: FeedbackSeverity;
  title: string | null;
  message: string;
  source: 'center_admin' | 'patient' | 'beta_internal';
  pagePath: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  status: FeedbackStatus;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export const feedbackApi = {
  submit: async (
    accessToken: string,
    input: {
      category: FeedbackCategory;
      severity?: FeedbackSeverity;
      title?: string;
      message: string;
      pagePath?: string;
      relatedEntityType?: string;
      relatedEntityId?: string;
      organizationId?: string;
    }
  ): Promise<{ id: string; status: FeedbackStatus; createdAt: string }> => {
    const result = await request<{ success: true; data: { id: string; status: FeedbackStatus; createdAt: string } }>('/feedback', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(input)
    });

    return result.data;
  },

  listAdmin: async (
    accessToken: string,
    query: URLSearchParams
  ): Promise<{ items: FeedbackItem[]; total: number; page: number; limit: number }> => {
    const result = await request<{ success: true; data: { items: FeedbackItem[]; total: number; page: number; limit: number } }>(
      `/admin/feedback?${query.toString()}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    return result.data;
  },

  updateAdmin: async (
    accessToken: string,
    feedbackId: string,
    input: { status: FeedbackStatus; adminNotes?: string; severity?: FeedbackSeverity }
  ): Promise<void> => {
    await request(`/admin/feedback/${feedbackId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(input)
    });
  }
};
