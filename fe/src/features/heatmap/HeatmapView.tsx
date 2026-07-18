import { useMemo, useState } from "react";
import { HAZARD_RUN_MOCK } from "../../shared/domain/mockData";
import { getForecastDays, sampleHazardAt } from "../../shared/hazard-raster";
import { RASTER_VILLAGES } from "../../shared/hazard-raster/villages";
import type { RasterLayer, RasterPoint } from "../../shared/hazard-raster";
import { useTranslation } from "../../shared/i18n/I18nProvider";
import { useLocalizedLabels } from "../../shared/i18n/useLocalizedLabels";
import { cn } from "../../shared/lib/cn";
import { DataFreshnessBadge } from "../../shared/ui/DataFreshnessBadge";
import { RasterHazardMap } from "../../shared/ui/RasterHazardMap";
import { RasterInspectionPanel } from "../../shared/ui/RasterInspectionPanel";
import { SafetyDisclaimer } from "../../shared/ui/SafetyDisclaimer";

const LEVEL_COLORS = ["#3DD6A4", "#FDE047", "#FB923C", "#FB7185", "#A855F7"];

/** Full-detail raster heatmap for admin and commune officers. */
export function HeatmapView() {
  const { t } = useTranslation();
  const labels = useLocalizedLabels();
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
  const layers: { key: RasterLayer; label: string }[] = [
    { key: "dominant", label: t("heatmap.layerDominant") },
    { key: "flash_flood", label: labels.hazardType.flash_flood },
    { key: "landslide", label: labels.hazardType.landslide },
  ];

  const chooseLayer = (nextLayer: RasterLayer) => {
    setLayer(nextLayer);
  };

  return (
    <div>
      <section className="signal-panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="signal-label">{t("heatmap.panelKicker")}</p>
            <h2 className="mt-1 text-xl font-semibold text-fg-strong">{t("heatmap.panelTitle")}</h2>
          </div>
          <div className="flex items-center gap-3">
            <DataFreshnessBadge status="fresh" timestamp={HAZARD_RUN_MOCK.forecastIssued} />
            <div className="flex rounded-xl border border-border bg-surface-2 p-1" role="tablist" aria-label={t("heatmap.layerTabsAria")}>
              {layers.map((item) => (
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
        <p className="mt-4 text-xs text-muted">{t("heatmap.simulationFootnote")}</p>
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

function ForecastPanel({ forecastDays, day, onDayChange }: { forecastDays: ReturnType<typeof getForecastDays>; day: number; onDayChange: (day: number) => void }) {
  const { t } = useTranslation();
  const current = forecastDays.find((forecastDay) => forecastDay.offset === day) ?? forecastDays[0];
  return <section className="rounded-2xl border border-border bg-surface-2 p-4"><div className="flex items-center justify-between"><span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">{t("heatmap.forecastTimeline")}</span><span className="text-sm font-semibold text-fg-strong">{current.label}</span></div><input type="range" min={0} max={forecastDays.length - 1} step={1} value={day} onChange={(event) => onDayChange(Number(event.target.value))} className="mt-3 w-full accent-[var(--accent)]" aria-label={t("heatmap.forecastDayAria")} /><div className="mt-1 flex justify-between font-mono text-[0.6rem] text-muted-2">{forecastDays.map((forecastDay) => <span key={forecastDay.offset}>{forecastDay.offset === 0 ? "0" : `+${forecastDay.offset}`}</span>)}</div><dl className="mt-4 grid grid-cols-2 gap-3"><div><dt className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted">{t("heatmap.rainfallBasin")}</dt><dd className="text-lg font-semibold text-fg-strong">{current.rainfallMm}<span className="text-xs text-muted"> mm</span></dd></div><div><dt className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted">{t("heatmap.peakIntensity")}</dt><dd className="text-lg font-semibold text-fg-strong">{current.intensityMmH}<span className="text-xs text-muted"> mm/h</span></dd></div></dl></section>;
}

function InlineLegend() {
  const labels = useLocalizedLabels();
  return <ul className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs">{([1, 2, 3, 4, 5] as const).map((level) => <li key={level} className="flex items-center gap-1.5"><span className="size-3 rounded-sm" style={{ backgroundColor: LEVEL_COLORS[level - 1] }} /><span className="text-muted">{level}. {labels.hazardLevel[level]}</span></li>)}</ul>;
}

function VillageLevels({ layer, day, selectedVillageId, onSelectVillage }: { layer: RasterLayer; day: number; selectedVillageId: string | null; onSelectVillage: (entry: (typeof RASTER_VILLAGES)[number]) => void }) {
  const { t } = useTranslation();
  return <section className="rounded-2xl border border-border bg-surface-2 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("heatmap.villageAnchorLevels")}</p><ul className="mt-2 divide-y divide-border-soft text-sm">{RASTER_VILLAGES.map((entry) => {
    const sample = entry.located ? sampleHazardAt(entry.point, layer, day).primary : null;
    return <li key={entry.village.id}><button type="button" disabled={!entry.located} onClick={() => onSelectVillage(entry)} className={cn("flex w-full items-center justify-between py-1.5 text-left", entry.located ? "text-fg hover:text-accent" : "cursor-not-allowed text-muted-2", selectedVillageId === entry.village.id && "font-semibold text-accent")}><span>{entry.village.name}</span><span className="text-muted">{sample ? t("heatmap.levelValue", { level: sample.level }) : t("heatmap.unlocated")}</span></button></li>;
  })}</ul></section>;
}
