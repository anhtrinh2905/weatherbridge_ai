import { useMemo, useState } from "react";
import { Mountain, Waves } from "lucide-react";
import { HAZARD_RUN_MOCK } from "../../shared/domain/mockData";
import { HAZARD_LEVEL_LABELS, HAZARD_TYPE_LABELS } from "../../shared/domain/labels";
import type { HazardType } from "../../shared/domain/types";
import { getForecastDays, sampleHazardAt } from "../../shared/hazard-raster";
import { RASTER_VILLAGES } from "../../shared/hazard-raster/villages";
import type { RasterLayer, RasterPoint, RasterSample } from "../../shared/hazard-raster";
import { cn } from "../../shared/lib/cn";
import { DataFreshnessBadge } from "../../shared/ui/DataFreshnessBadge";
import { RasterHazardMap } from "../../shared/ui/RasterHazardMap";
import { SafetyDisclaimer } from "../../shared/ui/SafetyDisclaimer";

const LAYERS: { key: RasterLayer; label: string }[] = [
  { key: "dominant", label: "Nguy hiểm cao nhất (gộp)" },
  { key: "flash_flood", label: HAZARD_TYPE_LABELS.flash_flood },
  { key: "landslide", label: HAZARD_TYPE_LABELS.landslide },
];

const LEVEL_COLORS = ["#3DD6A4", "#FDE047", "#FB923C", "#FB7185", "#A855F7"];

