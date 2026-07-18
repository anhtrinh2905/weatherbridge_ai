import { createContext, useContext } from "react";
import type { SafetyStatus } from "./types";

export interface ResidentStatus {
  safetyStatus: SafetyStatus;
  safetyStatusUpdatedAt: string | null;
  visitedByHeadAt: string | null;
}

export interface StatusStoreValue {
  getStatus: (residentId: string) => ResidentStatus;
  setSafetyStatus: (residentId: string, status: SafetyStatus) => void;
  markVisited: (residentId: string) => void;
}

export const StatusStoreContext = createContext<StatusStoreValue | null>(null);

export function useResidentStatusStore() {
  const ctx = useContext(StatusStoreContext);
  if (!ctx) throw new Error("useResidentStatusStore must be used inside ResidentStatusProvider");
  return ctx;
}
