import { useState } from "react";
import { ShieldCheck, HandHelping } from "lucide-react";
import { useAuth } from "../../features/auth/hooks";
import { useTranslation } from "../../shared/i18n/I18nProvider";
import { WebPushPanel } from "../../features/notifications/WebPushPanel";
import { AlertCard, SafeStatusCard } from "../../shared/ui/AlertCard";
import { SafetyDisclaimer } from "../../shared/ui/SafetyDisclaimer";
import { Button } from "../../shared/ui/Button";
import { HeatmapView } from "../../features/heatmap/HeatmapView";
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

      {/* Desktop: map left · alerts right. Mobile: alerts first, then map. Safety always below. */}
      <div className="grid items-start gap-4 lg:grid-cols-12 lg:gap-6">
        <aside className="order-1 space-y-4 px-4 sm:px-0 lg:order-2 lg:col-span-5">
          {alert ? (
            <AlertCard alert={alert} size="hero" forecastDay={day} />
          ) : (
            <SafeStatusCard size="hero" />
          )}
        </aside>

        <section className="order-2 px-4 sm:px-0 lg:order-1 lg:col-span-7">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t("resident.mapTitle")}</p>
          <HeatmapView compact variant="resident" day={day} onDayChange={setDay} hideChrome />
        </section>

        {self && (
          <div className="order-3 px-4 sm:px-0 lg:col-span-12">
            <div className="rounded-2xl border border-border bg-surface-2 p-4 sm:rounded-3xl sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-base font-semibold text-fg-strong">{t("resident.safetyCheckTitle")}</p>
                <span className="rounded-md border border-dashed border-accent/50 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-accent">
                  {t("resident.exerciseBadge")}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:max-w-md">
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
                <p className="mt-3 text-sm text-muted sm:max-w-md sm:text-center">
                  {t("resident.recordedAt", {
                    time: new Date(status.safetyStatusUpdatedAt).toLocaleTimeString("vi-VN"),
                  })}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
