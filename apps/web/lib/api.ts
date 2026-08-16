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
    throw new ApiError(0, "Network error. Check your connection.");
  }

  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = Array.isArray(body.message) ? body.message.join(", ") : body.message || res.statusText;
    throw new ApiError(res.status, message);
  }
  return body as T;
}
