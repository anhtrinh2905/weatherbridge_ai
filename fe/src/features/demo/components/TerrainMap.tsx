import { useEffect, useRef } from "react";
import { BOUNDARY } from "../boundary";
import { getBackendRisk, getForecastDays, HAZARD_META } from "../data";
import { EVENT_MARKER, isInsideBoundary, RASTER_H, RASTER_W, renderHazardRaster } from "../terrain";
import type { HazardType } from "../types";

export interface MapPoint {
  x: number;
  y: number;
}

export function TerrainMap({
  type,
  dayOffset,
  selected,
  onSelect,
}: {
  type: HazardType;
  dayOffset: number;
  selected: MapPoint | null;
  onSelect: (point: MapPoint) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // references change when live data replaces the defaults, forcing a raster
  // repaint: forecastDays on the Open-Meteo swap, backendRisk when authenticated
  // risk arrives from /hazards.
  const forecastDays = getForecastDays();
  const backendRisk = getBackendRisk();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const image = ctx.createImageData(RASTER_W, RASTER_H);
    renderHazardRaster(image.data, type, dayOffset);
    ctx.putImageData(image, 0, 0);

    // administrative boundary outline (OSM relation 19571212)
    ctx.beginPath();
    BOUNDARY.forEach(([bx, by], i) => {
      if (i === 0) ctx.moveTo(bx * RASTER_W, by * RASTER_H);
      else ctx.lineTo(bx * RASTER_W, by * RASTER_H);
    });
    ctx.closePath();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = "rgba(180, 60, 90, 0.9)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [type, dayOffset, forecastDays, backendRisk]);

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(RASTER_W - 1, Math.floor(((event.clientX - rect.left) / rect.width) * RASTER_W)));
    const y = Math.max(0, Math.min(RASTER_H - 1, Math.floor(((event.clientY - rect.top) / rect.height) * RASTER_H)));
    // only points inside the commune are meaningful for hazard inspection
    if (!isInsideBoundary(x, y)) return;
    onSelect({ x, y });
  };

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-border-soft bg-canvas-deep"
      role="group"
      aria-label={`Lưới nguy cơ ${HAZARD_META[type].label} độ phân giải cao`}
    >
      <canvas
        ref={canvasRef}
        width={RASTER_W}
        height={RASTER_H}
        onClick={handleClick}
        className="block w-full cursor-crosshair"
        aria-label="Bản đồ raster nguy cơ 5 cấp — nhấp để xem chi tiết một điểm"
      />

      {selected && (
        <span
          className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_2px_rgba(0,0,0,0.65)]"
          style={{ left: `${(selected.x / RASTER_W) * 100}%`, top: `${(selected.y / RASTER_H) * 100}%` }}
          aria-hidden="true"
        />
      )}

      {/* digitized 25/7/2024 event marker (Story 5.1 ground truth) */}
      <span
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-lg leading-none text-black [text-shadow:0_0_3px_rgba(255,255,255,0.9)]"
        style={{ left: `${EVENT_MARKER.x * 100}%`, top: `${EVENT_MARKER.y * 100}%` }}
        aria-hidden="true"
      >
        ▼
      </span>
      <span className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-lg bg-white/90 px-2.5 py-1 text-xs font-medium text-black shadow">
        <span aria-hidden="true">▼</span> {EVENT_MARKER.label}
      </span>
      <span className="absolute bottom-2 left-2 rounded bg-black/55 px-1.5 py-0.5 text-[0.6rem] text-white/80">
        Ranh giới: © OpenStreetMap contributors
      </span>
    </div>
  );
}
