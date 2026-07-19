import { useEffect, useMemo, useRef, useState } from "react";
import type { SetStateAction } from "react";
import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { BOUNDARY } from "../../features/demo/boundary";
import { FOG_PATCHES, fogSampleForDay, wmoVisibilityDeficit01 } from "../../features/demo/data";
import { EVENT_MARKER } from "../../features/demo/terrain";
import { cn } from "../lib/cn";
import { FogCloudIcon } from "./FogCloudIcon";
import { getBackendRisk, getForecastDays, isInsideBoundary, RASTER_H, RASTER_W, renderHazardRaster } from "../hazard-raster";
import { BOUNDARY_GEO_BOUNDS, RASTER_VILLAGES, nearestRasterVillage } from "../hazard-raster/villages";
import type { RasterLayer, RasterPoint } from "../hazard-raster";
import { useTranslation } from "../i18n/I18nProvider";

/** Zoom step: ±10 percentage points on the toolbar readout. */
const ZOOM_STEP_PCT = 10;
const MIN_ZOOM_PCT = 50;
const MAX_ZOOM_PCT = 400;
const MIN_ZOOM = MIN_ZOOM_PCT / 100;
const MAX_ZOOM_CAP = MAX_ZOOM_PCT / 100;
const SATELLITE_BASEMAP_URL =
  "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export";
const SATELLITE_ATTRIBUTION = "Imagery: Esri, Maxar, Earthstar Geographics, and the GIS User Community";

interface Viewport {
  zoom: number;
  panX: number;
  panY: number;
}

interface PointerPosition {
  x: number;
  y: number;
}

interface ViewportState {
  key: string;
  viewport: Viewport;
}

interface BoundaryBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface RasterMapMarker {
  id: string;
  point: RasterPoint;
  label: string;
  /** visual tone, e.g. resident safety status. Defaults to "danger" (the original event-pin look). Ignored when `color` is set. */
  tone?: "safe" | "warning" | "danger" | "muted";
  /** exact hex/css color, e.g. the hazard-level color of the cell the marker sits on. Takes priority over `tone`. */
  color?: string;
  /** whether to render the text tag under the pin. Defaults to true; set false for dense marker sets (e.g. residents). */
  showLabel?: boolean;
  /** home = the resident's own location (accent pin); watch = a registered notification point (danger dot). */
  variant?: "home" | "watch";
}

const MARKER_TONE_CLASSES: Record<NonNullable<RasterMapMarker["tone"]>, string> = {
  safe: "bg-positive",
  warning: "bg-accent",
  danger: "bg-danger",
  muted: "bg-white/80",
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function zoomToPct(zoom: number): number {
  return Math.round(zoom * 100);
}

function pctToZoom(pct: number): number {
  return clamp(pct, MIN_ZOOM_PCT, MAX_ZOOM_PCT) / 100;
}

function stepZoom(currentZoom: number, direction: 1 | -1): number {
  const nextPct = zoomToPct(currentZoom) + direction * ZOOM_STEP_PCT;
  return pctToZoom(nextPct);
}

function boundaryBox(): BoundaryBox {
  let minX = 1;
  let maxX = 0;
  let minY = 1;
  let maxY = 0;
  for (const [x, y] of BOUNDARY) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, maxX, minY, maxY };
}

const BOUNDARY_BOX = boundaryBox();

function clampViewport(viewport: Viewport, width: number, height: number): Viewport {
  const zoom = clamp(viewport.zoom, MIN_ZOOM, MAX_ZOOM_CAP);
  if (zoom <= 1) {
    // Letterbox / center when zoomed out past 100%
    return {
      zoom,
      panX: (width - width * zoom) / 2,
      panY: (height - height * zoom) / 2,
    };
  }
  return {
    zoom,
    panX: clamp(viewport.panX, width - width * zoom, 0),
    panY: clamp(viewport.panY, height - height * zoom, 0),
  };
}

