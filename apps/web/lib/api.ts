import { doneProgress, startProgress } from "./progress";

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

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(0, "Помилка мережі. Перевірте з’єднання.");
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
    throw new ApiError(res.status, statusMessage(res.status, message));
  }
  return body as T;
}

function statusMessage(status: number, fallback: string) {
  if (status === 401) return fallback || "Увійдіть у систему";
  if (status === 403) return fallback || "У вас немає доступу до цього елемента";
  if (status === 404) return fallback || "Цей елемент більше недоступний";
  if (status === 409) return fallback || "Елемент із такою назвою вже існує тут";
  return fallback;
}
