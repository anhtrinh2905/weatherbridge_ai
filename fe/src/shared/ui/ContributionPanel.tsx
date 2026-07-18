import { X } from "lucide-react";
import { getDominantLevel, getHazardLevel, getVillage } from "../domain/mockData";
import { useTranslation } from "../i18n/I18nProvider";
import { useLocalizedLabels } from "../i18n/useLocalizedLabels";
import type { HazardType } from "../domain/types";
import { HazardLevelBadge, ConfidenceBadge } from "./HazardBadge";

/**
 * FE side of the cell-inspect endpoint (AD-2: `GET /api/v1/hazard-layers/:layer_id/cell?x&y`).
 * No real multi-band contribution raster exists yet — the bars below are a mock feature
 * breakdown, shaped exactly like the real payload would be, so this panel is a drop-in target
 * once `be/src/ai/hazard/contracts.py` exists. Only rendered for admin/commune_officer
 * (detailLevel="full"); village_head/resident never see this (docs/design/ui-ux-role-spec.md §1.3).
 */

const MOCK_CONTRIBUTORS = [
  { key: "slope", weight: 0.28 },
  { key: "hand", weight: 0.24 },
  { key: "twi", weight: 0.16 },
  { key: "distance_road", weight: 0.1 },
  { key: "rain_trigger", weight: 0.22 },
] as const;

export function ContributionPanel({
  villageId,
  hazardType,
  day,
  onClose,
}: {
  villageId: string;
  hazardType: HazardType | "dominant";
  day: number;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const labels = useLocalizedLabels();
  const village = getVillage(villageId);
  const hazard = hazardType === "dominant" ? getDominantLevel(villageId, day) : getHazardLevel(villageId, hazardType, day);
  if (!village || !hazard) return null;

  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-surface-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">
            {t("contributionPanel.title", { village: village.name })}
          </p>
          <p className="mt-1 text-sm font-semibold text-fg-strong">
            {hazardType === "dominant" ? t("contributionPanel.dominantLabel") : labels.hazardType[hazardType]}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-3 hover:text-fg"
          aria-label={t("contributionPanel.closeAriaLabel")}
        >
          <X size={16} />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <HazardLevelBadge level={hazard.level} />
        <ConfidenceBadge value={hazard.confidence} />
      </div>

      <div className="mt-4 space-y-2.5">
        {MOCK_CONTRIBUTORS.map((c) => (
          <div key={c.key}>
            <div className="flex items-center justify-between text-xs text-muted">
              <span>{t(`contributionPanel.contributor.${c.key}`)}</span>
              <span className="font-mono">{Math.round(c.weight * 100)}%</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-surface-3">
              <div className="h-full rounded-full bg-accent" style={{ width: `${c.weight * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs leading-5 text-muted-2">{t("contributionPanel.footnote")}</p>
    </div>
  );
}
