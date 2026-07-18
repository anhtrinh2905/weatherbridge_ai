import { AlertTriangle, CheckCircle2, MapPinned, ShieldAlert } from "lucide-react";
import { PageHeader, Card } from "../../shared/ui/PageHeader";
import { useAuth } from "../../features/auth/hooks";
import { VillageMap } from "../../shared/ui/VillageMap";
import { SafetyDisclaimer } from "../../shared/ui/SafetyDisclaimer";
import { DataFreshnessBadge } from "../../shared/ui/DataFreshnessBadge";
import { getDominantLevel, getResidentsByVillage, getVillage, HAZARD_RUN_MOCK } from "../../shared/domain/mockData";
import { useTranslation } from "../../shared/i18n/I18nProvider";
import { useLocalizedLabels } from "../../shared/i18n/useLocalizedLabels";
import { useResidentStatusStore } from "../../shared/domain/residentStatusStore";

export function VillageHeadMapPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const labels = useLocalizedLabels();
  const villageId = user?.villageId ?? "muong-pon-1";
  const village = getVillage(villageId);
  const dominant = getDominantLevel(villageId, 0);
  const residents = getResidentsByVillage(villageId);
  const { getStatus } = useResidentStatusStore();
  const needHelpCount = residents.filter((r) => getStatus(r.id).safetyStatus === "need_help").length;
  const pendingVisits = residents.filter((r) => r.priority === "vulnerable" && !getStatus(r.id).visitedByHeadAt).length;

  return (
    <div>
      <PageHeader
        eyebrow={t("role.village_head")}
        title={t("villageHead.map.title", { village: village?.name ?? t("villageHead.map.unknownVillage") })}
        description={t("villageHead.map.description")}
        actions={<DataFreshnessBadge status="fresh" timestamp={HAZARD_RUN_MOCK.forecastIssued} />}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="space-y-4">
          <VillageMap layer="dominant" day={0} detailLevel="simple" focusVillageId={villageId} className="min-h-[520px] rounded-lg" />
          <SafetyDisclaimer />
        </section>

        <aside className="space-y-4">
          <Card className="rounded-lg">
            <div className="flex items-center gap-3">
              <MapPinned className="text-accent" size={22} aria-hidden />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("villageHead.map.scope")}</p>
                <h2 className="mt-1 text-lg font-semibold text-fg-strong">
                  {village?.name ?? t("villageHead.map.myVillageFallback")}
                </h2>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-border-soft bg-surface p-3">
                <dt className="text-xs text-muted">{t("villageHead.map.householdsInVillage")}</dt>
                <dd className="mt-1 text-xl font-bold text-fg-strong">{residents.length}</dd>
              </div>
              <div className="rounded-lg border border-border-soft bg-surface p-3">
                <dt className="text-xs text-muted">{t("villageHead.map.elevation")}</dt>
                <dd className="mt-1 text-xl font-bold text-fg-strong">{village?.elevationM ?? "-"}m</dd>
              </div>
            </dl>
          </Card>

          <Card className="rounded-lg">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("villageHead.map.todayLevel")}</p>
            <div className="mt-3 flex items-center gap-3">
              {dominant && dominant.level >= 4 ? (
                <ShieldAlert className="text-danger" size={28} aria-hidden />
              ) : dominant && dominant.level >= 2 ? (
                <AlertTriangle className="text-accent" size={28} aria-hidden />
              ) : (
                <CheckCircle2 className="text-positive" size={28} aria-hidden />
              )}
              <div>
                <p className="text-xl font-bold text-fg-strong">
                  {dominant ? labels.hazardLevel[dominant.level] : t("villageHead.map.noData")}
                </p>
                {dominant && (
                  <p className="text-sm text-muted">
                    {t("villageHead.map.confidence", { percent: Math.round(dominant.confidence * 100) })}
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card className="rounded-lg">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("villageHead.map.legendTitle")}</p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-positive" />
                <span className="text-muted">{t("villageHead.map.legendSafe")}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-[#FFF3A0]" />
                <span className="text-muted">{t("villageHead.map.legendPrepare")}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-[#E03131]" />
                <span className="text-muted">{t("villageHead.map.legendGoNow")}</span>
              </div>
            </div>
          </Card>

          <Card className="rounded-lg">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("villageHead.map.actionsTitle")}</p>
            <p className="mt-2 text-sm text-muted">
              {needHelpCount > 0
                ? t("villageHead.map.needHelpNotice", { count: needHelpCount })
                : t("villageHead.map.pendingVisitsNotice", { count: pendingVisits })}
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
