import { AlertTriangle, ArrowDown, CheckCircle2, Clock, Siren } from "lucide-react";
import { useState } from "react";
import {
  cellHazard,
  getBulletin,
  getRecommendation,
  GRID,
  HAZARD_META,
  RESIDENT_LABEL_META,
  residentExposure,
  residentLabel,
  VILLAGES,
} from "../data";
import type { HazardType, Resident } from "../types";
import { Button } from "../../../shared/ui/Button";
import { Countdown, Disclaimer } from "./primitives";

export function ResidentView({
  resident,
  type,
  dayOffset,
}: {
  resident: Resident;
  type: HazardType;
  dayOffset: number;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const level = residentExposure(resident, type, dayOffset);
  const label = residentLabel(level);
  const labelMeta = RESIDENT_LABEL_META[label];
  const bulletin = getBulletin(type, level);
  const recommendation = getRecommendation(resident, type, level);
  const village = VILLAGES.find((v) => v.id === resident.villageId);
  const cell = GRID.find((c) => c.id === resident.cellId);
  const hazard = cell ? cellHazard(cell, type, dayOffset) : null;

  return (
    <div className="space-y-4">
      {/* Layer 1 — color + icon + single action sentence, above the fold (FR8) */}
      <section
        className="overflow-hidden rounded-3xl border p-6 text-fg-strong shadow-lg"
        style={{ borderColor: `${labelMeta.color}55`, background: `linear-gradient(160deg, ${labelMeta.color}26, transparent)` }}
      >
        <div className="flex items-center gap-3">
          {label === "go-now" ? <Siren size={28} style={{ color: labelMeta.color }} /> : <AlertTriangle size={28} style={{ color: labelMeta.color }} />}
          <div>
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em]" style={{ color: labelMeta.color }}>
              {HAZARD_META[type].label} · {village?.name}
            </p>
            <h2 className="text-3xl font-extrabold tracking-tight" style={{ color: labelMeta.color }}>
              {labelMeta.title}
            </h2>
          </div>
        </div>
        <p className="mt-4 text-xl font-semibold leading-8">{recommendation.action}</p>
        <p className="mt-1 text-sm text-muted">{labelMeta.hint}</p>

        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-border-soft bg-canvas/60 px-4 py-3">
          <Clock size={20} style={{ color: labelMeta.color }} />
          <div className="flex-1">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted">Trước khi nào</p>
            <Countdown hours={recommendation.deadlineHours} />
          </div>
          {confirmed ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-positive">
              <CheckCircle2 size={16} /> Đã xác nhận
            </span>
          ) : (
            <Button className="min-h-10" onClick={() => setConfirmed(true)}>Tôi đã làm</Button>
          )}
        </div>
      </section>

      {/* Layer 2 — the 4-part bulletin */}
      <section className="signal-panel signal-panel--compact">
        <p className="signal-label">Bản tin hành động · 4 phần</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <BulletinPart index="1" title="Chuyện gì" body={bulletin.what} />
          <BulletinPart index="2" title="Nguy hiểm cỡ nào" body={bulletin.severity} />
          <BulletinPart index="3" title="Làm gì" body={bulletin.action} />
          <BulletinPart index="4" title="Trước khi nào" body={`Còn khoảng ${recommendation.deadlineHours} giờ để hoàn tất.`} />
        </div>
      </section>

      {/* Layer 3 — the supporting numbers, deliberately below the action (UX-DR3) */}
      <section className="signal-panel signal-panel--compact">
        <div className="flex items-center gap-2 text-muted">
          <ArrowDown size={14} />
          <p className="signal-label">Số liệu hỗ trợ</p>
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-3 text-center">
          <Stat label="Cấp nguy cơ" value={`${level}/5`} />
          <Stat label="Độ tin cậy" value={hazard ? `${Math.round(hazard.confidence * 100)}%` : "—"} />
          <Stat label="Nghề" value={resident.occupation} small />
        </dl>
      </section>

      <Disclaimer />
    </div>
  );
}

function BulletinPart({ index, title, body }: { index: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-2 p-4">
      <div className="flex items-center gap-2">
        <span className="grid size-6 place-items-center rounded-full bg-accent/15 font-mono text-xs font-bold text-accent">{index}</span>
        <span className="text-sm font-semibold text-fg-strong">{title}</span>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
    </div>
  );
}

function Stat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-xl border border-border-soft bg-surface-2 p-3">
      <dt className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted">{label}</dt>
      <dd className={small ? "mt-1 text-xs font-semibold text-fg-strong" : "mt-1 text-lg font-bold text-fg-strong"}>{value}</dd>
    </div>
  );
}
