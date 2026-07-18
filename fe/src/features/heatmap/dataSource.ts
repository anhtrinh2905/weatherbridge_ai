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

export const apiHazardDataSource: HazardDataSource = {
  mode: "api",
  forecastDays: getForecastDays, // API does not currently override forecast layout
  manifest: async (layer: RasterLayer, day: number) => {
    const dt = new Date();
    dt.setDate(dt.getDate() + day);
    const forecastDay = dt.toISOString().split("T")[0];
    try {
      return await apiClient.get<HazardManifestResponse>("/hazards/manifest", { type: layer, forecast_day: forecastDay });
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
    const fallbackSample = { level: 1 as HazardLevel, confidence: 0, score01: 0, contributions: { terrain: 0, trigger: 0 }, elevationM: 0, slopeDeg: 0 };

    try {
      const response = await apiClient.get<HazardCellResponse>("/hazards/cell", {
        latitude: lonLat.lat,
        longitude: lonLat.lon,
        type: layer,
        forecast_day: forecastDay,
      });
      return {
        layer,
        primary: { level: (response.samples[0]?.risk_level || 1) as HazardLevel, confidence: response.samples[0]?.confidence || 0, score01: response.samples[0]?.score_max || 0, contributions: { terrain: 0, trigger: 0 }, elevationM: 0, slopeDeg: 0 },
        dominantSource: (response.dominant_source as "flash_flood" | "landslide") || "flash_flood",
        hazards: {
          flash_flood: { ...fallbackSample },
          landslide: { ...fallbackSample },
        }
      };
    } catch {
      return {
        layer,
        primary: { ...fallbackSample },
        dominantSource: "flash_flood" as const,
        hazards: { flash_flood: { ...fallbackSample }, landslide: { ...fallbackSample } }
      };
    }
  }
};

export const configuredHazardSource = (import.meta.env.VITE_HAZARD_SOURCE ?? "mock") as HazardSourceMode;
export const activeHazardDataSource = configuredHazardSource === "mock" ? mockHazardDataSource : apiHazardDataSource;
