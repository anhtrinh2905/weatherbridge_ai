import { LayoutDashboard, Map } from "lucide-react";
import { DashboardLayout, type SidebarItem } from "../../app/DashboardLayout";
import { useTranslation } from "../../shared/i18n/I18nProvider";

export function ResidentShell() {
  const { t } = useTranslation();
  const items: SidebarItem[] = [
    { to: "/resident", label: t("resident.nav.alerts"), icon: LayoutDashboard, end: true },
    { to: "/resident/map", label: t("resident.nav.map"), icon: Map },
  ];

  return <DashboardLayout role="resident" items={items} />;
}
