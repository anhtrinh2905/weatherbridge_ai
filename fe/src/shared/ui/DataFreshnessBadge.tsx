import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "../lib/cn";

export type FreshnessStatus = "fresh" | "stale" | "unavailable";

const CONFIG: Record<FreshnessStatus, { icon: typeof CheckCircle2; classes: string; label: string }> = {
  fresh: { icon: CheckCircle2, classes: "border-positive/30 bg-positive/10 text-positive", label: "Dữ liệu mới nhất" },
  stale: { icon: AlertTriangle, classes: "border-accent/30 bg-accent/10 text-accent", label: "Dữ liệu cũ" },
  unavailable: { icon: XCircle, classes: "border-danger/30 bg-danger/10 text-danger", label: "Chưa có dữ liệu" },
};

export function DataFreshnessBadge({ status, timestamp }: { status: FreshnessStatus; timestamp?: string }) {
  const { icon: Icon, classes, label } = CONFIG[status];
  const timeLabel = timestamp
    ? new Date(timestamp).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })
    : null;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium", classes)}>
      <Icon size={14} aria-hidden />
      {label}
      {timeLabel && status !== "unavailable" ? ` lúc ${timeLabel}` : null}
    </span>
  );
}