/** Cover-fit the commune AABB into the container, with a slight extra zoom to crop padding. */
export function fitBoundaryViewport(width: number, height: number): Viewport {
  const { minX, maxX, minY, maxY } = BOUNDARY_BOX;
  const bboxW = Math.max(0.01, maxX - minX);
  const bboxH = Math.max(0.01, maxY - minY);
  const cover = Math.max(1 / bboxW, 1 / bboxH) * 1.08;
  const zoom = clamp(cover, MIN_ZOOM, MAX_ZOOM_CAP);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  return clampViewport(
    {
      zoom,
      panX: width / 2 - centerX * width * zoom,
      panY: height / 2 - centerY * height * zoom,
    },
    width,
    height,
  );
}

function defaultViewport(width = 560, height = 508): Viewport {
  return fitBoundaryViewport(width, height);
}

function fogPatchPoint(patch: (typeof FOG_PATCHES)[number]): RasterPoint {
  const lonSpan = BOUNDARY_GEO_BOUNDS.maxLon - BOUNDARY_GEO_BOUNDS.minLon;
  const latSpan = BOUNDARY_GEO_BOUNDS.maxLat - BOUNDARY_GEO_BOUNDS.minLat;
  return {
    x: ((patch.lon - BOUNDARY_GEO_BOUNDS.minLon) / lonSpan) * (RASTER_W - 1),
    y: ((BOUNDARY_GEO_BOUNDS.maxLat - patch.lat) / latSpan) * (RASTER_H - 1),
  };
}

function satelliteBasemapUrl(): string {
  const params = new URLSearchParams({
    bbox: [
      BOUNDARY_GEO_BOUNDS.minLon,
      BOUNDARY_GEO_BOUNDS.minLat,
      BOUNDARY_GEO_BOUNDS.maxLon,
      BOUNDARY_GEO_BOUNDS.maxLat,
    ].join(","),
    bboxSR: "4326",
    imageSR: "4326",
    size: `${RASTER_W * 2},${RASTER_H * 2}`,
    format: "jpg",
    f: "image",
  });
  return `${SATELLITE_BASEMAP_URL}?${params.toString()}`;
}

