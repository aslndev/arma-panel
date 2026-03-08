const BASE_URL =
  import.meta.env.VITE_API_URL !== undefined
    ? import.meta.env.VITE_API_URL
    : import.meta.env.DEV
      ? "http://localhost:3001"
      : "";

export function getToken(): string | null {
  return localStorage.getItem("arma-panel-token");
}

type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown };

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, ...init } = options;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  const token = getToken();
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  const fetchBody: BodyInit | undefined =
    body !== undefined ? (JSON.stringify(body) as BodyInit) : undefined;
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
    body: fetchBody,
  });
  if (res.status === 204) {
    return undefined as T;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || res.statusText || "Request failed");
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export function getBaseUrl() {
  return BASE_URL;
}

export function setToken(token: string) {
  localStorage.setItem("arma-panel-token", token);
}

export function clearToken() {
  localStorage.removeItem("arma-panel-token");
}

export function hasToken() {
  return !!getToken();
}
