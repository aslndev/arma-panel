import { api, setToken, clearToken, getToken, getBaseUrl } from "./client";

export interface LoginResponse {
  token: string;
  user: { id: number; username: string };
}

export interface SettingsResponse {
  panelName: string;
  serverFolder: string;
  configFile: string;
  steamcmdPath: string;
  armaServerFile: string;
  setupComplete: boolean;
}

/** Public setup endpoints (no auth required). Used for first-time installer. */
export const setupApi = {
  getStatus: () => api.get<{ setupComplete: boolean }>("/api/setup/status"),
  complete: (data: {
    panelName: string;
    serverFolder: string;
    configFile: string;
    steamcmdPath: string;
    armaServerFile?: string;
    adminUsername: string;
    adminPassword: string;
  }) => api.post<{ success: boolean }>("/api/setup/complete", data),
};

export const authApi = {
  login: (username: string, password: string) =>
    api.post<LoginResponse>("/api/auth/login", { username, password }),
  me: () => api.get<{ user: { id: number; username: string } }>("/api/auth/me"),
};

export const settingsApi = {
  get: () => api.get<SettingsResponse>("/api/settings"),
  completeSetup: (data: {
    panelName: string;
    serverFolder: string;
    configFile: string;
    steamcmdPath: string;
    armaServerFile?: string;
  }) => api.post<SettingsResponse>("/api/settings", data),
  update: (data: Partial<SettingsResponse>) => api.put<SettingsResponse>("/api/settings", data),
};

export interface ServerSummary {
  serverFolder: string;
  sessionStartedAt: string | null;
  uptimeSeconds: number;
  address: string | null;
  port: number | null;
  hasSession: boolean;
}

export const serverApi = {
  summary: () => api.get<ServerSummary>("/api/server/summary"),
  start: () => api.post<{ success: boolean; action: string }>("/api/server/start"),
  stop: () => api.post<{ success: boolean; action: string }>("/api/server/stop"),
  restart: () => api.post<{ success: boolean; action: string }>("/api/server/restart"),
  logs: {
    sessions: () => api.get<{ sessions: string[] }>("/api/server/logs/sessions"),
    getFile: (session: string, file: string, tail?: number) =>
      fetch(
        `${getBaseUrl()}/api/server/logs/sessions/${encodeURIComponent(session)}/files/${encodeURIComponent(file)}${tail != null ? `?tail=${tail}` : ""}`,
        {
          headers: { Authorization: `Bearer ${getToken()}` },
        }
      ).then((r) => (r.ok ? r.text() : r.json().then((d) => Promise.reject(new Error(d.error || "Failed"))))),
  },
};

export function getConsoleWebSocketUrl(): string {
  const base = getBaseUrl() || (typeof window !== "undefined" ? window.location.origin : "http://localhost:3001");
  const wsBase = base.replace(/^http/, "ws");
  const token = getToken();
  return `${wsBase}/ws/console${token ? `?token=${encodeURIComponent(token)}` : ""}`;
}

/** Config file from Settings (Config File path). Read/save the actual file. */
export const configApi = {
  getContent: () => api.get<{ content: string }>("/api/config/content"),
  saveContent: (content: string) => api.put<{ success: boolean }>("/api/config/content", { content }),
};

export const usersApi = {
  list: () => api.get<Array<{ id: string; email: string; role: string; permissions: string[]; addedAt: string }>>("/api/users"),
  invite: (data: { email: string; role: string; permissions: string[] }) =>
    api.post<{ id: string; email: string; role: string; permissions: string[]; addedAt: string }>("/api/users", data),
  remove: (id: string) => api.delete(`/api/users/${id}`),
};

export const databasesApi = {
  list: () =>
    api.get<
      Array<{
        id: string;
        name: string;
        host: string;
        port: number;
        username: string;
        password: string;
        connections: number;
        maxConnections: number;
      }>
    >("/api/databases"),
  create: (data: { name: string }) => api.post("/api/databases", data),
  remove: (id: string) => api.delete(`/api/databases/${id}`),
};

export const schedulesApi = {
  list: () =>
    api.get<
      Array<{
        id: string;
        name: string;
        cron: string;
        action: string;
        enabled: boolean;
        lastRun: string;
        nextRun: string;
      }>
    >("/api/schedules"),
  create: (data: { name: string; cron: string; action: string }) =>
    api.post("/api/schedules", data),
  update: (id: string, data: { name?: string; cron?: string; action?: string; enabled?: boolean }) =>
    api.put(`/api/schedules/${id}`, data),
  remove: (id: string) => api.delete(`/api/schedules/${id}`),
};

export const filesApi = {
  list: (path: string) =>
    api.get<
      Array<{
        id: string;
        path: string;
        name: string;
        type: string;
        size: string | null;
        modified: string;
      }>
    >(`/api/files?path=${encodeURIComponent(path)}`),
  createFolder: (path: string, name: string) =>
    api.post("/api/files/folder", { path, name }),
  upload: (path: string, name: string, content?: string) =>
    api.post("/api/files", { path, name, content }),
  getContent: (path: string, name: string) =>
    api.get<{ content: string; name: string }>(
      `/api/files/content?path=${encodeURIComponent(path)}&name=${encodeURIComponent(name)}`
    ),
  update: (path: string, name: string, data: { content?: string; newName?: string }) =>
    api.put("/api/files", { path, name, ...data }),
  remove: (path: string, name: string) =>
    api.delete(`/api/files?path=${encodeURIComponent(path)}&name=${encodeURIComponent(name)}`),
};

export const backupsApi = {
  list: () =>
    api.get<
      Array<{
        id: string;
        name: string;
        size: string;
        createdAt: string;
        locked: boolean;
        status: string;
      }>
    >("/api/backups"),
  create: (data?: { name?: string }) => api.post("/api/backups", data || {}),
  restore: (id: string) => api.post(`/api/backups/${id}/restore`, {}),
  remove: (id: string) => api.delete(`/api/backups/${id}`),
};

export const allocationsApi = {
  list: () =>
    api.get<
      Array<{ id: string; ip: string; port: number; alias: string; primary: boolean }>
    >("/api/allocations"),
  add: (data: { ip: string; port: number; alias?: string }) =>
    api.post("/api/allocations", data),
  remove: (id: string) => api.delete(`/api/allocations/${id}`),
};

export const activityApi = {
  list: () =>
    api.get<
      Array<{
        id: string;
        type: string;
        action: string;
        detail: string;
        user: string;
        timestamp: string;
      }>
    >("/api/activity"),
};

export { setToken, clearToken, getToken };
