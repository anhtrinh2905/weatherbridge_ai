import type {
  Bulletin,
  Cell,
  FogSample,
  ForecastDay,
  HazardLevel,
  HazardType,
  Resident,
  ResidentLabel,
  Threshold,
  Village,
} from "./types";
import { getOccupationRecommendation } from "../../shared/domain/recommendations";
import type { HazardType as SharedHazardType, Occupation, Tier } from "../../shared/domain/types";

/**
 * Simulated, fully deterministic demo dataset for the WeatherBridge AI commune
 * of Mường Pồn (Điện Biên). No real PII, no live services — every value is
 * reproducible from the coordinates + forecast so the hazard scoring stays
 * explainable (NFR7). This mirrors the online scoring contract that Epic 2
 * lands for real; here it runs client-side purely to demo the experience.
 */

const DEMO_OCCUPATION_TO_SHARED: Record<string, Occupation> = {
  "Nông dân": "nong_dan",
  "Người chăn nuôi": "chan_nuoi",
  "Tài xế": "tai_xe",
  "Giáo viên": "giao_vien",
};

function toSharedHazard(type: HazardType): SharedHazardType {
  return type === "flood" ? "flash_flood" : "landslide";
}

function toSharedTier(label: ResidentLabel): Tier {
  return label === "go-now" ? "go_now" : "prepare";
}

export const GRID_COLS = 12;
export const GRID_ROWS = 9;

const COMMUNE_NAME = "Xã Mường Pồn";
export const COMMUNE = COMMUNE_NAME;

/** deterministic hash → 0..1, stable across renders */
function noise(a: number, b: number, salt: number): number {
  const x = Math.sin(a * 127.1 + b * 311.7 + salt * 74.7) * 43758.5453;
  return x - Math.floor(x);
}

export const VILLAGES: Village[] = [
  { id: "v1", name: "Bản Mường Pồn 1", headName: "Lò Văn Pao" },
  { id: "v2", name: "Bản Mường Pồn 2", headName: "Quàng Thị Muôn" },
  { id: "v3", name: "Bản Huổi Chan 1", headName: "Vừ A Dình" },
  { id: "v4", name: "Bản Lôm", headName: "Lường Văn Panh" },
  { id: "v5", name: "Bản Tin Tốc", headName: "Cà Thị Inh" },
];

/** village centres in grid space, used to assign cells + shape susceptibility */
const VILLAGE_CENTRES: Record<string, { r: number; c: number }> = {
  v1: { r: 3, c: 3 },
  v2: { r: 5, c: 6 },
  v3: { r: 2, c: 8 },
  v4: { r: 6, c: 2 },
  v5: { r: 7, c: 9 },
};

/** irregular commune boundary mask so the map reads like a real commune */
function inBoundary(r: number, c: number): boolean {
  const cx = (GRID_COLS - 1) / 2;
  const cy = (GRID_ROWS - 1) / 2;
  const nx = (c - cx) / (GRID_COLS / 2);
  const ny = (r - cy) / (GRID_ROWS / 2);
  const wobble = 0.12 * Math.sin(r * 1.3) + 0.1 * Math.cos(c * 1.1);
  return nx * nx + ny * ny <= 0.92 + wobble;
}

function nearestVillage(r: number, c: number): string {
  let best = "v1";
  let bestDist = Infinity;
  for (const [id, ctr] of Object.entries(VILLAGE_CENTRES)) {
    const d = (ctr.r - r) ** 2 + (ctr.c - c) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = id;
    }
  }
  return best;
}

