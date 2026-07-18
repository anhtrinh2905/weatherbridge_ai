import { Activity, FlaskConical, LayoutDashboard, Map, SlidersHorizontal, Users } from "lucide-react";
import { DashboardLayout, type SidebarSection } from "../../app/DashboardLayout";
import { useTranslation } from "../../shared/i18n/I18nProvider";
import { HAZARD_RUN_MOCK } from "../../shared/domain/mockData";

export function AdminLayout() {
  const { t } = useTranslation();

  // Grouped so the sidebar reads as three concerns instead of a flat list of six:
  // day-to-day operations, the hazard model & its outputs, and access control.
  const sections: SidebarSection[] = [
    {
      title: t("admin.nav.operations"),
      items: [
        { to: "/admin/overview", label: t("admin.nav.overview"), icon: LayoutDashboard, end: true },
        {
          to: "/admin/pipeline",
          label: t("admin.nav.pipeline"),
          icon: Activity,
          badge: HAZARD_RUN_MOCK.status === "failed" ? 1 : undefined,
        },
      ],
    },
    {
      title: t("admin.nav.modelsAndAlerts"),
      items: [
        { to: "/admin/thresholds", label: t("admin.nav.thresholds"), icon: SlidersHorizontal },
        { to: "/admin/calibration", label: t("admin.nav.calibration"), icon: FlaskConical },
        { to: "/admin/heatmap", label: t("admin.nav.heatmap"), icon: Map },
      ],
    },
    {
      title: t("admin.nav.administration"),
      items: [{ to: "/admin/users", label: t("admin.nav.users"), icon: Users }],
    },
  ];

  return <DashboardLayout role="admin" sections={sections} />;
}
