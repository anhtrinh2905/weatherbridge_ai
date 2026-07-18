import { apiClient } from "../../shared/lib/api-client";
import { getForecastDays, sampleHazardAt, type RasterLayer, type RasterPoint } from "../../shared/hazard-raster";

export type HazardSourceMode = "mock" | "api";
export interface HazardDataSource {
  readonly mode: HazardSourceMode;
  forecastDays: typeof getForecastDays;
  inspect: (point: RasterPoint, layer: RasterLayer, day: number) => ReturnType<typeof sampleHazardAt>;
}

export const mockHazardDataSource: HazardDataSource = {
  mode: "mock",
  forecastDays: getForecastDays,
  inspect: sampleHazardAt,
};

/** API calls are intentionally separate until the trained raster contract includes dominant display data. */
export const apiHazardDataSource = {
  manifest: (type: RasterLayer, forecastDay?: string) => apiClient.get<unknown>("/hazards/manifest", { type, forecast_day: forecastDay }),
  inspectCell: (latitude: number, longitude: number, type: RasterLayer, forecastDay?: string) => apiClient.get<unknown>("/hazards/cell", { latitude, longitude, type, forecast_day: forecastDay }),
};

export const configuredHazardSource = (import.meta.env.VITE_HAZARD_SOURCE ?? "mock") as HazardSourceMode;
export const activeHazardDataSource = configuredHazardSource === "mock" ? mockHazardDataSource : null;
