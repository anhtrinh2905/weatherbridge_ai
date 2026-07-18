import type { Tier } from "./types";

// 5-level scale colors follow QD 18/2021/QD-TTg (see docs/architecture/.../risk-rules-spec.md
// and docs/design/ui-ux-role-spec.md §1.2). This is a domain palette, kept separate from the
// UI chrome tokens in shared/styles/globals.css (see AD-4: be owns bin->color mapping; this is
// the FE mirror of that legend for the mock data layer). Colors have no language, so they stay
// here; the matching TEXT labels are locale-aware — see shared/i18n/useLocalizedLabels.ts.
export const HAZARD_LEVEL_COLORS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "#A7D8F0",
  2: "#FFF3A0",
  3: "#FFA94D",
  4: "#E03131",
  5: "#862E9C",
};

export const TIER_COLORS: Record<Tier, string> = {
  prepare: "#FFF3A0",
  go_now: "#E03131",
};
