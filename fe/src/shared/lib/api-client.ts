import { keycloak } from "../../features/auth/keycloak";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly body: unknown) {
    const detail = body && typeof body === "object" && "detail" in body ? String(body.detail) : `Request failed with status ${status}`;
    super(detail);
    this.name = "ApiError";
  }
}

type QueryValue = string | number | boolean | null | undefined;

function withQuery(path: string, query?: Record<string, QueryValue>): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) params.set(key, String(value));
  }
  const serialized = params.toString();
  return serialized ? `${path}?${serialized}` : path;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (keycloak.authenticated) {
    await keycloak.updateToken(30);
    if (keycloak.token) headers.set("Authorization", `Bearer ${keycloak.token}`);
  }
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  const text = await response.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = { detail: text };
  }
  if (!response.ok) throw new ApiError(response.status, body);
  return body as T;
}

async function requestBlob(path: string, init: RequestInit = {}): Promise<Blob> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (keycloak.authenticated) {
    await keycloak.updateToken(30);
    if (keycloak.token) headers.set("Authorization", `Bearer ${keycloak.token}`);
  }
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (!response.ok) {
    const text = await response.text();
    let body: unknown;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      body = { detail: text };
    }
    throw new ApiError(response.status, body);
  }
  return response.blob();
}

export const apiClient = {
  get: <T>(path: string, query?: Record<string, QueryValue>) => request<T>(withQuery(path, query)),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body: body === undefined ? undefined : JSON.stringify(body) }),
  postBlob: (path: string, body?: unknown) => requestBlob(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
