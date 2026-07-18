import { History, ListOrdered, Map, SlidersHorizontal } from "lucide-react";
import { DashboardLayout, type SidebarItem } from "../../app/DashboardLayout";
import { useTranslation } from "../../shared/i18n/I18nProvider";

// FR9: threshold editing for commune_officer is conditional on admin having granted it.
// Mock: grant is on for the demo account. Real implementation reads this from GET /api/v1/me.
const OFFICER_HAS_THRESHOLD_GRANT = true;

export function OfficerLayout() {
  const { t } = useTranslation();

  const items: SidebarItem[] = [
    { to: "/officer/heatmap", label: t("officer.nav.heatmap"), icon: Map, end: true },
    { to: "/officer/triage", label: t("officer.nav.triage"), icon: ListOrdered },
    { to: "/officer/alerts", label: t("officer.nav.alerts"), icon: History },
    ...(OFFICER_HAS_THRESHOLD_GRANT
      ? [{ to: "/officer/thresholds", label: t("officer.nav.thresholds"), icon: SlidersHorizontal }]
      : []),
  ];

  return <DashboardLayout role="commune_officer" items={items} />;
}
