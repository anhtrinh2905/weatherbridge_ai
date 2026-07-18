import { HeatmapView } from "../../features/heatmap/HeatmapView";
import { PageHeader } from "../../shared/ui/PageHeader";

export function OfficerHeatmapPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Cán bộ PCTT xã"
        title="Bản đồ nguy hiểm toàn xã"
        description="5 cấp theo địa hình, 5 ngày tới. Chọn một điểm hoặc bản để xem nguy cơ và phần đóng góp trước khi ra quyết định cảnh báo."
      />
      <HeatmapView />
    </div>
  );
}
