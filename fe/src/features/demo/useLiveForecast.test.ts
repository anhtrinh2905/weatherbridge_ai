import { expect, test } from "vitest";
import { mapOpenMeteoToForecastDays } from "./useLiveForecast";
import { FOG_PATCHES, fogSampleForDay, setForecastDays, SIMULATED_FORECAST_DAYS, WMO_FOG_VISIBILITY_M } from "./data";
import { sampleFogAt } from "./terrain";
import { RASTER_H, RASTER_W } from "../../shared/hazard-raster";
import { BOUNDARY_GEO_BOUNDS, pixelToLonLat, RASTER_VILLAGES, ALL_COMMUNE_VILLAGES } from "../../shared/hazard-raster/villages";

test("maps Open-Meteo daily sums and hourly peaks to forecast days", () => {
  const days = mapOpenMeteoToForecastDays({
    daily: {
      time: ["2026-07-18", "2026-07-19"],
      precipitation_sum: [12.4, null],
    },
    hourly: {
      time: ["2026-07-18T06:00", "2026-07-18T07:00", "2026-07-19T06:00"],
      precipitation: [1.2, 4.8, null],
      visibility: [800, 1200, 5000],
      temperature_2m: [18, 19, 22],
      dew_point_2m: [17, 17.5, 16],
    },
  });

  expect(days).toHaveLength(2);
  expect(days[0]).toMatchObject({ offset: 0, label: "Hiện tại", rainfallMm: 12.4, intensityMmH: 4.8, visibilityM: 800 });
  expect(days[1]).toMatchObject({ offset: 1, label: "+1 ngày", rainfallMm: 0, intensityMmH: 0, visibilityM: 5000 });
  expect(days[0].confidence).toBeGreaterThan(days[1].confidence);
});

test("caps at eight forecast days for the day buttons", () => {
  const time = Array.from({ length: 10 }, (_, i) => `2026-07-${18 + i}`);
  const days = mapOpenMeteoToForecastDays({
    daily: { time, precipitation_sum: time.map(() => 10) },
  });
  expect(days).toHaveLength(8);
  expect(days[7].label).toBe("+7 ngày");
});

test("WMO fog label uses visibility under 1000 m", () => {
  setForecastDays(SIMULATED_FORECAST_DAYS);
  expect(fogSampleForDay(2).isFog).toBe(true);
  expect(fogSampleForDay(2).visibilityM!).toBeLessThan(WMO_FOG_VISIBILITY_M);
  expect(fogSampleForDay(0).isFog).toBe(false);
  expect(fogSampleForDay(5).isFog).toBe(false); // 1050 m — just above threshold
  expect(fogSampleForDay(2).dpdC).toBeCloseTo(0.4, 5);
});

test("simulated mock days stay physically consistent with WMO + DPD", () => {
  setForecastDays(SIMULATED_FORECAST_DAYS);
  for (const day of SIMULATED_FORECAST_DAYS) {
    expect(day.dewPointC!).toBeLessThanOrEqual(day.temperatureC!);
    const fog = fogSampleForDay(day.offset);
    expect(fog.isFog).toBe(day.visibilityM! < WMO_FOG_VISIBILITY_M);
    // DPD is a feature, not the label; fog days are authored near saturation.
    if (fog.isFog) {
      expect(fog.dpdC!).toBeGreaterThanOrEqual(0);
      expect(fog.dpdC!).toBeLessThanOrEqual(1.5);
    }
  }
  // Dense fog day must read stronger locally than light fog day at the same valley pixel
  const patch = FOG_PATCHES[0];
  const x = Math.round(
    ((patch.lon - BOUNDARY_GEO_BOUNDS.minLon) / (BOUNDARY_GEO_BOUNDS.maxLon - BOUNDARY_GEO_BOUNDS.minLon)) *
      (RASTER_W - 1),
  );
  const y = Math.round(
    ((BOUNDARY_GEO_BOUNDS.maxLat - patch.lat) / (BOUNDARY_GEO_BOUNDS.maxLat - BOUNDARY_GEO_BOUNDS.minLat)) *
      (RASTER_H - 1),
  );
  const dense = sampleFogAt(x, y, 2); // 380 m
  const light = sampleFogAt(x, y, 3); // 880 m
  expect(dense.localIntensity).toBeGreaterThan(light.localIntensity);
});

test("demo fog patches concentrate intensity near valley anchors", () => {
  setForecastDays(SIMULATED_FORECAST_DAYS);
  expect(FOG_PATCHES.length).toBeGreaterThanOrEqual(4);
  const patch = FOG_PATCHES[0];
  const x = Math.round(
    ((patch.lon - BOUNDARY_GEO_BOUNDS.minLon) / (BOUNDARY_GEO_BOUNDS.maxLon - BOUNDARY_GEO_BOUNDS.minLon)) *
      (RASTER_W - 1),
  );
  const y = Math.round(
    ((BOUNDARY_GEO_BOUNDS.maxLat - patch.lat) / (BOUNDARY_GEO_BOUNDS.maxLat - BOUNDARY_GEO_BOUNDS.minLat)) *
      (RASTER_H - 1),
  );
  const nearValley = sampleFogAt(x, y, 2);
  const farCorner = sampleFogAt(RASTER_W - 2, 2, 2);
  expect(nearValley.isFog).toBe(true);
  expect(nearValley.localIntensity).toBeGreaterThan(0.2);
  expect(nearValley.localIntensity).toBeGreaterThan(farCorner.localIntensity);
});

test("raster map has no village markers until coordinates are resolved from a cited source", () => {
  expect(ALL_COMMUNE_VILLAGES).toHaveLength(22);
  expect(RASTER_VILLAGES).toHaveLength(0);
  expect(ALL_COMMUNE_VILLAGES.every((v) => v.coordinateStatus === "unresolved")).toBe(true);
  expect(ALL_COMMUNE_VILLAGES.every((v) => v.lat === null && v.lon === null)).toBe(true);
});

test("pixelToLonLat inverts village projection bounds", () => {
  const corner = pixelToLonLat(0, 0);
  expect(corner.lat).toBeCloseTo(BOUNDARY_GEO_BOUNDS.maxLat, 5);
  expect(corner.lon).toBeCloseTo(BOUNDARY_GEO_BOUNDS.minLon, 5);
  const opposite = pixelToLonLat(RASTER_W - 1, RASTER_H - 1);
  expect(opposite.lat).toBeCloseTo(BOUNDARY_GEO_BOUNDS.minLat, 5);
  expect(opposite.lon).toBeCloseTo(BOUNDARY_GEO_BOUNDS.maxLon, 5);
});
