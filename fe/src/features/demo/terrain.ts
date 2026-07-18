import { BOUNDARY_ASPECT, buildBoundaryMask } from "./boundary";
import {
  clamp01,
  combineHazard,
  FOG_PATCHES,
  fogSampleForDay,
  wmoVisibilityDeficit01,
  hazardDayContext,
  LEVEL_META,
  levelFromScore,
} from "./data";
import type { FogSample, HazardLevel, HazardType } from "./types";

/** Keep in sync with BOUNDARY_GEO_BOUNDS in shared/hazard-raster/villages.ts */
const FOG_GEO_BOUNDS = {
  minLat: 21.474045782967035,
  maxLat: 21.700161717032966,
  minLon: 102.90104066923077,
  maxLon: 103.16895913076922,
};
const LAT_SPAN_KM = (FOG_GEO_BOUNDS.maxLat - FOG_GEO_BOUNDS.minLat) * 111;

/**
 * High-resolution simulated terrain raster for the demo heatmap.
 *
 * A deterministic fractal DEM stands in for the real SRTM 30m pipeline that
 * Story 2.1 builds offline in `ai/`. From the DEM we derive slope, hillshade,
 * and per-type susceptibility, then combine with the shared per-day rain
 * trigger from `data.ts` so the raster and the coarse village grid score with
 * the same deterministic function (FR2, NFR7). Everything is reproducible —
 * no randomness, no LLM.
 */

export const RASTER_W = 560;
/** height follows the real bbox aspect of the Mường Pồn boundary */
export const RASTER_H = Math.round(RASTER_W / BOUNDARY_ASPECT);

/** location of the digitized 25/7/2024 flash-flood event, raster fractions */
export const EVENT_MARKER = { x: 0.47, y: 0.44, label: "Lũ quét 25/7/2024" };

interface TerrainFields {
  /** normalized elevation 0..1 */
  elev: Float32Array;
  /** normalized slope 0..1 */
  slope: Float32Array;
  /** hillshade 0..1 (NW light) */
  shade: Float32Array;
  susceptibility: Record<HazardType, Float32Array>;
  /** small per-pixel jitter, mirrors the coarse-grid jitter term */
  jitter: Float32Array;
  /** 1 = inside the Mường Pồn administrative boundary */
  mask: Uint8Array;
}

function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function valueNoise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const a = hash2(xi, yi);
  const b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1);
  const d = hash2(xi + 1, yi + 1);
  const u = smoothstep(xf);
  const v = smoothstep(yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** fractional Brownian motion — soft rolling base terrain */
function fbm(x: number, y: number, octaves: number): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o += 1) {
    sum += amp * valueNoise(x * freq, y * freq);
    norm += amp;
    freq *= 2.03;
    amp *= 0.5;
  }
  return sum / norm;
}

/** ridged multifractal — sharp ridgelines and carved valleys */
function ridged(x: number, y: number, octaves: number): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o += 1) {
    const n = 1 - Math.abs(2 * valueNoise(x * freq, y * freq) - 1);
    sum += amp * n * n;
    norm += amp;
    freq *= 2.11;
    amp *= 0.52;
  }
  return sum / norm;
}

/** stretch susceptibility so the 5 classes all get real map area */
function contrast(s: number): number {
  return clamp01((s - 0.45) * 1.35 + 0.48);
}

let cached: TerrainFields | null = null;

