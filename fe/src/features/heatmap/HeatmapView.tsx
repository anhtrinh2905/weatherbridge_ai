import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Mountain, Users, Waves } from "lucide-react";
import { getResidentsByVillage, HAZARD_RUN_MOCK, RESIDENTS } from "../../shared/domain/mockData";
import type { HazardType } from "../../shared/domain/types";
import { useLocalizedLabels } from "../../shared/i18n/useLocalizedLabels";
import { useTranslation } from "../../shared/i18n/I18nProvider";
import { getForecastDays, sampleFogAt, sampleHazardAt } from "../../shared/hazard-raster";
import { pixelToLonLat, projectLatLonToRaster } from "../../shared/hazard-raster/villages";
import type { RasterLayer, RasterPoint, RasterSample, RasterInspectionResult } from "../../shared/hazard-raster";
import { cn } from "../../shared/lib/cn";
import { apiClient } from "../../shared/lib/api-client";
import { DataFreshnessBadge } from "../../shared/ui/DataFreshnessBadge";
import { FogCloudIcon } from "../../shared/ui/FogCloudIcon";
import { RasterHazardMap, type RasterMapMarker } from "../../shared/ui/RasterHazardMap";
import { SafetyDisclaimer } from "../../shared/ui/SafetyDisclaimer";
import { useLiveForecast } from "../demo/useLiveForecast";
import { FOG_PATCHES, WMO_FOG_VISIBILITY_M } from "../demo/data";
import { activeHazardDataSource } from "./dataSource";

const LAYERS: { key: RasterLayer; label: string }[] = [
  { key: "landslide", label: "heatmap.layerLandslide" },
  { key: "flash_flood", label: "heatmap.layerFlood" },
  { key: "dominant", label: "heatmap.layerDominantShort" },
];

const LEVEL_COLORS = ["#3DD6A4", "#FDE047", "#FB923C", "#FB7185", "#A855F7"];

const FULL_DAYS = [0, 1, 2, 3, 4, 5, 6, 7] as const;

function dayButtonLabel(offset: number): string {
  return offset === 0 ? "heatmap.dayCurrent" : "heatmap.dayPlusN";
}

function levelColor(level: 1 | 2 | 3 | 4 | 5): string {
  return LEVEL_COLORS[level - 1];
}

/**
 * Shared raster hazard map. One presentation for every role — the full commune
 * view with day tabs, hazard layers, fog toggle, level legend, and point metrics.
 */
