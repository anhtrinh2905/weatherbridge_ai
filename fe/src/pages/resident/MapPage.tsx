import { useAuth } from "../../features/auth/hooks";
import { useAddLocation, useResidents } from "../../features/operations/hooks";
import { getVillage } from "../../shared/domain/mockData";
import { useTranslation } from "../../shared/i18n/I18nProvider";
import { HeatmapView } from "../../features/heatmap/HeatmapView";
import { Button } from "../../shared/ui/Button";
import { PageHeader } from "../../shared/ui/PageHeader";

export function ResidentMapPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const residents = useResidents();
  const addLocation = useAddLocation();
  const villageId = user?.villageId ?? "muong-pon-1";
  const village = getVillage(villageId);
  const residentId = residents.data?.[0]?.id;
  const savedPointKey = "wba:resident-watch-point";
  const hasLocalWatchPoint = Boolean(localStorage.getItem(savedPointKey));

  return (
    <div>
      <PageHeader
        eyebrow={t("resident.village", { village: village?.name ?? "" })}
        title={t("resident.mapPageTitle")}
        description={t("resident.mapPageDescription")}
      />
      <HeatmapView
        watchPointSlot={({ selectedPoint, lonLat }) => (
          <div className="rounded-xl border border-border-soft bg-surface-3/60 p-3">
            <p className="text-sm font-semibold text-fg-strong">{t("resident.watchPoint.title")}</p>
            <p className="mt-1 text-xs text-muted">
              {selectedPoint && lonLat ? t("resident.watchPoint.selectedHelper") : t("resident.watchPoint.helper")}
            </p>
            {selectedPoint && lonLat ? (
              <>
                <p className="mt-2 font-mono text-xs text-muted">
                  {lonLat.lat.toFixed(5)}, {lonLat.lon.toFixed(5)}
                </p>
                <Button
                  className="mt-3 w-full px-3"
                  variant="secondary"
                  isLoading={addLocation.isPending}
                  onClick={() => {
                    const payload = {
                      location_type: "watch_point" as const,
                      latitude: lonLat.lat,
                      longitude: lonLat.lon,
                      label: t("resident.watchPoint.customMarker"),
                    };
                    if (residentId) {
                      addLocation.mutate({ residentId, payload });
                      return;
                    }
                    localStorage.setItem(savedPointKey, JSON.stringify(payload));
                  }}
                >
                  {residentId || !hasLocalWatchPoint ? t("resident.watchPoint.register") : t("resident.watchPoint.registered")}
                </Button>
              </>
            ) : null}
          </div>
        )}
      />
    </div>
  );
}