/** Build the static terrain fields once, lazily (keeps app startup light). */
export function getTerrain(): TerrainFields {
  if (cached) return cached;

  const size = RASTER_W * RASTER_H;
  const elev = new Float32Array(size);
  const slope = new Float32Array(size);
  const shade = new Float32Array(size);
  const flood = new Float32Array(size);
  const landslide = new Float32Array(size);
  const jitter = new Float32Array(size);

  // --- elevation ---
  let min = Infinity;
  let max = -Infinity;
  for (let y = 0; y < RASTER_H; y += 1) {
    const ny = (y / RASTER_H) * 3.4;
    for (let x = 0; x < RASTER_W; x += 1) {
      const nx = (x / RASTER_W) * 4.2;
      const base = fbm(nx + 7.3, ny + 2.9, 6);
      const ridge = ridged(nx * 1.6 + 13.1, ny * 1.6 + 5.7, 5);
      const e = 0.52 * base + 0.48 * ridge;
      elev[y * RASTER_W + x] = e;
      if (e < min) min = e;
      if (e > max) max = e;
    }
  }
  const range = max - min || 1;
  for (let i = 0; i < size; i += 1) elev[i] = (elev[i] - min) / range;

  // --- slope + hillshade (NW light, exaggerated relief) ---
  const Z = 130;
  const lx = -0.539;
  const ly = -0.539;
  const lz = 0.647;
  for (let y = 0; y < RASTER_H; y += 1) {
    for (let x = 0; x < RASTER_W; x += 1) {
      const i = y * RASTER_W + x;
      const xm = x > 0 ? i - 1 : i;
      const xp = x < RASTER_W - 1 ? i + 1 : i;
      const ym = y > 0 ? i - RASTER_W : i;
      const yp = y < RASTER_H - 1 ? i + RASTER_W : i;
      const dzdx = (elev[xp] - elev[xm]) * 0.5;
      const dzdy = (elev[yp] - elev[ym]) * 0.5;

      // wide-stencil gradient → smoother slope field with coherent zones
      const S = 4;
      const xm4 = y * RASTER_W + Math.max(0, x - S);
      const xp4 = y * RASTER_W + Math.min(RASTER_W - 1, x + S);
      const ym4 = Math.max(0, y - S) * RASTER_W + x;
      const yp4 = Math.min(RASTER_H - 1, y + S) * RASTER_W + x;
      const gdx = (elev[xp4] - elev[xm4]) / (2 * S);
      const gdy = (elev[yp4] - elev[ym4]) / (2 * S);
      slope[i] = clamp01(Math.sqrt(gdx * gdx + gdy * gdy) * 80);

      const nx = -dzdx * Z;
      const nyv = -dzdy * Z;
      const len = Math.sqrt(nx * nx + nyv * nyv + 1);
      shade[i] = clamp01((nx * lx + nyv * ly + lz) / len);
    }
  }

  // --- per-type susceptibility + jitter ---
  for (let y = 0; y < RASTER_H; y += 1) {
    const ny = (y / RASTER_H) * 3.4;
    for (let x = 0; x < RASTER_W; x += 1) {
      const i = y * RASTER_W + x;
      const nx = (x / RASTER_W) * 4.2;

      // winding drainage channels: thin bands where a low-freq field ≈ 0.5
      const channelField = fbm(nx * 2.3 + 31.7, ny * 2.3 + 17.3, 4);
      const channel = Math.max(0, 1 - Math.abs(channelField - 0.5) * 10);

      // fine-grained local variability (soil/cover proxy) — gives the map the
      // speckled level mixing of a real susceptibility raster
      const detail = (fbm(nx * 9 + 51.3, ny * 9 + 43.7, 3) - 0.5) * 0.5;

      const low = 1 - elev[i];
      const flat = 1 - slope[i];
      // flood: low + flat land, boosted along drainage channels
      flood[i] = contrast(clamp01(low ** 1.6 * (0.4 + 0.6 * flat) + 0.45 * channel * low + detail));

      // landslide: steep mid-elevation slopes (less speckle than flood)
      const mid = 1 - Math.abs(2 * elev[i] - 1);
      landslide[i] = contrast(clamp01(slope[i] ** 1.35 * (0.5 + 0.5 * mid) + detail * 0.2));

      jitter[i] = (hash2(x * 3.7, y * 9.1) - 0.5) * 0.05;
    }
  }

  cached = {
    elev,
    slope,
    shade,
    susceptibility: { flood, landslide },
    jitter,
    mask: buildBoundaryMask(RASTER_W, RASTER_H),
  };
  return cached;
}

function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
}

const LEVEL_RGB: Record<HazardLevel, [number, number, number]> = {
  1: hexToRgb(LEVEL_META[1].color),
  2: hexToRgb(LEVEL_META[2].color),
  3: hexToRgb(LEVEL_META[3].color),
  4: hexToRgb(LEVEL_META[4].color),
  5: hexToRgb(LEVEL_META[5].color),
};

/** A raster can show a single hazard or the higher-risk hazard at each pixel. */
export type RasterLayer = HazardType | "dominant";

export function dominantHazard(flood: RasterSample, landslide: RasterSample): HazardType {
  return flood.score01 >= landslide.score01 ? "flood" : "landslide";
}

/**
 * Paint the hazard raster (level color × hillshade) into RGBA pixels. Pixels
 * inside the Mường Pồn boundary get the classified colors; surrounding
 * terrain renders as muted grayscale hillshade for geographic context, like
 * the reference topo map.
 */
export function renderHazardRaster(
  out: Uint8ClampedArray,
  type: RasterLayer,
  dayOffset: number,
  options: { showFog?: boolean } = {},
): void {
  void options;
  const t = getTerrain();
  const size = RASTER_W * RASTER_H;

  for (let i = 0; i < size; i += 1) {
    const o = i * 4;
    const shade = t.shade[i];

    if (t.mask[i]) {
      const flood = sampleAtIndex(t, i, "flood", dayOffset);
      const landslide = sampleAtIndex(t, i, "landslide", dayOffset);
      const sample = type === "dominant" ? (dominantHazard(flood, landslide) === "flood" ? flood : landslide) : type === "flood" ? flood : landslide;
      const [r, g, b] = LEVEL_RGB[sample.level];
      // multiply by hillshade so relief stays readable under the class colors
      const m = 0.58 + 0.5 * shade;
      out[o] = Math.min(255, r * m);
      out[o + 1] = Math.min(255, g * m);
      out[o + 2] = Math.min(255, b * m);
      out[o + 3] = 255;
    } else {
      // context terrain outside the commune: mid-tone hillshade (avoid black letterbox)
      const v = 118 + 52 * shade;
      out[o] = v;
      out[o + 1] = v + 4;
      out[o + 2] = v + 6;
      out[o + 3] = 255;
    }
  }

  // Fog is rendered as cloud markers in RasterHazardMap (not a pixel veil).
}

