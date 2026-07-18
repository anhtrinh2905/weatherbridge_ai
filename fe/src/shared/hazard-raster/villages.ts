import { VILLAGES } from "../domain/mockData";
import type { Village } from "../domain/types";
import { isInsideBoundary, RASTER_H, RASTER_W } from "./index";

export interface RasterVillage {
  village: Village;
  point: { x: number; y: number };
  located: boolean;
}

/**
 * Padded WGS84 bounds matching `fe/src/features/demo/boundary.ts`
 * (OSM relation 19571212 = xã Mường Pồn sau sáp nhập, 4.5% pad).
 */
export const BOUNDARY_GEO_BOUNDS = {
  minLat: 21.474045782967035,
  maxLat: 21.700161717032966,
  minLon: 102.90104066923077,
  maxLon: 103.16895913076922,
};

export function projectLatLonToRaster(lat: number, lon: number) {
  return {
    x: Math.round(((lon - BOUNDARY_GEO_BOUNDS.minLon) / (BOUNDARY_GEO_BOUNDS.maxLon - BOUNDARY_GEO_BOUNDS.minLon)) * (RASTER_W - 1)),
    y: Math.round(((BOUNDARY_GEO_BOUNDS.maxLat - lat) / (BOUNDARY_GEO_BOUNDS.maxLat - BOUNDARY_GEO_BOUNDS.minLat)) * (RASTER_H - 1)),
  };
}

function projectVillage(village: Village) {
  if (village.lat === null || village.lon === null) return null;
  return projectLatLonToRaster(village.lat, village.lon);
}

/** Inverse of village projection: raster pixel → WGS84. */
export function pixelToLonLat(x: number, y: number): { lon: number; lat: number } {
  const nx = Math.max(0, Math.min(RASTER_W - 1, x)) / (RASTER_W - 1);
  const ny = Math.max(0, Math.min(RASTER_H - 1, y)) / (RASTER_H - 1);
  return {
    lon: BOUNDARY_GEO_BOUNDS.minLon + nx * (BOUNDARY_GEO_BOUNDS.maxLon - BOUNDARY_GEO_BOUNDS.minLon),
    lat: BOUNDARY_GEO_BOUNDS.maxLat - ny * (BOUNDARY_GEO_BOUNDS.maxLat - BOUNDARY_GEO_BOUNDS.minLat),
  };
}

/**
 * Only villages with resolved, in-polygon coordinates appear as map markers.
 * See data/catalogs/muong_pon_villages_v1.json — currently 0 resolved (no estimates).
 */
export const RASTER_VILLAGES: RasterVillage[] = VILLAGES.flatMap((village) => {
  if (village.coordinateStatus !== "resolved") return [];
  const point = projectVillage(village);
  if (!point) return [];
  if (!isInsideBoundary(point.x, point.y)) return [];
  return [{ village, point, located: true }];
});

/** Full name list for side panels (includes unresolved). */
export const ALL_COMMUNE_VILLAGES = VILLAGES;

export function nearestRasterVillage(point: { x: number; y: number }): RasterVillage | null {
  if (RASTER_VILLAGES.length === 0) return null;
  return RASTER_VILLAGES.reduce((nearest, entry) => {
    const currentDistance = (entry.point.x - point.x) ** 2 + (entry.point.y - point.y) ** 2;
    const nearestDistance = (nearest.point.x - point.x) ** 2 + (nearest.point.y - point.y) ** 2;
    return currentDistance < nearestDistance ? entry : nearest;
  });
}
