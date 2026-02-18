import { apiFetch } from "./client";
import { Appointment } from "../types";

export const listAppointments = (token: string, from: string, to: string, q = "") =>
  apiFetch<Appointment[]>(`/appointments?from=${from}&to=${to}&q=${encodeURIComponent(q)}`, {}, token);

export const cancelAppointment = (token: string, id: string) =>
  apiFetch<Appointment>(`/appointments/${id}/cancel`, { method: "PATCH" }, token);

export const publicAvailability = (slug: string, from: string, to: string) =>
  apiFetch<{ clinic: { name: string; slug: string }; slots: { startAt: string; endAt: string }[] }>(
    `/public/clinics/${slug}/availability?from=${from}&to=${to}`
  );


export const publicAvailabilityByClinicId = (clinicId: string, from: string, to: string) =>
  apiFetch<{ clinic: { name: string; slug: string }; slots: { startAt: string; endAt: string }[] }>(
    `/public/clinics/by-id/${clinicId}/availability?from=${from}&to=${to}`
  );

export const publicCreateAppointment = (
  slug: string,
  body: { startAt: string; patientFullName: string; patientPhone: string; note?: string },
  token?: string
) => apiFetch<Appointment>(`/public/clinics/${slug}/appointments`, { method: "POST", body: JSON.stringify(body) }, token);


export const listMyAppointments = (token: string) => apiFetch<Appointment[]>(`/public/me/appointments`, {}, token);

export const rescheduleMyAppointment = (token: string, id: string, body: { startAt: string }) =>
  apiFetch<{ cancelledAppointmentId: string; appointment: Appointment }>(
    `/public/me/appointments/${id}/reschedule`,
    { method: "POST", body: JSON.stringify(body) },
    token
  );
