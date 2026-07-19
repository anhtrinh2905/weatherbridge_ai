import { getOccupationRecommendation } from "./recommendations";
import { RASTER_H, RASTER_W, sampleHazardAt } from "../hazard-raster";
import type { RasterPoint } from "../hazard-raster";
import type {
  Alert,
  HazardDayLevel,
  HazardRunSummary,
  HazardType,
  Occupation,
  ResidentSim,
  ThresholdConfig,
  Tier,
  Village,
} from "./types";

/**
 * Mock data layer for the WeatherBridge AI MVP frontend.
 *
 * There is no `hazard_run` / `hazard_layer` / `alert` / `village` / `resident_sim` /
 * `threshold_config` backend yet (see docs/architecture/architecture-weatherbridge-2026-07-18/
 * ARCHITECTURE-SPINE.md — the domain tables are specified but not implemented). This module
 * stands in for that API so the 4-role UI in docs/design/ui-ux-role-spec.md can be built and
 * demoed end to end; every exported function has the shape the real API would have, so wiring
 * a real `be` later means swapping the implementation, not the call sites.
 *
 * Village names: data/catalogs/muong_pon_villages_v1.json (22 bản). Coordinates stay
 * unresolved until a cited GPS/GIS source exists — never invent centroids for the map.
 * Resident names/ages/occupations are synthetic (is_exercise). Hazard levels/alerts below are
 * a deterministic PRNG, not a real forecast — clearly a mock, never presented as a live run.
 */

/** 22 bản — names from Wikipedia; lat/lon null until resolved (see catalog). */
export const VILLAGES: Village[] = [
  { id: "co-chay-1", name: "Cò Chạy 1", lat: null, lon: null, elevationM: null, coordinateStatus: "unresolved", hazardBaseline: "chua_xac_dinh", floodHistory2024: false },
  { id: "co-chay-2", name: "Cò Chạy 2", lat: null, lon: null, elevationM: null, coordinateStatus: "unresolved", hazardBaseline: "chua_xac_dinh", floodHistory2024: false },
  { id: "dinh-deo", name: "Đỉnh Đèo", lat: null, lon: null, elevationM: null, coordinateStatus: "unresolved", hazardBaseline: "chua_xac_dinh", floodHistory2024: false },
  { id: "huoi-chan-1", name: "Huổi Chan 1", lat: null, lon: null, elevationM: null, coordinateStatus: "unresolved", hazardBaseline: "chua_xac_dinh", floodHistory2024: false },
  { id: "huoi-chan-2", name: "Huổi Chan 2", lat: null, lon: null, elevationM: null, coordinateStatus: "unresolved", hazardBaseline: "chua_xac_dinh", floodHistory2024: false },
  { id: "huoi-ho", name: "Huổi Ho", lat: null, lon: null, elevationM: null, coordinateStatus: "unresolved", hazardBaseline: "chua_xac_dinh", floodHistory2024: false },
  { id: "huoi-meo", name: "Huổi Meo", lat: null, lon: null, elevationM: null, coordinateStatus: "unresolved", hazardBaseline: "chua_xac_dinh", floodHistory2024: false },
  { id: "huoi-nha", name: "Huổi Nhả", lat: null, lon: null, elevationM: null, coordinateStatus: "unresolved", hazardBaseline: "chua_xac_dinh", floodHistory2024: false },
  { id: "huoi-un", name: "Huổi Un", lat: null, lon: null, elevationM: null, coordinateStatus: "unresolved", hazardBaseline: "chua_xac_dinh", floodHistory2024: false },
  { id: "huoi-vang", name: "Huổi Vang", lat: null, lon: null, elevationM: null, coordinateStatus: "unresolved", hazardBaseline: "chua_xac_dinh", floodHistory2024: false },
  { id: "ket-tinh", name: "Kết Tinh", lat: null, lon: null, elevationM: null, coordinateStatus: "unresolved", hazardBaseline: "chua_xac_dinh", floodHistory2024: false },
  { id: "linh", name: "Lĩnh", lat: null, lon: null, elevationM: null, coordinateStatus: "unresolved", hazardBaseline: "cao", floodHistory2024: true },
  { id: "muong-muon-1", name: "Mường Mươn 1", lat: null, lon: null, elevationM: null, coordinateStatus: "unresolved", hazardBaseline: "chua_xac_dinh", floodHistory2024: false },
  { id: "muong-muon-2", name: "Mường Mươn 2", lat: null, lon: null, elevationM: null, coordinateStatus: "unresolved", hazardBaseline: "chua_xac_dinh", floodHistory2024: false },
  { id: "muong-pon-1", name: "Mường Pồn 1", lat: null, lon: null, elevationM: null, coordinateStatus: "unresolved", hazardBaseline: "cao", floodHistory2024: true },
  { id: "muong-pon-2", name: "Mường Pồn 2", lat: null, lon: null, elevationM: null, coordinateStatus: "unresolved", hazardBaseline: "cao", floodHistory2024: true },
  { id: "pa-cha", name: "Pá Chả", lat: null, lon: null, elevationM: null, coordinateStatus: "unresolved", hazardBaseline: "chua_xac_dinh", floodHistory2024: false },
  { id: "pu-cha", name: "Pú Chả", lat: null, lon: null, elevationM: null, coordinateStatus: "unresolved", hazardBaseline: "chua_xac_dinh", floodHistory2024: false },
  { id: "pu-mua", name: "Pú Múa", lat: null, lon: null, elevationM: null, coordinateStatus: "unresolved", hazardBaseline: "chua_xac_dinh", floodHistory2024: false },
  { id: "pung-giat-1", name: "Púng Giắt 1", lat: null, lon: null, elevationM: null, coordinateStatus: "unresolved", hazardBaseline: "chua_xac_dinh", floodHistory2024: false },
  { id: "pung-giat-2", name: "Púng Giắt 2", lat: null, lon: null, elevationM: null, coordinateStatus: "unresolved", hazardBaseline: "chua_xac_dinh", floodHistory2024: false },
  { id: "tin-toc", name: "Tin Tốc", lat: null, lon: null, elevationM: null, coordinateStatus: "unresolved", hazardBaseline: "cao", floodHistory2024: true },
];

