import { ArrowLeft, CloudRain, Mountain } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { HeatmapPanel } from "../../features/demo/components/HeatmapPanel";
import type { MapPoint } from "../../features/demo/components/TerrainMap";
import { AlertsPanel, ThresholdPanel, ValidationPanel } from "../../features/demo/components/OpsPanels";
import { Disclaimer } from "../../features/demo/components/primitives";
import { ResidentView } from "../../features/demo/components/ResidentView";
import { TriagePanel } from "../../features/demo/components/TriagePanel";
import {
  COMMUNE,
  getForecastDays,
  HAZARD_META,
  RESIDENTS,
  ROLE_META,
  THRESHOLDS,
  VILLAGES,
} from "../../features/demo/data";
import { RASTER_H, RASTER_W } from "../../features/demo/terrain";
import type { HazardLevel, HazardType, Role } from "../../features/demo/types";
import { useLiveForecast } from "../../features/demo/useLiveForecast";
import { useLiveRisk } from "../../features/demo/useLiveRisk";
import { cn } from "../../shared/lib/cn";
import { Logo } from "../../shared/ui/Logo";

const ROLES: Role[] = ["resident", "village-head", "officer", "admin"];

export function DemoPage() {
  const [role, setRole] = useState<Role>("resident");
  const [type, setType] = useState<HazardType>("flood");
  const [dayOffset, setDayOffset] = useState(2);
  const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>({
    x: Math.round(RASTER_W * 0.42),
    y: Math.round(RASTER_H * 0.47),
  });
  const [residentId, setResidentId] = useState(RESIDENTS[0].id);
  const [villageScope, setVillageScope] = useState(VILLAGES[0].id);
  const [thresholds, setThresholds] = useState<Record<HazardType, HazardLevel>>({
    flood: THRESHOLDS.find((t) => t.type === "flood")!.level,
    landslide: THRESHOLDS.find((t) => t.type === "landslide")!.level,
  });

  const forecastStatus = useLiveForecast();
  // Loads online risk from /hazards for authenticated users; the public demo
  // falls back to the client heuristic. Side effect fills the risk store.
  useLiveRisk();
  const resident = RESIDENTS.find((r) => r.id === residentId) ?? RESIDENTS[0];
  const forecastDays = getForecastDays();
  const day = forecastDays.find((d) => d.offset === dayOffset) ?? forecastDays[0];
  const liveForecast = forecastStatus.source === "open-meteo";

  return (
    <main className="min-h-screen bg-canvas text-fg">
      <header className="border-b border-border-soft bg-canvas-deep/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <div className="flex items-center gap-4">
            <Logo />
            <span className="hidden rounded-full border border-border bg-surface-2 px-3 py-1 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-accent sm:inline">
              Demo tương tác
            </span>
          </div>
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-fg">
            <ArrowLeft size={15} /> Về trang chủ
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <p className="section-kicker">Bản demo · {COMMUNE}</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-fg-strong sm:text-4xl">
          Từ dự báo mưa đến hành động đúng hạn cho từng vai trò.
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-muted">
          Chọn vai trò để xem đúng phạm vi của mình.{" "}
          {liveForecast
            ? "Lượng mưa lấy trực tiếp từ Open-Meteo cho Mường Pồn; địa hình và hộ dân là mô phỏng."
            : "Toàn bộ số liệu là mô phỏng"}
          , tính toán ngay trên trình duyệt theo mô hình nguy cơ tất định (không có LLM trong đường tính điểm).
        </p>

        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 px-3 py-1.5 font-mono text-[0.62rem] uppercase tracking-[0.14em]">
          <span
            className={cn("h-1.5 w-1.5 rounded-full", liveForecast ? "bg-emerald-400" : "bg-amber-400")}
            aria-hidden
          />
          {liveForecast ? (
            <span className="text-muted">
              Mưa: Open-Meteo (thật) · cập nhật{" "}
              {forecastStatus.fetchedAt?.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
            </span>
          ) : (
            <span className="text-muted">Mưa: mô phỏng (chưa tải được Open-Meteo)</span>
          )}
        </div>

        {/* Role switcher (FR17) */}
        <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Chọn vai trò">
          {ROLES.map((r) => {
            const active = r === role;
            return (
              <button
                key={r}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setRole(r)}
                className={cn(
                  "rounded-2xl border px-4 py-2.5 text-left transition",
                  active ? "border-accent bg-accent/10" : "border-border bg-surface-2 hover:border-border-strong",
                )}
              >
                <span className={cn("block text-sm font-semibold", active ? "text-fg-strong" : "text-fg")}>{ROLE_META[r].title}</span>
                <span className="mt-0.5 block text-xs text-muted-2">{ROLE_META[r].blurb}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 lg:px-8">
        {role === "resident" && (
          <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="space-y-4">
              <ContextControls
                type={type}
                onTypeChange={setType}
                dayOffset={dayOffset}
                onDayChange={setDayOffset}
                dayLabel={day.label}
              />
              <div className="signal-panel signal-panel--compact">
                <p className="signal-label">Hộ dân (mô phỏng)</p>
                <div className="mt-3 grid gap-1.5">
                  {RESIDENTS.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setResidentId(r.id)}
                      className={cn(
                        "flex items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition",
                        r.id === residentId ? "border-accent bg-accent/10 text-fg-strong" : "border-border-soft bg-surface-2 text-muted hover:text-fg",
                      )}
                    >
                      <span>{r.occupation}</span>
                      <span className="text-xs text-muted-2">{VILLAGES.find((v) => v.id === r.villageId)?.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <ResidentView resident={resident} type={type} dayOffset={dayOffset} />
          </div>
        )}

        {role === "village-head" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">Bản phụ trách</span>
              <select
                value={villageScope}
                onChange={(e) => setVillageScope(e.target.value)}
                className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-fg-strong"
                aria-label="Chọn bản phụ trách"
              >
                {VILLAGES.map((v) => (
                  <option key={v.id} value={v.id}>{v.name} · {v.headName}</option>
                ))}
              </select>
            </div>
            <ContextControls type={type} onTypeChange={setType} dayOffset={dayOffset} onDayChange={setDayOffset} dayLabel={day.label} />
            <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
              <TriagePanel type={type} dayOffset={dayOffset} villageScope={villageScope} />
              <AlertsPanel type={type} dayOffset={dayOffset} thresholdLevel={thresholds[type]} villageScope={villageScope} />
            </div>
            <Disclaimer />
          </div>
        )}

        {role === "officer" && (
          <div className="space-y-6">
            <HeatmapPanel
              type={type}
              onTypeChange={setType}
              dayOffset={dayOffset}
              onDayChange={setDayOffset}
              selectedPoint={selectedPoint}
              onSelectPoint={setSelectedPoint}
            />
            <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
              <TriagePanel type={type} dayOffset={dayOffset} villageScope={null} />
              <div className="space-y-6">
                <AlertsPanel type={type} dayOffset={dayOffset} thresholdLevel={thresholds[type]} />
                <ThresholdPanel thresholds={thresholds} onChange={(t, level) => setThresholds((prev) => ({ ...prev, [t]: level }))} />
              </div>
            </div>
            <Disclaimer />
          </div>
        )}

        {role === "admin" && (
          <div className="space-y-6">
            <HeatmapPanel
              type={type}
              onTypeChange={setType}
              dayOffset={dayOffset}
              onDayChange={setDayOffset}
              selectedPoint={selectedPoint}
              onSelectPoint={setSelectedPoint}
            />
            <div className="grid gap-6 lg:grid-cols-2">
              <ValidationPanel />
              <AlertsPanel type={type} dayOffset={dayOffset} thresholdLevel={thresholds[type]} />
            </div>
            <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
              <TriagePanel type={type} dayOffset={dayOffset} villageScope={null} />
              <ThresholdPanel thresholds={thresholds} onChange={(t, level) => setThresholds((prev) => ({ ...prev, [t]: level }))} />
            </div>
            <Disclaimer />
          </div>
        )}
      </section>
    </main>
  );
}

function ContextControls({
  type,
  onTypeChange,
  dayOffset,
  onDayChange,
  dayLabel,
}: {
  type: HazardType;
  onTypeChange: (t: HazardType) => void;
  dayOffset: number;
  onDayChange: (offset: number) => void;
  dayLabel: string;
}) {
  const HAZARD_ICON = { flood: CloudRain, landslide: Mountain } as const;
  const forecastDays = getForecastDays();
  return (
    <div className="signal-panel signal-panel--compact">
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
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition",
                active ? "bg-accent text-[#1A1206]" : "text-muted hover:text-fg",
              )}
            >
              <Icon size={15} /> {HAZARD_META[t].label}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">Ngày dự báo</span>
        <span className="text-sm font-semibold text-fg-strong">{dayLabel}</span>
      </div>
      <input
        type="range"
        min={0}
        max={forecastDays.length - 1}
        step={1}
        value={dayOffset}
        onChange={(e) => onDayChange(Number(e.target.value))}
        className="mt-2 w-full accent-[var(--accent)]"
        aria-label="Chọn ngày dự báo"
      />
      <div className="mt-1 flex justify-between font-mono text-[0.6rem] text-muted-2">
        {forecastDays.map((d) => (
          <span key={d.offset}>{d.offset === 0 ? "0" : `+${d.offset}`}</span>
        ))}
      </div>
    </div>
  );
}
