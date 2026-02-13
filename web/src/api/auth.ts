import { apiFetch } from "./client";
import { Clinic } from "../types";

export type AuthResponse = { token: string; clinic: Clinic };

export const register = (body: { name: string; email: string; password: string }) =>
  apiFetch<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(body) });

export const login = (body: { email: string; password: string }) =>
  apiFetch<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify(body) });