export function HeatmapView({
  watchPointSlot,
  villageId,
}: {
  watchPointSlot?: (input: { selectedPoint: RasterPoint | null; lonLat: { lat: number; lon: number } | null }) => ReactNode;
  /** Scope the resident-status layer to one village (village_head); omit to show the whole commune (admin/commune_officer). */
  villageId?: string;
}) {
  const { t } = useTranslation();
  const labels = useLocalizedLabels();
  const [layer, setLayer] = useState<RasterLayer>("landslide");
  const [day, setDay] = useState(0);
  const [showResidents, setShowResidents] = useState(true);

  const residents = useMemo(
    () => (villageId ? getResidentsByVillage(villageId) : RESIDENTS),
    [villageId],
  );
  // Dot color = hazard level of the cell each resident currently sits in (same
  // 5-level scale as the raster/legend), so it tracks the active layer/day tab
  // rather than a separate acknowledgement status.
  const residentMarkers: RasterMapMarker[] = useMemo(
    () =>
      residents.map((resident) => {
        const point = projectLatLonToRaster(resident.lat, resident.lon);
        const level = sampleHazardAt(point, layer, day).primary.level;
        return {
          id: resident.id,
          point,
          label: resident.fullName,
          color: levelColor(level),
          showLabel: false,
        };
      }),
    [residents, layer, day],
  );

  const [selectedPoint, setSelectedPoint] = useState<RasterPoint | null>(null);
  const [addressResult, setAddressResult] = useState<{
    point: RasterPoint;
    address: string | null;
    status: "idle" | "error";
  } | null>(null);
  
  const addressStatus = selectedPoint === null
    ? "idle"
    : addressResult?.point === selectedPoint
      ? addressResult.status
      : "loading";
  const address = addressResult?.point === selectedPoint ? addressResult.address : null;
  
  const [showFog, setShowFog] = useState(false);
  const forecastStatus = useLiveForecast();
  const forecastDays = getForecastDays();
  const activeLayer = layer;
  const dayOffsets = FULL_DAYS;

  const [inspection, setInspection] = useState<RasterInspectionResult | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchManifest = async () => {
      if (activeHazardDataSource.mode === "mock") {
        setImageSrc(null);
        return;
      }
      const manifest = await activeHazardDataSource.manifest(activeLayer, day);
      if (!cancelled && manifest?.layers?.[0]?.web_png_url) {
        setImageSrc(manifest.layers[0].web_png_url);
      } else if (!cancelled) {
        setImageSrc(null);
      }
    };
    fetchManifest();
    return () => { cancelled = true; };
  }, [day, activeLayer]);

  useEffect(() => {
    let cancelled = false;
    const updateInspection = async () => {
      if (!selectedPoint) {
        setInspection(null);
        return;
      }
      const result = await activeHazardDataSource.inspect(selectedPoint, activeLayer, day);
      if (!cancelled) setInspection(result);
    };
    updateInspection();
    return () => { cancelled = true; };
  }, [day, activeLayer, selectedPoint]);

  const fog = useMemo(
    () => (selectedPoint ? sampleFogAt(selectedPoint.x, selectedPoint.y, day) : null),
    [day, selectedPoint],
  );
  const lonLat = useMemo(
    () => (selectedPoint ? pixelToLonLat(selectedPoint.x, selectedPoint.y) : null),
    [selectedPoint],
  );
  const dayForecast = forecastDays.find((entry) => entry.offset === day) ?? forecastDays[0];
  const dayFog = useMemo(() => {
    const visibilityM = dayForecast?.visibilityM ?? null;
    return {
      isFog: visibilityM !== null && visibilityM < WMO_FOG_VISIBILITY_M,
      visibilityM,
    };
  }, [dayForecast]);

  useEffect(() => {
    if (!lonLat || !selectedPoint) {
      return;
    }
    const fallback = t("heatmap.addressFallback");
    const controller = new AbortController();
    (async () => {
      try {
        const result = await apiClient.post<{ displayName: string }>("/geocode/reverse", {
          latitude: lonLat.lat,
          longitude: lonLat.lon,
        });
        if (controller.signal.aborted) return;
        setAddressResult({ point: selectedPoint, status: "idle", address: result.displayName || fallback });
      } catch {
        if (controller.signal.aborted) return;
        setAddressResult({ point: selectedPoint, status: "error", address: fallback });
      }
    })();
    return () => controller.abort();
  }, [lonLat, selectedPoint, t]);

  return (
    <div>
      <section className="signal-panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="signal-label">{t("heatmap.panelKicker")}</p>
            <h2 className="mt-1 text-xl font-semibold text-fg-strong">{t("heatmap.panelTitle")}</h2>
          </div>
          <DataFreshnessBadge
            status="fresh"
            timestamp={forecastStatus.fetchedAt?.toISOString() ?? HAZARD_RUN_MOCK.forecastIssued}
          />
        </div>

        <div className="mb-3 mt-4 space-y-2">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("heatmap.forecastDayAria")}>
            {dayOffsets.map((offset) => (
              <button
                key={offset}
                type="button"
                onClick={() => setDay(offset)}
                className={cn(
                  "inline-flex min-h-9 items-center rounded-lg border px-2.5 text-xs font-semibold transition sm:text-sm",
                  day === offset
                    ? "border-accent bg-accent text-[#1A1206]"
                    : "border-border bg-surface-2 text-muted hover:text-fg",
                )}
              >
                {offset === 0 ? t(dayButtonLabel(offset)) : t(dayButtonLabel(offset), { day: offset })}
              </button>
            ))}
          </div>
          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-0.5">
            <div className="flex shrink-0 rounded-xl border border-border bg-surface-2 p-1" role="tablist" aria-label={t("heatmap.layerTabsAria")}>
              {LAYERS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={layer === item.key}
                  onClick={() => setLayer(item.key)}
                  className={cn(
                    "inline-flex h-9 items-center whitespace-nowrap rounded-lg px-3 text-sm font-semibold transition",
                    layer === item.key ? "bg-accent text-[#1A1206]" : "text-muted hover:text-fg",
                  )}
                >
                  {t(item.label)}
                </button>
              ))}
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={showFog}
              aria-label={t("heatmap.fogToggleAria")}
              onClick={() => setShowFog((value) => !value)}
              className={cn(
                "inline-grid h-9 w-[9.75rem] shrink-0 grid-cols-[1.125rem_1fr] items-center gap-1.5 rounded-lg border px-2.5 text-left text-sm font-semibold leading-none transition",
                showFog
                  ? "border-[#b8c6d8] bg-[#eef3f8] text-[#1A1206]"
                  : "border-border bg-surface-2 text-muted hover:text-fg",
              )}
            >
              <FogCloudIcon size={18} severity={0.75} animated={false} />
              <span className="truncate whitespace-nowrap">
                {t("heatmap.fog")} · {showFog ? t("common.on") : t("common.off")}
              </span>
            </button>
            <button
              type="button"
              role="switch"
              aria-checked={showResidents}
              aria-label={t("heatmap.residentsToggleAria")}
              onClick={() => setShowResidents((value) => !value)}
              className={cn(
                "inline-grid h-9 w-[9.75rem] shrink-0 grid-cols-[1.125rem_1fr] items-center gap-1.5 rounded-lg border px-2.5 text-left text-sm font-semibold leading-none transition",
                showResidents
                  ? "border-[#b8c6d8] bg-[#eef3f8] text-[#1A1206]"
                  : "border-border bg-surface-2 text-muted hover:text-fg",
              )}
            >
              <Users size={16} />
              <span className="truncate whitespace-nowrap">
                {t("heatmap.residents")} · {showResidents ? t("common.on") : t("common.off")}
              </span>
            </button>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,2.2fr)_minmax(14rem,0.85fr)] lg:items-stretch">
          <RasterHazardMap
            layer={activeLayer}
            day={day}
            imageSrc={imageSrc}
            selected={selectedPoint}
            selectedVillageId={null}
            showVillageMarkers={false}
            showFog={showFog}
            markers={showResidents ? residentMarkers : []}
            aspectMode="fill"
            className="h-full min-h-[28rem] lg:min-h-[32rem]"
            onSelect={(point) => setSelectedPoint(point)}
          />

          <LevelsPanel showFog={showFog} levelLabels={labels.hazardLevel} watchPointSlot={watchPointSlot?.({ selectedPoint, lonLat })} />
        </div>

        <MetricsPanel
          dayForecast={dayForecast}
          dayLabel={dayForecast?.label ?? (day === 0 ? t("heatmap.dayCurrent") : t("heatmap.dayPlusN", { day }))}
          dayFog={dayFog}
          showFog={showFog}
          inspection={inspection}
          lonLat={lonLat}
          address={address}
          addressStatus={addressStatus}
          fog={fog}
          labels={labels}
          showContributions
          showCoordinates
        />

        <p className="mt-4 text-xs text-muted">
          {t("heatmap.simulationFootnoteFog", { visibility: WMO_FOG_VISIBILITY_M, count: FOG_PATCHES.length })}
        </p>
        {showResidents && (
          <p className="mt-1 text-xs text-muted">
            {t("heatmap.residentsHelper", { count: residentMarkers.length })}
          </p>
        )}
      </section>

      <div className="mt-4">
        <SafetyDisclaimer />
      </div>
    </div>
  );
}

