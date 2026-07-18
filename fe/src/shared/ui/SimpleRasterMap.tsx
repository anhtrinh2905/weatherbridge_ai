import { useMemo, useState } from "react";
import { getResidentsByVillage } from "../domain/mockData";
import { isInsideBoundary, sampleHazardAt } from "../hazard-raster";
import type { RasterLayer, RasterPoint } from "../hazard-raster";
import { RASTER_VILLAGES, projectLatLonToRaster } from "../hazard-raster/villages";
import { useTranslation } from "../i18n/I18nProvider";
import { useLocalizedLabels } from "../i18n/useLocalizedLabels";
import { cn } from "../lib/cn";
import { RasterHazardMap, type RasterMapMarker } from "./RasterHazardMap";
import { RasterInspectionPanel } from "./RasterInspectionPanel";

const LEVEL_COLORS = ["#3DD6A4", "#FDE047", "#FB923C", "#FB7185", "#A855F7"];

/**
 * Resident/village_head view onto the same raster used by the admin/officer heatmap.
 * It keeps the role-specific chrome light, but exposes the same cell inspection details.
 */
export function SimpleRasterMap({
  villageId,
  day,
  layer = "dominant",
  selectedResidentId,
  enableWatchPoint = false,
  className,
}: {
  villageId: string;
  day: number;
  layer?: RasterLayer;
  selectedResidentId?: string | null;
  enableWatchPoint?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const labels = useLocalizedLabels();
  const villageEntry = RASTER_VILLAGES.find((item) => item.village.id === villageId) ?? null;
  const residents = getResidentsByVillage(villageId);
  const selectedResident = selectedResidentId
    ? residents.find((resident) => resident.id === selectedResidentId) ?? null
    : null;
  const [selected, setSelected] = useState<RasterPoint | null>(null);
  const [selectedVillageId, setSelectedVillageId] = useState<string | null>(villageId);
  const [watchedPoint, setWatchedPoint] = useState<RasterPoint | null>(null);

  const residentPoint = useMemo(() => {
    if (!selectedResident) return null;
    const point = projectLatLonToRaster(selectedResident.lat, selectedResident.lon);
    return isInsideBoundary(point.x, point.y) ? point : null;
  }, [selectedResident]);

  const markers = useMemo<RasterMapMarker[]>(() => {
    const nextMarkers: RasterMapMarker[] = [];
    if (selectedResident && residentPoint) {
      nextMarkers.push({ id: selectedResident.id, point: residentPoint, label: t("resident.watchPoint.homeMarker") });
    }
    if (watchedPoint) {
      nextMarkers.push({ id: "resident-watch-point", point: watchedPoint, label: t("resident.watchPoint.customMarker") });
    }
    return nextMarkers;
  }, [residentPoint, selectedResident, t, watchedPoint]);

  const activeSelected = selected ?? residentPoint;
  const activeSelectedVillageId = selected ? selectedVillageId : villageId;
  const selectedVillage = RASTER_VILLAGES.find((entry) => entry.village.id === activeSelectedVillageId) ?? villageEntry;
  const inspection = useMemo(
    () => (activeSelected ? sampleHazardAt(activeSelected, layer, day) : null),
    [activeSelected, day, layer],
  );
  const canRegisterWatchPoint = Boolean(enableWatchPoint && activeSelected && !samePoint(activeSelected, residentPoint));
  const isSelectedWatchPoint = Boolean(activeSelected && samePoint(activeSelected, watchedPoint));

  const map = (
    <RasterHazardMap
      layer={layer}
      day={day}
      selected={activeSelected}
      selectedVillageId={activeSelectedVillageId ?? villageId}
      showVillageMarkers={false}
      focusPoint={residentPoint ?? villageEntry?.point ?? null}
      focusRequest={1}
      markers={markers}
      onSelect={(point, nextVillageId) => {
        setSelected(point);
        setSelectedVillageId(nextVillageId ?? villageId);
      }}
      className={className}
    />
  );

  return (
    <div className="space-y-3">
      {enableWatchPoint ? (
        <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
          {map}
          <aside className="rounded-2xl border border-border bg-surface-2 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("heatmap.legend5Levels")}</p>
            <ul className="mt-3 space-y-2">
              {([1, 2, 3, 4, 5] as const).map((level) => (
                <li key={level} className="flex items-center gap-2 text-sm">
                  <span className="size-3.5 shrink-0 rounded-sm" style={{ backgroundColor: LEVEL_COLORS[level - 1] }} />
                  <span className="text-muted">{labels.hazardLevel[level]}</span>
                </li>
              ))}
            </ul>

            <div className="mt-5 border-t border-border-soft pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                {t("resident.watchPoint.title")}
              </p>
              <p className="mt-2 text-xs text-muted">
                {watchedPoint ? t("resident.watchPoint.active") : t("resident.watchPoint.helper")}
              </p>
              <div className="mt-3 flex flex-col gap-2">
                <button
                  type="button"
                  disabled={!canRegisterWatchPoint}
                  onClick={() => activeSelected && setWatchedPoint(activeSelected)}
                  className={cn(
                    "min-h-10 rounded-lg border px-3 text-sm font-semibold transition",
                    canRegisterWatchPoint
                      ? "border-accent bg-accent/15 text-fg-strong hover:bg-accent/25"
                      : "cursor-not-allowed border-border bg-surface-3 text-muted",
                  )}
                >
                  {isSelectedWatchPoint ? t("resident.watchPoint.registered") : t("resident.watchPoint.register")}
                </button>
                {watchedPoint && (
                  <button
                    type="button"
                    onClick={() => setWatchedPoint(null)}
                    className="min-h-10 rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-muted transition hover:bg-surface-3 hover:text-fg"
                  >
                    {t("resident.watchPoint.remove")}
                  </button>
                )}
              </div>
            </div>
          </aside>
        </div>
      ) : (
        map
      )}
      <RasterInspectionPanel inspection={inspection} selectedVillage={selectedVillage} />
    </div>
  );
}

function samePoint(left: RasterPoint | null, right: RasterPoint | null) {
  return Boolean(left && right && left.x === right.x && left.y === right.y);
}