interface FogPatchPixel {
  x: number;
  y: number;
  radiusPx: number;
  weight: number;
}

function fogPatchesInPixels(): FogPatchPixel[] {
  const latSpan = FOG_GEO_BOUNDS.maxLat - FOG_GEO_BOUNDS.minLat;
  const lonSpan = FOG_GEO_BOUNDS.maxLon - FOG_GEO_BOUNDS.minLon;
  return FOG_PATCHES.map((patch) => ({
    x: ((patch.lon - FOG_GEO_BOUNDS.minLon) / lonSpan) * (RASTER_W - 1),
    y: ((FOG_GEO_BOUNDS.maxLat - patch.lat) / latSpan) * (RASTER_H - 1),
    radiusPx: Math.max(12, (patch.radiusKm / LAT_SPAN_KM) * RASTER_H),
    weight: patch.weight,
  }));
}

function fogPatchIntensityAt(x: number, y: number, elev01: number): number {
  let peak = 0;
  for (const patch of fogPatchesInPixels()) {
    const dist = Math.hypot(x - patch.x, y - patch.y);
    if (dist >= patch.radiusPx) continue;
    const falloff = 1 - dist / patch.radiusPx;
    // Radiation fog pools in valleys (cold-air drainage); ridges stay weaker.
    const valley = 1 - elev01;
    peak = Math.max(peak, patch.weight * falloff * falloff * (0.35 + 0.65 * valley));
  }
  return clamp01(peak);
}

/** Fog inspection at a pixel (WMO label + local valley-patch intensity). */
export function sampleFogAt(x: number, y: number, dayOffset: number): FogSample & { localIntensity: number } {
  const base = fogSampleForDay(dayOffset);
  const t = getTerrain();
  const xi = Math.max(0, Math.min(RASTER_W - 1, Math.round(x)));
  const yi = Math.max(0, Math.min(RASTER_H - 1, Math.round(y)));
  const i = yi * RASTER_W + xi;
  const severity = wmoVisibilityDeficit01(base.visibilityM);
  const patch = fogPatchIntensityAt(xi, yi, t.elev[i]);
  return {
    ...base,
    localIntensity: base.isFog ? severity * patch : 0,
  };
}

/** whether a raster pixel lies inside the commune boundary */
export function isInsideBoundary(x: number, y: number): boolean {
  const t = getTerrain();
  const xi = Math.max(0, Math.min(RASTER_W - 1, Math.round(x)));
  const yi = Math.max(0, Math.min(RASTER_H - 1, Math.round(y)));
  return t.mask[yi * RASTER_W + xi] === 1;
}

export interface RasterSample {
  level: HazardLevel;
  score01: number;
  confidence: number;
  contributions: { terrain: number; trigger: number };
  /** simulated absolute elevation, meters */
  elevationM: number;
  /** simulated slope, degrees */
  slopeDeg: number;
}

export interface RasterInspection {
  layer: RasterLayer;
  primary: RasterSample;
  dominantSource: HazardType;
  hazards: Record<HazardType, RasterSample>;
}

function sampleAtIndex(t: TerrainFields, i: number, type: HazardType, dayOffset: number): RasterSample {
  const { trigger, confidence } = hazardDayContext(type, dayOffset);
  const terrain = t.susceptibility[type][i];
  const score01 = clamp01(combineHazard(terrain, trigger) + t.jitter[i]);

  return {
    level: levelFromScore(score01),
    score01,
    confidence,
    contributions: { terrain, trigger },
    elevationM: Math.round(320 + t.elev[i] * 1250),
    slopeDeg: Math.round(t.slope[i] * 42),
  };
}

/** Inspect a single raster pixel with the same scoring function as the map. */
export function sampleHazardAt(x: number, y: number, type: HazardType, dayOffset: number): RasterSample {
  const t = getTerrain();
  const xi = Math.max(0, Math.min(RASTER_W - 1, Math.round(x)));
  const yi = Math.max(0, Math.min(RASTER_H - 1, Math.round(y)));
  const i = yi * RASTER_W + xi;

  return sampleAtIndex(t, i, type, dayOffset);
}

/** Inspect every hazard at a point, preserving the inputs used by the renderer. */
export function sampleRasterAt(x: number, y: number, layer: RasterLayer, dayOffset: number): RasterInspection {
  const flood = sampleHazardAt(x, y, "flood", dayOffset);
  const landslide = sampleHazardAt(x, y, "landslide", dayOffset);
  const dominantSource = dominantHazard(flood, landslide);
  const primary = layer === "dominant" ? (dominantSource === "flood" ? flood : landslide) : layer === "flood" ? flood : landslide;

  return {
    layer,
    primary,
    dominantSource,
    hazards: { flood, landslide },
  };
}
