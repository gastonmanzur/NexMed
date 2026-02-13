import { apiFetch } from "./client";
import { AuthProfile, AuthUser } from "../types";

export type AuthResponse = { token: string; user: AuthUser };

export const register = (body:
  | { type: "clinic"; name: string; email: string; password: string; phone: string; address: string; city: string }
  | { type: "patient"; email: string; password: string; firstName: string; lastName: string; age: number; phone: string }
) => apiFetch<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(body) });

export const login = (body: { email: string; password: string }) =>
  apiFetch<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify(body) });

export const loginWithGoogle = (body: { credential: string }) =>
  apiFetch<AuthResponse>("/auth/google", { method: "POST", body: JSON.stringify(body) });

export const getMe = (token: string) => apiFetch<AuthProfile>("/auth/me", {}, token);