/** Full-detail raster heatmap for admin and commune officers. */
export function HeatmapView() {
  const [layer, setLayer] = useState<RasterLayer>("dominant");
  const [day, setDay] = useState(0);
  const [selectedPoint, setSelectedPoint] = useState<RasterPoint | null>(null);
  const [selectedVillageId, setSelectedVillageId] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  const forecastDays = getForecastDays();
  const selectedVillage = RASTER_VILLAGES.find((entry) => entry.village.id === selectedVillageId) ?? null;
  const inspection = useMemo(
    () => (selectedPoint ? sampleHazardAt(selectedPoint, layer, day) : null),
    [day, layer, selectedPoint],
  );

  const chooseLayer = (nextLayer: RasterLayer) => {
    setLayer(nextLayer);
  };

  return (
    <div>
      <section className="signal-panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="signal-label">Bản đồ nguy cơ · Xã Mường Pồn</p>
            <h2 className="mt-1 text-xl font-semibold text-fg-strong">Raster nguy cơ 5 cấp trên nền địa hình</h2>
          </div>
          <div className="flex items-center gap-3">
            <DataFreshnessBadge status="fresh" timestamp={HAZARD_RUN_MOCK.forecastIssued} />
            <div className="flex rounded-xl border border-border bg-surface-2 p-1" role="tablist" aria-label="Chọn lớp nguy cơ">
              {LAYERS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={layer === item.key}
                  onClick={() => chooseLayer(item.key)}
                  className={cn(
                    "inline-flex min-h-9 items-center rounded-lg px-3 text-sm font-semibold transition",
                    layer === item.key ? "bg-accent text-[#1A1206]" : "text-muted hover:text-fg",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <div>
            <RasterHazardMap
              layer={layer}
              day={day}
              selected={selectedPoint}
              selectedVillageId={selectedVillageId}
              showVillageMarkers={false}
              focusPoint={selectedVillage?.point ?? null}
              focusRequest={focusRequest}
              onSelect={(point, villageId) => {
                setSelectedPoint(point);
                setSelectedVillageId(villageId);
              }}
            />
            <div className="mt-3"><InlineLegend /></div>
          </div>
          <div className="flex flex-col gap-4">
            <ForecastPanel forecastDays={forecastDays} day={day} onDayChange={setDay} />
            <RasterInspectionPanel inspection={inspection} selectedVillage={selectedVillage} />
          </div>
        </div>
        <p className="mt-4 text-xs text-muted">Raster mô phỏng phía trình duyệt, sử dụng dự báo mưa công khai; chưa phải lớp vận hành từ backend.</p>
      </section>

      <div className="mt-4">
        <VillageLevels layer={layer} day={day} selectedVillageId={selectedVillageId} onSelectVillage={(entry) => {
          setSelectedPoint(entry.point);
          setSelectedVillageId(entry.village.id);
          setFocusRequest((request) => request + 1);
        }} />
      </div>

      <div className="mt-4">
        <SafetyDisclaimer />
      </div>
    </div>
  );
}

function RasterInspectionPanel({
  inspection,
  selectedVillage,
}: {
  inspection: ReturnType<typeof sampleHazardAt> | null;
  selectedVillage: (typeof RASTER_VILLAGES)[number] | null;
}) {
  if (!inspection) {
    return <div className="rounded-2xl border border-dashed border-border-strong p-5 text-sm text-muted">Chọn một điểm trên raster hoặc một marker bản để xem nguy cơ, địa hình và phần đóng góp.</div>;
  }

  const isDominant = inspection.layer === "dominant";
  const leadingLabel = HAZARD_TYPE_LABELS[inspection.dominantSource];
  return (
    <section className="rounded-2xl border border-border bg-surface-2 p-4" aria-live="polite">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Điểm đã chọn</p>
      <div className="mt-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-fg-strong">Cấp {inspection.primary.level} · {HAZARD_LEVEL_LABELS[inspection.primary.level]}</p>
          {selectedVillage && <p className="mt-1 text-xs text-muted">Bản gần nhất: {selectedVillage.village.name}{selectedVillage.located ? "" : " (chưa định vị)"}</p>}
        </div>
        <span className="rounded-full border border-border-strong px-2 py-1 font-mono text-xs text-muted">{Math.round(inspection.primary.score01 * 100)}%</span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-xs text-muted">Cao độ mô phỏng</dt><dd className="font-semibold text-fg-strong">{inspection.primary.elevationM} m</dd></div>
        <div><dt className="text-xs text-muted">Độ dốc</dt><dd className="font-semibold text-fg-strong">{inspection.primary.slopeDeg}°</dd></div>
      </dl>
      {isDominant ? (
        <>
          <p className="mt-4 text-sm text-muted">Nguy cơ trội tại điểm này: <span className="font-semibold text-fg">{leadingLabel}</span>.</p>
          <div className="mt-3 space-y-3">
            <HazardBreakdown type="flash_flood" sample={inspection.hazards.flash_flood} leading={inspection.dominantSource === "flash_flood"} />
            <HazardBreakdown type="landslide" sample={inspection.hazards.landslide} leading={inspection.dominantSource === "landslide"} />
          </div>
        </>
      ) : (
        <div className="mt-4"><HazardBreakdown type={inspection.layer as HazardType} sample={inspection.primary} /></div>
      )}
    </section>
  );
}

function HazardBreakdown({ type, sample, leading = false }: { type: HazardType; sample: RasterSample; leading?: boolean }) {
  const Icon = type === "flash_flood" ? Waves : Mountain;
  return (
    <div className="rounded-lg border border-border-soft p-3">
      <div className="flex items-center justify-between gap-2 text-sm font-semibold text-fg-strong">
        <span className="inline-flex items-center gap-1.5"><Icon size={15} />{HAZARD_TYPE_LABELS[type]}{leading ? " · trội" : ""}</span>
        <span>Cấp {sample.level}</span>
      </div>
      <div className="mt-3 space-y-2">
        <ContributionBar label="Địa hình" value={sample.contributions.terrain} />
        <ContributionBar label="Kích hoạt mưa" value={sample.contributions.trigger} />
      </div>
      <p className="mt-2 text-xs text-muted">Độ tin cậy: {Math.round(sample.confidence * 100)}%</p>
    </div>
  );
}

function ContributionBar({ label, value }: { label: string; value: number }) {
  const percentage = Math.round(value * 100);
  return <div><div className="flex justify-between text-xs text-muted"><span>{label}</span><span className="font-mono text-fg">{percentage}%</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full bg-positive/80" style={{ width: `${Math.min(100, percentage)}%` }} /></div></div>;
}

function ForecastPanel({ forecastDays, day, onDayChange }: { forecastDays: ReturnType<typeof getForecastDays>; day: number; onDayChange: (day: number) => void }) {
  const current = forecastDays.find((forecastDay) => forecastDay.offset === day) ?? forecastDays[0];
  return <section className="rounded-2xl border border-border bg-surface-2 p-4"><div className="flex items-center justify-between"><span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">Trục thời gian dự báo</span><span className="text-sm font-semibold text-fg-strong">{current.label}</span></div><input type="range" min={0} max={forecastDays.length - 1} step={1} value={day} onChange={(event) => onDayChange(Number(event.target.value))} className="mt-3 w-full accent-[var(--accent)]" aria-label="Chọn ngày dự báo" /><div className="mt-1 flex justify-between font-mono text-[0.6rem] text-muted-2">{forecastDays.map((forecastDay) => <span key={forecastDay.offset}>{forecastDay.offset === 0 ? "0" : `+${forecastDay.offset}`}</span>)}</div><dl className="mt-4 grid grid-cols-2 gap-3"><div><dt className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted">Mưa lưu vực</dt><dd className="text-lg font-semibold text-fg-strong">{current.rainfallMm}<span className="text-xs text-muted"> mm</span></dd></div><div><dt className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted">Cường độ đỉnh</dt><dd className="text-lg font-semibold text-fg-strong">{current.intensityMmH}<span className="text-xs text-muted"> mm/h</span></dd></div></dl></section>;
}

function InlineLegend() {
  return <ul className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs">{([1, 2, 3, 4, 5] as const).map((level) => <li key={level} className="flex items-center gap-1.5"><span className="size-3 rounded-sm" style={{ backgroundColor: LEVEL_COLORS[level - 1] }} /><span className="text-muted">{level}. {HAZARD_LEVEL_LABELS[level]}</span></li>)}</ul>;
}

function VillageLevels({ layer, day, selectedVillageId, onSelectVillage }: { layer: RasterLayer; day: number; selectedVillageId: string | null; onSelectVillage: (entry: (typeof RASTER_VILLAGES)[number]) => void }) {
  return <section className="rounded-2xl border border-border bg-surface-2 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted">Cấp theo điểm neo bản</p><ul className="mt-2 divide-y divide-border-soft text-sm">{RASTER_VILLAGES.map((entry) => {
    const sample = entry.located ? sampleHazardAt(entry.point, layer, day).primary : null;
    return <li key={entry.village.id}><button type="button" disabled={!entry.located} onClick={() => onSelectVillage(entry)} className={cn("flex w-full items-center justify-between py-1.5 text-left", entry.located ? "text-fg hover:text-accent" : "cursor-not-allowed text-muted-2", selectedVillageId === entry.village.id && "font-semibold text-accent")}><span>{entry.village.name}</span><span className="text-muted">{sample ? `Cấp ${sample.level}` : "Chưa định vị"}</span></button></li>;
  })}</ul></section>;
}
