import { AlertTriangle, ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { HAZARD_TYPE_LABELS } from "../domain/labels";
import type { Alert } from "../domain/types";
import { cn } from "../lib/cn";
import { ConfidenceBadge, TierBadge } from "./HazardBadge";
import { Countdown } from "./Countdown";
import { HAZARD_RUN_MOCK, getHazardLevel } from "../domain/mockData";

/**
 * The 4-part alert (AD-9): what / how dangerous / what to do / by when. Action sentence is
 * always shown first and large; supporting numbers are one tap away (progressive disclosure).
 * Fits a 360px viewport without scrolling for the collapsed state.
 */
export function AlertCard({ alert, confidence }: { alert: Alert; confidence?: number }) {
  const [expanded, setExpanded] = useState(false);
  const isGoNow = alert.tier === "go_now";
  const dayLevel = getHazardLevel(alert.villageId, alert.hazardType, 0);

  return (
    <div
      className={cn(
        "rounded-lg border-2 p-5 shadow-lg",
        isGoNow ? "border-danger bg-danger/10 shadow-danger/20" : "border-accent bg-accent/10 shadow-accent/10",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
          <AlertTriangle size={14} className={isGoNow ? "text-danger" : "text-accent"} aria-hidden />
          {HAZARD_TYPE_LABELS[alert.hazardType]}
        </span>
        <TierBadge tier={alert.tier} size="sm" />
      </div>

      <p className="mt-3 text-lg font-bold leading-6 text-fg-strong">{alert.whatToDo}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{alert.what}</p>

      <p className="mt-3 text-sm">
        <Countdown deadlineUtc={alert.deadlineUtc} />
      </p>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-4 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-border-strong bg-surface-2 text-sm font-medium text-fg hover:bg-surface-3"
        aria-expanded={expanded}
      >
        {expanded ? "Ẩn số liệu chi tiết" : "Xem số liệu chi tiết"}
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2 rounded-lg border border-border bg-surface px-3 py-3 text-sm text-muted">
          <p>{alert.howDangerous}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            {confidence !== undefined && <ConfidenceBadge value={confidence} />}
            {dayLevel && <ConfidenceBadge value={dayLevel.confidence} />}
          </div>
          <p className="pt-1 text-xs text-muted-2">
            Nguồn: Open-Meteo (CC BY 4.0) · Cập nhật lúc{" "}
            {new Date(HAZARD_RUN_MOCK.forecastIssued).toLocaleString("vi-VN")}
          </p>
        </div>
      )}
    </div>
  );
}

export function SafeStatusCard() {
  return (
    <div className="rounded-lg border-2 border-positive bg-positive/10 p-5 text-center">
      <ShieldCheck className="mx-auto text-positive" size={28} />
      <p className="mt-2 text-lg font-bold text-fg-strong">An toàn</p>
      <p className="mt-1 text-sm leading-6 text-muted">
        Hiện chưa có cảnh báo hiệu lực cho khu vực của bạn.
      </p>
    </div>
  );
}
