import { useState } from "react";
import { HandHelping, ShieldCheck } from "lucide-react";
import { useAuth } from "../../features/auth/hooks";
import { useTranslation } from "../../shared/i18n/I18nProvider";
import { WebPushPanel } from "../../features/notifications/WebPushPanel";
import { AlertCard, SafeStatusCard } from "../../shared/ui/AlertCard";
import { SafetyDisclaimer } from "../../shared/ui/SafetyDisclaimer";
import { Button } from "../../shared/ui/Button";
import type { Occupation } from "../../shared/domain/types";
import {
  getAlertForVillageDay,
  getSelfResident,
  getVillage,
  personalizeAlert,
} from "../../shared/domain/mockData";
import { useResidentStatusStore } from "../../shared/domain/residentStatusStore";
import { cn } from "../../shared/lib/cn";

function occupationKey(occupation: Occupation): string {
  return `occupation.${occupation}`;
}

export function ResidentHomePage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const villageId = user?.villageId ?? "muong-pon-1";
  const village = getVillage(villageId);
  const self = getSelfResident(villageId);
  const { getStatus, setSafetyStatus } = useResidentStatusStore();
  const status = self ? getStatus(self.id) : undefined;
  const [day, setDay] = useState(0);

  const dayTabs = [
    { day: 0, label: t("resident.dayToday") },
    { day: 1, label: t("resident.dayPlus1") },
    { day: 2, label: t("resident.dayPlus2") },
  ] as const;

  const baseAlert = getAlertForVillageDay(villageId, day);
  const alert = baseAlert && self ? personalizeAlert(baseAlert, self.occupation) : baseAlert;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="space-y-4 px-4 sm:px-0">
        <SafetyDisclaimer />
        <WebPushPanel />
      </div>

      <div className="px-4 sm:px-0">
        <p className="text-xs uppercase tracking-wide text-muted">
          {t("resident.village", { village: village?.name ?? "" })}
        </p>
        {self && (
          <p className="mt-0.5 text-base text-fg">
            <span className="font-semibold text-fg-strong">{self.fullName}</span>
            <span className="text-muted"> · {t(occupationKey(self.occupation))}</span>
          </p>
        )}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-12 lg:gap-6">
        <div className="lg:col-span-8">
          {alert ? (
            <AlertCard alert={alert} size="hero" forecastDay={day} />
          ) : (
            <SafeStatusCard size="hero" />
          )}
        </div>

        <aside className="space-y-4 px-4 sm:px-0 lg:col-span-4">
          <div className="flex gap-2" role="tablist" aria-label={t("resident.dayTabsAriaLabel")}>
            {dayTabs.map((tab) => (
              <button
                key={tab.day}
                type="button"
                role="tab"
                aria-selected={day === tab.day}
                onClick={() => setDay(tab.day)}
                className={cn(
                  "min-h-12 flex-1 rounded-xl border text-sm font-semibold transition-colors",
                  day === tab.day
                    ? "border-accent bg-accent/15 text-fg-strong"
                    : "border-border bg-surface-2 text-muted hover:bg-surface-3",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {self && (
            <div className="rounded-2xl border border-border bg-surface-2 p-4 sm:rounded-3xl sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-base font-semibold text-fg-strong">{t("resident.safetyCheckTitle")}</p>
                <span className="rounded-md border border-dashed border-accent/50 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-accent">
                  {t("resident.exerciseBadge")}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Button
                  variant={status?.safetyStatus === "safe" ? "primary" : "secondary"}
                  className={cn(
                    "min-h-16 flex-col gap-1 text-sm",
                    status?.safetyStatus === "safe" && "ring-2 ring-positive",
                  )}
                  onClick={() => setSafetyStatus(self.id, "safe")}
                >
                  <ShieldCheck size={22} />
                  {t("resident.imSafe")}
                </Button>
                <Button
                  variant={status?.safetyStatus === "need_help" ? "danger" : "secondary"}
                  className="min-h-16 flex-col gap-1 text-sm"
                  onClick={() => setSafetyStatus(self.id, "need_help")}
                >
                  <HandHelping size={22} />
                  {t("resident.needHelp")}
                </Button>
              </div>
              {status?.safetyStatusUpdatedAt && (
                <p className="mt-3 text-center text-xs text-muted">
                  {t("resident.recordedAt", {
                    time: new Date(status.safetyStatusUpdatedAt).toLocaleTimeString("vi-VN"),
                  })}
                </p>
              )}
            </div>
          )}
        </aside>
      </div>

    </div>
  );
}
