import { CheckCircle2, HandHelping, ShieldAlert, Volume2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "../../features/auth/hooks";
import { WebPushPanel } from "../../features/notifications/WebPushPanel";
import { operationsApi, type AlertInboxItem } from "../../features/operations/api";
import { useAcknowledgeAlert, useInbox } from "../../features/operations/hooks";
import { useDynamicTranslation } from "../../features/translation/useDynamicTranslation";
import { getHighestTierAlert, getSelfResident, personalizeAlert } from "../../shared/domain/mockData";
import { useTranslation } from "../../shared/i18n/I18nProvider";
import { useLocalizedLabels } from "../../shared/i18n/useLocalizedLabels";
import { ApiError } from "../../shared/lib/api-client";
import { Button } from "../../shared/ui/Button";
import { HazardLevelBadge, TierBadge } from "../../shared/ui/HazardBadge";
import { SafetyDisclaimer } from "../../shared/ui/SafetyDisclaimer";
import { Spinner } from "../../shared/ui/Spinner";

type AckStatus = "seen" | "safe" | "need_help";

export function ResidentHomePage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const inbox = useInbox();
  const acknowledge = useAcknowledgeAlert();
  const [demoAckStatus, setDemoAckStatus] = useState<AckStatus | null>(null);

  const playAudio = async (alertId: string) => {
    const audio = await operationsApi.alertAudio(alertId);
    const url = URL.createObjectURL(audio);
    const player = new Audio(url);
    player.addEventListener("ended", () => URL.revokeObjectURL(url), { once: true });
    await player.play();
  };

  const shouldUseDemoAlert =
    inbox.data?.length === 0 ||
    (inbox.error instanceof ApiError && inbox.error.status === 404);

  const demoAlert = useMemo(() => {
    if (!shouldUseDemoAlert) return null;
    const villageId = user?.villageId ?? "muong-pon-1";
    const resident = getSelfResident(villageId);
    const alert = getHighestTierAlert(villageId);
    if (!resident || !alert) return null;

    const personalized = personalizeAlert(alert, resident.occupation);
    return {
      alert_id: personalized.id,
      recipient_id: `${personalized.id}-demo-recipient`,
      hazard_type: personalized.hazardType,
      level: personalized.level,
      tier: personalized.tier,
      what_happened: personalized.what,
      danger_description: personalized.howDangerous,
      action_instruction: personalized.whatToDo,
      deadline_instruction: new Date(personalized.deadlineUtc).toLocaleString("vi-VN"),
      deadline_at: personalized.deadlineUtc,
      content_locale: "vi",
      is_locale_fallback: false,
      audio_available: false,
      audio_asset_url: null,
      acknowledgement_status: demoAckStatus ?? "unacknowledged",
      acknowledged_at: demoAckStatus ? new Date().toISOString() : null,
    } satisfies AlertInboxItem;
  }, [demoAckStatus, shouldUseDemoAlert, user?.villageId]);

  const alerts = demoAlert ? [demoAlert] : (inbox.data ?? []);

  if (inbox.isPending) return <Spinner label={t("resident.alerts.loading")} />;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="space-y-4 px-4 sm:px-0">
        <SafetyDisclaimer />
        <WebPushPanel />
      </div>

      <div className="px-4 sm:px-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("resident.alerts.eyebrow")}</p>
        <h1 className="mt-1 text-2xl font-semibold text-fg-strong">{t("resident.alerts.title")}</h1>
      </div>

      <div className="space-y-4 px-4 sm:px-0">
        {inbox.isError && !demoAlert && (
          <p className="rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
            {t("resident.alerts.loadError")}
          </p>
        )}
        {alerts.length === 0 && (
          <div className="rounded-lg border border-positive/30 bg-positive/10 p-6 text-center">
            <CheckCircle2 className="mx-auto text-positive" size={32} />
            <p className="mt-3 font-semibold">{t("resident.alerts.empty")}</p>
          </div>
        )}
        {alerts.map((alert) => (
          <ResidentAlertCard
            key={alert.alert_id}
            alert={alert}
            isDemo={alert.alert_id.startsWith("AL-")}
            isPending={acknowledge.isPending}
            onAcknowledge={(status) => {
              if (alert.alert_id.startsWith("AL-")) {
                setDemoAckStatus(status);
                return;
              }
              acknowledge.mutate({ id: alert.alert_id, status });
            }}
            onPlayAudio={() => void playAudio(alert.alert_id)}
          />
        ))}
      </div>
    </div>
  );
}

function ResidentAlertCard({
  alert,
  isDemo,
  isPending,
  onAcknowledge,
  onPlayAudio,
}: {
  alert: AlertInboxItem;
  isDemo: boolean;
  isPending: boolean;
  onAcknowledge: (status: AckStatus) => void;
  onPlayAudio: () => void;
}) {
  const { t } = useTranslation();
  const labels = useLocalizedLabels();
  const translated = useDynamicTranslation([
    alert.what_happened,
    alert.danger_description,
    alert.action_instruction,
  ]);
  const [whatHappened, dangerDescription, actionInstruction] = translated.texts;

  return (
    <article className="rounded-lg border border-border bg-surface-2 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="text-accent" size={20} />
          <span className="font-semibold">{alert.hazard_type === "flash_flood" || alert.hazard_type === "landslide" ? labels.hazardType[alert.hazard_type] : t("resident.alerts.generic")}</span>
        </div>
        <div className="flex gap-2">
          <HazardLevelBadge level={alert.level as 1 | 2 | 3 | 4 | 5} compact />
          <TierBadge tier={alert.tier as "prepare" | "go_now"} size="sm" />
        </div>
      </div>
      <h2 className="mt-4 text-lg font-semibold text-fg-strong">{whatHappened}</h2>
      <p className="mt-2 text-sm text-muted">{dangerDescription}</p>
      <p className="mt-3 rounded-lg bg-surface px-3 py-2 text-sm font-medium text-fg">
        {actionInstruction}
      </p>
      <p className="mt-3 text-xs text-muted">
        {t("resident.alerts.deadline", { time: new Date(alert.deadline_at).toLocaleString("vi-VN") })}
      </p>
      {translated.isTranslating && <p className="mt-2 text-xs text-muted">{t("resident.alerts.translating")}</p>}
      {alert.is_locale_fallback && (
        <p className="mt-2 text-xs text-muted">{t("resident.alerts.localeFallback")}</p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          className="min-h-9 px-3"
          isLoading={!isDemo && isPending}
          onClick={() => onAcknowledge("seen")}
        >
          {t("resident.alerts.seen")}
        </Button>
        <Button
          className="min-h-9 px-3"
          isLoading={!isDemo && isPending}
          onClick={() => onAcknowledge("safe")}
        >
          <CheckCircle2 size={15} /> {t("resident.imSafe")}
        </Button>
        <Button
          variant="danger"
          className="min-h-9 px-3"
          isLoading={!isDemo && isPending}
          onClick={() => onAcknowledge("need_help")}
        >
          <HandHelping size={15} /> {t("resident.needHelp")}
        </Button>
        {alert.audio_available && (
          <Button variant="ghost" className="min-h-9 px-3" onClick={onPlayAudio}>
            <Volume2 size={15} /> {t("resident.alerts.listen")}
          </Button>
        )}
      </div>
      {alert.acknowledged_at && (
        <p className="mt-3 text-xs text-muted">{t("resident.alerts.status", { status: alert.acknowledgement_status })}</p>
      )}
    </article>
  );
}
