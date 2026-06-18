import type { AppointmentDto, ProfessionalDashboardDto, ProfessionalPanelMeDto } from '@starter/shared-types';
import type { InternalMessageDto } from '../organizations/organization-api';

const rawApiUrl = import.meta.env.VITE_API_URL;

if (!rawApiUrl) {
  throw new Error('Missing required VITE_API_URL');
}

const API_URL = rawApiUrl.replace(/\/$/, '');

interface ApiErrorPayload {
  success?: boolean;
  error?: { message?: string };
}

const request = async <T>(path: string, accessToken: string, organizationId: string, method = 'GET', body?: unknown): Promise<T> => {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'x-organization-id': organizationId
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
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


export interface EncounterInput { reason?: string; evolution?: string; diagnosisText?: string; treatmentPlan?: string; observations?: string }
export interface ClinicalEncounter extends EncounterInput { _id?: string; id?: string; status: 'draft' | 'signed' | 'cancelled'; createdAt?: string; signedAt?: string | null }
export interface AttentionData { appointment: AppointmentDto; patient: { firstName?: string; lastName?: string; phone?: string; documentId?: string; dateOfBirth?: string | null } | null; professional: unknown; clinicalRecord: { _id?: string; allergies?: string[]; chronicConditions?: string[]; currentMedications?: string[]; relevantHistory?: string; generalObservations?: string }; currentEncounter: ClinicalEncounter | null; previousEncounters: ClinicalEncounter[] }

export const professionalApi = {
  me: async (accessToken: string, organizationId: string): Promise<ProfessionalPanelMeDto> => {
    const result = await request<{ success: true; data: ProfessionalPanelMeDto }>('/professional/me', accessToken, organizationId);
    return result.data;
  },

  dashboard: async (accessToken: string, organizationId: string): Promise<ProfessionalDashboardDto> => {
    const result = await request<{ success: true; data: ProfessionalDashboardDto }>('/professional/dashboard', accessToken, organizationId);
    return result.data;
  },

  appointments: async (accessToken: string, organizationId: string): Promise<AppointmentDto[]> => {
    const result = await request<{ success: true; data: AppointmentDto[] }>('/professional/appointments', accessToken, organizationId);
    return result.data;
  },

  waitingRoom: async (accessToken: string, organizationId: string): Promise<AppointmentDto[]> => {
    const result = await request<{ success: true; data: AppointmentDto[] }>('/professional/waiting-room', accessToken, organizationId);
    return result.data;
  },

  start: async (accessToken: string, organizationId: string, appointmentId: string): Promise<AppointmentDto> => {
    const result = await request<{ success: true; data: AppointmentDto }>(`/professional/appointments/${appointmentId}/start`, accessToken, organizationId, 'POST');
    return result.data;
  },

  complete: async (accessToken: string, organizationId: string, appointmentId: string): Promise<AppointmentDto> => {
    const result = await request<{ success: true; data: AppointmentDto }>(`/professional/appointments/${appointmentId}/complete`, accessToken, organizationId, 'POST');
    return result.data;
  },

  attention: async (accessToken: string, organizationId: string, appointmentId: string): Promise<AttentionData> => {
    const result = await request<{ success: true; data: AttentionData }>(`/professional/appointments/${appointmentId}/attention`, accessToken, organizationId);
    return result.data;
  },

  saveEncounter: async (accessToken: string, organizationId: string, appointmentId: string, body: EncounterInput): Promise<ClinicalEncounter> => {
    const result = await request<{ success: true; data: ClinicalEncounter }>(`/professional/appointments/${appointmentId}/encounter`, accessToken, organizationId, 'POST', body);
    return result.data;
  },

  signEncounter: async (accessToken: string, organizationId: string, encounterId: string): Promise<ClinicalEncounter> => {
    const result = await request<{ success: true; data: ClinicalEncounter }>(`/professional/encounters/${encounterId}/sign`, accessToken, organizationId, 'POST');
    return result.data;
  },

  updateRecord: async (accessToken: string, organizationId: string, patientProfileId: string, body: unknown): Promise<unknown> => {
    const result = await request<{ success: true; data: unknown }>(`/professional/patients/${patientProfileId}/clinical-record`, accessToken, organizationId, 'PATCH', body);
    return result.data;
  },

  messages: async (accessToken: string, organizationId: string): Promise<InternalMessageDto[]> => {
    const result = await request<{ success: true; data: InternalMessageDto[] }>('/professional/messages', accessToken, organizationId);
    return result.data;
  },

  sendMessage: async (accessToken: string, organizationId: string, body: { appointmentId?: string; patientProfileId?: string; type: string; message?: string }): Promise<unknown> => {
    const result = await request<{ success: true; data: unknown }>('/professional/messages', accessToken, organizationId, 'POST', body);
    return result.data;
  },

  markMessageRead: async (accessToken: string, organizationId: string, messageId: string): Promise<unknown> => request(`/professional/messages/${messageId}/read`, accessToken, organizationId, 'PATCH'),
  resolveMessage: async (accessToken: string, organizationId: string, messageId: string): Promise<unknown> => request(`/professional/messages/${messageId}/resolve`, accessToken, organizationId, 'PATCH')
};
