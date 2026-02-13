import { apiFetch } from "./client";
import { Clinic } from "../types";

export const updateSettings = (token: string, settings: Clinic["settings"]) =>
  apiFetch<Clinic["settings"]>(
    "/clinics/me/settings",
    {
      method: "PUT",
      body: JSON.stringify(settings),
    },
    token
  );