export const GRID: Cell[] = (() => {
  const cells: Cell[] = [];
  for (let r = 0; r < GRID_ROWS; r += 1) {
    for (let c = 0; c < GRID_COLS; c += 1) {
      // valleys (low rows) drain water → higher flood susceptibility.
      const valley = 1 - r / (GRID_ROWS - 1);
      const flood = clamp01(0.35 * valley + 0.5 * noise(r, c, 11) + 0.15);
      // mid-slope terrain → higher landslide susceptibility.
      const slope = 1 - Math.abs(r - GRID_ROWS / 2) / (GRID_ROWS / 2);
      const landslide = clamp01(0.4 * slope + 0.45 * noise(r, c, 29) + 0.1);
      cells.push({
        id: `${r}-${c}`,
        row: r,
        col: c,
        villageId: nearestVillage(r, c),
        inBoundary: inBoundary(r, c),
        susceptibility: { flood, landslide },
      });
    }
  }
  return cells;
})();

/**
 * WMO International Cloud Atlas: fog = horizontal visibility < 1000 m.
 * This is the only binary fog label used in the demo (not RH/DPD/wind scores).
 * @see https://cloudatlas.wmo.int/en/fog.html
 */
export const WMO_FOG_VISIBILITY_M = 1000;

/**
 * How far visibility sits below the WMO fog threshold (0..1).
 * 0 = at/above 1000 m (no fog); 1 = visibility → 0 m.
 * Used only for overlay opacity — never as a substitute label.
 */
export function wmoVisibilityDeficit01(visibilityM: number | null | undefined): number {
  if (visibilityM === null || visibilityM === undefined) return 0;
  if (visibilityM >= WMO_FOG_VISIBILITY_M) return 0;
  return Math.min(1, (WMO_FOG_VISIBILITY_M - visibilityM) / WMO_FOG_VISIBILITY_M);
}

/**
 * Demo spatial prior for radiation-fog pooling in low valleys (cold-air drainage).
 * Drawn only when the day is WMO-fog (visibility < 1000 m) — not a trained field
 * and not a hand-tuned "fog score".
 * Keep lon/lat inside BOUNDARY_GEO_BOUNDS (hazard-raster/villages.ts).
 */
export interface FogPatch {
  id: string;
  lat: number;
  lon: number;
  /** Approximate radius in km (converted to pixels against the commune bbox). */
  radiusKm: number;
  weight: number;
}

export const FOG_PATCHES: FogPatch[] = [
  { id: "valley-muong-pon-1", lat: 21.588, lon: 103.022, radiusKm: 2.4, weight: 1 },
  { id: "valley-linh", lat: 21.579, lon: 103.014, radiusKm: 2.0, weight: 0.95 },
  { id: "valley-pa-cha", lat: 21.61, lon: 103.033, radiusKm: 1.9, weight: 0.9 },
  { id: "valley-muong-muon", lat: 21.665, lon: 103.065, radiusKm: 2.2, weight: 0.95 },
  { id: "valley-huoi-vang", lat: 21.655, lon: 103.055, radiusKm: 1.8, weight: 0.85 },
];

/**
 * Simulated Open-Meteo-like daily fields.
 *
 * Fog logic (academic):
 * - Label: isFog ⇔ visibilityM < 1000 (WMO).
 * - DPD = T − Td is a physical feature (near 0 ⇒ near saturation); it is NOT the label.
 * - Fog days: authored with Td ≤ T and small DPD (typical near-saturated air).
 * - Non-fog can still have modest DPD (mist / near-fog) when visibility ≥ 1000 m.
 */