function LevelsPanel({ showFog, levelLabels, watchPointSlot }: { showFog: boolean; levelLabels: Record<1 | 2 | 3 | 4 | 5, string>; watchPointSlot?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <aside className="flex h-full flex-col rounded-2xl border border-border bg-surface-2 p-3 sm:p-4" aria-label={t("heatmap.levelPanelAria")}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("heatmap.levelsTitle")}</p>
      <ul className="mt-2 space-y-1.5">
        {([1, 2, 3, 4, 5] as const).map((level) => (
          <li key={level} className="flex items-center gap-2.5 rounded-lg bg-surface-3/60 px-2 py-1.5">
            <span className="size-4 shrink-0 rounded-sm ring-1 ring-black/10" style={{ backgroundColor: levelColor(level) }} />
            <span className="text-sm font-semibold text-fg-strong">{levelLabels[level]}</span>
          </li>
        ))}
        {showFog && (
          <li className="flex min-h-9 items-center gap-2.5 rounded-lg bg-surface-3/60 px-2 py-1.5">
            <span className="inline-flex size-5 shrink-0 items-center justify-center">
              <FogCloudIcon size={20} severity={0.7} animated={false} />
            </span>
            <span className="text-sm font-semibold text-fg-strong whitespace-nowrap">{t("heatmap.fog")}</span>
          </li>
        )}
      </ul>
      <div className="mt-auto space-y-3 pt-4">
        <p className="text-xs text-muted">{t("heatmap.selectPointHelper")}</p>
        {watchPointSlot}
      </div>
    </aside>
  );
}

