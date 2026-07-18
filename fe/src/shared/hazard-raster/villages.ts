import { VILLAGES } from "../domain/mockData";
import type { Village } from "../domain/types";
import { isInsideBoundary, RASTER_H, RASTER_W } from "./index";

export interface RasterVillage {
  village: Village;
  point: { x: number; y: number };
  located: boolean;
}

// Bounds of the OSM relation used to normalize the demo boundary, with its source padding.
const BOUNDARY_GEO_BOUNDS = { minLat: 21.56, maxLat: 21.635, minLon: 102.997, maxLon: 103.078 };

export function projectLatLonToRaster(lat: number, lon: number) {
  return {
    x: Math.round(((lon - BOUNDARY_GEO_BOUNDS.minLon) / (BOUNDARY_GEO_BOUNDS.maxLon - BOUNDARY_GEO_BOUNDS.minLon)) * (RASTER_W - 1)),
    y: Math.round(((BOUNDARY_GEO_BOUNDS.maxLat - lat) / (BOUNDARY_GEO_BOUNDS.maxLat - BOUNDARY_GEO_BOUNDS.minLat)) * (RASTER_H - 1)),
  };
}

export const RASTER_VILLAGES: RasterVillage[] = VILLAGES.map((village) => {
  const point = projectLatLonToRaster(village.lat, village.lon);
  return { village, point, located: isInsideBoundary(point.x, point.y) };
});

export function nearestRasterVillage(point: { x: number; y: number }): RasterVillage | null {
  const candidates = RASTER_VILLAGES.filter((entry) => entry.located);
  if (candidates.length === 0) return null;
  return candidates.reduce((nearest, entry) => {
    const currentDistance = (entry.point.x - point.x) ** 2 + (entry.point.y - point.y) ** 2;
    const nearestDistance = (nearest.point.x - point.x) ** 2 + (nearest.point.y - point.y) ** 2;
    return currentDistance < nearestDistance ? entry : nearest;
  });
}
