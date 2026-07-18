import { AlertTriangle, ChevronDown, ChevronUp, Clock, CloudRain, ShieldCheck, Siren } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "../i18n/I18nProvider";
import { useLocalizedLabels } from "../i18n/useLocalizedLabels";
import { useDynamicTranslation } from "../../features/translation/useDynamicTranslation";
import type { Alert, HazardType } from "../domain/types";
import { cn } from "../lib/cn";
import { TierBadge } from "./HazardBadge";
import { Countdown } from "./Countdown";
import { HAZARD_RUN_MOCK, getHazardLevel, getRainfallForDay } from "../domain/mockData";

/**
 * FR7 4-part + FR8: action first; one progressive-disclosure block for evidence (no separate page).
 * Copy stays plain-language for low-literacy residents.
 */
export function AlertCard({
  alert,
  size = "default",
  forecastDay = 0,
}: {
  alert: Alert;
  size?: "default" | "hero";
  /** Day tab (0..2) so expanded rainfall matches the map */
  forecastDay?: number;
}) {
  const { t } = useTranslation();
  const labels = useLocalizedLabels();
  const [expanded, setExpanded] = useState(false);
  const isGoNow = alert.tier === "go_now";
  const dayLevel = getHazardLevel(alert.villageId, alert.hazardType, forecastDay);
  const rainfall = getRainfallForDay(alert.villageId, forecastDay);
  const isHero = size === "hero";
  const level = dayLevel?.level ?? alert.level;

  // alert.whatToDo/what come from the mock bulletin generator (a stand-in for a real AI/worker
  // pipeline) — unlike the static UI chrome above, this text isn't known ahead of time, so it's
  // translated live (Redis-cached server-side) instead of shipped in the offline locale catalog.
  const { texts: [translatedWhatToDo, translatedWhat] } = useDynamicTranslation([
    alert.whatToDo,
    alert.what,
  ]);

  return (
    <article
      className={cn(
        "overflow-hidden border-2 shadow-lg",
        isHero ? "rounded-none sm:rounded-3xl" : "rounded-lg",
        isGoNow
          ? "border-danger bg-gradient-to-br from-danger/20 via-danger/10 to-surface shadow-danger/25"
          : "border-accent bg-gradient-to-br from-accent/20 via-accent/10 to-surface shadow-accent/15",
      )}
    >
      <div className={cn(isHero ? "px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10" : "p-5")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
            {isGoNow ? (
              <Siren size={18} className="text-danger" aria-hidden />
            ) : (
              <AlertTriangle size={18} className="text-accent" aria-hidden />
            )}
            {labels.hazardType[alert.hazardType]}
          </span>
          <TierBadge tier={alert.tier} size={isHero ? "lg" : "md"} />
        </div>

        <p className="mt-5 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted">
          {t("alert.whatToDoLabel")}
        </p>
        <h2
          className={cn(
            "mt-2 font-bold leading-tight text-fg-strong",
            isHero ? "text-2xl sm:text-3xl lg:text-4xl lg:leading-[1.15]" : "text-lg leading-6",
          )}
        >
          {translatedWhatToDo}
        </h2>

        <div
          className={cn(
            "mt-5 flex items-center gap-3 rounded-2xl border border-border-strong bg-canvas/50",
            isHero ? "px-4 py-4 sm:px-5 sm:py-5" : "px-3 py-3",
          )}
        >
          <Clock size={isHero ? 28 : 20} className={isGoNow ? "shrink-0 text-danger" : "shrink-0 text-accent"} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted">
              {t("alert.deadlineLabel")}
            </p>
            <p className={cn("mt-0.5 font-bold text-fg-strong", isHero ? "text-xl sm:text-2xl" : "text-base")}>
              <Countdown deadlineUtc={alert.deadlineUtc} />
            </p>
          </div>
        </div>

        <div className={cn("mt-5 grid gap-3", isHero ? "sm:grid-cols-2" : "grid-cols-1")}>
          <BulletinPart index="1" title={t("alert.whatHappening")} body={translatedWhat} />
          <BulletinPart
            index="2"
            title={t("alert.dangerLevel")}
            body={plainDangerSentence(t, labels, alert.hazardType, level)}
          />
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-5 flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl border border-border-strong bg-surface-2 text-sm font-semibold text-fg hover:bg-surface-3"
          aria-expanded={expanded}
        >
          {expanded ? t("alert.collapseButton") : t("alert.expandButton")}
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {expanded && (
          <div className="mt-3 space-y-4 rounded-2xl border border-border bg-surface px-4 py-4 text-sm leading-6 text-fg">
            <p className="text-muted">{t("alert.expandedIntro")}</p>

            {rainfall && (
              <div className="flex gap-3 rounded-xl border border-border-soft bg-canvas/40 p-3">
                <CloudRain size={22} className="mt-0.5 shrink-0 text-accent" aria-hidden />
                <div>
                  <p className="font-semibold text-fg-strong">{t("alert.rainForecast")}</p>
                  <p className="mt-1 text-muted">
                    {t("alert.rainAmount", { sentence: plainRainSentence(t, rainfall.rainfallMm), mm: rainfall.rainfallMm })}
                    {rainfall.peakIntensityMmH >= 15 ? t("alert.heavyRainNote") : ""}
                  </p>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-border-soft bg-canvas/40 p-3">
              <p className="font-semibold text-fg-strong">{t("alert.confidenceTitle")}</p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-fg-strong">
                {Math.round((dayLevel?.confidence ?? 0.7) * 100)}%
              </p>
              <p className="mt-1 text-muted">{plainConfidenceSentence(t, dayLevel?.confidence ?? 0.7)}</p>
            </div>

            <div className="rounded-xl border border-border-soft bg-canvas/40 p-3">
              <p className="font-semibold text-fg-strong">{t("alert.updatedAtLabel")}</p>
              <p className="mt-1 text-muted">
                {t("alert.updatedAt", { time: new Date(HAZARD_RUN_MOCK.forecastIssued).toLocaleString("vi-VN") })}
              </p>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

type Translator = (key: string, params?: Record<string, string | number>) => string;

function plainDangerSentence(
  t: Translator,
  labels: ReturnType<typeof useLocalizedLabels>,
  type: HazardType,
  level: number,
): string {
  const hazard = labels.hazardType[type].toLowerCase();
  if (level >= 5) return t("alert.dangerVeryHigh", { hazard });
  if (level >= 4) return t("alert.dangerHigh", { hazard });
  if (level >= 3) return t("alert.dangerMedium", { hazard });
  return t("alert.dangerLow");
}

function plainRainSentence(t: Translator, mm: number): string {
  if (mm >= 80) return t("alert.rainVeryHeavy");
  if (mm >= 40) return t("alert.rainHeavy");
  if (mm >= 15) return t("alert.rainModerate");
  if (mm > 0) return t("alert.rainLight");
  return t("alert.rainNoneOrLittle");
}

function plainConfidenceSentence(t: Translator, value: number): string {
  if (value >= 0.7) return t("alert.confidenceHigh");
  if (value >= 0.45) return t("alert.confidenceMedium");
  return t("alert.confidenceLow");
}

function BulletinPart({ index, title, body }: { index: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border-soft bg-canvas/40 px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="grid size-6 place-items-center rounded-full bg-accent/15 font-mono text-xs font-bold text-accent">
          {index}
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</span>
      </div>
      <p className="mt-2 text-sm leading-6 text-fg">{body}</p>
    </div>
  );
}

export function SafeStatusCard({ size = "default" }: { size?: "default" | "hero" }) {
  const { t } = useTranslation();
  const isHero = size === "hero";
  return (
    <article
      className={cn(
        "border-2 border-positive bg-gradient-to-br from-positive/20 via-positive/10 to-surface text-center shadow-lg shadow-positive/10",
        isHero ? "rounded-none px-5 py-10 sm:rounded-3xl sm:px-8 sm:py-14 lg:px-10" : "rounded-lg p-5",
      )}
    >
      <ShieldCheck className="mx-auto text-positive" size={isHero ? 48 : 28} aria-hidden />
      <p className={cn("mt-3 font-bold text-fg-strong", isHero ? "text-3xl sm:text-4xl" : "text-lg")}>
        {t("alert.safeTitle")}
      </p>
      <p className={cn("mx-auto mt-2 text-muted", isHero ? "max-w-md text-base leading-7" : "text-sm leading-6")}>
        {t("alert.safeDescription")}
      </p>
    </article>
  );
}
