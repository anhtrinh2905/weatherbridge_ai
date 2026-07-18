import { BellRing, FlaskConical, Minus, Plus, SlidersHorizontal } from "lucide-react";
import { getBulletin, HAZARD_META, LEVEL_META, THRESHOLDS, villageHazard, VILLAGES } from "../data";
import type { HazardLevel, HazardType } from "../types";
import { LevelChip } from "./primitives";

export function AlertsPanel({
  type,
  dayOffset,
  thresholdLevel,
  villageScope = null,
}: {
  type: HazardType;
  dayOffset: number;
  thresholdLevel: HazardLevel;
  villageScope?: string | null;
}) {
  const alerting = VILLAGES.filter((v) => (villageScope ? v.id === villageScope : true))
    .map((v) => ({ village: v, level: villageHazard(v.id, type, dayOffset) }))
    .filter((row) => row.level >= thresholdLevel)
    .sort((a, b) => b.level - a.level);

  return (
    <section className="signal-panel signal-panel--compact">
      <div className="flex items-center justify-between">
        <p className="signal-label">Cảnh báo đang kích hoạt · {HAZARD_META[type].label}</p>
        <BellRing size={16} className={alerting.length ? "text-danger" : "text-muted-2"} />
      </div>
      {alerting.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Chưa có bản nào vượt ngưỡng cấp {thresholdLevel} cho ngày này.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {alerting.map(({ village, level }) => {
            const bulletin = getBulletin(type, level);
            return (
              <li key={village.id} className="rounded-xl border border-border bg-surface-2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-fg-strong">{village.name}</span>
                  <LevelChip level={level} />
                </div>
                <p className="mt-1.5 text-xs leading-5 text-muted">{bulletin.action} <span className="text-fg">Hạn ~{bulletin.deadlineHours}h.</span></p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function ThresholdPanel({
  thresholds,
  onChange,
}: {
  thresholds: Record<HazardType, HazardLevel>;
  onChange: (type: HazardType, level: HazardLevel) => void;
}) {
  const step = (type: HazardType, delta: number) => {
    const next = Math.max(1, Math.min(5, thresholds[type] + delta)) as HazardLevel;
    onChange(type, next);
  };

  return (
    <section className="signal-panel signal-panel--compact">
      <p className="signal-label flex items-center gap-2"><SlidersHorizontal size={14} /> Bảng ngưỡng cảnh báo (cấu hình)</p>
      <ul className="mt-3 space-y-3">
        {THRESHOLDS.map((t) => (
          <li key={t.type} className="rounded-xl border border-border bg-surface-2 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-fg-strong">{HAZARD_META[t.type].label}</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => step(t.type, -1)} aria-label={`Giảm ngưỡng ${HAZARD_META[t.type].label}`} className="grid size-7 place-items-center rounded-lg border border-border bg-surface-3 text-fg hover:bg-surface">
                  <Minus size={14} />
                </button>
                <span className="w-16 text-center text-sm font-bold" style={{ color: LEVEL_META[thresholds[t.type]].color }}>
                  Cấp {thresholds[t.type]}
                </span>
                <button type="button" onClick={() => step(t.type, 1)} aria-label={`Tăng ngưỡng ${HAZARD_META[t.type].label}`} className="grid size-7 place-items-center rounded-lg border border-border bg-surface-3 text-fg hover:bg-surface">
                  <Plus size={14} />
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-2">Nguồn: {t.source}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ValidationPanel() {
  return (
    <section className="signal-panel signal-panel--compact">
      <p className="signal-label flex items-center gap-2"><FlaskConical size={14} /> Kiểm định mô hình · sự kiện 25/7/2024</p>
      <div className="mt-3 grid grid-cols-3 gap-3 text-center">
        <Metric label="Recall@τ" value="0.82" />
        <Metric label="FPR" value="0.19" />
        <Metric label="ROC-AUC" value="0.74" />
      </div>
      <p className="mt-3 rounded-xl border border-border-soft bg-surface-2 px-3 py-2 text-xs leading-5 text-muted">
        Đây là <strong className="text-fg">đánh giá nội bộ</strong>, chạy offline trong <code className="text-accent">ai/</code>. Nhãn nền còn ở dạng
        bootstrap nên kết quả <strong className="text-fg">chưa được coi là thành tích</strong> cho tới khi có nhãn thực.
      </p>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-3">
      <p className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 text-xl font-bold text-fg-strong">{value}</p>
    </div>
  );
}
