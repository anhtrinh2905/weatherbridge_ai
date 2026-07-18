import { AlertTriangle, ChevronDown, ChevronUp, Clock, CloudRain, ShieldCheck, Siren } from "lucide-react";
import { useState } from "react";
import { HAZARD_TYPE_LABELS } from "../domain/labels";
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
  const [expanded, setExpanded] = useState(false);
  const isGoNow = alert.tier === "go_now";
  const dayLevel = getHazardLevel(alert.villageId, alert.hazardType, forecastDay);
  const rainfall = getRainfallForDay(alert.villageId, forecastDay);
  const isHero = size === "hero";
  const level = dayLevel?.level ?? alert.level;

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
            {HAZARD_TYPE_LABELS[alert.hazardType]}
          </span>
          <TierBadge tier={alert.tier} size={isHero ? "lg" : "md"} />
        </div>

        <p className="mt-5 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted">Làm gì</p>
        <h2
          className={cn(
            "mt-2 font-bold leading-tight text-fg-strong",
            isHero ? "text-2xl sm:text-3xl lg:text-4xl lg:leading-[1.15]" : "text-lg leading-6",
          )}
        >
          {alert.whatToDo}
        </h2>

        <div
          className={cn(
            "mt-5 flex items-center gap-3 rounded-2xl border border-border-strong bg-canvas/50",
            isHero ? "px-4 py-4 sm:px-5 sm:py-5" : "px-3 py-3",
          )}
        >
          <Clock size={isHero ? 28 : 20} className={isGoNow ? "shrink-0 text-danger" : "shrink-0 text-accent"} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted">Trước khi nào</p>
            <p className={cn("mt-0.5 font-bold text-fg-strong", isHero ? "text-xl sm:text-2xl" : "text-base")}>
              <Countdown deadlineUtc={alert.deadlineUtc} />
            </p>
          </div>
        </div>

        <div className={cn("mt-5 grid gap-3", isHero ? "sm:grid-cols-2" : "grid-cols-1")}>
          <BulletinPart index="1" title="Chuyện gì" body={alert.what} />
          <BulletinPart index="2" title="Nguy hiểm cỡ nào" body={plainDangerSentence(alert.hazardType, level)} />
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-5 flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl border border-border-strong bg-surface-2 text-sm font-semibold text-fg hover:bg-surface-3"
          aria-expanded={expanded}
        >
          {expanded ? "Thu gọn số liệu" : "Xem vì sao có cảnh báo này"}
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {expanded && (
          <div className="mt-3 space-y-4 rounded-2xl border border-border bg-surface px-4 py-4 text-sm leading-6 text-fg">
            <p className="text-muted">
              Phần này chỉ để bạn yên tâm hơn — không cần nhớ số, cứ làm theo hướng dẫn phía trên.
            </p>

            {rainfall && (
              <div className="flex gap-3 rounded-xl border border-border-soft bg-canvas/40 p-3">
                <CloudRain size={22} className="mt-0.5 shrink-0 text-accent" aria-hidden />
                <div>
                  <p className="font-semibold text-fg-strong">Mưa dự báo</p>
                  <p className="mt-1 text-muted">
                    {plainRainSentence(rainfall.rainfallMm)} (khoảng {rainfall.rainfallMm} mm trong ngày).
                    {rainfall.peakIntensityMmH >= 15
                      ? " Có lúc mưa rất mạnh trong thời gian ngắn."
                      : ""}
                  </p>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-border-soft bg-canvas/40 p-3">
              <p className="font-semibold text-fg-strong">Mức chắc chắn</p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-fg-strong">
                {Math.round((dayLevel?.confidence ?? 0.7) * 100)}%
              </p>
              <p className="mt-1 text-muted">{plainConfidenceSentence(dayLevel?.confidence ?? 0.7)}</p>
            </div>

            <div className="rounded-xl border border-border-soft bg-canvas/40 p-3">
              <p className="font-semibold text-fg-strong">Cập nhật lúc</p>
              <p className="mt-1 text-muted">
                {new Date(HAZARD_RUN_MOCK.forecastIssued).toLocaleString("vi-VN")} · nguồn dự báo mưa công khai
                (Open-Meteo)
              </p>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function plainDangerSentence(type: HazardType, level: number): string {
  const hazard = HAZARD_TYPE_LABELS[type].toLowerCase();
  if (level >= 5) return `Rất nguy hiểm — ${hazard} có thể đe dọa tính mạng nếu ở lại vùng rủi ro.`;
  if (level >= 4) return `Nguy hiểm cao — ${hazard} có thể gây thiệt hại nhà cửa, hoa màu, gia súc.`;
  if (level >= 3) return `Cần chú ý — ${hazard} có thể xảy ra, nên chuẩn bị sẵn sàng.`;
  return `Nguy cơ còn thấp — theo dõi thêm, chưa cần rời nhà.`;
}

function plainRainSentence(mm: number): string {
  if (mm >= 80) return "Mưa rất nhiều";
  if (mm >= 40) return "Mưa nhiều";
  if (mm >= 15) return "Mưa vừa";
  if (mm > 0) return "Mưa nhẹ";
  return "Ít mưa hoặc không mưa";
}

function plainConfidenceSentence(value: number): string {
  if (value >= 0.7) return "Cảnh báo khá chắc — nên làm theo hướng dẫn.";
  if (value >= 0.45) return "Cảnh báo ở mức vừa — vẫn nên chuẩn bị, theo dõi thêm.";
  return "Còn chưa chắc lắm — làm theo hướng dẫn an toàn là tốt nhất.";
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
  const isHero = size === "hero";
  return (
    <article
      className={cn(
        "border-2 border-positive bg-gradient-to-br from-positive/20 via-positive/10 to-surface text-center shadow-lg shadow-positive/10",
        isHero ? "rounded-none px-5 py-10 sm:rounded-3xl sm:px-8 sm:py-14 lg:px-10" : "rounded-lg p-5",
      )}
    >
      <ShieldCheck className="mx-auto text-positive" size={isHero ? 48 : 28} aria-hidden />
      <p className={cn("mt-3 font-bold text-fg-strong", isHero ? "text-3xl sm:text-4xl" : "text-lg")}>An toàn</p>
      <p className={cn("mx-auto mt-2 text-muted", isHero ? "max-w-md text-base leading-7" : "text-sm leading-6")}>
        Hiện chưa có cảnh báo cho khu vực của bạn. Sinh hoạt bình thường, vẫn theo dõi loa bản nếu có.
      </p>
    </article>
  );
}
