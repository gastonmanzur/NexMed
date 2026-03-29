import type { AppointmentDto, AppointmentStatus, CalculatedAvailabilityDto, JoinOrganizationPreviewDto, PatientMeDto, PatientOrganizationSummaryDto, PatientProfileDto, UserEventDto } from '@starter/shared-types';
const rawApiUrl = import.meta.env.VITE_API_URL;
if (!rawApiUrl) throw new Error('Missing required VITE_API_URL');
const API_URL = rawApiUrl.replace(/\/$/, '');
interface ApiErrorPayload { success?: boolean; error?: { message?: string } }
const request = async <T>(path: string, init: RequestInit): Promise<T> => {
  const headers = new Headers(init.headers ?? {}); if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${API_URL}${path}`, { ...init, credentials: 'include', headers });
  const rawBody = await response.text(); let payload: (T & ApiErrorPayload) | null = null;
  if (rawBody) { try { payload = JSON.parse(rawBody) as T & ApiErrorPayload; } catch { payload = null; } }
  if (!response.ok) throw new Error(payload?.error?.message ?? `Request failed with status ${response.status}`);
  return payload ?? ({} as T);
};
export const patientApi = {
  getJoinPreview: async (tokenOrSlug: string): Promise<JoinOrganizationPreviewDto> => (await request<{ success: true; data: JoinOrganizationPreviewDto }>(`/join/${encodeURIComponent(tokenOrSlug)}`, { method: 'GET' })).data,
  resolveJoin: async (accessToken: string, tokenOrSlug: string): Promise<PatientOrganizationSummaryDto> => (await request<{ success: true; data: PatientOrganizationSummaryDto }>(`/patient/join`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ tokenOrSlug }) })).data,
  getMe: async (accessToken: string): Promise<PatientMeDto> => (await request<{ success: true; data: PatientMeDto }>('/patient/me', { method: 'GET', headers: { Authorization: `Bearer ${accessToken}` } })).data,
  patchMe: async (accessToken: string, input: { phone?: string; dateOfBirth?: string; documentId?: string }): Promise<PatientProfileDto> => (await request<{ success: true; data: PatientProfileDto }>('/patient/me', { method: 'PATCH', headers: { Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(input) })).data,
  listOrganizations: async (accessToken: string): Promise<PatientOrganizationSummaryDto[]> => (await request<{ success: true; data: PatientOrganizationSummaryDto[] }>('/patient/organizations', { method: 'GET', headers: { Authorization: `Bearer ${accessToken}` } })).data,
  getOrganizationCatalog: async (accessToken: string, organizationId: string): Promise<{ professionals: Array<{ id: string; displayName: string }>; specialties: Array<{ id: string; name: string }> }> => (await request<{ success: true; data: { professionals: Array<{ id: string; displayName: string }>; specialties: Array<{ id: string; name: string }> } }>(`/patient/organizations/${organizationId}/catalog`, { method: 'GET', headers: { Authorization: `Bearer ${accessToken}` } })).data,
  getAvailability: async (accessToken: string, organizationId: string, params: { professionalId: string; startDate: string; endDate: string }): Promise<CalculatedAvailabilityDto> => (await request<{ success: true; data: CalculatedAvailabilityDto }>(`/patient/organizations/${organizationId}/availability?${new URLSearchParams(params).toString()}`, { method: 'GET', headers: { Authorization: `Bearer ${accessToken}` } })).data,
  createAppointment: async (accessToken: string, organizationId: string, input: { professionalId: string; specialtyId?: string; startAt: string; endAt?: string; notes?: string }): Promise<AppointmentDto> => (await request<{ success: true; data: AppointmentDto }>(`/patient/organizations/${organizationId}/appointments`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(input) })).data,
  listAppointments: async (accessToken: string, params?: { status?: AppointmentStatus; organizationId?: string }): Promise<{ upcoming: AppointmentDto[]; history: AppointmentDto[] }> => {
    const query = new URLSearchParams(); if (params?.status) query.set('status', params.status); if (params?.organizationId) query.set('organizationId', params.organizationId);
    return (await request<{ success: true; data: { upcoming: AppointmentDto[]; history: AppointmentDto[] } }>(`/patient/appointments${query.size > 0 ? `?${query.toString()}` : ''}`, { method: 'GET', headers: { Authorization: `Bearer ${accessToken}` } })).data;
  },
  getAppointment: async (accessToken: string, appointmentId: string): Promise<AppointmentDto> => (await request<{ success: true; data: AppointmentDto }>(`/patient/appointments/${appointmentId}`, { method: 'GET', headers: { Authorization: `Bearer ${accessToken}` } })).data,
  cancelAppointment: async (accessToken: string, appointmentId: string, reason?: string): Promise<AppointmentDto> => (await request<{ success: true; data: AppointmentDto }>(`/patient/appointments/${appointmentId}/cancel`, { method: 'PATCH', headers: { Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ reason }) })).data,
  rescheduleAppointment: async (accessToken: string, appointmentId: string, input: { newProfessionalId?: string; newSpecialtyId?: string; newStartAt: string; newEndAt?: string; reason?: string }): Promise<{ original: AppointmentDto; replacement: AppointmentDto }> => (await request<{ success: true; data: { original: AppointmentDto; replacement: AppointmentDto } }>(`/patient/appointments/${appointmentId}/reschedule`, { method: 'PATCH', headers: { Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(input) })).data,
  listEvents: async (accessToken: string): Promise<UserEventDto[]> => (await request<{ success: true; data: UserEventDto[] }>('/patient/events', { method: 'GET', headers: { Authorization: `Bearer ${accessToken}` } })).data
};
