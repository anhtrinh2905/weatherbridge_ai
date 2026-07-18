import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { useTranslation } from "../i18n/I18nProvider";
import { cn } from "../lib/cn";

export type FreshnessStatus = "fresh" | "stale" | "unavailable";

const CONFIG: Record<FreshnessStatus, { icon: typeof CheckCircle2; classes: string; labelKey: string }> = {
  fresh: { icon: CheckCircle2, classes: "border-positive/30 bg-positive/10 text-positive", labelKey: "dataFreshness.fresh" },
  stale: { icon: AlertTriangle, classes: "border-accent/30 bg-accent/10 text-accent", labelKey: "dataFreshness.stale" },
  unavailable: { icon: XCircle, classes: "border-danger/30 bg-danger/10 text-danger", labelKey: "dataFreshness.unavailable" },
};

export function DataFreshnessBadge({ status, timestamp }: { status: FreshnessStatus; timestamp?: string }) {
  const { t, locale } = useTranslation();
  const { icon: Icon, classes, labelKey } = CONFIG[status];
  const timeLabel = timestamp
    ? new Date(timestamp).toLocaleString(locale === "vi" ? "vi-VN" : "en-US", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })
    : null;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium", classes)}>
      <Icon size={14} aria-hidden />
      {t(labelKey)}
      {timeLabel && status !== "unavailable" ? ` ${t("dataFreshness.at")} ${timeLabel}` : null}
    </span>
  );
}