const VILLAGE_NAME_TO_ID = new Map(VILLAGES.map((v) => [v.name, v.id]));

interface RawResident {
  id: string;
  fullName: string;
  age: number;
  occupation: ResidentSim["occupation"];
  priority: ResidentSim["priority"];
  vulnerabilityReason: ResidentSim["vulnerabilityReason"];
  villageName: string;
  lat: number;
  lon: number;
}

// Sampled from the real generated data/samples/households_muong_pon_sample.json (45 of 200
// households, ~5 per village, kept in the resident's original village + coordinates).
const RAW_RESIDENTS: RawResident[] = [
  // Demo resident login (dan@… → village_id muong-pon-1) maps to this UJ-1 farmer persona.
  { id: "HH-MUONGPON1-010", fullName: "Vàng A Quàng", age: 52, occupation: "nong_dan", priority: "vulnerable", vulnerabilityReason: ["mu_chu"], villageName: "Mường Pồn 1", lat: 21.596479, lon: 103.025285 },
  { id: "HH-MUONGPON1-028", fullName: "Thào Thị Chá", age: 62, occupation: "nong_dan", priority: "vulnerable", vulnerabilityReason: ["mu_chu", "sat_vung_nguy_co"], villageName: "Mường Pồn 1", lat: 21.585509, lon: 103.021049 },
  { id: "HH-MUONGPON1-003", fullName: "Nguyễn Văn Cường", age: 51, occupation: "chan_nuoi", priority: "normal", vulnerabilityReason: [], villageName: "Mường Pồn 1", lat: 21.587251, lon: 103.019041 },
  { id: "HH-MUONGPON1-013", fullName: "Sùng Thị Máy", age: 38, occupation: "tai_xe", priority: "normal", vulnerabilityReason: [], villageName: "Mường Pồn 1", lat: 21.58635, lon: 103.031488 },
  { id: "HH-MUONGPON1-005", fullName: "Nguyễn Thị Lan", age: 64, occupation: "chan_nuoi", priority: "normal", vulnerabilityReason: [], villageName: "Mường Pồn 1", lat: 21.5946, lon: 103.025937 },
  { id: "HH-MUONGPON2-030", fullName: "Quàng Thị Thu", age: 32, occupation: "nong_dan", priority: "vulnerable", vulnerabilityReason: ["mu_chu"], villageName: "Mường Pồn 2", lat: 21.5984, lon: 103.040548 },
  { id: "HH-MUONGPON2-027", fullName: "Thào A Súa", age: 28, occupation: "giao_vien", priority: "vulnerable", vulnerabilityReason: ["mu_chu"], villageName: "Mường Pồn 2", lat: 21.596151, lon: 103.047075 },
  { id: "HH-MUONGPON2-019", fullName: "Giàng A Lử", age: 35, occupation: "tai_xe", priority: "normal", vulnerabilityReason: [], villageName: "Mường Pồn 2", lat: 21.599583, lon: 103.034381 },
  { id: "HH-MUONGPON2-020", fullName: "Mùa Thị Say", age: 39, occupation: "giao_vien", priority: "normal", vulnerabilityReason: [], villageName: "Mường Pồn 2", lat: 21.597653, lon: 103.032893 },
  { id: "HH-MUONGPON2-028", fullName: "Lò Văn Dũng", age: 20, occupation: "chan_nuoi", priority: "normal", vulnerabilityReason: [], villageName: "Mường Pồn 2", lat: 21.588689, lon: 103.041729 },
  { id: "HH-LINH-020", fullName: "Nguyễn Văn Hùng", age: 43, occupation: "nong_dan", priority: "vulnerable", vulnerabilityReason: ["mu_chu"], villageName: "Lĩnh", lat: 21.581561, lon: 103.013455 },
  { id: "HH-LINH-010", fullName: "Giàng A Vảng", age: 45, occupation: "nong_dan", priority: "vulnerable", vulnerabilityReason: ["sat_vung_nguy_co"], villageName: "Lĩnh", lat: 21.582466, lon: 103.01133 },
  { id: "HH-LINH-006", fullName: "Lò Văn Inh", age: 43, occupation: "nong_dan", priority: "normal", vulnerabilityReason: [], villageName: "Lĩnh", lat: 21.584046, lon: 103.01914 },
  { id: "HH-LINH-023", fullName: "Mùa Thị Say", age: 44, occupation: "tai_xe", priority: "normal", vulnerabilityReason: [], villageName: "Lĩnh", lat: 21.580724, lon: 103.013942 },
  { id: "HH-LINH-001", fullName: "Trần Văn Sơn", age: 27, occupation: "nong_dan", priority: "normal", vulnerabilityReason: [], villageName: "Lĩnh", lat: 21.585728, lon: 103.013343 },
  { id: "HH-TINTOC-013", fullName: "Giàng A Chinh", age: 67, occupation: "nong_dan", priority: "vulnerable", vulnerabilityReason: ["mu_chu"], villageName: "Tin Tốc", lat: 21.609241, lon: 103.047241 },
  { id: "HH-TINTOC-022", fullName: "Moong Thị Hoa", age: 83, occupation: "khong_co", priority: "vulnerable", vulnerabilityReason: ["gia_neo_don"], villageName: "Tin Tốc", lat: 21.611328, lon: 103.053459 },
  { id: "HH-TINTOC-025", fullName: "Moong Văn Sơn", age: 32, occupation: "tai_xe", priority: "normal", vulnerabilityReason: [], villageName: "Tin Tốc", lat: 21.604032, lon: 103.051935 },
  { id: "HH-TINTOC-001", fullName: "Lê Thị Hà", age: 57, occupation: "giao_vien", priority: "normal", vulnerabilityReason: [], villageName: "Tin Tốc", lat: 21.608864, lon: 103.044601 },
  { id: "HH-TINTOC-019", fullName: "Vừ Thị Mỷ", age: 49, occupation: "nong_dan", priority: "normal", vulnerabilityReason: [], villageName: "Tin Tốc", lat: 21.610367, lon: 103.054178 },
  { id: "HH-HUOICHAN1-008", fullName: "Cút Văn Đôi", age: 64, occupation: "chan_nuoi", priority: "vulnerable", vulnerabilityReason: ["khong_dien_thoai"], villageName: "Huổi Chan 1", lat: 21.61657, lon: 103.006921 },
  { id: "HH-HUOICHAN1-001", fullName: "Vừ A Rua", age: 74, occupation: "khong_co", priority: "vulnerable", vulnerabilityReason: ["gia_neo_don"], villageName: "Huổi Chan 1", lat: 21.620374, lon: 103.012312 },
  { id: "HH-HUOICHAN1-012", fullName: "Quàng Văn Chinh", age: 31, occupation: "chan_nuoi", priority: "normal", vulnerabilityReason: [], villageName: "Huổi Chan 1", lat: 21.614051, lon: 103.015897 },
  { id: "HH-HUOICHAN1-003", fullName: "Moong Văn Sơn", age: 28, occupation: "tai_xe", priority: "normal", vulnerabilityReason: [], villageName: "Huổi Chan 1", lat: 21.618156, lon: 103.003254 },
  { id: "HH-HUOICHAN1-007", fullName: "Nguyễn Thị Hạnh", age: 46, occupation: "chan_nuoi", priority: "normal", vulnerabilityReason: [], villageName: "Huổi Chan 1", lat: 21.61665, lon: 103.002498 },
  { id: "HH-HUOICHAN2-002", fullName: "Lò Thị Kia", age: 80, occupation: "nong_dan", priority: "vulnerable", vulnerabilityReason: ["gia_neo_don"], villageName: "Huổi Chan 2", lat: 21.614376, lon: 103.001961 },
  { id: "HH-HUOICHAN2-011", fullName: "Quàng Thị Thu", age: 51, occupation: "nong_dan", priority: "vulnerable", vulnerabilityReason: ["mu_chu"], villageName: "Huổi Chan 2", lat: 21.615596, lon: 103.008406 },
  { id: "HH-HUOICHAN2-001", fullName: "Nguyễn Văn Hùng", age: 35, occupation: "nong_dan", priority: "normal", vulnerabilityReason: [], villageName: "Huổi Chan 2", lat: 21.615538, lon: 103.01027 },
  { id: "HH-HUOICHAN2-013", fullName: "Cút Văn Sáng", age: 38, occupation: "giao_vien", priority: "normal", vulnerabilityReason: [], villageName: "Huổi Chan 2", lat: 21.619969, lon: 103.003643 },
  { id: "HH-HUOICHAN2-010", fullName: "Sùng A Rùa", age: 49, occupation: "nong_dan", priority: "normal", vulnerabilityReason: [], villageName: "Huổi Chan 2", lat: 21.620385, lon: 103.004558 },
  { id: "HH-PUNGGIAT1-002", fullName: "Trần Văn Nam", age: 80, occupation: "nong_dan", priority: "vulnerable", vulnerabilityReason: ["gia_neo_don"], villageName: "Púng Giắt 1", lat: 21.566822, lon: 103.066897 },
  { id: "HH-PUNGGIAT1-005", fullName: "Lê Thị Thu", age: 63, occupation: "tai_xe", priority: "vulnerable", vulnerabilityReason: ["khong_dien_thoai"], villageName: "Púng Giắt 1", lat: 21.571644, lon: 103.054101 },
  { id: "HH-PUNGGIAT1-013", fullName: "Vừ A Tếnh", age: 54, occupation: "nong_dan", priority: "normal", vulnerabilityReason: [], villageName: "Púng Giắt 1", lat: 21.575991, lon: 103.061698 },
  { id: "HH-PUNGGIAT1-006", fullName: "Trần Văn Sơn", age: 19, occupation: "chan_nuoi", priority: "normal", vulnerabilityReason: [], villageName: "Púng Giắt 1", lat: 21.566688, lon: 103.064779 },
  { id: "HH-PUNGGIAT1-009", fullName: "Sùng Thị Chá", age: 35, occupation: "nong_dan", priority: "normal", vulnerabilityReason: [], villageName: "Púng Giắt 1", lat: 21.567627, lon: 103.056724 },
  { id: "HH-PUNGGIAT2-009", fullName: "Vừ A Dính", age: 47, occupation: "nong_dan", priority: "vulnerable", vulnerabilityReason: ["mu_chu"], villageName: "Púng Giắt 2", lat: 21.571142, lon: 103.066916 },
  { id: "HH-PUNGGIAT2-001", fullName: "Giàng A Vảng", age: 54, occupation: "nong_dan", priority: "vulnerable", vulnerabilityReason: ["mu_chu"], villageName: "Púng Giắt 2", lat: 21.571375, lon: 103.072332 },
  { id: "HH-PUNGGIAT2-015", fullName: "Lò Thị Piêng", age: 43, occupation: "nong_dan", priority: "normal", vulnerabilityReason: [], villageName: "Púng Giắt 2", lat: 21.567675, lon: 103.070706 },
  { id: "HH-PUNGGIAT2-010", fullName: "Cút Thị Mai", age: 37, occupation: "giao_vien", priority: "normal", vulnerabilityReason: [], villageName: "Púng Giắt 2", lat: 21.561306, lon: 103.073023 },
  { id: "HH-PUNGGIAT2-014", fullName: "Cút Thị Mai", age: 38, occupation: "chan_nuoi", priority: "normal", vulnerabilityReason: [], villageName: "Púng Giắt 2", lat: 21.561889, lon: 103.075633 },
  { id: "HH-DINHDEO-014", fullName: "Lầu A Tủa", age: 23, occupation: "tai_xe", priority: "vulnerable", vulnerabilityReason: ["mu_chu"], villageName: "Đỉnh Đèo", lat: 21.62624, lon: 103.024687 },
  { id: "HH-DINHDEO-001", fullName: "Nguyễn Thị Hạnh", age: 28, occupation: "nong_dan", priority: "vulnerable", vulnerabilityReason: ["mu_chu"], villageName: "Đỉnh Đèo", lat: 21.624924, lon: 103.020085 },
  { id: "HH-DINHDEO-007", fullName: "Sùng Thị Mai", age: 19, occupation: "chan_nuoi", priority: "normal", vulnerabilityReason: [], villageName: "Đỉnh Đèo", lat: 21.627964, lon: 103.02591 },
  { id: "HH-DINHDEO-005", fullName: "Lò Văn Inh", age: 24, occupation: "nong_dan", priority: "normal", vulnerabilityReason: [], villageName: "Đỉnh Đèo", lat: 21.623729, lon: 103.018018 },
  { id: "HH-DINHDEO-012", fullName: "Nguyễn Văn Bình", age: 61, occupation: "nong_dan", priority: "normal", vulnerabilityReason: [], villageName: "Đỉnh Đèo", lat: 21.633747, lon: 103.019492 },
];

