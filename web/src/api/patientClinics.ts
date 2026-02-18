import { PatientClinic } from "../types";
import { apiFetch } from "./client";

export const joinClinicByToken = (token: string, body: { token: string }) =>
  apiFetch<{ _id: string; name: string; slug: string; phone: string; address: string; city: string }>(
    "/patient/clinics/join",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
    token
  );

export const listMyClinics = (token: string) => apiFetch<PatientClinic[]>("/patient/clinics", {}, token);
