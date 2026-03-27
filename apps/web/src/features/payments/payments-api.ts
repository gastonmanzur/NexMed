const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api').replace(/\/$/, '');

const parseBody = async (response: Response): Promise<unknown> => {
  if (response.status === 204) {
    return null;
  }

  const raw = await response.text();
  if (!raw.trim()) {
    return null;
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return { raw };
    }
  }

  if (raw.trim().startsWith('{') || raw.trim().startsWith('[')) {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return { raw };
    }
  }

  return { raw };
};

const request = async <T>(path: string, init: RequestInit): Promise<T> => {
  const headers = new Headers(init.headers ?? {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_URL}${path}`, { ...init, credentials: 'include', headers });
  const payload = (await parseBody(response)) as (T & { error?: { message?: string } }) | { raw?: string } | null;
  if (!response.ok) {
    const fallbackMessage =
      typeof payload === 'object' && payload && 'raw' in payload && typeof payload.raw === 'string'
        ? payload.raw
        : `Request failed (${response.status})`;
    const maybeApiMessage = typeof payload === 'object' && payload && 'error' in payload ? payload.error?.message : undefined;
    throw new Error(maybeApiMessage ?? fallbackMessage);
  }

  return (payload ?? ({} as T)) as T;
};

export const paymentsApi = {
  createOneTime: async (accessToken: string, input: { title: string; amount: number; currency: string }) => {
    const result = await request<{ success: true; data: { orderId: string; externalReference: string; checkoutUrl: string; status: string } }>(
      '/payments/one-time',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(input)
      }
    );

    return result.data;
  },
  createSubscription: async (
    accessToken: string,
    input: { planCode: string; title: string; amount: number; currency: string; period: 'monthly' | 'yearly' }
  ) => {
    const result = await request<{
      success: true;
      data: { subscriptionId: string; externalReference: string; providerPreapprovalId: string; checkoutUrl: string; status: string };
    }>('/payments/subscriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(input)
    });

    return result.data;
  },
  listAdminTransactions: async (accessToken: string) => {
    const result = await request<{ success: true; data: Array<{ _id: string; status: string; amount: number; createdAt: string }> }>(
      '/payments/admin/transactions',
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    return result.data;
  },
  listAdminSubscriptions: async (accessToken: string) => {
    const result = await request<{ success: true; data: Array<{ _id: string; status: string; period: string; createdAt: string }> }>(
      '/payments/admin/subscriptions',
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    return result.data;
  },
  getOrderStatus: async (accessToken: string, orderId: string, sync = false) => {
    const query = sync ? '?sync=true' : '';
    const result = await request<{ success: true; data: { _id: string; status: string; externalReference: string; updatedAt: string } }>(
      `/payments/orders/${orderId}${query}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    return result.data;
  },
  getMySubscriptionStatus: async (
    accessToken: string,
    input: { subscriptionId?: string; planCode?: string; period?: 'monthly' | 'yearly'; sync?: boolean }
  ) => {
    const params = new URLSearchParams();
    if (input.subscriptionId) params.set('subscriptionId', input.subscriptionId);
    if (input.planCode) params.set('planCode', input.planCode);
    if (input.period) params.set('period', input.period);
    if (input.sync) params.set('sync', 'true');

    const query = params.size > 0 ? `?${params.toString()}` : '';
    const result = await request<{
      success: true;
      data: {
        _id: string;
        planCode: string;
        period: 'monthly' | 'yearly';
        status: 'pending' | 'authorized' | 'paused' | 'cancelled' | 'ended';
        externalReference: string;
        providerPreapprovalId?: string;
        providerInitPoint?: string;
        nextBillingDate?: string;
        updatedAt: string;
      };
    }>(`/payments/subscriptions/me${query}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    return result.data;
  }
};