export const SIMULATED_FORECAST_DAYS: ForecastDay[] = [
  // Clear: high vis, larger DPD
  { offset: 0, label: "Hiện tại", rainfallMm: 34, intensityMmH: 8, confidence: 0.92, visibilityM: 4500, temperatureC: 23, dewPointC: 16.5 },
  // Near saturation but not fog (mist): DPD small, vis still ≥ 1000 m
  { offset: 1, label: "+1 ngày", rainfallMm: 76, intensityMmH: 17, confidence: 0.86, visibilityM: 1600, temperatureC: 19.5, dewPointC: 18.2 },
  // Dense fog: vis well below 1000 m, DPD ≈ 0.4°C
  { offset: 2, label: "+2 ngày", rainfallMm: 138, intensityMmH: 31, confidence: 0.78, visibilityM: 380, temperatureC: 16.8, dewPointC: 16.4 },
  // Light fog: just under WMO threshold
  { offset: 3, label: "+3 ngày", rainfallMm: 112, intensityMmH: 24, confidence: 0.68, visibilityM: 880, temperatureC: 18.2, dewPointC: 17.5 },
  // Clearing
  { offset: 4, label: "+4 ngày", rainfallMm: 61, intensityMmH: 14, confidence: 0.6, visibilityM: 2800, temperatureC: 21, dewPointC: 15.5 },
  // Just above threshold — not fog by WMO
  { offset: 5, label: "+5 ngày", rainfallMm: 48, intensityMmH: 11, confidence: 0.52, visibilityM: 1050, temperatureC: 19.5, dewPointC: 17.2 },
  // Moderate fog
  { offset: 6, label: "+6 ngày", rainfallMm: 72, intensityMmH: 15, confidence: 0.45, visibilityM: 620, temperatureC: 15.8, dewPointC: 15.3 },
  // Clear / dry air
  { offset: 7, label: "+7 ngày", rainfallMm: 55, intensityMmH: 12, confidence: 0.4, visibilityM: 5200, temperatureC: 24, dewPointC: 14 },
];

export function fogSampleForDay(dayOffset: number): FogSample {
  const days = getForecastDays();
  const day = days.find((entry) => entry.offset === dayOffset) ?? days[0];
  const visibilityM = day?.visibilityM ?? null;
  const temperatureC = day?.temperatureC ?? null;
  const dewPointC = day?.dewPointC ?? null;
  const dpdC =
    temperatureC !== null && dewPointC !== null ? Math.round((temperatureC - dewPointC) * 10) / 10 : null;
  return {
    // Label is visibility-only (WMO). DPD is reported for inspection, not gating.
    isFog: visibilityM !== null && visibilityM < WMO_FOG_VISIBILITY_M,
    visibilityM,
    temperatureC,
    dewPointC,
    dpdC,
  };
}

// Swappable forecast store: starts simulated; `useLiveForecast` replaces it
// with real Open-Meteo data when the fetch succeeds. Every scoring function
// reads through the getter so the whole demo re-scores on swap.
let currentForecastDays: ForecastDay[] = SIMULATED_FORECAST_DAYS;

export function getForecastDays(): ForecastDay[] {
  return currentForecastDays;
}

export function setForecastDays(days: ForecastDay[]): void {
  if (days.length > 0) currentForecastDays = days;
}

/** Per-day risk from the backend `/hazards` endpoint, indexed by day offset. */
export interface BackendRiskDay {
  /** rainfall I–D trigger, normalised to 0..1 */
  trigger: number;
  /** composite risk level from the backend (0..4), or null if unscored */
  riskLevel: number | null;
}

// Swappable backend-risk store: null until `useLiveRisk` fills it from
// GET /api/v1/hazards/{location}/latest (authenticated callers only). When
// present, `hazardDayContext` uses the backend rainfall trigger instead of the
// client heuristic; the public, unauthenticated demo keeps the heuristic.
let currentBackendRisk: BackendRiskDay[] | null = null;

export function getBackendRisk(): BackendRiskDay[] | null {
  return currentBackendRisk;
}

export function setBackendRisk(days: BackendRiskDay[] | null): void {
  currentBackendRisk = days && days.length > 0 ? days : null;
}

export const THRESHOLDS: Threshold[] = [
  { type: "flood", level: 4, source: "Ngưỡng mưa lũ quét lưu vực nhỏ — QĐ PCTT tỉnh (giả lập)" },
  { type: "landslide", level: 4, source: "Đường I–D Guzzetti hiệu chỉnh vùng núi phía Bắc (giả lập)" },
];

