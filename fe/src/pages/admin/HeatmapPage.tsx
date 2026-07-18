import { HeatmapView } from "../../features/heatmap/HeatmapView";
import { PageHeader } from "../../shared/ui/PageHeader";

export function AdminHeatmapPage() {
  return (
    <div>
      <PageHeader eyebrow="Admin" title="Bản đồ nguy hiểm" description="Toàn xã, không giới hạn — giống góc nhìn cán bộ PCTT." />
      <HeatmapView />
    </div>
  );
}
