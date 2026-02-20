import { PatientNotification } from "../types";
import { apiFetch } from "./client";

export const listPatientNotifications = (token: string) => apiFetch<PatientNotification[]>("/patient/notifications", {}, token);
