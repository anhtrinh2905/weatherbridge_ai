import { History, ListOrdered, Map, SlidersHorizontal } from "lucide-react";
import { DashboardLayout, type SidebarItem } from "../../app/DashboardLayout";

// FR9: threshold editing for commune_officer is conditional on admin having granted it.
// Mock: grant is on for the demo account. Real implementation reads this from GET /api/v1/me.
const OFFICER_HAS_THRESHOLD_GRANT = true;

const items: SidebarItem[] = [
  { to: "/officer/heatmap", label: "Bản đồ nguy hiểm", icon: Map, end: true },
  { to: "/officer/triage", label: "Ưu tiên theo bản", icon: ListOrdered },
  { to: "/officer/alerts", label: "Lịch sử cảnh báo", icon: History },
  ...(OFFICER_HAS_THRESHOLD_GRANT
    ? [{ to: "/officer/thresholds", label: "Ngưỡng cảnh báo", icon: SlidersHorizontal }]
    : []),
];

export function OfficerLayout() {
  return <DashboardLayout role="commune_officer" items={items} />;
}
