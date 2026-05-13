import type { AnalyticsSummaryDto } from '@starter/shared-types';

const API_URL = import.meta.env.VITE_API_URL.replace(/\/$/, '');

const request = async <T>(path: string, token: string): Promise<T> => {
  const response = await fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${token}` }, credentials: 'include' });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message ?? 'Error al cargar métricas');
  return payload.data as T;
};

export const analyticsApi = {
  summary: (token: string, organizationId: string, params: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    return request<AnalyticsSummaryDto>(`/organizations/${organizationId}/analytics/summary?${query}`, token);
  }
};
