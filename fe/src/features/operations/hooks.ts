import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { operationsApi, type AlertCreate, type ContactCreate, type ContactUpdate, type LocationCreate, type ResidentCreate, type SubscriptionCreate, type SubscriptionUpdate } from "./api";

const keys = {
  profile: ["profile"] as const,
  residents: ["residents"] as const,
  resident: (id: string) => ["residents", id] as const,
  subscriptions: ["subscriptions"] as const,
  consents: ["consents"] as const,
  channels: ["notification-channels"] as const,
  locales: (inactive: boolean) => ["locales", inactive] as const,
  alerts: ["alerts"] as const,
  inbox: ["alerts", "inbox"] as const,
  delivery: (id: string) => ["alerts", id, "delivery"] as const,
  translations: (id: string) => ["alerts", id, "translations"] as const,
};
const invalidateResident = (client: ReturnType<typeof useQueryClient>, id?: string) => {
  client.invalidateQueries({ queryKey: keys.residents });
  if (id) client.invalidateQueries({ queryKey: keys.resident(id) });
};

export const useProfile = () => useQuery({ queryKey: keys.profile, queryFn: operationsApi.profile, retry: false });
export function useUpdateProfile() { const client = useQueryClient(); return useMutation({ mutationFn: operationsApi.updateProfile, onSuccess: () => client.invalidateQueries({ queryKey: keys.profile }) }); }
export const useResidents = () => useQuery({ queryKey: keys.residents, queryFn: operationsApi.residents });
export function useCreateResident() { const client = useQueryClient(); return useMutation({ mutationFn: (payload: ResidentCreate) => operationsApi.createResident(payload), onSuccess: () => client.invalidateQueries({ queryKey: keys.residents }) }); }
export const useResident = (id?: string) => useQuery({ queryKey: keys.resident(id ?? "none"), queryFn: () => operationsApi.resident(id!), enabled: Boolean(id) });
export const useSubscriptions = () => useQuery({ queryKey: keys.subscriptions, queryFn: operationsApi.subscriptions });
export const useConsents = () => useQuery({ queryKey: keys.consents, queryFn: operationsApi.consents });
export const useNotificationChannels = () => useQuery({ queryKey: keys.channels, queryFn: operationsApi.channels });
export const useLocales = (includeInactive = false, enabled = true) => useQuery({
  queryKey: keys.locales(includeInactive),
  queryFn: () => operationsApi.locales(includeInactive),
  enabled,
});
export const useAlerts = () => useQuery({ queryKey: keys.alerts, queryFn: operationsApi.alerts });
export const useInbox = () => useQuery({ queryKey: keys.inbox, queryFn: operationsApi.inbox });
export const useDeliverySummary = (id?: string) => useQuery({ queryKey: keys.delivery(id ?? "none"), queryFn: () => operationsApi.deliverySummary(id!), enabled: Boolean(id) });
export const useAlertTranslations = (id?: string) => useQuery({ queryKey: keys.translations(id ?? "none"), queryFn: () => operationsApi.alertTranslations(id!), enabled: Boolean(id) });

export function useAddContact() { const client = useQueryClient(); return useMutation({ mutationFn: ({ residentId, payload }: { residentId: string; payload: ContactCreate }) => operationsApi.addContact(residentId, payload), onSuccess: (_, input) => invalidateResident(client, input.residentId) }); }
export function useUpdateContact() { const client = useQueryClient(); return useMutation({ mutationFn: ({ residentId, contactId, payload }: { residentId: string; contactId: string; payload: ContactUpdate }) => operationsApi.updateContact(residentId, contactId, payload), onSuccess: (_, input) => invalidateResident(client, input.residentId) }); }
export function useAddLocation() { const client = useQueryClient(); return useMutation({ mutationFn: ({ residentId, payload }: { residentId: string; payload: LocationCreate }) => operationsApi.addLocation(residentId, payload), onSuccess: (_, input) => invalidateResident(client, input.residentId) }); }
export function useCreateSubscription() { const client = useQueryClient(); return useMutation({ mutationFn: (payload: SubscriptionCreate) => operationsApi.createSubscription(payload), onSuccess: () => client.invalidateQueries({ queryKey: keys.subscriptions }) }); }
export function useUpdateSubscription() { const client = useQueryClient(); return useMutation({ mutationFn: ({ id, payload }: { id: string; payload: SubscriptionUpdate }) => operationsApi.updateSubscription(id, payload), onSuccess: () => client.invalidateQueries({ queryKey: keys.subscriptions }) }); }
export function useGrantConsent() { const client = useQueryClient(); return useMutation({ mutationFn: operationsApi.grantConsent, onSuccess: () => client.invalidateQueries({ queryKey: keys.consents }) }); }
export function useWithdrawConsent() { const client = useQueryClient(); return useMutation({ mutationFn: operationsApi.withdrawConsent, onSuccess: () => client.invalidateQueries({ queryKey: keys.consents }) }); }
export function useCreateAlert() { const client = useQueryClient(); return useMutation({ mutationFn: (payload: AlertCreate) => operationsApi.createAlert(payload), onSuccess: () => client.invalidateQueries({ queryKey: keys.alerts }) }); }
export function useSubmitAlert() { const client = useQueryClient(); return useMutation({ mutationFn: operationsApi.submitAlert, onSuccess: () => client.invalidateQueries({ queryKey: keys.alerts }) }); }
export function usePublishAlert() { const client = useQueryClient(); return useMutation({ mutationFn: operationsApi.publishAlert, onSuccess: () => client.invalidateQueries({ queryKey: keys.alerts }) }); }
export function useCreateAlertTranslation() { const client = useQueryClient(); return useMutation({ mutationFn: ({ id, payload }: { id: string; payload: import("./api").AlertTranslationDraft }) => operationsApi.createAlertTranslation(id, payload), onSuccess: (_, input) => client.invalidateQueries({ queryKey: keys.translations(input.id) }) }); }
export function useGenerateAlertTranslation() { const client = useQueryClient(); return useMutation({ mutationFn: ({ id, locale }: { id: string; locale: string }) => operationsApi.generateAlertTranslation(id, locale), onSuccess: (_, input) => client.invalidateQueries({ queryKey: keys.translations(input.id) }) }); }
export function useReviewAlertTranslation() { const client = useQueryClient(); return useMutation({ mutationFn: ({ id, decision }: { id: string; decision: "approve" | "reject" }) => operationsApi.reviewAlertTranslation(id, { decision }), onSuccess: () => client.invalidateQueries({ queryKey: keys.alerts }) }); }
export function usePublishAlertTranslation() { const client = useQueryClient(); return useMutation({ mutationFn: operationsApi.publishAlertTranslation, onSuccess: () => client.invalidateQueries({ queryKey: keys.alerts }) }); }
export function useAcknowledgeAlert() { const client = useQueryClient(); return useMutation({ mutationFn: ({ id, status }: { id: string; status: "seen" | "safe" | "need_help" }) => operationsApi.acknowledge(id, status), onSuccess: () => client.invalidateQueries({ queryKey: keys.inbox }) }); }
