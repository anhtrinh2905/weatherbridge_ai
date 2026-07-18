import { Activity, FlaskConical, LayoutDashboard, Map, SlidersHorizontal, Users } from "lucide-react";
import { DashboardLayout, type SidebarSection } from "../../app/DashboardLayout";
import { HAZARD_RUN_MOCK } from "../../shared/domain/mockData";

// Grouped so the sidebar reads as three concerns instead of a flat list of six:
// day-to-day operations, the hazard model & its outputs, and access control.
const sections: SidebarSection[] = [
  {
    title: "Vận hành",
    items: [
      { to: "/admin/overview", label: "Tổng quan", icon: LayoutDashboard, end: true },
      {
        to: "/admin/pipeline",
        label: "Pipeline & job",
        icon: Activity,
        badge: HAZARD_RUN_MOCK.status === "failed" ? 1 : undefined,
      },
    ],
  },
  {
    title: "Mô hình & cảnh báo",
    items: [
      { to: "/admin/thresholds", label: "Ngưỡng cảnh báo", icon: SlidersHorizontal },
      { to: "/admin/calibration", label: "Kiểm định mô hình", icon: FlaskConical },
      { to: "/admin/heatmap", label: "Bản đồ nguy hiểm", icon: Map },
    ],
  },
  {
    title: "Quản trị",
    items: [{ to: "/admin/users", label: "Người dùng & phân quyền", icon: Users }],
  },
];

export function AdminLayout() {
  return <DashboardLayout role="admin" sections={sections} />;
}
