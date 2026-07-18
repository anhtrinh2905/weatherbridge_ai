import { Mountain, Waves } from "lucide-react";
import type { ReactNode } from "react";
import type { HazardType } from "../domain/types";
import { sampleHazardAt, type RasterSample } from "../hazard-raster";
import { RASTER_VILLAGES } from "../hazard-raster/villages";
import { useTranslation } from "../i18n/I18nProvider";
import { useLocalizedLabels } from "../i18n/useLocalizedLabels";

export function RasterInspectionPanel({
  inspection,
  selectedVillage,
  actions,
}: {
  inspection: ReturnType<typeof sampleHazardAt> | null;
  selectedVillage: (typeof RASTER_VILLAGES)[number] | null;
  actions?: ReactNode;
}) {
  const { t } = useTranslation();
  const labels = useLocalizedLabels();

  if (!inspection) {
    return (
      <div className="rounded-2xl border border-dashed border-border-strong p-5 text-sm text-muted">
        {t("heatmap.emptyInspection")}
      </div>
    );
  }

  const isDominant = inspection.layer === "dominant";
  const leadingLabel = labels.hazardType[inspection.dominantSource];

  return (
    <section className="rounded-2xl border border-border bg-surface-2 p-4" aria-live="polite">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("heatmap.selectedPoint")}</p>
      <div className="mt-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-fg-strong">
            {t("heatmap.levelWithLabel", {
              level: inspection.primary.level,
              label: labels.hazardLevel[inspection.primary.level],
            })}
          </p>
          {selectedVillage && (
            <p className="mt-1 text-xs text-muted">
              {t("heatmap.nearestVillage", { village: selectedVillage.village.name })}
              {selectedVillage.located ? "" : ` (${t("heatmap.unlocated")})`}
            </p>
          )}
        </div>
        <span className="rounded-full border border-border-strong px-2 py-1 font-mono text-xs text-muted">
          {Math.round(inspection.primary.score01 * 100)}%
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted">{t("heatmap.elevation")}</dt>
          <dd className="font-semibold text-fg-strong">{inspection.primary.elevationM} m</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">{t("heatmap.slope")}</dt>
          <dd className="font-semibold text-fg-strong">{inspection.primary.slopeDeg}°</dd>
        </div>
      </dl>

      {isDominant ? (
        <>
          <p className="mt-4 text-sm text-muted">
            {t("heatmap.dominantAtPoint")} <span className="font-semibold text-fg">{leadingLabel}</span>.
          </p>
          <div className="mt-3 space-y-3">
            <HazardBreakdown
              type="flash_flood"
              sample={inspection.hazards.flash_flood}
              leading={inspection.dominantSource === "flash_flood"}
            />
            <HazardBreakdown
              type="landslide"
              sample={inspection.hazards.landslide}
              leading={inspection.dominantSource === "landslide"}
            />
          </div>
        </>
      ) : (
        <div className="mt-4">
          <HazardBreakdown type={inspection.layer as HazardType} sample={inspection.primary} />
        </div>
      )}

      {actions && <div className="mt-4 border-t border-border-soft pt-4">{actions}</div>}
    </section>
  );
}

function HazardBreakdown({ type, sample, leading = false }: { type: HazardType; sample: RasterSample; leading?: boolean }) {
  const { t } = useTranslation();
  const labels = useLocalizedLabels();
  const Icon = type === "flash_flood" ? Waves : Mountain;

  return (
    <div className="rounded-lg border border-border-soft p-3">
      <div className="flex items-center justify-between gap-2 text-sm font-semibold text-fg-strong">
        <span className="inline-flex items-center gap-1.5">
          <Icon size={15} />
          {labels.hazardType[type]}
          {leading ? ` · ${t("heatmap.leadingSuffix")}` : ""}
        </span>
        <span>{t("heatmap.levelValue", { level: sample.level })}</span>
      </div>
      <div className="mt-3 space-y-2">
        <ContributionBar label={t("heatmap.terrain")} value={sample.contributions.terrain} />
        <ContributionBar label={t("heatmap.rainTrigger")} value={sample.contributions.trigger} />
      </div>
      <p className="mt-2 text-xs text-muted">
        {t("heatmap.confidencePercent", { percent: Math.round(sample.confidence * 100) })}
      </p>
    </div>
  );
}

function ContributionBar({ label, value }: { label: string; value: number }) {
  const percentage = Math.round(value * 100);

  return (
    <div>
      <div className="flex justify-between text-xs text-muted">
        <span>{label}</span>
        <span className="font-mono text-fg">{percentage}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div className="h-full rounded-full bg-positive/80" style={{ width: `${Math.min(100, percentage)}%` }} />
      </div>
    </div>
  );
}
