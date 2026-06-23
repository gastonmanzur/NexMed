import type {
  AppointmentDto,
  AppointmentDurationMultiplier,
  AppointmentStatus,
  CalculatedAvailabilityDto,
  JoinOrganizationPreviewDto,
  NotificationDto,
  PatientFamilyMemberDto,
  PatientMeDto,
  PatientOrganizationSummaryDto,
  PatientProfileDto,
  UserEventDto,
  WaitlistRequestDto,
  OrganizationHealthInsuranceDto,
  PatientAppointmentAvailableSlotsDto,
  PatientAppointmentDetailDto,
  PatientAppointmentScope,
  PatientAppointmentsPageDto,
} from "@starter/shared-types";
const rawApiUrl = import.meta.env.VITE_API_URL;
if (!rawApiUrl) throw new Error("Missing required VITE_API_URL");
const API_URL = rawApiUrl.replace(/\/$/, "");

export type ExpressMaskedPatient = { displayName: string; maskedPhone: string };
export type ExpressPatientCoverage = {
  type: "private" | "health_insurance";
  healthInsuranceId: string | null;
  healthInsuranceName: string | null;
  insuranceMemberNumber: string | null;
  insurancePlan: string | null;
};
export type ExpressSessionMe =
  | { authenticated: false }
  | {
      authenticated: true;
      patient: ExpressMaskedPatient & {
        patientIdentityId: string;
        coverage?: ExpressPatientCoverage;
      };
    };
export type ExpressPatientLookup =
  | { found: false }
  | {
      found: true;
      maskedPatient: ExpressMaskedPatient;
      requiresVerification: boolean;
      hasSavedData: boolean;
      lookupToken: string;
    };
export type ExpressPatientPrefill =
  | {
      found: false;
    }
  | {
      found: true;
      patient: {
        firstName: string;
        lastName: string;
        phone: string;
        email: string | null;
        documentNumber: string | null;
        birthDate: string | null;
        coverage: ExpressPatientCoverage;
      };
    };
export type ExpressPatientConfirm = {
  confirmed: true;
  patient: ExpressMaskedPatient;
};
export type ExpressAppointmentInput = {
  professionalId: string;
  specialtyId: string;
  startAt: string;
  endAt?: string;
  appointmentType?: "single" | "double";
  useCurrentExpressPatient?: boolean;
  useSavedPatientData?: boolean;
  patientLookupToken?: string;
  patient?: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    documentNumber?: string;
    birthDate?: string;
  };
  coverage?: {
    type: "private" | "health_insurance";
    healthInsuranceId?: string | null;
    insuranceMemberNumber?: string | null;
    insurancePlan?: string | null;
  };
  reason?: string;
};

export type PatientCatalog = {
  professionals: Array<{
    id: string;
    displayName: string;
    specialtyIds: string[];
  }>;
  specialties: Array<{ id: string; name: string; professionalIds: string[] }>;
};

interface ApiErrorPayload {
  success?: boolean;
  message?: string;
  error?: { message?: string };
}

