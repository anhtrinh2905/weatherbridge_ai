import { PageHeader } from "../../shared/ui/PageHeader";
import { HeatmapView } from "../../features/heatmap/HeatmapView";

export function OfficerHeatmapPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Cán bộ PCTT xã"
        title="Bản đồ nguy hiểm toàn xã"
        description="5 cấp theo địa hình, 3–7 ngày tới. Click 1 bản để xem đóng góp đặc trưng trước khi ra quyết định cảnh báo."
      />
      <HeatmapView />
    </div>
  );
}
