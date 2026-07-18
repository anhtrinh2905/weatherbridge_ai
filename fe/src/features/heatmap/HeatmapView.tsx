import { useEffect, useMemo, useState } from "react";
import { Mountain, Waves } from "lucide-react";
import { HAZARD_RUN_MOCK } from "../../shared/domain/mockData";
import { HAZARD_LEVEL_LABELS, HAZARD_TYPE_LABELS } from "../../shared/domain/labels";
import type { HazardType } from "../../shared/domain/types";
import { getForecastDays, sampleFogAt, sampleHazardAt } from "../../shared/hazard-raster";
import { pixelToLonLat } from "../../shared/hazard-raster/villages";
import type { RasterLayer, RasterPoint, RasterSample, RasterInspectionResult } from "../../shared/hazard-raster";
import { cn } from "../../shared/lib/cn";
import { apiClient } from "../../shared/lib/api-client";
import { DataFreshnessBadge } from "../../shared/ui/DataFreshnessBadge";
import { FogCloudIcon } from "../../shared/ui/FogCloudIcon";
import { RasterHazardMap } from "../../shared/ui/RasterHazardMap";
import { SafetyDisclaimer } from "../../shared/ui/SafetyDisclaimer";
import { useLiveForecast } from "../demo/useLiveForecast";
import { FOG_PATCHES, WMO_FOG_VISIBILITY_M } from "../demo/data";
import { activeHazardDataSource } from "./dataSource";

export type HeatmapVariant = "full" | "village" | "resident";

const LAYERS: { key: RasterLayer; label: string }[] = [
  { key: "landslide", label: "Sạt lở" },
  { key: "flash_flood", label: "Lũ" },
  { key: "dominant", label: "Tổng hợp" },
];

const LEVEL_COLORS = ["#3DD6A4", "#FDE047", "#FB923C", "#FB7185", "#A855F7"];

const FULL_DAYS = [0, 1, 2, 3, 4, 5, 6, 7] as const;

function dayButtonLabel(offset: number): string {
  return offset === 0 ? "Hiện tại" : `+${offset} ngày`;
}

function levelColor(level: 1 | 2 | 3 | 4 | 5): string {
  return LEVEL_COLORS[level - 1];
}

/**
 * Shared raster map shell. Role pages differ in chrome / alerts / actions;
 * they only share that login lands on a map view.
 */
