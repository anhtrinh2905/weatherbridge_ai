import { useEffect, useState } from "react";
import { keycloak } from "../auth/keycloak";
import { setBackendRisk, type BackendRiskDay } from "./data";
import { fetchLatestHazardRisk, type HazardRiskResponse } from "./riskApi";

/**
 * Loads online hazard risk from `GET /api/v1/hazards/{location}/latest` and
 * feeds it into the demo's risk store. The endpoint is authenticated, while the
 * public `/demo` page is not, so this only calls the backend when the user is
 * signed in and silently keeps the client heuristic otherwise (mirrors
 * `useLiveForecast`'s simulated fallback). Same location, same 5-level scale.
 */

const LOCATION_CODE = "muong-pon";
// Matches the backend's TRIGGER_SATURATION: ratio ≥ 2 → full trigger strength.
const TRIGGER_SATURATION = 2.0;

/** Pure mapping from the API response to the demo's per-offset risk store. */
export function mapHazardRiskToBackendDays(response: HazardRiskResponse): BackendRiskDay[] {
  return response.days.map((day) => ({
    trigger:
      day.id_exceedance != null
        ? Math.min(Math.max(day.id_exceedance, 0) / TRIGGER_SATURATION, 1)
        : 0,
    riskLevel: day.risk_level,
  }));
}

export interface LiveRiskStatus {
  /** "backend" once real risk is loaded; "heuristic" before/on failure */
  source: "backend" | "heuristic";
  fetchedAt: Date | null;
}

export function useLiveRisk(): LiveRiskStatus {
  const [status, setStatus] = useState<LiveRiskStatus>({
    source: "heuristic",
    fetchedAt: null,
  });

  useEffect(() => {
    // Unauthenticated demo: skip the auth-only endpoint, keep the heuristic.
    if (!keycloak.authenticated) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetchLatestHazardRisk(LOCATION_CODE);
        const days = mapHazardRiskToBackendDays(response);
        if (cancelled || days.length === 0) return;
        setBackendRisk(days);
        setStatus({ source: "backend", fetchedAt: new Date() });
      } catch {
        // not signed in / offline / not yet ingested: keep the heuristic
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}