export class PatientApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}
const request = async <T>(path: string, init: RequestInit): Promise<T> => {
  const headers = new Headers(init.headers ?? {});
  if (!headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers,
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
  if (!response.ok)
    throw new PatientApiError(
      payload?.error?.message ??
        payload?.message ??
        `Request failed with status ${response.status}`,
      response.status,
    );
  return payload ?? ({} as T);
};
export const patientApi = {
  getPublicCatalog: async (tokenOrSlug: string): Promise<PatientCatalog> =>
    (
      await request<{ success: true; data: PatientCatalog }>(
        `/join/${encodeURIComponent(tokenOrSlug)}/catalog`,
        { method: "GET" },
      )
    ).data,
  getPublicAvailability: async (
    tokenOrSlug: string,
    params: {
      professionalId: string;
      specialtyId: string;
      startDate: string;
      endDate: string;
    },
  ): Promise<CalculatedAvailabilityDto> =>
    (
      await request<{ success: true; data: CalculatedAvailabilityDto }>(
        `/join/${encodeURIComponent(tokenOrSlug)}/availability?${new URLSearchParams(params).toString()}`,
        { method: "GET" },
      )
    ).data,
  getPublicHealthInsurances: async (
    tokenOrSlug: string,
  ): Promise<OrganizationHealthInsuranceDto[]> =>
    (
      await request<{ success: true; data: OrganizationHealthInsuranceDto[] }>(
        `/join/${encodeURIComponent(tokenOrSlug)}/health-insurances`,
        { method: "GET" },
      )
    ).data,
  getExpressSessionMe: async (): Promise<ExpressSessionMe> =>
    request<ExpressSessionMe>("/public/patient-express-session/me", {
      method: "GET",
    }),
  getPatientSession: async (tokenOrSlug: string): Promise<ExpressSessionMe> =>
    request<ExpressSessionMe>(
      `/join/${encodeURIComponent(tokenOrSlug)}/patient-session`,
      { method: "GET" },
    ),
  lookupExpressPatient: async (
    tokenOrSlug: string,
    input: { phone: string },
  ): Promise<ExpressPatientLookup> =>
    (
      await request<{ success: true; data: ExpressPatientLookup }>(
        `/join/${encodeURIComponent(tokenOrSlug)}/patient-lookup`,
        { method: "POST", body: JSON.stringify(input) },
      )
    ).data,
  prefillExpressPatient: async (
    tokenOrSlug: string,
    input: { phone: string; acceptSavedData: true },
  ): Promise<ExpressPatientPrefill> =>
    (
      await request<{ success: true; data: ExpressPatientPrefill }>(
        `/join/${encodeURIComponent(tokenOrSlug)}/patient-prefill`,
        { method: "POST", body: JSON.stringify(input) },
      )
    ).data,
  confirmExpressPatient: async (
    tokenOrSlug: string,
    input: { phone: string; confirm?: boolean; code?: string },
  ): Promise<ExpressPatientConfirm> =>
    (
      await request<{ success: true; data: ExpressPatientConfirm }>(
        `/join/${encodeURIComponent(tokenOrSlug)}/patient-confirm`,
        { method: "POST", body: JSON.stringify(input) },
      )
    ).data,
  createExpressAppointment: async (
    tokenOrSlug: string,
    input: ExpressAppointmentInput,
  ): Promise<AppointmentDto> =>
    (
      await request<{ success: true; data: AppointmentDto }>(
        `/join/${encodeURIComponent(tokenOrSlug)}/appointments/express`,
        { method: "POST", body: JSON.stringify(input) },
      )
    ).data,
  getJoinPreview: async (
    tokenOrSlug: string,
  ): Promise<JoinOrganizationPreviewDto> =>
    (
      await request<{ success: true; data: JoinOrganizationPreviewDto }>(
        `/join/${encodeURIComponent(tokenOrSlug)}`,
        { method: "GET" },
      )
    ).data,
  resolveJoin: async (
    accessToken: string,
    tokenOrSlug: string,
  ): Promise<PatientOrganizationSummaryDto> =>
    (
      await request<{ success: true; data: PatientOrganizationSummaryDto }>(
        `/patient/join`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ tokenOrSlug }),
        },
      )
    ).data,
  getMe: async (accessToken: string): Promise<PatientMeDto> =>
    (
      await request<{ success: true; data: PatientMeDto }>("/patient/me", {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
      })
    ).data,
  patchMe: async (
    accessToken: string,
    input: Partial<PatientProfileDto>,
  ): Promise<PatientProfileDto> =>
    (
      await request<{ success: true; data: PatientProfileDto }>("/patient/me", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(input),
      })
    ).data,
  listOrganizations: async (
    accessToken: string,
  ): Promise<PatientOrganizationSummaryDto[]> =>
    (
      await request<{ success: true; data: PatientOrganizationSummaryDto[] }>(
        "/patient/organizations",
        { method: "GET", headers: { Authorization: `Bearer ${accessToken}` } },
      )
    ).data,
  getOrganizationCatalog: async (
    accessToken: string,
    organizationId: string,
  ): Promise<PatientCatalog> =>
    (
      await request<{ success: true; data: PatientCatalog }>(
        `/patient/organizations/${organizationId}/catalog`,
        { method: "GET", headers: { Authorization: `Bearer ${accessToken}` } },
      )
    ).data,
  getAvailability: async (
    accessToken: string,
    organizationId: string,
    params: {
      professionalId: string;
      specialtyId: string;
      startDate: string;
      endDate: string;
    },
  ): Promise<CalculatedAvailabilityDto> =>
    (
      await request<{ success: true; data: CalculatedAvailabilityDto }>(
        `/patient/organizations/${organizationId}/availability?${new URLSearchParams(params).toString()}`,
        { method: "GET", headers: { Authorization: `Bearer ${accessToken}` } },
      )
    ).data,
  createAppointment: async (
    accessToken: string,
    organizationId: string,
    input: {
      professionalId: string;
      specialtyId: string;
      startAt: string;
      endAt?: string;
      durationMultiplier?: AppointmentDurationMultiplier;
      notes?: string;
      beneficiaryType?: "self" | "family_member";
      familyMemberId?: string;
      patientProfileId?: string;
    },
  ): Promise<AppointmentDto> =>
    (
      await request<{ success: true; data: AppointmentDto }>(
        `/patient/organizations/${organizationId}/appointments`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify(input),
        },
      )
    ).data,
  listFamilyMembers: async (
    accessToken: string,
  ): Promise<PatientFamilyMemberDto[]> =>
    (
      await request<{ success: true; data: PatientFamilyMemberDto[] }>(
        "/patient/family-members",
        { method: "GET", headers: { Authorization: `Bearer ${accessToken}` } },
      )
    ).data,
  createFamilyMember: async (
    accessToken: string,
    input: Partial<PatientFamilyMemberDto> & {
      firstName: string;
      lastName: string;
      relationship: string;
      dateOfBirth: string;
      documentId: string;
    },
  ): Promise<PatientFamilyMemberDto> =>
    (
      await request<{ success: true; data: PatientFamilyMemberDto }>(
        "/patient/family-members",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify(input),
        },
      )
    ).data,
  patchFamilyMember: async (
    accessToken: string,
    familyMemberId: string,
    input: Partial<PatientFamilyMemberDto>,
  ): Promise<PatientFamilyMemberDto> =>
    (
      await request<{ success: true; data: PatientFamilyMemberDto }>(
        `/patient/family-members/${familyMemberId}`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify(input),
        },
      )
    ).data,
  deleteFamilyMember: async (
    accessToken: string,
    familyMemberId: string,
  ): Promise<{ ok: true }> =>
    (
      await request<{ success: true; data: { ok: true } }>(
        `/patient/family-members/${familyMemberId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      )
    ).data,
  listAppointments: async (
    accessToken: string,
    params?: { scope?: PatientAppointmentScope; status?: AppointmentStatus; organizationId?: string; page?: number; limit?: number; sort?: 'asc' | 'desc' },
  ): Promise<PatientAppointmentsPageDto> => {
    const query = new URLSearchParams();
    if (params?.scope) query.set("scope", params.scope);
    if (params?.status) query.set("status", params.status);
    if (params?.organizationId)
      query.set("organizationId", params.organizationId);
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.sort) query.set("sort", params.sort);
    return (
      await request<{
        success: true;
        data: PatientAppointmentsPageDto;
      }>(
        `/patient/appointments${query.size > 0 ? `?${query.toString()}` : ""}`,
        { method: "GET", headers: { Authorization: `Bearer ${accessToken}` } },
      )
    ).data;
  },
  getAppointment: async (
    accessToken: string,
    appointmentId: string,
  ): Promise<PatientAppointmentDetailDto> =>
    (
      await request<{ success: true; data: PatientAppointmentDetailDto }>(
        `/patient/appointments/${appointmentId}`,
        { method: "GET", headers: { Authorization: `Bearer ${accessToken}` } },
      )
    ).data,
  getAppointmentAvailableSlots: async (
    accessToken: string,
    appointmentId: string,
    params?: { dateFrom?: string; dateTo?: string; professionalId?: string },
  ): Promise<PatientAppointmentAvailableSlotsDto> => {
    const query = new URLSearchParams();
    if (params?.dateFrom) query.set("dateFrom", params.dateFrom);
    if (params?.dateTo) query.set("dateTo", params.dateTo);
    if (params?.professionalId) query.set("professionalId", params.professionalId);
    return (
      await request<{ success: true; data: PatientAppointmentAvailableSlotsDto }>(
        `/patient/appointments/${appointmentId}/available-slots${query.size > 0 ? `?${query.toString()}` : ""}`,
        { method: "GET", headers: { Authorization: `Bearer ${accessToken}` } },
      )
    ).data;
  },
  confirmAppointmentAttendance: async (
    accessToken: string,
    appointmentId: string,
  ): Promise<AppointmentDto> =>
    (
      await request<{ success: true; data: AppointmentDto }>(
        `/patient/appointments/${appointmentId}/confirm-attendance`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ note: "Confirmado por paciente" }),
        },
      )
    ).data,
  cancelAppointment: async (
    accessToken: string,
    appointmentId: string,
    reason?: string,
  ): Promise<AppointmentDto> =>
    (
      await request<{ success: true; data: AppointmentDto }>(
        `/patient/appointments/${appointmentId}/cancel`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ reason }),
        },
      )
    ).data,
  rescheduleAppointment: async (
    accessToken: string,
    appointmentId: string,
    input: {
      newProfessionalId?: string;
      newSpecialtyId?: string;
      newStartAt: string;
      newEndAt?: string;
      reason?: string;
    },
  ): Promise<{ original: AppointmentDto; replacement: AppointmentDto }> =>
    (
      await request<{
        success: true;
        data: { original: AppointmentDto; replacement: AppointmentDto };
      }>(`/patient/appointments/${appointmentId}/reschedule`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(input),
      })
    ).data,
  listEvents: async (accessToken: string): Promise<UserEventDto[]> =>
    (
      await request<{ success: true; data: UserEventDto[] }>(
        "/patient/events",
        { method: "GET", headers: { Authorization: `Bearer ${accessToken}` } },
      )
    ).data,
  listWaitlist: async (accessToken: string): Promise<WaitlistRequestDto[]> =>
    (
      await request<{ success: true; data: WaitlistRequestDto[] }>(
        "/patient/waitlist",
        { method: "GET", headers: { Authorization: `Bearer ${accessToken}` } },
      )
    ).data,
  createWaitlist: async (
    accessToken: string,
    input: {
      organizationId: string;
      specialtyId?: string;
      professionalId?: string;
      startDate: string;
      endDate: string;
      timeWindowStart?: string;
      timeWindowEnd?: string;
    },
  ): Promise<WaitlistRequestDto> =>
    (
      await request<{ success: true; data: WaitlistRequestDto }>(
        "/patient/waitlist",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify(input),
        },
      )
    ).data,
  cancelWaitlist: async (
    accessToken: string,
    waitlistId: string,
  ): Promise<WaitlistRequestDto> =>
    (
      await request<{ success: true; data: WaitlistRequestDto }>(
        `/patient/waitlist/${waitlistId}/cancel`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      )
    ).data,
  listNotifications: async (
    accessToken: string,
    read?: "read" | "unread",
  ): Promise<NotificationDto[]> =>
    (
      await request<{ success: true; data: NotificationDto[] }>(
        `/notifications/me${read ? `?${new URLSearchParams({ read }).toString()}` : ""}`,
        { method: "GET", headers: { Authorization: `Bearer ${accessToken}` } },
      )
    ).data,
  markNotificationRead: async (
    accessToken: string,
    notificationId: string,
  ): Promise<NotificationDto> =>
    (
      await request<{ success: true; data: NotificationDto }>(
        `/notifications/${notificationId}/read`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      )
    ).data,
};