function MetricsPanel({
  dayForecast,
  dayLabel,
  dayFog,
  showFog,
  inspection,
  lonLat,
  address,
  addressStatus,
  fog,
  showContributions,
  showCoordinates,
  labels,
}: {
  dayForecast: ReturnType<typeof getForecastDays>[number] | undefined;
  dayLabel: string;
  dayFog: { isFog: boolean; visibilityM: number | null };
  showFog: boolean;
  inspection: ReturnType<typeof sampleHazardAt> | null;
  lonLat: { lat: number; lon: number } | null;
  address: string | null;
  addressStatus: "idle" | "loading" | "error";
  fog: ReturnType<typeof sampleFogAt> | null;
  showContributions: boolean;
  showCoordinates: boolean;
  labels: ReturnType<typeof useLocalizedLabels>;
}) {
  const { t } = useTranslation();
  return (
    <section className="mt-3 rounded-2xl border border-border bg-surface-2 p-4" aria-live="polite" aria-label={t("heatmap.metricsAria")}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("heatmap.metricsTitle")}</p>

      <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCell label={t("heatmap.day")} value={dayLabel} />
        <MetricCell label={t("heatmap.dailyRain")} value={dayForecast ? `${dayForecast.rainfallMm} mm` : "—"} />
        <MetricCell label={t("heatmap.peakRain")} value={dayForecast ? `${dayForecast.intensityMmH} mm/h` : "—"} />
        <MetricCell
          label={showFog ? t("heatmap.fogDay") : t("heatmap.visibility")}
          value={
            dayFog.visibilityM === null
              ? "—"
              : showFog
                ? dayFog.isFog
                  ? t("heatmap.fogYes", { visibility: Math.round(dayFog.visibilityM) })
                  : t("heatmap.fogNo", { visibility: Math.round(dayFog.visibilityM) })
                : `${Math.round(dayFog.visibilityM)} m`
          }
        />
      </dl>

      {inspection ? (
        <div className="mt-4 border-t border-border-soft pt-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-fg-strong">{t("heatmap.selectedPoint")}</p>
              <p className="mt-1 inline-flex items-center gap-2 text-sm">
                <span
                  className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold text-[#1A1206]"
                  style={{ backgroundColor: levelColor(inspection.primary.level) }}
                >
                  {t("hazardLevel.compact", { level: inspection.primary.level })}
                </span>
                <span className="text-fg">{labels.hazardLevel[inspection.primary.level]}</span>
                <span className="font-mono text-xs text-muted">{Math.round(inspection.primary.score01 * 100)}%</span>
              </p>
            </div>
            {showCoordinates && (addressStatus !== "idle" || address) ? (
              <div className="max-w-md text-sm">
                <p className="text-xs text-muted">{t("heatmap.address")}</p>
                <p className="font-semibold text-fg-strong">
                  {addressStatus === "loading" ? t("heatmap.addressLoading") : address ?? "—"}
                </p>
              </div>
            ) : null}
          </div>

          {showCoordinates && (
            <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {lonLat && (
                <>
                  <MetricCell label={t("heatmap.latitude")} value={`${lonLat.lat.toFixed(5)}°`} mono />
                  <MetricCell label={t("heatmap.longitude")} value={`${lonLat.lon.toFixed(5)}°`} mono />
                </>
              )}
              <MetricCell label={t("heatmap.elevation")} value={`${inspection.primary.elevationM} m`} />
              <MetricCell label={t("heatmap.slope")} value={`${inspection.primary.slopeDeg}°`} />
            </dl>
          )}

          {fog && showFog && (
            <div className="mt-3 rounded-lg border border-border-soft bg-surface-3/50 p-3">
              <p className="text-sm font-semibold text-fg-strong">{t("heatmap.fogAtPoint")}</p>
              <p className="mt-1 text-sm text-muted">
                {fog.isFog && fog.localIntensity > 0.05
                  ? t("heatmap.fogInPatch")
                  : fog.isFog
                    ? t("heatmap.fogOutsidePatch")
                    : t("heatmap.noFog")}
                {fog.visibilityM !== null ? ` · ${t("heatmap.visibilityValue", { visibility: Math.round(fog.visibilityM) })}` : ""}
                {fog.dpdC !== null ? ` · DPD ${fog.dpdC}°C` : ""}
                {fog.isFog ? ` · ${t("heatmap.localIntensity", { percent: Math.round(fog.localIntensity * 100) })}` : ""}
              </p>
            </div>
          )}

          {showContributions &&
            (inspection.layer === "dominant" ? (
              <>
                <p className="mt-4 text-sm text-muted">
                  {t("heatmap.dominantAtPoint")}{" "}
                  <span className="font-semibold text-fg">{labels.hazardType[inspection.dominantSource]}</span>.
                </p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <HazardBreakdown type="flash_flood" sample={inspection.hazards.flash_flood} leading={inspection.dominantSource === "flash_flood"} labels={labels} />
                  <HazardBreakdown type="landslide" sample={inspection.hazards.landslide} leading={inspection.dominantSource === "landslide"} labels={labels} />
                </div>
              </>
            ) : (
              <div className="mt-4">
                <HazardBreakdown type={inspection.layer as HazardType} sample={inspection.primary} labels={labels} />
              </div>
            ))}
        </div>
      ) : null}
    </section>
  );
}