export const RESIDENTS: ResidentSim[] = RAW_RESIDENTS.map((r) => ({
  id: r.id,
  fullName: r.fullName,
  age: r.age,
  occupation: r.occupation,
  priority: r.priority,
  vulnerabilityReason: r.vulnerabilityReason,
  villageId: VILLAGE_NAME_TO_ID.get(r.villageName) ?? "muong-pon-1",
  lat: r.lat,
  lon: r.lon,
  simulated: true,
  safetyStatus: "unknown",
  safetyStatusUpdatedAt: null,
  visitedByHeadAt: null,
}));

// --- deterministic pseudo-random, so the mock "forecast" is stable across renders/reloads ---
function seedHash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

const FORECAST_DAYS = [0, 1, 2, 3, 4, 5, 6, 7];

export function generateHazardLevels(): HazardDayLevel[] {
  const rows: HazardDayLevel[] = [];
  for (const village of VILLAGES) {
    for (const hazardType of ["flash_flood", "landslide"] as HazardType[]) {
      for (const day of FORECAST_DAYS) {
        const r = seedHash(`${village.id}:${hazardType}:${day}`);
        let base = village.hazardBaseline === "cao" ? 2.6 : 1.4;
        if (hazardType === "landslide") base += (village.elevationM ?? 0) > 1000 ? 0.9 : 0.2;
        if (hazardType === "flash_flood" && village.floodHistory2024) base += 0.8;
        const dayDecay = day * 0.12; // risk read as slightly less certain further out
        const raw = base + r * 2.2 - dayDecay;
        const level = Math.min(5, Math.max(1, Math.round(raw))) as 1 | 2 | 3 | 4 | 5;
        const confidence = Math.max(0.35, 0.92 - day * 0.08 - r * 0.1);
        rows.push({ villageId: village.id, hazardType, forecastDay: day, level, confidence });
      }
    }
  }
  return rows;
}

