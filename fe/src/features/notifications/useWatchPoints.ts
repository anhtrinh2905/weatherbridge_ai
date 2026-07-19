import { useCallback, useState } from "react";
import type { RasterPoint } from "../../shared/hazard-raster";
import { pixelToLonLat } from "../../shared/hazard-raster/villages";

/**
 * Resident-registered notification locations, in addition to the resident's home
 * point. Client-side mock: there is no per-location subscription endpoint yet, so
 * the list lives in localStorage keyed by resident id (survives reload) and is
 * shaped like the eventual API so a later TanStack Query mutation swaps in cleanly.
 */
export interface WatchPoint {
  id: string;
  x: number;
  y: number;
  lat: number;
  lon: number;
  createdAt: string;
}

export const MAX_WATCH_POINTS = 3;

const storageKey = (residentId: string) => `weather-bridge.watch-points.${residentId}`;

function readStored(residentId: string | undefined): WatchPoint[] {
  if (!residentId) return [];
  try {
    const raw = localStorage.getItem(storageKey(residentId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is WatchPoint =>
          item && typeof item.id === "string" && typeof item.x === "number" && typeof item.y === "number",
      )
      .slice(0, MAX_WATCH_POINTS);
  } catch {
    return [];
  }
}

export function samePoint(a: { x: number; y: number } | null, b: { x: number; y: number } | null): boolean {
  return Boolean(a && b && a.x === b.x && a.y === b.y);
}

export function useWatchPoints(residentId: string | undefined) {
  const [points, setPoints] = useState<WatchPoint[]>(() => readStored(residentId));
  // Re-read storage when the resident changes (e.g. auth resolves undefined -> id),
  // adjusting state during render per React's recommended reset pattern (no effect).
  const [loadedFor, setLoadedFor] = useState(residentId);
  if (residentId !== loadedFor) {
    setLoadedFor(residentId);
    setPoints(readStored(residentId));
  }

  const add = useCallback(
    (point: RasterPoint): WatchPoint | null => {
      let created: WatchPoint | null = null;
      setPoints((current) => {
        if (current.length >= MAX_WATCH_POINTS) return current;
        if (current.some((existing) => samePoint(existing, point))) return current;
        const { lat, lon } = pixelToLonLat(point.x, point.y);
        created = { id: `wp-${point.x}-${point.y}-${Date.now()}`, x: point.x, y: point.y, lat, lon, createdAt: new Date().toISOString() };
        const next = [...current, created];
        if (residentId) localStorage.setItem(storageKey(residentId), JSON.stringify(next));
        return next;
      });
      return created;
    },
    [residentId],
  );

  const remove = useCallback(
    (id: string) => {
      setPoints((current) => {
        const next = current.filter((point) => point.id !== id);
        if (residentId) localStorage.setItem(storageKey(residentId), JSON.stringify(next));
        return next;
      });
    },
    [residentId],
  );

  return {
    points,
    add,
    remove,
    canAdd: points.length < MAX_WATCH_POINTS,
    max: MAX_WATCH_POINTS,
  };
}