function MetricCell({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={cn("mt-0.5 text-sm font-semibold text-fg-strong", mono && "font-mono")}>{value}</dd>
    </div>
  );
}

function HazardBreakdown({ type, sample, leading = false, labels }: { type: HazardType; sample: RasterSample; leading?: boolean; labels: ReturnType<typeof useLocalizedLabels> }) {
  const { t } = useTranslation();
  const Icon = type === "flash_flood" ? Waves : Mountain;
  return (
    <div className="rounded-lg border border-border-soft p-3">
      <div className="flex items-center justify-between gap-2 text-sm font-semibold text-fg-strong">
        <span className="inline-flex items-center gap-1.5">
          <Icon size={15} />
          {labels.hazardType[type]}
          {leading ? ` · ${t("heatmap.leadingSuffix")}` : ""}
        </span>
        <span
          className="rounded-md px-2 py-0.5 text-xs font-bold text-[#1A1206]"
          style={{ backgroundColor: levelColor(sample.level) }}
        >
          {t("hazardLevel.compact", { level: sample.level })}
        </span>
      </div>
      <div className="mt-3 space-y-2">
        <ContributionBar label={t("heatmap.terrain")} value={sample.contributions.terrain} />
        <ContributionBar label={t("heatmap.rainTrigger")} value={sample.contributions.trigger} />
      </div>
      <p className="mt-2 text-xs text-muted">{t("heatmap.confidencePercent", { percent: Math.round(sample.confidence * 100) })}</p>
    </div>
  );
}

function ContributionBar({ label, value }: { label: string; value: number }) {
  const percentage = Math.round(value * 100);
  return (
    <div>
      <div className="flex justify-between text-xs text-muted">
        <span>{label}</span>
        <span className="font-mono text-fg">{percentage}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div className="h-full rounded-full bg-positive/80" style={{ width: `${Math.min(100, percentage)}%` }} />
      </div>
    </div>
  );
}