export const HAZARD_LEVELS = generateHazardLevels();

// Mirrors BOUNDARY_GEO_BOUNDS in shared/hazard-raster/villages.ts. Duplicated (not imported)
// because villages.ts imports VILLAGES from this file — importing back would create a cycle.
// Keep the two bounds in sync if the commune boundary bbox ever changes.
const RASTER_GEO_BOUNDS = {
  minLat: 21.474045782967035,
  maxLat: 21.700161717032966,
  minLon: 102.90104066923077,
  maxLon: 103.16895913076922,
};

function projectToRasterPoint(lat: number, lon: number): RasterPoint {
  return {
    x: Math.round(((lon - RASTER_GEO_BOUNDS.minLon) / (RASTER_GEO_BOUNDS.maxLon - RASTER_GEO_BOUNDS.minLon)) * (RASTER_W - 1)),
    y: Math.round(((RASTER_GEO_BOUNDS.maxLat - lat) / (RASTER_GEO_BOUNDS.maxLat - RASTER_GEO_BOUNDS.minLat)) * (RASTER_H - 1)),
  };
}

/**
 * Real hazard level for a village/day, sourced from the same raster engine the map uses
 * (shared/hazard-raster — live Open-Meteo + I–D trigger, see risk_scoring.py). Sampled at
 * every resident's real coordinates in that village and reduced to the worst cell (safety
 * bias, same rule the raster/village-grid scoring already uses elsewhere). Falls back to the
 * seeded mock only for the villages with no resident coordinates yet (13 of 22 — see
 * data/catalogs/muong_pon_villages_v1.json).
 */
