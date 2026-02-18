import { apiFetch } from "./client";
import { Clinic, ClinicInvite, Professional, ProfessionalAvailabilityPayload, ProfessionalTimeOff, Specialty } from "../types";

export const updateSettings = (token: string, settings: Clinic["settings"]) =>
  apiFetch<Clinic["settings"]>(
    "/clinics/me/settings",
    {
      method: "PUT",
      body: JSON.stringify(settings),
    },
    token
  );

export const createInvite = (token: string, body: { label?: string }) =>
  apiFetch<{ token: string; url: string }>(
    "/clinics/invites",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
    token
  );

export const listInvites = (token: string) => apiFetch<ClinicInvite[]>("/clinics/invites", {}, token);

export const listSpecialties = (token: string) => apiFetch<Specialty[]>("/clinics/specialties", {}, token);
export const createSpecialty = (token: string, body: { name: string; description?: string }) =>
  apiFetch<Specialty>("/clinics/specialties", { method: "POST", body: JSON.stringify(body) }, token);
export const updateSpecialty = (token: string, id: string, body: Partial<{ name: string; description: string; isActive: boolean }>) =>
  apiFetch<Specialty>(`/clinics/specialties/${id}`, { method: "PUT", body: JSON.stringify(body) }, token);
export const deleteSpecialty = (token: string, id: string) =>
  apiFetch<Specialty>(`/clinics/specialties/${id}`, { method: "DELETE" }, token);

export const listProfessionals = (token: string) => apiFetch<Professional[]>("/clinics/professionals", {}, token);
export const createProfessional = (
  token: string,
  body: { firstName: string; lastName: string; email?: string; phone?: string; specialtyIds: string[]; isActive?: boolean }
) => apiFetch<Professional>("/clinics/professionals", { method: "POST", body: JSON.stringify(body) }, token);
export const updateProfessional = (
  token: string,
  id: string,
  body: Partial<{ firstName: string; lastName: string; email: string; phone: string; specialtyIds: string[]; isActive: boolean }>
) => apiFetch<Professional>(`/clinics/professionals/${id}`, { method: "PUT", body: JSON.stringify(body) }, token);
export const deleteProfessional = (token: string, id: string) =>
  apiFetch<Professional>(`/clinics/professionals/${id}`, { method: "DELETE" }, token);

export const getProfessionalAvailability = (token: string, id: string) =>
  apiFetch<ProfessionalAvailabilityPayload>(`/clinics/professionals/${id}/availability`, {}, token);
export const putProfessionalAvailability = (
  token: string,
  id: string,
  body: { weeklyBlocks: { weekday: number; startTime: string; endTime: string }[]; slotMinutes?: number }
) => apiFetch<ProfessionalAvailabilityPayload>(`/clinics/professionals/${id}/availability`, { method: "PUT", body: JSON.stringify(body) }, token);

export const listProfessionalTimeOff = (token: string, id: string) =>
  apiFetch<ProfessionalTimeOff[]>(`/clinics/professionals/${id}/timeoff`, {}, token);
export const createProfessionalTimeOff = (
  token: string,
  id: string,
  body: { date: string; startTime?: string; endTime?: string; reason?: string }
) => apiFetch<ProfessionalTimeOff>(`/clinics/professionals/${id}/timeoff`, { method: "POST", body: JSON.stringify(body) }, token);
export const deleteProfessionalTimeOff = (token: string, id: string, timeoffId: string) =>
  apiFetch<ProfessionalTimeOff>(`/clinics/professionals/${id}/timeoff/${timeoffId}`, { method: "DELETE" }, token);

export const listPublicSpecialties = (slug: string) => apiFetch<Specialty[]>(`/public/clinics/${slug}/specialties`);
export const listPublicProfessionals = (slug: string) =>
  apiFetch<Professional[]>(`/public/clinics/${slug}/professionals?includeSpecialties=true`);
