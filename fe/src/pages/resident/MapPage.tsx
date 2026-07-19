import { useMemo, useState } from "react";
import { BellRing, MapPin, Trash2 } from "lucide-react";
import { useAuth } from "../../features/auth/hooks";
import { getSelfResident, getVillage } from "../../shared/domain/mockData";
import { useTranslation } from "../../shared/i18n/I18nProvider";
import { HeatmapView } from "../../features/heatmap/HeatmapView";
import { MAX_WATCH_POINTS, samePoint, useWatchPoints } from "../../features/notifications/useWatchPoints";
import { PageHeader } from "../../shared/ui/PageHeader";
import { isInsideBoundary } from "../../shared/hazard-raster";
import type { RasterPoint } from "../../shared/hazard-raster";
import { pixelToLonLat, projectLatLonToRaster } from "../../shared/hazard-raster/villages";
import type { RasterMapMarker } from "../../shared/ui/RasterHazardMap";
import { cn } from "../../shared/lib/cn";

function formatCoords(lat: number, lon: number): string {
  return `${lat.toFixed(5)}°, ${lon.toFixed(5)}°`;
}

export function ResidentMapPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const villageId = user?.villageId ?? "muong-pon-1";
  const village = getVillage(villageId);
  const self = getSelfResident(villageId);

  const { points: watchPoints, add, remove, canAdd } = useWatchPoints(self?.id);
  const [selected, setSelected] = useState<RasterPoint | null>(null);

  const homePoint = useMemo<RasterPoint | null>(() => {
    if (!self) return null;
    const point = projectLatLonToRaster(self.lat, self.lon);
    return isInsideBoundary(point.x, point.y) ? point : null;
  }, [self]);

  const markers = useMemo<RasterMapMarker[]>(() => {
    const next: RasterMapMarker[] = [];
    if (homePoint) {
      next.push({ id: "resident-home", point: homePoint, label: t("resident.watchPoint.homeMarker"), variant: "home" });
    }
    watchPoints.forEach((point, index) => {
      next.push({
        id: point.id,
        point: { x: point.x, y: point.y },
        label: `${t("resident.watchPoint.customMarker")} ${index + 1}`,
        variant: "watch",
      });
    });
    return next;
  }, [homePoint, watchPoints, t]);

  const isHome = samePoint(selected, homePoint);
  const alreadyRegistered = Boolean(selected && watchPoints.some((point) => samePoint(point, selected)));
  const canRegister = Boolean(selected && !isHome && !alreadyRegistered && canAdd);
  const selectedCoords = selected ? pixelToLonLat(selected.x, selected.y) : null;

  const statusMessage = !selected
    ? t("resident.watchPoint.selectPrompt")
    : isHome
      ? t("resident.watchPoint.isHome")
      : alreadyRegistered
        ? t("resident.watchPoint.alreadyRegistered")
        : !canAdd
          ? t("resident.watchPoint.limitReached", { max: MAX_WATCH_POINTS })
          : t("resident.watchPoint.readyToRegister");

  return (
    <div>
      <PageHeader
        eyebrow={t("resident.village", { village: village?.name ?? "" })}
        title={t("resident.mapPageTitle")}
        description={t("resident.mapPageDescription")}
      />

      <section className="mb-4 rounded-2xl border border-border bg-surface-2 p-4 sm:p-5" aria-label={t("resident.watchPoint.title")}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
              <BellRing size={19} />
            </div>
            <div>
              <p className="text-sm font-semibold text-fg-strong">{t("resident.watchPoint.title")}</p>
              <p className="mt-1 max-w-xl text-sm leading-6 text-muted">
                {t("resident.watchPoint.notifyNote", { max: MAX_WATCH_POINTS })}
              </p>
            </div>
          </div>
          <span className="rounded-lg border border-border bg-surface px-3 py-1 text-xs font-semibold text-muted">
            {t("resident.watchPoint.count", { count: watchPoints.length, max: MAX_WATCH_POINTS })}
          </span>
        </div>

        <div className="mt-4 rounded-xl border border-border-soft bg-surface p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("resident.watchPoint.selectedPoint")}</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-sm text-fg-strong">
              {selectedCoords ? formatCoords(selectedCoords.lat, selectedCoords.lon) : "—"}
            </p>
            <button
              type="button"
              disabled={!canRegister}
              onClick={() => {
                if (selected) add(selected);
              }}
              className={cn(
                "inline-flex min-h-10 items-center gap-2 rounded-lg border px-4 text-sm font-semibold transition",
                canRegister
                  ? "border-accent bg-accent text-[#1A1206] hover:bg-accent/90"
                  : "cursor-not-allowed border-border bg-surface-3 text-muted",
              )}
            >
              <BellRing size={16} />
              {t("resident.watchPoint.register")}
            </button>
          </div>
          <p className="mt-2 text-sm text-muted">{statusMessage}</p>
        </div>

        <div className="mt-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
            <MapPin size={14} className="text-accent" />
            {t("resident.watchPoint.registeredList")}
          </div>
          {watchPoints.length === 0 ? (
            <p className="mt-2 text-sm text-muted">{t("resident.watchPoint.helper")}</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {watchPoints.map((point, index) => (
                <li
                  key={point.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border-soft bg-surface px-3 py-2"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-danger text-[0.7rem] font-bold text-white">
                      {index + 1}
                    </span>
                    <span className="font-mono text-sm text-fg-strong">{formatCoords(point.lat, point.lon)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(point.id)}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 text-sm font-semibold text-muted transition hover:bg-surface-3 hover:text-fg"
                    aria-label={t("resident.watchPoint.remove")}
                  >
                    <Trash2 size={15} />
                    {t("resident.watchPoint.remove")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <HeatmapView
        markers={markers}
        focusPoint={homePoint}
        focusRequest={homePoint ? 1 : 0}
        onSelectPoint={setSelected}
      />
    </div>
  );
}
