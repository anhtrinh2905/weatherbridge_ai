import { useEffect, useRef, useState } from "react";
import type { SetStateAction } from "react";
import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { BOUNDARY } from "../../features/demo/boundary";
import { EVENT_MARKER } from "../../features/demo/terrain";
import { cn } from "../lib/cn";
import { isInsideBoundary, RASTER_H, RASTER_W, renderHazardRaster } from "../hazard-raster";
import { RASTER_VILLAGES, nearestRasterVillage } from "../hazard-raster/villages";
import type { RasterLayer, RasterPoint } from "../hazard-raster";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 1.5;

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

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function defaultViewport(): Viewport {
  return { zoom: MIN_ZOOM, panX: 0, panY: 0 };
}

function clampViewport(viewport: Viewport, width: number, height: number): Viewport {
  const minX = width - width * viewport.zoom;
  const minY = height - height * viewport.zoom;
  return {
    ...viewport,
    panX: clamp(viewport.panX, minX, 0),
    panY: clamp(viewport.panY, minY, 0),
  };
}

export function RasterHazardMap({
  layer,
  day,
  selected,
  selectedVillageId,
  onSelect,
  showVillageMarkers = true,
  focusPoint,
  focusRequest = 0,
  className,
}: {
  layer: RasterLayer;
  day: number;
  selected: RasterPoint | null;
  selectedVillageId: string | null;
  onSelect: (point: RasterPoint, villageId: string | null) => void;
  showVillageMarkers?: boolean;
  focusPoint?: RasterPoint | null;
  focusRequest?: number;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointersRef = useRef(new Map<number, PointerPosition>());
  const dragRef = useRef<{ start: PointerPosition; viewport: Viewport; moved: boolean } | null>(null);
  const pinchRef = useRef<{ distance: number; midpoint: PointerPosition; viewport: Viewport } | null>(null);
  const suppressClickRef = useRef(false);
  const viewportKey = `${layer}:${day}`;
  const [viewportState, setViewportState] = useState<ViewportState>({
    key: viewportKey,
    viewport: defaultViewport(),
  });
  const viewport = viewportState.key === viewportKey ? viewportState.viewport : defaultViewport();
  const [isPanning, setIsPanning] = useState(false);

  const setViewport = (next: SetStateAction<Viewport>) => {
    setViewportState((current) => {
      const currentViewport = current.key === viewportKey ? current.viewport : defaultViewport();
      const viewport = typeof next === "function" ? next(currentViewport) : next;
      return { key: viewportKey, viewport };
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const image = ctx.createImageData(RASTER_W, RASTER_H);
    renderHazardRaster(image.data, layer, day);
    ctx.putImageData(image, 0, 0);
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
  }, [day, layer]);

  useEffect(() => {
    if (!focusPoint || focusRequest === 0) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const zoom = 2;
    const pointX = (focusPoint.x / RASTER_W) * rect.width;
    const pointY = (focusPoint.y / RASTER_H) * rect.height;
    setViewport(
      clampViewport(
        { zoom, panX: rect.width / 2 - pointX * zoom, panY: rect.height / 2 - pointY * zoom },
        rect.width,
        rect.height,
      ),
    );
  }, [focusPoint, focusRequest]);

  const containerRect = () => containerRef.current?.getBoundingClientRect() ?? null;

  const zoomAt = (clientX: number, clientY: number, nextZoom: number) => {
    const rect = containerRect();
    if (!rect) return;
    setViewport((current) => {
      const zoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
      if (zoom === current.zoom) return current;
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
    zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, viewport.zoom * (direction === 1 ? ZOOM_STEP : 1 / ZOOM_STEP));
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
    const zoom = clamp((distance / pinchRef.current.distance) * pinchRef.current.viewport.zoom, MIN_ZOOM, MAX_ZOOM);
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
    if (viewport.zoom > MIN_ZOOM) {
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

  return (
    <div ref={containerRef} className={cn("relative aspect-[560/508] overflow-hidden rounded-2xl border border-border-soft bg-canvas-deep touch-none", className)} role="group" aria-label="Bản đồ raster nguy cơ">
      <div className="absolute inset-0 origin-top-left" style={{ transform: `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})` }}>
        <canvas
          ref={canvasRef}
          width={RASTER_W}
          height={RASTER_H}
          onClick={selectPoint}
          onDoubleClick={(event) => zoomAt(event.clientX, event.clientY, viewport.zoom * ZOOM_STEP)}
          onWheel={(event) => { event.preventDefault(); zoomAt(event.clientX, event.clientY, viewport.zoom * (event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP)); }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishPointer}
          onPointerCancel={finishPointer}
          className={cn("block size-full", isPanning ? "cursor-grabbing" : viewport.zoom > MIN_ZOOM ? "cursor-grab" : "cursor-crosshair")}
          aria-label="Bản đồ raster nguy cơ 5 cấp"
        />
        {showVillageMarkers && RASTER_VILLAGES.map(({ village, point, located }) => (
          <button key={village.id} type="button" disabled={!located} onClick={() => onSelect(point, village.id)} title={located ? village.name : `${village.name}: chưa định vị trong ranh giới raster`} className={cn("absolute -translate-x-1/2 -translate-y-1/2 text-left text-[0.62rem] font-semibold text-white [text-shadow:0_1px_2px_rgb(0_0_0_/_90%)]", located ? "cursor-pointer" : "cursor-not-allowed opacity-40")} style={{ left: `${(point.x / RASTER_W) * 100}%`, top: `${(point.y / RASTER_H) * 100}%` }}><span className={cn("mx-auto block size-2.5 rounded-full border border-white", selectedVillageId === village.id ? "bg-accent ring-2 ring-white" : "bg-black/70")} /><span className="mt-0.5 block whitespace-nowrap">{village.name}</span></button>
        ))}
        {selected && <span className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_2px_rgba(0,0,0,0.65)]" style={{ left: `${(selected.x / RASTER_W) * 100}%`, top: `${(selected.y / RASTER_H) * 100}%` }} />}
        <span className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-lg leading-none text-black [text-shadow:0_0_3px_rgba(255,255,255,0.9)]" style={{ left: `${EVENT_MARKER.x * 100}%`, top: `${EVENT_MARKER.y * 100}%` }} aria-hidden="true">▼</span>
      </div>
      <div className="absolute right-3 top-3 flex items-center gap-1 rounded-lg border border-white/15 bg-black/65 p-1 shadow" role="toolbar" aria-label="Điều khiển bản đồ">
        <button type="button" onClick={() => zoomFromCenter(-1)} disabled={viewport.zoom <= MIN_ZOOM} className="grid size-9 place-items-center rounded text-white enabled:hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Thu nhỏ bản đồ" title="Thu nhỏ"><ZoomOut size={17} /></button>
        <span className="min-w-10 text-center font-mono text-xs text-white" aria-label={`Mức zoom ${Math.round(viewport.zoom * 100)}%`}>{Math.round(viewport.zoom * 100)}%</span>
        <button type="button" onClick={() => zoomFromCenter(1)} disabled={viewport.zoom >= MAX_ZOOM} className="grid size-9 place-items-center rounded text-white enabled:hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Phóng to bản đồ" title="Phóng to"><ZoomIn size={17} /></button>
        <button type="button" onClick={() => setViewport({ zoom: MIN_ZOOM, panX: 0, panY: 0 })} disabled={viewport.zoom === MIN_ZOOM && viewport.panX === 0 && viewport.panY === 0} className="grid size-9 place-items-center rounded text-white enabled:hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Đặt lại góc nhìn" title="Đặt lại góc nhìn"><RotateCcw size={16} /></button>
      </div>
      <span className="absolute bottom-2 left-2 rounded bg-black/55 px-1.5 py-0.5 text-[0.6rem] text-white/80">Ranh giới: © OpenStreetMap contributors</span>
    </div>
  );
}
