import type { components } from "../../shared/api/generated";
import { apiClient } from "../../shared/lib/api-client";

export type Profile = components["schemas"]["ProfileResponse"];
export type Resident = components["schemas"]["ResidentResponse"];
export type ResidentCreate = components["schemas"]["ResidentCreateRequest"];
export type ResidentDetail = components["schemas"]["ResidentDetailResponse"];
export type ContactCreate = components["schemas"]["ContactCreateRequest"];
export type ContactUpdate = components["schemas"]["ContactUpdateRequest"];
export type LocationCreate = components["schemas"]["ResidentPointRequest"];
export type Subscription = components["schemas"]["SubscriptionResponse"];
export type SubscriptionCreate = components["schemas"]["SubscriptionCreateRequest"];
export type SubscriptionUpdate = components["schemas"]["SubscriptionUpdateRequest"];
export type Consent = components["schemas"]["ConsentResponse"];
export type Alert = components["schemas"]["AlertResponse"];
export type AlertCreate = components["schemas"]["AlertCreateRequest"];
export type AlertInboxItem = components["schemas"]["AlertInboxItem"];
export type NotificationChannel = components["schemas"]["NotificationChannelResponse"];
export type DeliverySummaryItem = components["schemas"]["DeliverySummaryItem"];
export type Locale = components["schemas"]["LocaleResponse"];
export type AlertTranslationDraft = components["schemas"]["AlertTranslationDraftRequest"];
export type AlertTranslation = components["schemas"]["AlertTranslationResponse"];
export type AlertLocalizedContent = components["schemas"]["AlertLocalizedContentResponse"];

export const operationsApi = {
  profile: () => apiClient.get<Profile>("/profile"),
  updateProfile: (payload: components["schemas"]["UpdateProfileRequest"]) => apiClient.patch<Profile>("/profile", payload),
  residents: () => apiClient.get<Resident[]>("/residents"),
  createResident: (payload: ResidentCreate) => apiClient.post<Resident>("/residents", payload),
  resident: (id: string) => apiClient.get<ResidentDetail>(`/residents/${id}`),
  addContact: (id: string, payload: ContactCreate) => apiClient.post<ResidentDetail["contacts"][number]>(`/residents/${id}/contacts`, payload),
  updateContact: (id: string, contactId: string, payload: ContactUpdate) => apiClient.patch<ResidentDetail["contacts"][number]>(`/residents/${id}/contacts/${contactId}`, payload),
  addLocation: (id: string, payload: LocationCreate) => apiClient.post<ResidentDetail["locations"][number]>(`/residents/${id}/locations`, payload),
  subscriptions: () => apiClient.get<Subscription[]>("/subscriptions"),
  createSubscription: (payload: SubscriptionCreate) => apiClient.post<Subscription>("/subscriptions", payload),
  updateSubscription: (id: string, payload: SubscriptionUpdate) => apiClient.patch<Subscription>(`/subscriptions/${id}`, payload),
  consents: () => apiClient.get<Consent[]>("/subscriptions/consent"),
  grantConsent: (policyVersion: string) => apiClient.post<void>("/subscriptions/consent", { policy_version: policyVersion }),
  withdrawConsent: (id: string) => apiClient.delete<void>(`/subscriptions/consent/${id}`),
  channels: () => apiClient.get<NotificationChannel[]>("/notifications/channels"),
  locales: (includeInactive = false) => apiClient.get<Locale[]>("/locales", { include_inactive: includeInactive }),
  alerts: () => apiClient.get<Alert[]>("/alerts"),
  createAlert: (payload: AlertCreate) => apiClient.post<Alert>("/alerts", payload),
  submitAlert: (id: string) => apiClient.post<Alert>(`/alerts/${id}/submit`),
  publishAlert: (id: string) => apiClient.post<{ alert: Alert }>(`/alerts/${id}/publish`),
  deliverySummary: (id: string) => apiClient.get<DeliverySummaryItem[]>(`/alerts/${id}/delivery-summary`),
  alertTranslations: (id: string) => apiClient.get<AlertTranslation[]>(`/alerts/${id}/translations`),
  createAlertTranslation: (id: string, payload: AlertTranslationDraft) => apiClient.post<AlertTranslation>(`/alerts/${id}/translations`, payload),
  reviewAlertTranslation: (id: string, payload: components["schemas"]["AlertTranslationReviewRequest"]) => apiClient.post<AlertTranslation>(`/alerts/translations/${id}/review`, payload),
  publishAlertTranslation: (id: string) => apiClient.post<AlertLocalizedContent>(`/alerts/translations/${id}/publish`),
  alertAudio: (id: string) => apiClient.getBlob(`/alerts/${id}/audio`),
  inbox: () => apiClient.get<AlertInboxItem[]>("/alerts/inbox"),
  acknowledge: (id: string, status: "seen" | "safe" | "need_help") => apiClient.post<AlertInboxItem>(`/alerts/${id}/acknowledgements`, { status }),
};
