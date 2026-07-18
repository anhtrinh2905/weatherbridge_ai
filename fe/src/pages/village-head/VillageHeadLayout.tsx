import { LayoutDashboard, Map, Users } from "lucide-react";
import { DashboardLayout, type SidebarItem } from "../../app/DashboardLayout";
import { useAuth } from "../../features/auth/hooks";
import { getResidentsByVillage } from "../../shared/domain/mockData";
import { useResidentStatusStore } from "../../shared/domain/residentStatusContext";

export function VillageHeadLayout() {
  const { user } = useAuth();
  const { getStatus } = useResidentStatusStore();
  const villageId = user?.villageId ?? "muong-pon-1";
  const pendingVisits = getResidentsByVillage(villageId).filter(
    (r) => r.priority === "vulnerable" && !getStatus(r.id).visitedByHeadAt,
  ).length;

  const items: SidebarItem[] = [
    { to: "/village-head/overview", label: "Tổng quan bản tôi", icon: LayoutDashboard, end: true },
    { to: "/village-head/residents", label: "Danh sách hộ dân", icon: Users, badge: pendingVisits || undefined },
    { to: "/village-head/map", label: "Bản đồ bản tôi", icon: Map },
  ];

  return <DashboardLayout role="village_head" items={items} />;
}
