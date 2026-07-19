import type { components } from "../../shared/api/generated";
import { apiClient } from "../../shared/lib/api-client";

export type AlertCreateRequest = components["schemas"]["AlertCreateRequest"];
export type AlertResponse = components["schemas"]["AlertResponse"];
export type PublishAlertResponse = components["schemas"]["PublishAlertResponse"];

export async function sendVillageAlert(payload: AlertCreateRequest): Promise<PublishAlertResponse> {
  const draft = await apiClient.post<AlertResponse>("/alerts", payload);
  return apiClient.post<PublishAlertResponse>(`/alerts/${draft.id}/publish`);
}
