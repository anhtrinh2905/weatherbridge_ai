import { HAZARD_LEVEL_COLORS, HAZARD_LEVEL_LABELS, TIER_COLORS, TIER_LABELS } from "../domain/labels";
import type { Tier } from "../domain/types";
import { cn } from "../lib/cn";

export function HazardLevelBadge({ level, compact = false }: { level: 1 | 2 | 3 | 4 | 5; compact?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-[#141414]",
        compact && "px-2 py-0.5",
      )}
      style={{ backgroundColor: HAZARD_LEVEL_COLORS[level] }}
    >
      {compact ? `Cấp ${level}` : HAZARD_LEVEL_LABELS[level]}
    </span>
  );
}

export function TierBadge({ tier, size = "md" }: { tier: Tier; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "px-2 py-0.5 text-xs", md: "px-3 py-1 text-sm", lg: "px-4 py-2 text-base" };
  return (
    <span
      className={cn("inline-flex items-center gap-2 rounded-full font-bold uppercase tracking-wide text-[#141414]", sizes[size])}
      style={{ backgroundColor: TIER_COLORS[tier] }}
    >
      {tier === "go_now" && <span className="h-2 w-2 animate-pulse rounded-full bg-[#141414]" aria-hidden />}
      {TIER_LABELS[tier]}
    </span>
  );
}

export function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const label = pct >= 70 ? "Cao" : pct >= 45 ? "Trung bình" : "Thấp";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-surface-2 px-2.5 py-1 text-xs text-muted">
      Độ tin cậy: <strong className="text-fg">{label}</strong> ({pct}%)
    </span>
  );
}
