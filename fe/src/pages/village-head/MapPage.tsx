import { HeatmapView } from "../../features/heatmap/HeatmapView";
import { PageHeader } from "../../shared/ui/PageHeader";
import { useAuth } from "../../features/auth/hooks";
import { getVillage } from "../../shared/domain/mockData";
import { useTranslation } from "../../shared/i18n/I18nProvider";

export function VillageHeadMapPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const villageId = user?.villageId ?? "muong-pon-1";
  const village = getVillage(villageId);

  return (
    <div>
      <PageHeader
        eyebrow={t("role.village_head")}
        title={t("villageHead.map.title", { village: village?.name ?? t("villageHead.map.unknownVillage") })}
        description={t("villageHead.map.description")}
      />
      <HeatmapView />
    </div>
  );
}
