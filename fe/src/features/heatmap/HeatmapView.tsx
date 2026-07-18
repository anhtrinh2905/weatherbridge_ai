import { useState } from "react";
import { VillageMap } from "../../shared/ui/VillageMap";
import { ContributionPanel } from "../../shared/ui/ContributionPanel";
import { SafetyDisclaimer } from "../../shared/ui/SafetyDisclaimer";
import { DataFreshnessBadge } from "../../shared/ui/DataFreshnessBadge";
import { HAZARD_RUN_MOCK, VILLAGES, getDominantLevel, getHazardLevel } from "../../shared/domain/mockData";
import { HAZARD_LEVEL_LABELS, HAZARD_TYPE_LABELS } from "../../shared/domain/labels";
import { cn } from "../../shared/lib/cn";
import type { HazardType } from "../../shared/domain/types";

type Layer = HazardType | "dominant";
const LAYERS: { key: Layer; label: string }[] = [
  { key: "dominant", label: "Nguy hiểm cao nhất (gộp)" },
  { key: "flash_flood", label: HAZARD_TYPE_LABELS.flash_flood },
  { key: "landslide", label: HAZARD_TYPE_LABELS.landslide },
];
const DAYS = [0, 1, 2, 3, 4, 5, 6];

/** Full detail heatmap: admin + commune_officer (AD-2 cell-inspect included). */
export function HeatmapView() {
  const [layer, setLayer] = useState<Layer>("dominant");
  const [day, setDay] = useState(0);
  const [inspecting, setInspecting] = useState<string | null>(null);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {LAYERS.map((l) => (
            <button
              key={l.key}
              type="button"
              onClick={() => setLayer(l.key)}
              className={cn(
                "min-h-9 rounded-full border px-3 text-sm font-medium transition",
                layer === l.key ? "border-accent bg-accent/15 text-accent" : "border-border-strong text-muted hover:text-fg",
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
        <DataFreshnessBadge status="fresh" timestamp={HAZARD_RUN_MOCK.forecastIssued} />
      </div>

      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
        {DAYS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDay(d)}
            className={cn(
              "min-h-9 shrink-0 rounded-lg border px-3 text-xs font-medium",
              day === d ? "border-accent bg-accent/15 text-accent" : "border-border-strong text-muted hover:text-fg",
            )}
          >
            {d === 0 ? "Hôm nay" : `+${d} ngày`}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <VillageMap layer={layer} day={day} onVillageClick={(id) => setInspecting(id)} className="min-h-[420px]" />
        <div className="space-y-4">
          {inspecting ? (
            <ContributionPanel villageId={inspecting} hazardType={layer} day={day} onClose={() => setInspecting(null)} />
          ) : (
            <div className="rounded-2xl border border-dashed border-border-strong p-5 text-sm text-muted">
              Click vào 1 bản trên bản đồ để xem đóng góp đặc trưng (feature contribution).
            </div>
          )}
          <div className="rounded-2xl border border-border bg-surface-2 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Chú giải 5 cấp</p>
            <ul className="mt-2 space-y-1.5 text-xs">
              {([1, 2, 3, 4, 5] as const).map((lvl) => (
                <li key={lvl} className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: ["#A7D8F0", "#FFF3A0", "#FFA94D", "#E03131", "#862E9C"][lvl - 1] }}
                  />
                  <span className="text-muted">{HAZARD_LEVEL_LABELS[lvl]}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-surface-2 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Cấp hiện tại theo bản</p>
            <ul className="mt-2 divide-y divide-border-soft text-sm">
              {VILLAGES.map((v) => {
                const hazard = layer === "dominant" ? getDominantLevel(v.id, day) : getHazardLevel(v.id, layer, day);
                return (
                  <li key={v.id} className="flex items-center justify-between py-1.5">
                    <span className="text-fg">{v.name}</span>
                    <span className="text-muted">Cấp {hazard?.level ?? "-"}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <SafetyDisclaimer />
      </div>
    </div>
  );
}