export const RESIDENTS: Resident[] = [
  { id: "r1", name: "Hộ mô phỏng A · Lò Thị M.", age: 71, occupation: "Người cao tuổi", villageId: "v1", cellId: "8-3", priority: 3 },
  { id: "r2", name: "Hộ mô phỏng B · Vàng A S.", age: 34, occupation: "Nông dân", villageId: "v1", cellId: "7-4", priority: 1 },
  { id: "r3", name: "Hộ mô phỏng C · Quàng V.", age: 46, occupation: "Người chăn nuôi", villageId: "v2", cellId: "5-6", priority: 2 },
  { id: "r4", name: "Hộ mô phỏng D · Cà Thị P.", age: 29, occupation: "Cán bộ y tế bản", villageId: "v2", cellId: "6-7", priority: 2 },
  { id: "r5", name: "Hộ mô phỏng E · Lường V.", age: 52, occupation: "Nông dân", villageId: "v4", cellId: "6-2", priority: 1 },
  { id: "r6", name: "Hộ mô phỏng F · Vừ A D.", age: 15, occupation: "Học sinh", villageId: "v3", cellId: "2-8", priority: 2 },
  { id: "r7", name: "Hộ mô phỏng G · Sùng Thị D.", age: 67, occupation: "Người cao tuổi", villageId: "v5", cellId: "7-9", priority: 3 },
  { id: "r8", name: "Hộ mô phỏng H · Tòng V.", age: 41, occupation: "Buôn bán", villageId: "v5", cellId: "6-9", priority: 1 },
];

export function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/** calibrated (uneven) 5-level bins — matches AC "not fixed even bins" */
const LEVEL_BREAKS = [0.22, 0.42, 0.6, 0.78];

export function levelFromScore(score01: number): HazardLevel {
  if (score01 >= LEVEL_BREAKS[3]) return 5;
  if (score01 >= LEVEL_BREAKS[2]) return 4;
  if (score01 >= LEVEL_BREAKS[1]) return 3;
  if (score01 >= LEVEL_BREAKS[0]) return 2;
  return 1;
}

export interface HazardDayContext {
  /** per-type rain trigger for the day, 0..1 */
  trigger: number;
  confidence: number;
  /** weight of the static terrain term for this hazard type */
  wTerrain: number;
}

/**
 * Shared per-day trigger math, used by both the coarse village grid and the
 * high-resolution raster so every surface scores identically. Flash flood uses
 * basin-integrated rainfall; landslide uses an intensity–duration (I–D)
 * trigger — never a shared curve (FR2). No LLM anywhere in this path.
 */
export function hazardDayContext(type: HazardType, dayOffset: number): HazardDayContext {
  const days = getForecastDays();
  const day = days.find((d) => d.offset === dayOffset) ?? days[0];

  let trigger: number;
  if (type === "flood") {
    // basin-integrated rainfall trigger, saturating near 160mm/day
    trigger = clamp01(day.rainfallMm / 160);
  } else {
    // I–D style: intensity relative to a duration-decaying threshold
    const idThreshold = 9 + 34 * Math.exp(-0.35 * (dayOffset + 1));
    trigger = clamp01((day.intensityMmH / idThreshold) * 0.8 + (day.rainfallMm / 220) * 0.4);
  }

  // Prefer the authoritative backend rainfall trigger when loaded (the offline-
  // trained bias-correction + I–D pipeline, served via /hazards). It is the
  // unified "Kích hoạt mưa" factor for both hazard types; the per-type terrain
  // susceptibility below stays client-side, so risk = susceptibility × trigger.
  const backend = getBackendRisk()?.[dayOffset];
  if (backend) trigger = backend.trigger;

  return {
    trigger,
    confidence: clamp01(day.confidence - 0.02 * dayOffset),
    wTerrain: type === "flood" ? 0.45 : 0.5,
  };
}

/**
 * FR2: per-cell hazard = static terrain susceptibility × per-type rain
 * trigger. Multiplicative, so calm days stay green and heavy-rain days light
 * up only the susceptible terrain.
 */
export function combineHazard(susceptibility: number, trigger: number): number {
  return clamp01(susceptibility * (0.15 + 0.85 * trigger));
}

