import { CloudRain, Mountain } from "lucide-react";
import { COMMUNE, getForecastDays, HAZARD_META } from "../data";
import { sampleHazardAt } from "../terrain";
import type { HazardType } from "../types";
import { cn } from "../../../shared/lib/cn";
import { ConfidenceBar, LevelChip, LevelLegend } from "./primitives";
import { TerrainMap, type MapPoint } from "./TerrainMap";

interface HeatmapPanelProps {
  type: HazardType;
  onTypeChange: (type: HazardType) => void;
  dayOffset: number;
  onDayChange: (offset: number) => void;
  selectedPoint: MapPoint | null;
  onSelectPoint: (point: MapPoint) => void;
}

const HAZARD_ICON = { flood: CloudRain, landslide: Mountain } as const;

export function HeatmapPanel({
  type,
  onTypeChange,
  dayOffset,
  onDayChange,
  selectedPoint,
  onSelectPoint,
}: HeatmapPanelProps) {
  const forecastDays = getForecastDays();
  const day = forecastDays.find((d) => d.offset === dayOffset) ?? forecastDays[0];
  const sample = selectedPoint ? sampleHazardAt(selectedPoint.x, selectedPoint.y, type, dayOffset) : null;

  return (
    <section className="signal-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="signal-label">Bản đồ nguy cơ · {COMMUNE}</p>
          <h2 className="mt-1 text-xl font-semibold text-fg-strong">Raster nguy cơ 5 cấp trên nền địa hình</h2>
        </div>
        <div className="flex rounded-xl border border-border bg-surface-2 p-1" role="tablist" aria-label="Chọn loại hình thiên tai">
          {(Object.keys(HAZARD_META) as HazardType[]).map((t) => {
            const Icon = HAZARD_ICON[t];
            const active = t === type;
            return (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onTypeChange(t)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition",
                  active ? "bg-accent text-[#1A1206]" : "text-muted hover:text-fg",
                )}
              >
                <Icon size={15} /> {HAZARD_META[t].label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div>
          <TerrainMap type={type} dayOffset={dayOffset} selected={selectedPoint} onSelect={onSelectPoint} />
          <div className="mt-3">
            <LevelLegend />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border bg-surface-2 p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">Trục thời gian dự báo</span>
              <span className="text-sm font-semibold text-fg-strong">{day.label}</span>
            </div>
            <input
              type="range"
              min={0}
              max={forecastDays.length - 1}
              step={1}
              value={dayOffset}
              onChange={(e) => onDayChange(Number(e.target.value))}
              className="mt-3 w-full accent-[var(--accent)]"
              aria-label="Chọn ngày dự báo"
            />
            <div className="mt-1 flex justify-between font-mono text-[0.6rem] text-muted-2">
              {forecastDays.map((d) => (
                <span key={d.offset}>{d.offset === 0 ? "0" : `+${d.offset}`}</span>
              ))}
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <dt className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted">Mưa lưu vực</dt>
                <dd className="text-lg font-semibold text-fg-strong">{day.rainfallMm}<span className="text-xs text-muted"> mm</span></dd>
              </div>
              <div>
                <dt className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted">Cường độ đỉnh</dt>
                <dd className="text-lg font-semibold text-fg-strong">{day.intensityMmH}<span className="text-xs text-muted"> mm/h</span></dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-border bg-surface-2 p-4">
            {sample ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">Điểm đã chọn</span>
                  <LevelChip level={sample.level} />
                </div>
                <p className="mt-3 text-sm text-muted">
                  Cơ chế kích hoạt: <span className="text-fg">{HAZARD_META[type].short}</span>
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <dt className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted">Cao độ (mô phỏng)</dt>
                    <dd className="text-base font-semibold text-fg-strong">{sample.elevationM}<span className="text-xs text-muted"> m</span></dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted">Độ dốc</dt>
                    <dd className="text-base font-semibold text-fg-strong">{sample.slopeDeg}<span className="text-xs text-muted"> °</span></dd>
                  </div>
                </dl>
                <div className="mt-3 space-y-2">
                  <ContributionBar label="Địa hình (tĩnh)" value={sample.contributions.terrain} />
                  <ContributionBar label="Kích hoạt mưa" value={sample.contributions.trigger} />
                </div>
                <div className="mt-4">
                  <ConfidenceBar value={sample.confidence} />
                </div>
              </>
            ) : (
              <p className="text-sm text-muted">Nhấp một điểm trên bản đồ để xem điểm nguy cơ, cao độ, độ dốc và phần đóng góp của từng yếu tố.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ContributionBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{label}</span>
        <span className="font-mono text-fg">{pct}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div className="h-full rounded-full bg-positive/80" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}
