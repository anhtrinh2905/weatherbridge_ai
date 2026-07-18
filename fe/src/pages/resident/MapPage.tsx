import { useState } from "react";
import { useAuth } from "../../features/auth/hooks";
import { getSelfResident, getVillage } from "../../shared/domain/mockData";
import { useTranslation } from "../../shared/i18n/I18nProvider";
import { cn } from "../../shared/lib/cn";
import { SafetyDisclaimer } from "../../shared/ui/SafetyDisclaimer";
import { SimpleRasterMap } from "../../shared/ui/SimpleRasterMap";

export function ResidentMapPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const villageId = user?.villageId ?? "muong-pon-1";
  const village = getVillage(villageId);
  const self = getSelfResident(villageId);
  const [day, setDay] = useState(0);

  const dayTabs = [
    { day: 0, label: t("resident.dayToday") },
    { day: 1, label: t("resident.dayPlus1") },
    { day: 2, label: t("resident.dayPlus2") },
  ] as const;

  return (
    <div className="space-y-4 sm:space-y-6">
      <SafetyDisclaimer />

      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {t("resident.village", { village: village?.name ?? "" })}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-fg-strong">{t("resident.mapPageTitle")}</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted">{t("resident.mapPageDescription")}</p>
      </header>

      <div className="flex max-w-md gap-2" role="tablist" aria-label={t("resident.dayTabsAriaLabel")}>
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

      <SimpleRasterMap
        villageId={villageId}
        day={day}
        selectedResidentId={self?.id}
        enableWatchPoint
        className="min-h-[300px] lg:min-h-[420px]"
      />
    </div>
  );
}