export function getHazardLevel(villageId: string, hazardType: HazardType, day: number): HazardDayLevel | undefined {
  const villageResidents = getResidentsByVillage(villageId);
  if (villageResidents.length > 0) {
    let worst: HazardDayLevel | null = null;
    for (const resident of villageResidents) {
      const point = projectToRasterPoint(resident.lat, resident.lon);
      const sample = sampleHazardAt(point, hazardType, day).primary;
      if (!worst || sample.level > worst.level) {
        worst = { villageId, hazardType, forecastDay: day, level: sample.level, confidence: sample.confidence };
      }
    }
    if (worst) return worst;
  }
  return HAZARD_LEVELS.find((h) => h.villageId === villageId && h.hazardType === hazardType && h.forecastDay === day);
}

export function getDominantLevel(villageId: string, day: number) {
  const flood = getHazardLevel(villageId, "flash_flood", day);
  const landslide = getHazardLevel(villageId, "landslide", day);
  if (!flood && !landslide) return undefined;
  if (!flood) return landslide;
  if (!landslide) return flood;
  return flood.level >= landslide.level ? flood : landslide;
}

export const THRESHOLDS: ThresholdConfig[] = [
  { hazardType: "flash_flood", villageId: "all", levelToTierCut: 4, note: "Theo QĐ 18/2021/QĐ-TTg, cấp 4 trở lên = di chuyển ngay" },
  { hazardType: "landslide", villageId: "all", levelToTierCut: 4, note: "Theo QĐ 18/2021/QĐ-TTg, cấp 4 trở lên = di chuyển ngay" },
];

