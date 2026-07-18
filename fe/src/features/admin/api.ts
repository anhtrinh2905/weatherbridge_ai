import { apiClient } from "../../shared/lib/api-client";

export type JobStatus = "queued" | "running" | "succeeded" | "failed";

export interface AdminAiJob {
  id: string;
  user_id: string;
  task: string;
  status: JobStatus;
  payload: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobStats {
  queued: number;
  running: number;
  succeeded: number;
  failed: number;
  total: number;
}

export interface ForecastFreshness {
  location_code: string;
  location_name: string;
  source: string | null;
  fetched_at: string | null;
}

export function listJobs(status?: JobStatus) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiClient.get<AdminAiJob[]>(`/admin/jobs${query}`);
}

export function getJobStats() {
  return apiClient.get<JobStats>("/admin/jobs/stats");
}

export function listForecastFreshness() {
  return apiClient.get<ForecastFreshness[]>("/admin/forecasts");
}

export function retryJob(jobId: string) {
  return apiClient.post<AdminAiJob>(`/admin/jobs/${jobId}/retry`);
}

export type DomainRole = "admin" | "commune_officer" | "village_head" | "resident";

export interface AdminUser {
  id: string;
  username: string | null;
  email: string | null;
  display_name: string;
  enabled: boolean;
  domain_role: DomainRole | null;
  village_id: string | null;
}

export function listUsers() {
  return apiClient.get<AdminUser[]>("/admin/users");
}

export function setUserRole(userId: string, role: DomainRole) {
  return apiClient.put<void>(`/admin/users/${userId}/role`, { role });
}

export function setUserVillage(userId: string, villageId: string | null) {
  return apiClient.put<void>(`/admin/users/${userId}/village`, { village_id: villageId });
}
