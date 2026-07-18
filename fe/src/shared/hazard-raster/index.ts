import { getBackendRisk, getForecastDays } from "../../features/demo/data";
import {
  dominantHazard,
  isInsideBoundary,
  RASTER_H,
  RASTER_W,
  renderHazardRaster as renderDemoHazardRaster,
  sampleFogAt as sampleDemoFogAt,
  sampleRasterAt as sampleDemoRasterAt,
} from "../../features/demo/terrain";
import type { RasterInspection, RasterSample } from "../../features/demo/terrain";
import type { HazardType as DemoHazardType } from "../../features/demo/types";
import type { HazardType } from "../domain/types";

export type RasterLayer = HazardType | "dominant";

export interface RasterPoint {
  x: number;
  y: number;
}

export interface RasterInspectionResult {
  layer: RasterLayer;
  primary: RasterSample;
  dominantSource: HazardType;
  hazards: Record<HazardType, RasterSample>;
}

export {
  getBackendRisk,
  getForecastDays,
  isInsideBoundary,
  RASTER_H,
  RASTER_W,
  sampleDemoFogAt as sampleFogAt,
};
export type { RasterSample };

export function toDemoHazardLayer(layer: RasterLayer): DemoHazardType | "dominant" {
  return layer === "flash_flood" ? "flood" : layer;
}

export function renderHazardRaster(
  out: Uint8ClampedArray,
  layer: RasterLayer,
  dayOffset: number,
  options: { showFog?: boolean } = {},
): void {
  renderDemoHazardRaster(out, toDemoHazardLayer(layer), dayOffset, options);
}

export function sampleHazardAt(point: RasterPoint, layer: RasterLayer, dayOffset: number): RasterInspectionResult {
  const inspection: RasterInspection = sampleDemoRasterAt(point.x, point.y, toDemoHazardLayer(layer), dayOffset);
  return {
    layer,
    primary: inspection.primary,
    dominantSource: inspection.dominantSource === "flood" ? "flash_flood" : "landslide",
    hazards: {
      flash_flood: inspection.hazards.flood,
      landslide: inspection.hazards.landslide,
    },
  };
}

export function dominantSourceFor(samples: Record<HazardType, RasterSample>): HazardType {
  return dominantHazard(samples.flash_flood, samples.landslide) === "flood" ? "flash_flood" : "landslide";
}
