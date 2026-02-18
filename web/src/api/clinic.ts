import { apiFetch } from "./client";
import { Clinic, ClinicInvite } from "../types";

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
