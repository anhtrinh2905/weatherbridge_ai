import { describe, expect, test } from "vitest";
import { dominantSourceFor, isInsideBoundary, RASTER_H, RASTER_W, sampleHazardAt, toDemoHazardLayer } from "./index";
import { RASTER_VILLAGES } from "./villages";

describe("shared raster hazard adapter", () => {
  test("maps the application flash-flood layer to the demo flood model", () => {
    expect(toDemoHazardLayer("flash_flood")).toBe("flood");
    expect(toDemoHazardLayer("landslide")).toBe("landslide");
    expect(toDemoHazardLayer("dominant")).toBe("dominant");
  });

  test("uses flash flood as the deterministic dominant-layer tie breaker", () => {
    const sample = sampleHazardAt({ x: 280, y: 240 }, "dominant", 0);
    expect(dominantSourceFor({ flash_flood: sample.hazards.flash_flood, landslide: sample.hazards.landslide })).toBe(sample.dominantSource);
    expect(dominantSourceFor({ flash_flood: sample.hazards.flash_flood, landslide: sample.hazards.flash_flood })).toBe("flash_flood");
  });

  test("returns both independent hazard contributions for a dominant inspection", () => {
    const sample = sampleHazardAt({ x: 280, y: 240 }, "dominant", 0);
    expect(sample.hazards.flash_flood.contributions.terrain).toBeGreaterThanOrEqual(0);
    expect(sample.hazards.landslide.contributions.trigger).toBeGreaterThanOrEqual(0);
  });

  test("keeps every projected village point inside the raster bounds", () => {
    for (const { point, located } of RASTER_VILLAGES) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThan(RASTER_W);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThan(RASTER_H);
      expect(located).toBe(isInsideBoundary(point.x, point.y));
    }
  });
});
