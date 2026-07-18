import { LayoutDashboard, Map, Users } from "lucide-react";
import { DashboardLayout, type SidebarItem } from "../../app/DashboardLayout";
import { useAuth } from "../../features/auth/hooks";
import { useTranslation } from "../../shared/i18n/I18nProvider";
import { getResidentsByVillage } from "../../shared/domain/mockData";
import { useResidentStatusStore } from "../../shared/domain/residentStatusStore";

export function VillageHeadLayout() {
  const { user } = useAuth();
  const { getStatus } = useResidentStatusStore();
  const { t } = useTranslation();
  const villageId = user?.villageId ?? "muong-pon-1";
  const pendingVisits = getResidentsByVillage(villageId).filter(
    (r) => r.priority === "vulnerable" && !getStatus(r.id).visitedByHeadAt,
  ).length;

  const items: SidebarItem[] = [
    { to: "/village-head/map", label: t("villageHead.nav.map"), icon: Map, end: true },
    { to: "/village-head/overview", label: t("villageHead.nav.overview"), icon: LayoutDashboard },
    { to: "/village-head/residents", label: t("villageHead.nav.residents"), icon: Users, badge: pendingVisits || undefined },
  ];

  return <DashboardLayout role="village_head" items={items} />;
}
