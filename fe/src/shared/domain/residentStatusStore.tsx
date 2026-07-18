import { useMemo, useState, type ReactNode } from "react";
import { RESIDENTS } from "./mockData";
import type { SafetyStatus } from "./types";
import { StatusStoreContext, type ResidentStatus, type StatusStoreValue } from "./residentStatusContext";

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