export function RasterHazardMap({
  layer,
  day,
  selected,
  selectedVillageId,
  onSelect,
  showVillageMarkers = true,
  showFog = true,
  focusPoint,
  focusRequest = 0,
  markers = [],
  imageSrc = null,
  /** fill = stretch into parent height; natural = keep raster aspect (no distortion). */
  aspectMode = "fill",
  className,
}: {
  layer: RasterLayer;
  day: number;
  selected: RasterPoint | null;
  selectedVillageId: string | null;
  onSelect: (point: RasterPoint, villageId: string | null) => void;
  showVillageMarkers?: boolean;
  showFog?: boolean;
  focusPoint?: RasterPoint | null;
  focusRequest?: number;
  markers?: RasterMapMarker[];
  imageSrc?: string | null;
  aspectMode?: "fill" | "natural";
  className?: string;
}) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointersRef = useRef(new Map<number, PointerPosition>());
  const dragRef = useRef<{ start: PointerPosition; viewport: Viewport; moved: boolean } | null>(null);
  const pinchRef = useRef<{ distance: number; midpoint: PointerPosition; viewport: Viewport } | null>(null);
  const suppressClickRef = useRef(false);
  const fittedRef = useRef<Viewport | null>(null);
  const [fittedViewport, setFittedViewport] = useState<Viewport | null>(null);
  const [minZoom] = useState(MIN_ZOOM);
  const viewportKey = `${layer}:${day}`;
  const [viewportState, setViewportState] = useState<ViewportState>({
    key: viewportKey,
    viewport: defaultViewport(),
  });
  const fallbackViewport = fittedViewport ?? defaultViewport();
  const viewport = viewportState.key === viewportKey ? viewportState.viewport : fallbackViewport;
  const [isPanning, setIsPanning] = useState(false);
  const zoomPct = zoomToPct(viewport.zoom);

  const setViewport = (next: SetStateAction<Viewport>) => {
    setViewportState((current) => {
      const currentViewport = current.key === viewportKey ? current.viewport : (fittedRef.current ?? defaultViewport());
      const nextViewport = typeof next === "function" ? next(currentViewport) : next;
      return { key: viewportKey, viewport: nextViewport };
    });
  };

  const applyFit = () => {
    const rect = containerRef.current?.getBoundingClientRect();
    const width = rect && rect.width > 0 ? rect.width : 560;
    const height = rect && rect.height > 0 ? rect.height : 508;
    const fitted = fitBoundaryViewport(width, height);
    fittedRef.current = fitted;
    setFittedViewport(fitted);
    setViewport(fitted);
  };

  // reference changes when live forecast / backend risk arrive, forcing a repaint
  const forecastDays = getForecastDays();
  const backendRisk = getBackendRisk();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    
    let cancelled = false;
    
    const drawOutline = () => {
      ctx.beginPath();
      BOUNDARY.forEach(([x, y], index) => {
        if (index === 0) ctx.moveTo(x * RASTER_W, y * RASTER_H);
        else ctx.lineTo(x * RASTER_W, y * RASTER_H);
      });
      ctx.closePath();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = "rgba(180, 60, 90, 0.9)";
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    if (imageSrc) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (cancelled || !canvas || !ctx) return;
        ctx.clearRect(0, 0, RASTER_W, RASTER_H);
        ctx.drawImage(img, 0, 0, RASTER_W, RASTER_H);
        drawOutline();
      };
      img.src = imageSrc;
    } else {
      ctx.clearRect(0, 0, RASTER_W, RASTER_H);
      const image = ctx.createImageData(RASTER_W, RASTER_H);
      renderHazardRaster(image.data, layer, day);
      ctx.putImageData(image, 0, 0);
      drawOutline();
    }
    
    return () => { cancelled = true; };
  }, [day, layer, forecastDays, backendRisk, imageSrc]);

  useEffect(() => {
    applyFit();
    const element = containerRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => applyFit());
    observer.observe(element);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applyFit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, layer]);

  useEffect(() => {
    if (!focusPoint || focusRequest === 0) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const fitZoom = fittedRef.current?.zoom ?? minZoom;
    const zoom = clamp(fitZoom + 1, minZoom, MAX_ZOOM_CAP);
    const pointX = (focusPoint.x / RASTER_W) * rect.width;
    const pointY = (focusPoint.y / RASTER_H) * rect.height;
    setViewport(clampViewport({ zoom, panX: rect.width / 2 - pointX * zoom, panY: rect.height / 2 - pointY * zoom }, rect.width, rect.height));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusPoint, focusRequest, minZoom]);

  const containerRect = () => containerRef.current?.getBoundingClientRect() ?? null;

  const zoomAt = (clientX: number, clientY: number, nextZoom: number) => {
    const rect = containerRect();
    if (!rect) return;
    setViewport((current) => {
      const zoom = clamp(nextZoom, minZoom, MAX_ZOOM_CAP);
      if (Math.abs(zoom - current.zoom) < 0.0001) return current;
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const contentX = (x - current.panX) / current.zoom;
      const contentY = (y - current.panY) / current.zoom;
      return clampViewport({ zoom, panX: x - contentX * zoom, panY: y - contentY * zoom }, rect.width, rect.height);
    });
  };

  const zoomFromCenter = (direction: 1 | -1) => {
    const rect = containerRect();
    if (!rect) return;
    zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, stepZoom(viewport.zoom, direction));
  };

  const selectPoint = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const point = {
      x: Math.max(0, Math.min(RASTER_W - 1, Math.floor(((event.clientX - rect.left) / rect.width) * RASTER_W))),
      y: Math.max(0, Math.min(RASTER_H - 1, Math.floor(((event.clientY - rect.top) / rect.height) * RASTER_H))),
    };
    if (!isInsideBoundary(point.x, point.y)) return;
    onSelect(point, nearestRasterVillage(point)?.village.id ?? null);
  };

  const updatePinch = () => {
    const points = [...pointersRef.current.values()];
    if (points.length !== 2 || !pinchRef.current) return;
    const [first, second] = points;
    const midpoint = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
    const distance = Math.hypot(first.x - second.x, first.y - second.y);
    const rect = containerRect();
    if (!rect) return;
    const zoom = clamp((distance / pinchRef.current.distance) * pinchRef.current.viewport.zoom, minZoom, MAX_ZOOM_CAP);
    const start = pinchRef.current;
    const contentX = (start.midpoint.x - start.viewport.panX) / start.viewport.zoom;
    const contentY = (start.midpoint.y - start.viewport.panY) / start.viewport.zoom;
    setViewport(clampViewport({ zoom, panX: midpoint.x - contentX * zoom, panY: midpoint.y - contentY * zoom }, rect.width, rect.height));
    suppressClickRef.current = true;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = containerRect();
    if (!rect) return;
    const position = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    pointersRef.current.set(event.pointerId, position);
    event.currentTarget.setPointerCapture(event.pointerId);
    const points = [...pointersRef.current.values()];
    if (points.length === 2) {
      const [first, second] = points;
      pinchRef.current = { distance: Math.hypot(first.x - second.x, first.y - second.y), midpoint: { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 }, viewport };
      dragRef.current = null;
      setIsPanning(true);
      return;
    }
    if (viewport.zoom > 1) {
      dragRef.current = { start: position, viewport, moved: false };
      setIsPanning(true);
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = containerRect();
    if (!rect) return;
    const position = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    if (pointersRef.current.has(event.pointerId)) pointersRef.current.set(event.pointerId, position);
    if (pointersRef.current.size === 2) {
      updatePinch();
      return;
    }
    const drag = dragRef.current;
    if (!drag) return;
    const dx = position.x - drag.start.x;
    const dy = position.y - drag.start.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true;
    setViewport(clampViewport({ zoom: drag.viewport.zoom, panX: drag.viewport.panX + dx, panY: drag.viewport.panY + dy }, rect.width, rect.height));
  };

  const finishPointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current?.moved || pinchRef.current) suppressClickRef.current = true;
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (pointersRef.current.size === 0) {
      dragRef.current = null;
      setIsPanning(false);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const fitted = fittedViewport;
  const isAtFit =
    fitted !== null &&
    Math.abs(viewport.zoom - fitted.zoom) < 0.001 &&
    Math.abs(viewport.panX - fitted.panX) < 0.5 &&
    Math.abs(viewport.panY - fitted.panY) < 0.5;

  const dayFog = useMemo(() => fogSampleForDay(day), [day]);
  const fogSeverity = wmoVisibilityDeficit01(dayFog.visibilityM);
  const showFogMarkers = showFog && dayFog.isFog;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border-soft bg-[#8a9088] touch-none",
        aspectMode === "natural"
          ? "mx-auto aspect-[560/508] w-full"
          : "aspect-[560/508] min-h-[24rem] lg:aspect-auto lg:h-full lg:min-h-[32rem]",
        className,
      )}
      role="group"
      aria-label={t("rasterMap.groupAria")}
    >
      <div className="absolute inset-0 origin-top-left" style={{ transform: `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})` }}>
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url("${satelliteBasemapUrl()}")` }}
          aria-hidden="true"
        />
        <canvas
          ref={canvasRef}
          width={RASTER_W}
          height={RASTER_H}
          onClick={selectPoint}
          onDoubleClick={(event) => zoomAt(event.clientX, event.clientY, stepZoom(viewport.zoom, 1))}
          onWheel={(event) => {
            // Page scroll by default; zoom only with Ctrl/Cmd+wheel (avoids hijacking scroll).
            if (!event.ctrlKey && !event.metaKey) return;
            event.preventDefault();
            zoomAt(event.clientX, event.clientY, stepZoom(viewport.zoom, event.deltaY < 0 ? 1 : -1));
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishPointer}
          onPointerCancel={finishPointer}
          className={cn("relative block size-full", !imageSrc && "opacity-80 mix-blend-multiply", isPanning ? "cursor-grabbing" : viewport.zoom > 1 ? "cursor-grab" : "cursor-crosshair")}
          aria-label={t("rasterMap.canvasAria")}
        />
        {showFogMarkers &&
          FOG_PATCHES.map((patch) => {
            const point = fogPatchPoint(patch);
            const size = Math.round(40 + 26 * fogSeverity * patch.weight);
            return (
              <span
                key={patch.id}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${(point.x / RASTER_W) * 100}%`,
                  top: `${(point.y / RASTER_H) * 100}%`,
                }}
                title={t("rasterMap.fogTitle", { visibility: Math.round(dayFog.visibilityM ?? 0) })}
                aria-hidden="true"
              >
                <FogCloudIcon size={size} severity={fogSeverity * patch.weight} />
              </span>
            );
          })}
        {showVillageMarkers && RASTER_VILLAGES.map(({ village, point }) => (
          <button
            key={village.id}
            type="button"
            onClick={() => onSelect(point, village.id)}
            title={village.name}
            className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer text-left text-[0.68rem] font-semibold leading-tight text-white [text-shadow:0_1px_2px_rgb(0_0_0_/_90%)]"
            style={{ left: `${(point.x / RASTER_W) * 100}%`, top: `${(point.y / RASTER_H) * 100}%` }}
          >
            <span className={cn("mx-auto block size-3 rounded-full border-2 border-white shadow", selectedVillageId === village.id ? "bg-accent ring-2 ring-white" : "bg-black/75")} />
            <span className="mt-0.5 block max-w-[7.5rem] truncate whitespace-nowrap">{village.name}</span>
          </button>
        ))}
        {markers.map((marker) => {
          const isHome = marker.variant === "home";
          return (
            <span
              key={marker.id}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${(marker.point.x / RASTER_W) * 100}%`, top: `${(marker.point.y / RASTER_H) * 100}%` }}
              title={marker.label}
              aria-label={marker.label}
            >
              <span
                className={cn(
                  "block rounded-full",
                  marker.showLabel === false
                    ? "size-2 border border-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.45)]"
                    : "size-5 border-2 border-white shadow-[0_0_0_3px_rgba(0,0,0,0.55),0_0_18px_rgba(242,107,107,0.9)]",
                  !marker.color && !isHome && MARKER_TONE_CLASSES[marker.tone ?? "danger"],
                  !marker.color && isHome && "bg-accent",
                )}
                style={marker.color ? { backgroundColor: marker.color } : undefined}
              />
              {marker.showLabel !== false && (
                <span className="absolute left-1/2 top-6 -translate-x-1/2 whitespace-nowrap rounded bg-black/75 px-2 py-0.5 text-[0.62rem] font-semibold text-white">
                  {marker.label}
                </span>
              )}
            </span>
          );
        })}
        {selected && <span className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_2px_rgba(0,0,0,0.65)]" style={{ left: `${(selected.x / RASTER_W) * 100}%`, top: `${(selected.y / RASTER_H) * 100}%` }} />}
        <span className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-lg leading-none text-black [text-shadow:0_0_3px_rgba(255,255,255,0.9)]" style={{ left: `${EVENT_MARKER.x * 100}%`, top: `${EVENT_MARKER.y * 100}%` }} aria-hidden="true">▼</span>
      </div>
      <div className="absolute right-3 top-3 flex items-center gap-1 rounded-lg border border-white/15 bg-black/65 p-1 shadow" role="toolbar" aria-label={t("rasterMap.controlsAria")}>
        <button type="button" onClick={() => zoomFromCenter(-1)} disabled={zoomPct <= MIN_ZOOM_PCT} className="grid size-9 place-items-center rounded text-white enabled:hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40" aria-label={t("rasterMap.zoomOutAria")} title={t("rasterMap.zoomOutTitle")}><ZoomOut size={17} /></button>
        <span className="min-w-12 text-center font-mono text-xs text-white" aria-label={t("rasterMap.zoomLevelAria", { zoom: zoomPct })} title={t("rasterMap.zoomHelp")}>{zoomPct}%</span>
        <button type="button" onClick={() => zoomFromCenter(1)} disabled={zoomPct >= MAX_ZOOM_PCT} className="grid size-9 place-items-center rounded text-white enabled:hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40" aria-label={t("rasterMap.zoomInAria")} title={t("rasterMap.zoomInTitle")}><ZoomIn size={17} /></button>
        <button type="button" onClick={applyFit} disabled={isAtFit} className="grid size-9 place-items-center rounded text-white enabled:hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40" aria-label={t("rasterMap.resetViewAria")} title={t("rasterMap.resetViewAria")}><RotateCcw size={16} /></button>
      </div>
      <span className="absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[0.6rem] text-white/85">
        {t("rasterMap.boundaryAttribution")} · {SATELLITE_ATTRIBUTION}
      </span>
    </div>
  );
}
