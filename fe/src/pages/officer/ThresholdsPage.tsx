import { AdminThresholdsPage } from "../admin/ThresholdsPage";

/**
 * Same UI as admin's threshold editor (docs/design/ui-ux-role-spec.md §4.2: "giao diện giống
 * /admin/thresholds nhưng phạm vi hẹp hơn tuỳ cấu hình"). This route only renders because
 * OfficerLayout's sidebar only includes it when the officer has been granted FR9 permission; the
 * real gate is still the backend 403, not this component.
 */
export function OfficerThresholdsPage() {
  return <AdminThresholdsPage />;
}
