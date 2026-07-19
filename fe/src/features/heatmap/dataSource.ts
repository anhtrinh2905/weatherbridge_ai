import { apiClient } from "../../shared/lib/api-client";
import { getForecastDays, sampleHazardAt, type RasterLayer, type RasterPoint } from "../../shared/hazard-raster";

export type HazardSourceMode = "mock" | "api";
export interface HazardDataSource {
  readonly mode: HazardSourceMode;
  forecastDays: typeof getForecastDays;
  inspect: (point: RasterPoint, layer: RasterLayer, day: number) => Promise<ReturnType<typeof sampleHazardAt>>;
  manifest: (layer: RasterLayer, day: number) => Promise<components["schemas"]["HazardManifestResponse"] | null>;
}

export const mockHazardDataSource: HazardDataSource = {
  mode: "mock",
  forecastDays: getForecastDays,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  inspect: async (point, layer, day) => sampleHazardAt(point, "dominant", 0),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  manifest: async (layer, day) => null,
};

import type { components } from "../../shared/api/generated";
import { pixelToLonLat } from "../../shared/hazard-raster/villages";

type HazardManifestResponse = components["schemas"]["HazardManifestResponse"];
type HazardCellResponse = components["schemas"]["HazardCellResponse"];

/**
 * The worker ingest pipeline (`worker/src/forecast_ingest.py`) only ever
 * generates `flash_flood` hazard runs — there is no landslide raster/cell
 * backend yet. So `landslide` (and therefore `dominant`, which needs both
 * physical types) can never be fully served from `/hazards/*`; treat those
 * responses as incomplete and let the caller fall back to the client terrain
 * heuristic instead of showing an empty map/panel.
 */
function manifestCoversLayer(response: HazardManifestResponse, layer: RasterLayer): boolean {
  const types = new Set(response.layers.map((entry) => entry.hazard_type));
  if (layer === "dominant") return types.has("flash_flood") && types.has("landslide");
  return types.has(layer);
}

export const apiHazardDataSource: HazardDataSource = {
  mode: "api",
  forecastDays: getForecastDays, // API does not currently override forecast layout
  manifest: async (layer: RasterLayer, day: number) => {
    const dt = new Date();
    dt.setDate(dt.getDate() + day);
    const forecastDay = dt.toISOString().split("T")[0];
    try {
      const response = await apiClient.get<HazardManifestResponse>("/hazards/manifest", { hazard_type: layer, forecast_day: forecastDay });
      return manifestCoversLayer(response, layer) ? response : null;
    } catch {
      return null;
    }
  },
  inspect: async (point: RasterPoint, layer: RasterLayer, day: number) => {
    const lonLat = pixelToLonLat(point.x, point.y);
    const dt = new Date();
    dt.setDate(dt.getDate() + day);
    const forecastDay = dt.toISOString().split("T")[0];

    type HazardLevel = 1 | 2 | 3 | 4 | 5;
    const emptySample = { level: 1 as HazardLevel, confidence: 0, score01: 0, contributions: { terrain: 0, trigger: 0 }, elevationM: 0, slopeDeg: 0 };

    // Landslide has no backend run yet — always score it with the same client
    // terrain heuristic the mock source uses, so it never renders as empty.
    const landslideSample = sampleHazardAt(point, "landslide", day).primary;

    let floodSample = emptySample;
    try {
      const response = await apiClient.get<HazardCellResponse>("/hazards/cell", {
        latitude: lonLat.lat,
        longitude: lonLat.lon,
        hazard_type: "flash_flood",
        forecast_day: forecastDay,
      });
      const sample = response.samples.find((entry) => entry.hazard_type === "flash_flood");
      if (sample?.risk_level != null) {
        floodSample = {
          level: sample.risk_level as HazardLevel,
          confidence: sample.confidence ?? 0,
          score01: sample.score_max ?? 0,
          contributions: { terrain: 0, trigger: 0 },
          elevationM: 0,
          slopeDeg: 0,
        };
      }
    } catch {
      // keep emptySample for flood; landslide heuristic still renders below
    }

    const dominantSource: "flash_flood" | "landslide" =
      floodSample.score01 >= landslideSample.score01 ? "flash_flood" : "landslide";
    const primary =
      layer === "dominant" ? (dominantSource === "flash_flood" ? floodSample : landslideSample)
      : layer === "flash_flood" ? floodSample
      : landslideSample;

    return {
      layer,
      primary,
      dominantSource,
      hazards: { flash_flood: floodSample, landslide: landslideSample },
    };
  }
};

export const configuredHazardSource = (import.meta.env.VITE_HAZARD_SOURCE ?? "mock") as HazardSourceMode;
export const activeHazardDataSource = configuredHazardSource === "mock" ? mockHazardDataSource : apiHazardDataSource;
