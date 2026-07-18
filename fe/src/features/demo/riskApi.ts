import { apiClient } from "../../shared/lib/api-client";

/**
 * Client for the online hazard-risk endpoint (Epic 2 / M3). Mirrors the backend
 * `HazardRiskResponse`: per-day risk that the worker scores at ingest time
 * (bias-correction → I–D trigger → composite risk). Hand-written to match the
 * repo's feature-api convention; the generated types stay a reference artifact.
 */

export interface HazardRiskDay {
  date: string;
  rainfall_mm: number;
  peak_intensity_mm_h: number | null;
  corrected_rainfall_mm: number | null;
  bias_corrected: boolean | null;
  /** rainfall I–D exceedance ratio (≥1 = threshold crossed) */
  id_exceedance: number | null;
  /** rainfall trigger level, 0..4 */
  trigger_level: number | null;
  /** composite risk level (trigger × terrain), 0..4 */
  risk_level: number | null;
  risk_name: string | null;
}

export interface HazardRiskResponse {
  location_code: string;
  latitude: number;
  longitude: number;
  source: string;
  computed_at: string;
  days: HazardRiskDay[];
}

export function fetchLatestHazardRisk(locationCode: string): Promise<HazardRiskResponse> {
  return apiClient.get<HazardRiskResponse>(`/hazards/${locationCode}/latest`);
}