function tierFor(hazardType: HazardType, villageId: string, level: number): Tier | null {
  const cfg = THRESHOLDS.find((t) => t.hazardType === hazardType && (t.villageId === villageId || t.villageId === "all"));
  const cut = cfg?.levelToTierCut ?? 4;
  if (level >= cut) return "go_now";
  if (level >= 2) return "prepare";
  return null;
}

const ALERT_COPY: Record<HazardType, { what: string; dangerByLevel: (l: number) => string; actionByTier: Record<Tier, string> }> = {
  flash_flood: {
    what: "Mưa lớn tích luỹ có nguy cơ gây lũ quét trên suối đầu nguồn bản.",
    dangerByLevel: (l) => `Cấp ${l}/5 theo thang QĐ 18/2021/QĐ-TTg — chỉ báo rủi ro theo lượng mưa, không phải dự báo lũ quét chính xác.`,
    actionByTier: {
      prepare: "Thu dọn nông cụ, không ra khu vực gần suối, theo dõi bản tin tiếp theo.",
      go_now: "Di chuyển NGAY tới điểm tập kết an toàn của bản, mang giấy tờ tuỳ thân và vật dụng thiết yếu.",
    },
  },
  landslide: {
    what: "Địa hình dốc + mưa tiền đề có nguy cơ sạt lở đất.",
    dangerByLevel: (l) => `Cấp ${l}/5 theo thang QĐ 18/2021/QĐ-TTg — chỉ báo rủi ro, không phải dự báo sạt lở chính xác.`,
    actionByTier: {
      prepare: "Theo dõi vết nứt/nghiêng bất thường quanh nhà, chuẩn bị phương án di chuyển.",
      go_now: "Rời khỏi khu vực dốc/gần taluy NGAY, di chuyển tới điểm tập kết an toàn của bản.",
    },
  },
};

/** Deterministic mock rainfall (mm/day) for progressive-disclosure evidence — not a live forecast. */
export interface RainfallDayMock {
  villageId: string;
  forecastDay: number;
  rainfallMm: number;
  peakIntensityMmH: number;
}

