import { doneProgress, startProgress } from "./progress";
import { applyDevDelay } from "./dev-delay";
import { dictionaries, readStoredLocale } from "./messages";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("dr_token");
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem("dr_token", token);
  else localStorage.removeItem("dr_token");
}

export async function api<T>(
  path: string,
  options: RequestInit & { token?: string | null; progress?: boolean } = {},
): Promise<T> {
  const { progress = true, token, ...rest } = options;
  if (progress) startProgress();
  try {
    if (progress && !path.startsWith("/auth/")) await applyDevDelay();
    return await apiRequest<T>(path, { ...rest, token });
  } finally {
    if (progress) doneProgress();
  }
}

async function apiRequest<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const token = options.token === undefined ? getToken() : options.token;
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const locale = readStoredLocale();
  headers.set("Accept-Language", locale);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(0, dictionaries[locale].errors.network);
  }

  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = Array.isArray(body.message) ? body.message.join(", ") : body.message || res.statusText;
    if (res.status === 401 && typeof window !== "undefined" && !path.startsWith("/auth/")) {
      setToken(null);
      if (!window.location.pathname.startsWith("/login") && !window.location.pathname.startsWith("/s/")) {
        window.location.href = "/login";
      }
    }
    throw new ApiError(res.status, statusMessage(locale, res.status, message));
  }
  return body as T;
}

function statusMessage(locale: "en" | "uk", status: number, fallback: string) {
  const errors = dictionaries[locale].errors;
  if (status === 401) return fallback || errors.signIn;
  if (status === 403) return fallback || errors.forbidden;
  if (status === 404) return fallback || errors.notFound;
  if (status === 409) return fallback || errors.conflict;
  return fallback;
}