export function HeatmapView({
  compact = false,
  variant = "full",
  day: controlledDay,
  onDayChange,
  hideChrome = false,
}: {
  compact?: boolean;
  variant?: HeatmapVariant;
  /** Controlled day (e.g. resident alert tabs drive the map). */
  day?: number;
  onDayChange?: (day: number) => void;
  /** Skip outer panel title when the parent page already has a header. */
  hideChrome?: boolean;
} = {}) {
  const isResident = variant === "resident";
  const isVillage = variant === "village";
  const isFull = variant === "full";

  const [layer, setLayer] = useState<RasterLayer>("dominant");
  const [internalDay, setInternalDay] = useState(0);
  const day = controlledDay ?? internalDay;
  const setDay = (next: number) => {
    onDayChange?.(next);
    if (controlledDay === undefined) setInternalDay(next);
  };

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
  
  const [showFog, setShowFog] = useState(true);
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
    if (!isFull || !lonLat || !selectedPoint) {
      return;
    }
    const fallback = "Xã Mường Pồn, Điện Biên";
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
  }, [isFull, lonLat, selectedPoint]);

  const title =
    isResident
      ? { label: "Khu vực của bạn", heading: "Bản đồ nguy cơ gần nhà" }
      : isVillage
        ? { label: "Bản đồ bản tôi", heading: "Nguy cơ trong phạm vi bản" }
        : { label: "Bản đồ nguy cơ · Xã Mường Pồn", heading: "Raster nguy cơ 5 cấp trên nền địa hình" };

  return (
    <div>
      <section className={cn("signal-panel", compact && "signal-panel--compact")}>
        {!hideChrome && (
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="signal-label">{title.label}</p>
              <h2 className="mt-1 text-xl font-semibold text-fg-strong">{title.heading}</h2>
            </div>
            {(isFull || isVillage) && (
              <DataFreshnessBadge
                status="fresh"
                timestamp={forecastStatus.fetchedAt?.toISOString() ?? HAZARD_RUN_MOCK.forecastIssued}
              />
            )}
          </div>
        )}

        <div className={cn("mb-3 space-y-2", !hideChrome && "mt-4")}>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Chọn ngày dự báo">
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
                {dayButtonLabel(offset)}
              </button>
            ))}
          </div>
          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-0.5">
            <div className="flex shrink-0 rounded-xl border border-border bg-surface-2 p-1" role="tablist" aria-label="Chọn dạng bản đồ">
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
                  {item.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={showFog}
              aria-label="Bật tắt lớp sương mù"
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
                Sương mù · {showFog ? "bật" : "tắt"}
              </span>
            </button>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,2.2fr)_minmax(14rem,0.85fr)] lg:items-stretch">
          <RasterHazardMap
            layer={activeLayer}
            day={day}
            imageSrc={imageSrc}
            selected={isFull || isVillage || isResident ? selectedPoint : null}
            selectedVillageId={null}
            showVillageMarkers={false}
            showFog={showFog}
            aspectMode="fill"
            className={cn(
              "h-full min-h-[28rem] lg:min-h-[32rem]",
              compact && "min-h-[20rem] lg:min-h-[24rem]",
            )}
            onSelect={(point) => setSelectedPoint(point)}
          />

          <LevelsPanel showFog={showFog} mode={isFull ? "full" : "village"} />
        </div>

        {isFull && (
          <MetricsPanel
            dayForecast={dayForecast}
            dayLabel={dayForecast?.label ?? dayButtonLabel(day)}
            dayFog={dayFog}
            showFog={showFog}
            inspection={inspection}
            lonLat={lonLat}
            address={address}
            addressStatus={addressStatus}
            fog={fog}
            showContributions
            showCoordinates
          />
        )}

        {isVillage && inspection && (
          <section className="mt-3 rounded-2xl border border-border bg-surface-2 p-4" aria-live="polite">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Điểm đã chọn · bản tôi</p>
            <p className="mt-2 inline-flex items-center gap-2 text-sm">
              <span
                className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold text-[#1A1206]"
                style={{ backgroundColor: levelColor(inspection.primary.level) }}
              >
                Cấp {inspection.primary.level}
              </span>
              <span className="font-semibold text-fg-strong">{HAZARD_LEVEL_LABELS[inspection.primary.level]}</span>
            </p>
            {fog && showFog && (
              <p className="mt-2 text-sm text-muted">
                {fog.isFog && fog.localIntensity > 0.05
                  ? "Có sương mù gần điểm này"
                  : fog.isFog
                    ? "Ngày có sương · điểm ngoài vùng demo"
                    : "Không sương mù"}
                {fog.visibilityM !== null ? ` · tầm nhìn ${Math.round(fog.visibilityM)} m` : ""}
              </p>
            )}
            <p className="mt-2 text-xs text-muted">Không hiện đóng góp mô hình — dùng để đi nhắc hộ, không phân tích kỹ thuật.</p>
          </section>
        )}

        {isResident && inspection && (
          <section className="mt-3 rounded-2xl border border-border bg-surface-2 p-4" aria-live="polite">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Điểm đã chọn</p>
            <p className="mt-2 inline-flex flex-wrap items-center gap-2 text-sm">
              <span
                className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold text-[#1A1206]"
                style={{ backgroundColor: levelColor(inspection.primary.level) }}
              >
                Cấp {inspection.primary.level}
              </span>
              <span className="font-semibold text-fg-strong">{HAZARD_LEVEL_LABELS[inspection.primary.level]}</span>
            </p>
            {fog && showFog && dayFog.visibilityM !== null && (
              <p className="mt-2 text-sm text-muted">
                {dayFog.isFog
                  ? `Có sương mù · tầm nhìn ${Math.round(dayFog.visibilityM)} m — đi chậm trên đèo.`
                  : `Tầm nhìn khoảng ${Math.round(dayFog.visibilityM)} m.`}
              </p>
            )}
          </section>
        )}

        {isResident && !inspection && dayFog.visibilityM !== null && showFog && (
          <p className="mt-3 text-sm text-muted">
            {dayFog.isFog
              ? `Ngày này có sương mù (tầm nhìn dưới 1000 m · ${Math.round(dayFog.visibilityM)} m). Đi chậm trên đèo.`
              : `Tầm nhìn khoảng ${Math.round(dayFog.visibilityM)} m — chưa đạt mức sương mù.`}
          </p>
        )}

        {isFull && !compact && (
          <p className="mt-4 text-xs text-muted">
            Raster mô phỏng phía trình duyệt; sương mù (WMO, visibility &lt; {WMO_FOG_VISIBILITY_M} m) hiện bằng icon đám mây tại{" "}
            {FOG_PATCHES.length} vùng demo. Marker bản tạm ẩn — chờ tọa độ chính thức.
          </p>
        )}
      </section>

      {isFull && !compact && (
        <div className="mt-4">
          <SafetyDisclaimer />
        </div>
      )}
    </div>
  );
}

