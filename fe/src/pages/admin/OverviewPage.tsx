import { PageHeader, Card } from "../../shared/ui/PageHeader";
import { SafetyDisclaimer } from "../../shared/ui/SafetyDisclaimer";
import { Spinner } from "../../shared/ui/Spinner";
import { Alert } from "../../shared/ui/Alert";
import { ALERTS, VILLAGES } from "../../shared/domain/mockData";
import { TierBadge } from "../../shared/ui/HazardBadge";
import { useTranslation } from "../../shared/i18n/I18nProvider";
import { useLocalizedLabels } from "../../shared/i18n/useLocalizedLabels";
import { useForecastFreshness, useJobStats } from "../../features/admin/hooks";
import { Link } from "react-router-dom";

export function AdminOverviewPage() {
  const { t } = useTranslation();
  const labels = useLocalizedLabels();
  const stats = useJobStats();
  const freshness = useForecastFreshness();

  return (
    <div>
      <PageHeader
        eyebrow={t("role.admin")}
        title={t("admin.overview.title")}
        description={t("admin.overview.description")}
      />
      <SafetyDisclaimer />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-wide text-muted">{t("admin.overview.jobsPending")}</p>
          <p className="mt-2 text-3xl font-bold text-accent">
            {stats.data ? stats.data.queued + stats.data.running : stats.isPending ? "—" : "?"}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-muted">{t("admin.overview.jobsSucceeded")}</p>
          <p className="mt-2 text-3xl font-bold text-positive">{stats.data?.succeeded ?? (stats.isPending ? "—" : "?")}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-muted">{t("admin.overview.jobsFailed")}</p>
          <p className="mt-2 text-3xl font-bold text-danger">{stats.data?.failed ?? (stats.isPending ? "—" : "?")}</p>
        </Card>
      </div>
      {stats.isError && <Alert variant="error">{t("admin.overview.jobsLoadError", { error: stats.error.message })}</Alert>}

      <Card className="mt-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-fg-strong">{t("admin.overview.forecastFreshness")}</p>
          <Link to="/admin/pipeline" className="text-sm text-accent hover:underline">
            {t("admin.overview.viewJobQueue")}
          </Link>
        </div>
        {freshness.isPending && <div className="mt-3"><Spinner label={t("admin.overview.loadingForecastStatus")} /></div>}
        {freshness.isError && (
          <Alert variant="error">{t("admin.overview.forecastLoadError", { error: freshness.error.message })}</Alert>
        )}
        {freshness.data && (
          <ul className="mt-3 divide-y divide-border-soft">
            {freshness.data.map((item) => (
              <li key={item.location_code} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="text-fg">{item.location_name}</span>
                {item.fetched_at ? (
                  <span className="font-mono text-xs text-muted">{new Date(item.fetched_at).toLocaleString("vi-VN")}</span>
                ) : (
                  <span className="text-xs text-danger">{t("admin.overview.notIngested")}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mt-6">
        <p className="text-sm font-semibold text-fg-strong">{t("admin.overview.activeAlerts")}</p>
        {/* TODO: bảng alerts chưa có ở backend (FR6) — danh sách này vẫn là mock cho tới khi có API. */}
        <ul className="mt-3 divide-y divide-border-soft">
          {ALERTS.map((alert) => {
            const village = VILLAGES.find((v) => v.id === alert.villageId);
            return (
              <li key={alert.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="text-fg">
                  {village?.name} — {labels.hazardType[alert.hazardType]}
                </span>
                <TierBadge tier={alert.tier} size="sm" />
              </li>
            );
          })}
          {ALERTS.length === 0 && <p className="py-3 text-sm text-muted">{t("admin.overview.noActiveAlerts")}</p>}
        </ul>
      </Card>
    </div>
  );
}
