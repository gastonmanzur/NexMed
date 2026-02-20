import { apiFetch } from "./client";
import { Appointment } from "../types";

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

  return apiFetch<{ clinic: { name: string; slug: string }; slots: { startAt: string; endAt: string; professionalId?: string }[] }>(
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

  return apiFetch<{ clinic: { name: string; slug: string }; slots: { startAt: string; endAt: string }[] }>(
    `/public/clinics/by-id/${clinicId}/availability?${params.toString()}`
  );
};

export const publicCreateAppointment = (
  slug: string,
  body: {
    startAt: string;
    patientFullName: string;
    patientPhone: string;
    note?: string;
    professionalId?: string;
    specialtyId?: string;
  },
  token?: string
) => apiFetch<Appointment>(`/public/clinics/${slug}/appointments`, { method: "POST", body: JSON.stringify(body) }, token);

export const listMyAppointments = (token: string) => apiFetch<Appointment[]>(`/public/me/appointments`, {}, token);

export const cancelMyAppointment = (token: string, id: string) =>
  apiFetch<Appointment>(`/public/me/appointments/${id}/cancel`, { method: "PATCH" }, token);

export const rescheduleMyAppointment = (token: string, id: string, body: { startAt: string }) =>
  apiFetch<{ cancelledAppointmentId: string; appointment: Appointment }>(
    `/public/me/appointments/${id}/reschedule`,
    { method: "POST", body: JSON.stringify(body) },
    token
  );
