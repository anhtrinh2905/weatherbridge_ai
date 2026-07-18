export type HazardType = "flood" | "landslide";

export type HazardLevel = 1 | 2 | 3 | 4 | 5;

export type ResidentLabel = "prepare" | "go-now";

export type Role = "admin" | "officer" | "village-head" | "resident";

export interface ForecastDay {
  /** 0 = today, offset in days */
  offset: number;
  label: string;
  /** basin-integrated rainfall for the day (mm) */
  rainfallMm: number;
  /** peak hourly intensity (mm/h) — feeds the landslide I–D trigger */
  intensityMmH: number;
  /** forecast confidence, decays with horizon */
  confidence: number;
  /** WMO fog proxy: daily min visibility (m); fog when < 1000 */
  visibilityM?: number;
  /** 2 m air temperature (°C) for dew-point depression */
  temperatureC?: number;
  /** 2 m dew point (°C) */
  dewPointC?: number;
}

/** WMO International Cloud Atlas: fog = visibility < 1000 m */
export interface FogSample {
  isFog: boolean;
  visibilityM: number | null;
  temperatureC: number | null;
  dewPointC: number | null;
  /** dew-point depression DPD = T − Td (°C); null if inputs missing */
  dpdC: number | null;
}

export interface Cell {
  id: string;
  row: number;
  col: number;
  villageId: string;
  /** true when the cell lies inside the commune boundary mask */
  inBoundary: boolean;
  /** static terrain susceptibility per type, 0..1 (deterministic) */
  susceptibility: Record<HazardType, number>;
}

export interface Village {
  id: string;
  name: string;
  headName: string;
}

export interface Resident {
  id: string;
  /** clearly synthetic display name — no real PII */
  name: string;
  age: number;
  occupation: string;
  villageId: string;
  cellId: string;
  /** support-priority weight, 1 (standard) .. 3 (priority household) */
  priority: number;
}

export interface Threshold {
  type: HazardType;
  /** hazard level at or above which a village alert is raised */
  level: HazardLevel;
  source: string;
}

export interface Bulletin {
  /** what is happening */
  what: string;
  /** how dangerous */
  severity: string;
  /** what to do */
  action: string;
  /** by when — hours from evaluation moment until the deadline */
  deadlineHours: number;
}
