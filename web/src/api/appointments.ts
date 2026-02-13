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

export const publicCreateAppointment = (
  slug: string,
  body: { startAt: string; patientFullName: string; patientPhone: string; note?: string }
) => apiFetch<Appointment>(`/public/clinics/${slug}/appointments`, { method: "POST", body: JSON.stringify(body) });
