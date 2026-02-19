import { apiFetch } from "./client";
import { ClinicInvite } from "../types";

export const listClinicInvites = (token: string) => apiFetch<ClinicInvite[]>("/clinic/invites", { cache: "no-store" }, token);

export const createClinicInvite = (token: string, body: { label?: string; active?: boolean }) =>
  apiFetch<ClinicInvite & { url: string }>("/clinic/invites", { method: "POST", body: JSON.stringify(body) }, token);

export const updateClinicInvite = (token: string, id: string, body: { label?: string; active?: boolean }) =>
  apiFetch<ClinicInvite & { url: string }>(`/clinic/invites/${id}`, { method: "PUT", body: JSON.stringify(body) }, token);
