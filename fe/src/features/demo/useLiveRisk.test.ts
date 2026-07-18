import { describe, expect, it } from "vitest";
import { mapHazardRiskToBackendDays } from "./useLiveRisk";
import type { HazardRiskResponse } from "./riskApi";

function response(days: Partial<HazardRiskResponse["days"][number]>[]): HazardRiskResponse {
  return {
    location_code: "muong-pon",
    latitude: 21.59,
    longitude: 103.03,
    source: "open-meteo:best_match",
    computed_at: "2026-07-19T00:00:00Z",
    days: days.map((d, i) => ({
      date: `2026-07-${19 + i}`,
      rainfall_mm: 0,
      peak_intensity_mm_h: null,
      corrected_rainfall_mm: null,
      bias_corrected: null,
      id_exceedance: null,
      trigger_level: null,
      risk_level: null,
      risk_name: null,
      ...d,
    })),
  };
}

describe("mapHazardRiskToBackendDays", () => {
  it("normalises id_exceedance to a 0..1 trigger, saturating at ratio 2", () => {
    const days = mapHazardRiskToBackendDays(
      response([{ id_exceedance: 1.0 }, { id_exceedance: 4.0 }, { id_exceedance: 0 }]),
    );
    expect(days[0].trigger).toBeCloseTo(0.5);
    expect(days[1].trigger).toBe(1); // capped
    expect(days[2].trigger).toBe(0);
  });

  it("treats a missing or negative exceedance as no trigger", () => {
    const days = mapHazardRiskToBackendDays(
      response([{ id_exceedance: null }, { id_exceedance: -3 }]),
    );
    expect(days[0].trigger).toBe(0);
    expect(days[1].trigger).toBe(0);
  });

  it("passes the composite risk level through", () => {
    const days = mapHazardRiskToBackendDays(response([{ risk_level: 3 }]));
    expect(days[0].riskLevel).toBe(3);
  });
});