export interface CellHazard {
  level: HazardLevel;
  score01: number;
  confidence: number;
  /** per-feature contribution breakdown for explainability (NFR7) */
  contributions: { terrain: number; trigger: number };
}

/** Deterministic per-type hazard score for a coarse village-grid cell. */
export function cellHazard(cell: Cell, type: HazardType, dayOffset: number): CellHazard {
  const terrain = cell.susceptibility[type];
  const { trigger, confidence } = hazardDayContext(type, dayOffset);
  const jitter = (noise(cell.row, cell.col, type === "flood" ? 5 : 91) - 0.5) * 0.06;
  const score01 = clamp01(combineHazard(terrain, trigger) + jitter);

  return {
    level: levelFromScore(score01),
    score01,
    confidence,
    contributions: { terrain, trigger },
  };
}

/** village hazard = the worst in-boundary cell of that village (safety bias) */
export function villageHazard(villageId: string, type: HazardType, dayOffset: number): HazardLevel {
  let worst: HazardLevel = 1;
  for (const cell of GRID) {
    if (cell.villageId !== villageId || !cell.inBoundary) continue;
    const level = cellHazard(cell, type, dayOffset).level;
    if (level > worst) worst = level;
  }
  return worst;
}

export function isVillageAlerting(villageId: string, type: HazardType, dayOffset: number): boolean {
  const threshold = THRESHOLDS.find((t) => t.type === type);
  if (!threshold) return false;
  return villageHazard(villageId, type, dayOffset) >= threshold.level;
}

/** 5→2 level projection for residents (FR4): 1–3 prepare, 4–5 go now */
export function residentLabel(level: HazardLevel): ResidentLabel {
  return level >= 4 ? "go-now" : "prepare";
}

export function residentExposure(resident: Resident, type: HazardType, dayOffset: number): HazardLevel {
  const cell = GRID.find((c) => c.id === resident.cellId);
  if (!cell) return 1;
  return cellHazard(cell, type, dayOffset).level;
}

export function triageScore(resident: Resident, type: HazardType, dayOffset: number): number {
  return residentExposure(resident, type, dayOffset) * resident.priority;
}

export interface LevelMeta {
  level: HazardLevel;
  color: string;
  label: string;
}

/** palette matched to the reference hazard-zoning map (Cấp 1 → Cấp 5) */
export const LEVEL_META: Record<HazardLevel, LevelMeta> = {
  1: { level: 1, color: "#7BD9A0", label: "Rất thấp" },
  2: { level: 2, color: "#F2DE6E", label: "Thấp" },
  3: { level: 3, color: "#E8A45C", label: "Trung bình" },
  4: { level: 4, color: "#EC8172", label: "Cao" },
  5: { level: 5, color: "#A78BD0", label: "Rất cao" },
};

export const HAZARD_META: Record<HazardType, { label: string; short: string }> = {
  flood: { label: "Lũ quét", short: "Mưa tích lũy lưu vực" },
  landslide: { label: "Sạt lở đất", short: "Cường độ – thời lượng (I–D)" },
};

export const RESIDENT_LABEL_META: Record<ResidentLabel, { title: string; color: string; hint: string }> = {
  prepare: { title: "CHUẨN BỊ", color: "#F2A93B", hint: "Theo dõi sát, sẵn sàng di dời" },
  "go-now": { title: "ĐI NGAY", color: "#F26B6B", hint: "Rời khỏi vùng nguy hiểm lập tức" },
};

