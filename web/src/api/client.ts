const DEFAULT_API_BASE = "http://localhost:5000";

function normalizeApiBase(baseUrl?: string) {
  const trimmed = (baseUrl ?? DEFAULT_API_BASE).trim().replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

const API_BASE = normalizeApiBase(import.meta.env.VITE_API_URL);

type ApiResponse<T> = { ok: boolean; data?: T; error?: string; code?: string; details?: unknown };

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(options.headers ?? {});
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await res.text();
    throw new ApiError(`API error ${res.status}: expected JSON but received: ${text.slice(0, 120)}`, res.status);
  }

  const payload = (await res.json()) as ApiResponse<T>;
  if (!res.ok || !payload.ok || payload.data === undefined) {
    throw new ApiError(payload.error || "Error inesperado", res.status, payload.code, payload.details);
  }

  return payload.data;
}
