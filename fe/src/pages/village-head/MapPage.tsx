import { PageHeader } from "../../shared/ui/PageHeader";
import { useAuth } from "../../features/auth/hooks";
import { VillageMap } from "../../shared/ui/VillageMap";
import { SafetyDisclaimer } from "../../shared/ui/SafetyDisclaimer";

export function VillageHeadMapPage() {
  const { user } = useAuth();
  const villageId = user?.villageId ?? "muong-pon-1";

  return (
    <div>
      <PageHeader eyebrow="Trưởng bản" title="Bản đồ bản tôi" description="Chỉ khoanh vùng bản của bạn — không có đóng góp đặc trưng (đúng quyền vai)." />
      <VillageMap layer="dominant" day={0} detailLevel="simple" focusVillageId={villageId} className="min-h-[420px]" />
      <div className="mt-4">
        <SafetyDisclaimer />
      </div>
    </div>
  );
}
