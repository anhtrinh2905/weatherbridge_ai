import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { RESIDENTS } from "./mockData";
import type { SafetyStatus } from "./types";

/**
 * Client-side mock for resident_sim.safety_status / visited_by_head_at (see docs/design/
 * ui-ux-role-spec.md §7). No backend field exists yet for these two flows ("đã đến nhắc" /
 * "tự xác nhận an toàn") — until that schema change is approved, this in-memory store is the
 * ONLY place that state lives, and it resets on page reload. It is intentionally shaped like
 * the eventual API (`markVisited(residentId)`, `setSafetyStatus(residentId, status)`) so
 * swapping this provider for a TanStack Query mutation later does not change any consumer.
 */

export interface ResidentStatus {
  safetyStatus: SafetyStatus;
  safetyStatusUpdatedAt: string | null;
  visitedByHeadAt: string | null;
}

interface StatusStoreValue {
  getStatus: (residentId: string) => ResidentStatus;
  setSafetyStatus: (residentId: string, status: SafetyStatus) => void;
  markVisited: (residentId: string) => void;
}

const StatusStoreContext = createContext<StatusStoreValue | null>(null);

export function ResidentStatusProvider({ children }: { children: ReactNode }) {
  const [statuses, setStatuses] = useState<Record<string, ResidentStatus>>(() =>
    Object.fromEntries(
      RESIDENTS.map((r) => [
        r.id,
        { safetyStatus: "unknown" as SafetyStatus, safetyStatusUpdatedAt: null, visitedByHeadAt: null },
      ]),
    ),
  );

  const value = useMemo<StatusStoreValue>(
    () => ({
      getStatus: (residentId) =>
        statuses[residentId] ?? { safetyStatus: "unknown", safetyStatusUpdatedAt: null, visitedByHeadAt: null },
      setSafetyStatus: (residentId, status) =>
        setStatuses((prev) => ({
          ...prev,
          [residentId]: { ...prev[residentId], safetyStatus: status, safetyStatusUpdatedAt: new Date().toISOString() },
        })),
      markVisited: (residentId) =>
        setStatuses((prev) => ({
          ...prev,
          [residentId]: { ...prev[residentId], visitedByHeadAt: new Date().toISOString() },
        })),
    }),
    [statuses],
  );

  return <StatusStoreContext.Provider value={value}>{children}</StatusStoreContext.Provider>;
}

export function useResidentStatusStore() {
  const ctx = useContext(StatusStoreContext);
  if (!ctx) throw new Error("useResidentStatusStore must be used inside ResidentStatusProvider");
  return ctx;
}