function LevelsPanel({ showFog, mode }: { showFog: boolean; mode: "full" | "village" }) {
  return (
    <aside className="flex h-full flex-col rounded-2xl border border-border bg-surface-2 p-3 sm:p-4" aria-label="Cấp độ nguy cơ">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Cấp độ</p>
      <ul className="mt-2 space-y-1.5">
        {([1, 2, 3, 4, 5] as const).map((level) => (
          <li key={level} className="flex items-center gap-2.5 rounded-lg bg-surface-3/60 px-2 py-1.5">
            <span className="size-4 shrink-0 rounded-sm ring-1 ring-black/10" style={{ backgroundColor: levelColor(level) }} />
            <span className="text-sm font-semibold text-fg-strong">{HAZARD_LEVEL_LABELS[level]}</span>
          </li>
        ))}
        {showFog && (
          <li className="flex min-h-9 items-center gap-2.5 rounded-lg bg-surface-3/60 px-2 py-1.5">
            <span className="inline-flex size-5 shrink-0 items-center justify-center">
              <FogCloudIcon size={20} severity={0.7} animated={false} />
            </span>
            <span className="text-sm font-semibold text-fg-strong whitespace-nowrap">Sương mù</span>
          </li>
        )}
      </ul>
      <p className="mt-auto pt-4 text-xs text-muted">
        {mode === "village" ? "Chạm bản đồ để xem cấp tại điểm trong bản." : "Chọn điểm trên bản đồ để xem số liệu bên dưới."}
      </p>
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
}) {
  return (
    <section className="mt-3 rounded-2xl border border-border bg-surface-2 p-4" aria-live="polite" aria-label="Số liệu">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Số liệu</p>

      <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCell label="Ngày" value={dayLabel} />
        <MetricCell label="Mưa ngày" value={dayForecast ? `${dayForecast.rainfallMm} mm` : "—"} />
        <MetricCell label="Đỉnh mưa" value={dayForecast ? `${dayForecast.intensityMmH} mm/h` : "—"} />
        <MetricCell
          label={showFog ? "Sương mù ngày" : "Tầm nhìn"}
          value={
            dayFog.visibilityM === null
              ? "—"
              : showFog
                ? dayFog.isFog
                  ? `Có (vis < 1000 m) · ${Math.round(dayFog.visibilityM)} m`
                  : `Không (vis ≥ 1000 m) · ${Math.round(dayFog.visibilityM)} m`
                : `${Math.round(dayFog.visibilityM)} m`
          }
        />
      </dl>

      {inspection ? (
        <div className="mt-4 border-t border-border-soft pt-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-fg-strong">Điểm đã chọn</p>
              <p className="mt-1 inline-flex items-center gap-2 text-sm">
                <span
                  className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold text-[#1A1206]"
                  style={{ backgroundColor: levelColor(inspection.primary.level) }}
                >
                  Cấp {inspection.primary.level}
                </span>
                <span className="text-fg">{HAZARD_LEVEL_LABELS[inspection.primary.level]}</span>
                <span className="font-mono text-xs text-muted">{Math.round(inspection.primary.score01 * 100)}%</span>
              </p>
            </div>
            {showCoordinates && (addressStatus !== "idle" || address) ? (
              <div className="max-w-md text-sm">
                <p className="text-xs text-muted">Địa chỉ</p>
                <p className="font-semibold text-fg-strong">
                  {addressStatus === "loading" ? "Đang tra cứu…" : address ?? "—"}
                </p>
              </div>
            ) : null}
          </div>

          {showCoordinates && (
            <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {lonLat && (
                <>
                  <MetricCell label="Vĩ độ" value={`${lonLat.lat.toFixed(5)}°`} mono />
                  <MetricCell label="Kinh độ" value={`${lonLat.lon.toFixed(5)}°`} mono />
                </>
              )}
              <MetricCell label="Cao độ mô phỏng" value={`${inspection.primary.elevationM} m`} />
              <MetricCell label="Độ dốc" value={`${inspection.primary.slopeDeg}°`} />
            </dl>
          )}

          {fog && showFog && (
            <div className="mt-3 rounded-lg border border-border-soft bg-surface-3/50 p-3">
              <p className="text-sm font-semibold text-fg-strong">Sương mù tại điểm (WMO)</p>
              <p className="mt-1 text-sm text-muted">
                {fog.isFog && fog.localIntensity > 0.05
                  ? "Trong vùng sương mù demo"
                  : fog.isFog
                    ? "Ngày có sương · ngoài patch gần"
                    : "Không sương mù"}
                {fog.visibilityM !== null ? ` · tầm nhìn ${Math.round(fog.visibilityM)} m` : ""}
                {fog.dpdC !== null ? ` · DPD ${fog.dpdC}°C` : ""}
                {fog.isFog ? ` · cường độ cục bộ ${Math.round(fog.localIntensity * 100)}%` : ""}
              </p>
            </div>
          )}

          {showContributions &&
            (inspection.layer === "dominant" ? (
              <>
                <p className="mt-4 text-sm text-muted">
                  Nguy cơ trội tại điểm này:{" "}
                  <span className="font-semibold text-fg">{HAZARD_TYPE_LABELS[inspection.dominantSource]}</span>.
                </p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <HazardBreakdown type="flash_flood" sample={inspection.hazards.flash_flood} leading={inspection.dominantSource === "flash_flood"} />
                  <HazardBreakdown type="landslide" sample={inspection.hazards.landslide} leading={inspection.dominantSource === "landslide"} />
                </div>
              </>
            ) : (
              <div className="mt-4">
                <HazardBreakdown type={inspection.layer as HazardType} sample={inspection.primary} />
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

function HazardBreakdown({ type, sample, leading = false }: { type: HazardType; sample: RasterSample; leading?: boolean }) {
  const Icon = type === "flash_flood" ? Waves : Mountain;
  return (
    <div className="rounded-lg border border-border-soft p-3">
      <div className="flex items-center justify-between gap-2 text-sm font-semibold text-fg-strong">
        <span className="inline-flex items-center gap-1.5">
          <Icon size={15} />
          {HAZARD_TYPE_LABELS[type]}
          {leading ? " · trội" : ""}
        </span>
        <span
          className="rounded-md px-2 py-0.5 text-xs font-bold text-[#1A1206]"
          style={{ backgroundColor: levelColor(sample.level) }}
        >
          Cấp {sample.level}
        </span>
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
