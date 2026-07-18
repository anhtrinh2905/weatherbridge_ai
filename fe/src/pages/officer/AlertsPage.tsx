import { Download } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { PageHeader, Card } from "../../shared/ui/PageHeader";
import { Button } from "../../shared/ui/Button";
import { ALERTS, VILLAGES } from "../../shared/domain/mockData";
import { useTranslation } from "../../shared/i18n/I18nProvider";
import { useLocalizedLabels } from "../../shared/i18n/useLocalizedLabels";
import { HazardLevelBadge, TierBadge } from "../../shared/ui/HazardBadge";
import { Countdown } from "../../shared/ui/Countdown";

export function OfficerAlertsPage() {
  const { t } = useTranslation();
  const labels = useLocalizedLabels();
  const [params] = useSearchParams();
  const villageFilter = params.get("village");
  const alerts = villageFilter ? ALERTS.filter((a) => a.villageId === villageFilter) : ALERTS;

  return (
    <div>
      <PageHeader
        eyebrow={t("role.commune_officer")}
        title={t("officer.alerts.title")}
        description={
          villageFilter
            ? t("officer.alerts.filteredByVillage", { village: VILLAGES.find((v) => v.id === villageFilter)?.name ?? "" })
            : t("officer.alerts.wholeCommune")
        }
        actions={
          <Button variant="secondary" onClick={() => window.alert(t("officer.alerts.exportNotice"))}>
            <Download size={16} /> {t("officer.alerts.exportButton")}
          </Button>
        }
      />
      <Card>
        <ul className="divide-y divide-border-soft">
          {alerts.map((alert) => {
            const village = VILLAGES.find((v) => v.id === alert.villageId);
            return (
              <li key={alert.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium text-fg">
                    {village?.name} — {labels.hazardType[alert.hazardType]}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    <Countdown deadlineUtc={alert.deadlineUtc} />
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <HazardLevelBadge level={alert.level} compact />
                  <TierBadge tier={alert.tier} size="sm" />
                </div>
              </li>
            );
          })}
          {alerts.length === 0 && <p className="py-3 text-sm text-muted">{t("officer.alerts.empty")}</p>}
        </ul>
      </Card>
    </div>
  );
}
