export type Role = "admin" | "commune_officer" | "village_head" | "resident";

export type HazardType = "flash_flood" | "landslide";

export type Tier = "prepare" | "go_now";

export type SafetyStatus = "unknown" | "safe" | "need_help";

export interface Village {
  id: string;
  name: string;
  /** WGS84 — null until a cited survey/geocode source exists (no estimates). */
  lat: number | null;
  lon: number | null;
  elevationM: number | null;
  coordinateStatus: "resolved" | "unresolved";
  hazardBaseline: "cao" | "chua_xac_dinh";
  floodHistory2024: boolean;
}

export type Occupation = "nong_dan" | "chan_nuoi" | "tai_xe" | "giao_vien" | "khong_co";

export type VulnerabilityReason = "gia_neo_don" | "khong_dien_thoai" | "mu_chu" | "sat_vung_nguy_co";

export interface ResidentSim {
  id: string;
  fullName: string;
  age: number;
  occupation: Occupation;
  priority: "normal" | "vulnerable";
  vulnerabilityReason: VulnerabilityReason[];
  villageId: string;
  lat: number;
  lon: number;
  simulated: true;
  // client-side only until schema §7 of docs/design/ui-ux-role-spec.md is approved
  safetyStatus: SafetyStatus;
  safetyStatusUpdatedAt: string | null;
  visitedByHeadAt: string | null;
}

export interface HazardDayLevel {
  villageId: string;
  hazardType: HazardType;
  forecastDay: number; // 0..6, 0 = today
  level: 1 | 2 | 3 | 4 | 5;
  confidence: number; // 0..1
}

export interface Alert {
  id: string;
  villageId: string;
  hazardType: HazardType;
  level: 1 | 2 | 3 | 4 | 5;
  tier: Tier;
  what: string;
  howDangerous: string;
  whatToDo: string;
  deadlineUtc: string;
  isCurrent: boolean;
}

export interface ThresholdConfig {
  hazardType: HazardType;
  villageId: string | "all";
  levelToTierCut: number; // level >= this => go_now
  note: string;
}

export interface HazardRunSummary {
  runId: string;
  forecastIssued: string;
  status: "queued" | "running" | "succeeded" | "failed";
  featureStackVersion: string;
  calibrationVersion: string;
}
