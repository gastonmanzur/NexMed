const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

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
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  const payload = (await res.json()) as ApiResponse<T>;
  if (!res.ok || !payload.ok || !payload.data) {
    throw new ApiError(payload.error || "Error inesperado", res.status, payload.code, payload.details);
  }
  return payload.data;
}
