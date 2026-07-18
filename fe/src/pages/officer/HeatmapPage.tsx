import { useState } from "react";
import { PageHeader } from "../../shared/ui/PageHeader";
import { HeatmapPanel } from "../../features/demo/components/HeatmapPanel";
import type { MapPoint } from "../../features/demo/components/TerrainMap";
import { RASTER_H, RASTER_W } from "../../features/demo/terrain";
import type { HazardType } from "../../features/demo/types";

export function OfficerHeatmapPage() {
  const [type, setType] = useState<HazardType>("flood");
  const [dayOffset, setDayOffset] = useState(2);
  const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>({
    x: Math.round(RASTER_W * 0.42),
    y: Math.round(RASTER_H * 0.47),
  });

  return (
    <div>
      <PageHeader
        eyebrow="Cán bộ PCTT xã"
        title="Bản đồ nguy hiểm toàn xã"
        description="5 cấp theo địa hình, 5 ngày tới. Chọn một điểm hoặc bản để xem nguy cơ và phần đóng góp trước khi ra quyết định cảnh báo."
      />
      <HeatmapPanel
        type={type}
        onTypeChange={setType}
        dayOffset={dayOffset}
        onDayChange={setDayOffset}
        selectedPoint={selectedPoint}
        onSelectPoint={setSelectedPoint}
      />
    </div>
  );
}
