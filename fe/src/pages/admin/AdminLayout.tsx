import { Activity, FlaskConical, LayoutDashboard, Map, SlidersHorizontal, Users } from "lucide-react";
import { DashboardLayout, type SidebarItem } from "../../app/DashboardLayout";
import { HAZARD_RUN_MOCK } from "../../shared/domain/mockData";

const items: SidebarItem[] = [
  { to: "/admin/overview", label: "Tổng quan", icon: LayoutDashboard, end: true },
  {
    to: "/admin/pipeline",
    label: "Pipeline & vận hành",
    icon: Activity,
    badge: HAZARD_RUN_MOCK.status === "failed" ? 1 : undefined,
  },
  { to: "/admin/thresholds", label: "Ngưỡng cảnh báo", icon: SlidersHorizontal },
  { to: "/admin/calibration", label: "Kiểm định mô hình", icon: FlaskConical },
  { to: "/admin/heatmap", label: "Bản đồ nguy hiểm", icon: Map },
  { to: "/admin/users", label: "Người dùng & phân quyền", icon: Users },
];

export function AdminLayout() {
  return <DashboardLayout role="admin" items={items} />;
}
