import { keycloak } from "../../features/auth/keycloak";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly body: unknown) {
    const detail = body && typeof body === "object" && "detail" in body ? String(body.detail) : `Request failed with status ${status}`;
    super(detail);
    this.name = "ApiError";
  }
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
  const body = text ? JSON.parse(text) : undefined;
  if (!response.ok) throw new ApiError(response.status, body);
  return body as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
};