/** 4-part action bulletin (FR7). Deadline shrinks as danger rises. */
export function getBulletin(type: HazardType, level: HazardLevel): Bulletin {
  const hazard = HAZARD_META[type].label.toLowerCase();
  const deadlineHours = level >= 5 ? 1 : level >= 4 ? 3 : level >= 3 ? 8 : 18;
  const severityMap: Record<HazardLevel, string> = {
    1: "Nguy cơ rất thấp, chủ yếu theo dõi.",
    2: "Nguy cơ thấp, giữ liên lạc với trưởng bản.",
    3: "Nguy cơ trung bình, chuẩn bị phương án di dời.",
    4: "Nguy cơ cao, có thể gây thiệt hại người và tài sản.",
    5: "Nguy cơ rất cao, đe dọa trực tiếp tính mạng.",
  };
  const actionMap: Record<ResidentLabel, string> = {
    prepare: `Kê cao tài sản, chuẩn bị đồ thiết yếu và sẵn sàng di dời khỏi khu vực ${hazard}.`,
    "go-now": `Di dời ngay người và gia súc đến điểm cao an toàn; tuyệt đối không qua ngầm, suối.`,
  };
  return {
    what: `Cảnh báo ${hazard} tại khu dân cư trong 3–7 ngày tới.`,
    severity: severityMap[level],
    action: actionMap[residentLabel(level)],
    deadlineHours,
  };
}

/** Occupation × Type × Level recommendation (FR11). Delegates shared occupations to domain matrix. */
export function getRecommendation(
  resident: Resident,
  type: HazardType,
  level: HazardLevel,
): { action: string; deadlineHours: number } {
  const label = residentLabel(level);
  const hazard = HAZARD_META[type].label.toLowerCase();
  const sharedOcc = DEMO_OCCUPATION_TO_SHARED[resident.occupation];
  if (sharedOcc) {
    const rec = getOccupationRecommendation(sharedOcc, toSharedHazard(type), toSharedTier(label));
    return { action: rec.whatToDo, deadlineHours: rec.deadlineHours };
  }

  const byOccupation: Record<string, Record<ResidentLabel, string>> = {
    "Người cao tuổi": {
      prepare: "Nhờ hàng xóm/ trưởng bản hỗ trợ, chuẩn bị thuốc men mang theo.",
      "go-now": "Được hộ ưu tiên hỗ trợ đưa đi trước; báo trưởng bản nếu cần khiêng cáng.",
    },
    "Cán bộ y tế bản": {
      prepare: "Chuẩn bị túi sơ cấp cứu di động, rà soát hộ ưu tiên trong bản.",
      "go-now": "Kích hoạt điểm sơ cứu tại nơi tập kết, theo sát người yếu thế.",
    },
    "Học sinh": {
      prepare: "Đi học theo nhóm, tránh đường qua suối; nghe hướng dẫn của thầy cô.",
      "go-now": "Ở yên tại điểm an toàn của trường/bản, không tự ý về nhà.",
    },
    "Buôn bán": {
      prepare: "Che chắn hàng hóa, di chuyển kho tạm khỏi vùng trũng.",
      "go-now": "Bỏ lại tài sản, ưu tiên đưa người đến nơi an toàn.",
    },
  };

  const fallback: Record<ResidentLabel, string> = {
    prepare: `Theo dõi cảnh báo ${hazard}, chuẩn bị sẵn sàng di dời.`,
    "go-now": "Di dời ngay đến điểm cao an toàn theo hướng dẫn của bản.",
  };

  const deadlineHours = level >= 5 ? 1 : level >= 4 ? 3 : level >= 3 ? 8 : 18;
  const action = (byOccupation[resident.occupation] ?? fallback)[label];
  return { action, deadlineHours };
}

export const ROLE_META: Record<import("./types").Role, { title: string; blurb: string }> = {
  admin: { title: "Quản trị hệ thống", blurb: "Toàn quyền · kiểm định mô hình & nguồn gốc dữ liệu" },
  officer: { title: "Cán bộ xã", blurb: "Toàn xã · bản đồ, ngưỡng cảnh báo, phân loại ưu tiên" },
  "village-head": { title: "Trưởng bản", blurb: "Phạm vi bản mình · phân loại & đôn đốc hộ dân" },
  resident: { title: "Người dân", blurb: "Cảnh báo cá nhân · làm gì, trước khi nào" },
};