export function generateRainfallForecast(): RainfallDayMock[] {
  const rows: RainfallDayMock[] = [];
  for (const village of VILLAGES) {
    for (const day of FORECAST_DAYS) {
      const r = seedHash(`${village.id}:rain:${day}`);
      const rainfallMm = Math.round((village.floodHistory2024 ? 35 : 12) + r * 55 - day * 4);
      const peakIntensityMmH = Math.round((8 + r * 22 - day * 1.5) * 10) / 10;
      rows.push({
        villageId: village.id,
        forecastDay: day,
        rainfallMm: Math.max(0, rainfallMm),
        peakIntensityMmH: Math.max(0, peakIntensityMmH),
      });
    }
  }
  return rows;
}

export const RAINFALL_FORECAST = generateRainfallForecast();

export function getRainfallForDay(villageId: string, day: number) {
  return RAINFALL_FORECAST.find((r) => r.villageId === villageId && r.forecastDay === day);
}

export function getVillage(id: string) {
  return VILLAGES.find((v) => v.id === id);
}

export function getResidentsByVillage(villageId: string) {
  return RESIDENTS.filter((r) => r.villageId === villageId);
}

/**
 * There is no real link yet between a Keycloak `resident` account and a `resident_sim` row
 * (that mapping would live in a real backend). Prefer a nông dân household in the village so
 * the demo login (UJ-1 farmer) always lands on occupation-personalized copy.
 */
export function getSelfResident(villageId: string) {
  const inVillage = getResidentsByVillage(villageId);
  return inVillage.find((r) => r.occupation === "nong_dan") ?? inVillage[0];
}

export function getHighestTierAlert(villageId: string): Alert | undefined {
  return getAlertForVillageDay(villageId, 0);
}

/** Build (or omit) an alert for a forecast day from mock hazard levels. */
export function getAlertForVillageDay(villageId: string, day: number): Alert | undefined {
  const candidates: Alert[] = [];
  const now = new Date();
  for (const hazardType of ["flash_flood", "landslide"] as HazardType[]) {
    const levelRow = getHazardLevel(villageId, hazardType, day);
    if (!levelRow) continue;
    const tier = tierFor(hazardType, villageId, levelRow.level);
    if (!tier) continue;
    const hoursAhead = tier === "go_now" ? 4 : 18;
    const deadline = new Date(now.getTime() + hoursAhead * 3600 * 1000);
    const copy = ALERT_COPY[hazardType];
    candidates.push({
      id: `AL-${villageId}-${hazardType}-d${day}`,
      villageId,
      hazardType,
      level: levelRow.level,
      tier,
      what: copy.what,
      howDangerous: copy.dangerByLevel(levelRow.level),
      whatToDo: copy.actionByTier[tier],
      deadlineUtc: deadline.toISOString(),
      isCurrent: day === 0,
    });
  }
  const goNow = candidates.find((a) => a.tier === "go_now");
  return goNow ?? candidates[0];
}

/** Overlay occupation-specific action wording (FR11) onto a village alert. */
export function personalizeAlert(alert: Alert, occupation: Occupation): Alert {
  const rec = getOccupationRecommendation(occupation, alert.hazardType, alert.tier);
  const deadline = new Date(Date.now() + rec.deadlineHours * 3600 * 1000);
  return {
    ...alert,
    whatToDo: rec.whatToDo,
    deadlineUtc: deadline.toISOString(),
  };
}

/** exposure x priority triage score, per FR18 */
export function triageScore(resident: ResidentSim): number {
  const dominant = getDominantLevel(resident.villageId, 0);
  const exposure = dominant?.level ?? 1;
  const priorityWeight = resident.priority === "vulnerable" ? 2 : 1;
  return exposure * priorityWeight;
}

export const HAZARD_RUN_MOCK: HazardRunSummary = {
  runId: "run-mock-0001",
  forecastIssued: new Date().toISOString(),
  status: "succeeded",
  featureStackVersion: "stack-20260718-1",
  calibrationVersion: "calib-20260718-1",
};

export const BACKTEST_REPORT_MOCK = {
  event: "Lũ quét Mường Pồn 25/7/2024",
  recallAtTau: 0.78,
  falsePositiveRate: 0.31,
  note: "Đánh giá nội bộ — không phải chứng nhận hiệu năng. n nhỏ (1 sự kiện, 4 bản), không dùng để huấn luyện (AD-10).",
};
