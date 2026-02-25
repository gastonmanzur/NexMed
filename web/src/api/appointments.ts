import { apiFetch } from "./client";
import { Appointment, PaginatedAppointmentHistory, PublicCreateAppointmentResponse } from "../types";

export const listAppointments = (
  token: string,
  from: string,
  to: string,
  q = "",
  professionalId?: string
) => {
  const params = new URLSearchParams({ from, to, q });
  if (professionalId) params.set("professionalId", professionalId);

  return apiFetch<Appointment[]>(`/appointments?${params.toString()}`, {}, token);
};

export const cancelAppointment = (token: string, id: string) =>
  apiFetch<Appointment>(`/appointments/${id}/cancel`, { method: "PATCH" }, token);

export const publicAvailability = (
  slug: string,
  from: string,
  to: string,
  filters?: { professionalId?: string; specialtyId?: string }
) => {
  const params = new URLSearchParams({ from, to });
  if (filters?.professionalId) params.set("professionalId", filters.professionalId);
  if (filters?.specialtyId) params.set("specialtyId", filters.specialtyId);

  if (import.meta.env.DEV) {
    params.set("ts", String(Date.now()));
  }

  return apiFetch<{ clinic: { name: string; slug: string }; slots: { startAt: string; endAt: string; professionalId?: string; professionalFullName?: string }[] }>(
    `/public/clinics/${slug}/availability?${params.toString()}`,
    { cache: "no-store" }
  );
};

export const publicAvailabilityByClinicId = (clinicId: string, from: string, to: string) =>
  apiFetch<{ clinic: { name: string; slug: string }; slots: { startAt: string; endAt: string }[] }>(
    `/public/clinics/by-id/${clinicId}/availability?from=${from}&to=${to}`
  );

export const publicAvailabilityByClinicIdWithFilters = (
  clinicId: string,
  from: string,
  to: string,
  filters?: { professionalId?: string; specialtyId?: string }
) => {
  const params = new URLSearchParams({ from, to });
  if (filters?.professionalId) params.set("professionalId", filters.professionalId);
  if (filters?.specialtyId) params.set("specialtyId", filters.specialtyId);

  return apiFetch<{ clinic: { name: string; slug: string }; slots: { startAt: string; endAt: string; professionalId?: string; professionalFullName?: string }[] }>(
    `/public/clinics/by-id/${clinicId}/availability?${params.toString()}`
  );
};

export const publicCreateAppointment = (
  slug: string,
  body: {
    startAt: string;
    note?: string;
    professionalId?: string;
    specialtyId?: string;
  },
  token?: string
) => apiFetch<PublicCreateAppointmentResponse>(`/public/clinics/${slug}/appointments`, { method: "POST", body: JSON.stringify(body) }, token);

export const listMyAppointments = (token: string) => apiFetch<Appointment[]>(`/patient/appointments`, {}, token);

export const cancelMyAppointment = (token: string, id: string) =>
  apiFetch<Appointment>(`/patient/appointments/${id}/cancel`, { method: "PATCH" }, token);

export const rescheduleMyAppointment = (token: string, id: string, body: { startAt: string; professionalId?: string; specialtyId?: string }) =>
  apiFetch<{ appointment: Appointment }>(
    `/patient/appointments/${id}/reschedule`,
    { method: "POST", body: JSON.stringify(body) },
    token
  );


export const listMyAppointmentHistory = (
  token: string,
  params: {
    status?: string[];
    from?: string;
    to?: string;
    clinicId?: string;
    professionalId?: string;
    specialtyId?: string;
    q?: string;
    page?: number;
    limit?: number;
    sort?: string;
  }
) => {
  const search = new URLSearchParams();
  if (params.status?.length) search.set("status", params.status.join(","));
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  if (params.clinicId) search.set("clinicId", params.clinicId);
  if (params.professionalId) search.set("professionalId", params.professionalId);
  if (params.specialtyId) search.set("specialtyId", params.specialtyId);
  if (params.q) search.set("q", params.q);
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  if (params.sort) search.set("sort", params.sort);

  return apiFetch<PaginatedAppointmentHistory>(`/patient/appointments/history?${search.toString()}`, {}, token);
};
