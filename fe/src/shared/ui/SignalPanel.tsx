import { ArrowUpRight, Check } from "lucide-react";
import { useTranslation } from "../i18n/I18nProvider";

export function SignalPanel({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();

  const milestones = [
    { label: t("signalPanel.milestone1"), status: t("signalPanel.milestone1Time"), tone: "ready" },
    { label: t("signalPanel.milestone2"), status: t("signalPanel.milestone2Time"), tone: "ready" },
    { label: t("signalPanel.milestone3"), status: t("signalPanel.milestone3Time"), tone: "review" },
  ];

  return (
    <div className={`signal-panel${compact ? " signal-panel--compact" : ""}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="signal-panel__dot" />
          <span className="signal-label">{t("signalPanel.location")}</span>
        </div>
        <span className="signal-live">{t("signalPanel.liveStatus")}</span>
      </div>

      <div className="mt-8 grid grid-cols-[1fr_auto] items-end gap-6">
        <div>
          <p className="signal-label">{t("signalPanel.hazardLabel")}</p>
          <p className="mt-2 text-6xl font-semibold tracking-[-0.09em] text-fg-strong">
            2<sup className="align-super text-2xl text-accent">°</sup><span className="text-5xl">C</span>
          </p>
          <p className="mt-2 text-xs text-positive">{t("signalPanel.confidenceNote")}</p>
        </div>
        <div className="signal-ring" role="img" aria-label={t("signalPanel.tierAriaLabel")}>
          <span>{t("signalPanel.tierBadge")}</span>
        </div>
      </div>

      <div className="mt-9 grid gap-2">
        {milestones.map(({ label, status, tone }) => (
          <div key={label} className="signal-row">
            <span className={`signal-row__status signal-row__status--${tone}`}>
              {tone === "ready" ? <Check size={11} strokeWidth={3} /> : null}
            </span>
            <span className="text-sm text-fg">{label}</span>
            <span className="ml-auto font-mono text-[0.68rem] uppercase tracking-[0.16em] text-muted">{status}</span>
          </div>
        ))}
      </div>

      {!compact && (
        <div className="signal-panel__footer mt-4 flex items-center justify-between gap-4">
          <div>
            <p className="signal-label">{t("signalPanel.bulletinLabel")}</p>
            <p className="mt-1 text-sm font-medium text-fg-strong">{t("signalPanel.bulletinTitle")}</p>
          </div>
          <ArrowUpRight size={18} className="shrink-0 text-accent" />
        </div>
      )}
    </div>
  );
}
