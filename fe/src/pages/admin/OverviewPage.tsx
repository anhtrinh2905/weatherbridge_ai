import { Link } from "react-router-dom";
import { useAlerts } from "../../features/operations/hooks";
import { useForecastFreshness, useJobStats } from "../../features/admin/hooks";
import { useTranslation } from "../../shared/i18n/I18nProvider";
import { SafetyDisclaimer } from "../../shared/ui/SafetyDisclaimer";
import { HazardLevelBadge, TierBadge } from "../../shared/ui/HazardBadge";
import { Card, PageHeader } from "../../shared/ui/PageHeader";

export function AdminOverviewPage() {
  const { t } = useTranslation();
  const stats = useJobStats();
  const freshness = useForecastFreshness();
  const alerts = useAlerts();
  const published = alerts.data?.filter((item) => item.status === "published") ?? [];
  return <div>
    <PageHeader eyebrow={t("role.admin")} title={t("admin.overview.title")} description={t("admin.overview.description")} />
    <SafetyDisclaimer />
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3"><Metric label={t("admin.overview.jobsPending")} value={stats.data ? stats.data.queued + stats.data.running : "-"} tone="accent" /><Metric label={t("admin.overview.jobsSucceeded")} value={stats.data?.succeeded ?? "-"} tone="positive" /><Metric label={t("admin.overview.jobsFailed")} value={stats.data?.failed ?? "-"} tone="danger" /></div>
    <Card className="mt-6"><div className="flex justify-between"><p className="font-semibold text-fg-strong">{t("admin.overview.forecastFreshness")}</p><Link to="/admin/pipeline" className="text-sm text-accent">{t("admin.overview.viewJobQueue")}</Link></div><ul className="mt-3 divide-y divide-border-soft">{freshness.data?.map((item) => <li key={item.location_code} className="flex justify-between py-2 text-sm"><span>{item.location_name}</span><span className="text-muted">{item.fetched_at ? new Date(item.fetched_at).toLocaleString("vi-VN") : t("admin.overview.notIngested")}</span></li>)}</ul></Card>
    <Card className="mt-6"><p className="font-semibold text-fg-strong">{t("admin.overview.activeAlerts")}</p><ul className="mt-3 divide-y divide-border-soft">{published.map((item) => <li key={item.id} className="flex items-center justify-between gap-3 py-2.5 text-sm"><span>{item.target_area_codes.join(", ")} - {item.hazard_type}</span><span className="flex gap-2"><HazardLevelBadge level={item.level as 1|2|3|4|5} compact /><TierBadge tier={item.tier as "prepare"|"go_now"} size="sm" /></span></li>)}{published.length === 0 && <li className="py-3 text-sm text-muted">{t("admin.overview.noActiveAlerts")}</li>}</ul></Card>
  </div>;
}

function Metric({ label, value, tone }: { label: string; value: number | string; tone: "accent" | "positive" | "danger" }) { const colors = { accent: "text-accent", positive: "text-positive", danger: "text-danger" }; return <Card><p className="text-xs uppercase tracking-wide text-muted">{label}</p><p className={`mt-2 text-3xl font-bold ${colors[tone]}`}>{value}</p></Card>; }
