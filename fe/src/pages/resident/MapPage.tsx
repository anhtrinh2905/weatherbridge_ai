import { useAuth } from "../../features/auth/hooks";
import { getVillage } from "../../shared/domain/mockData";
import { useTranslation } from "../../shared/i18n/I18nProvider";
import { HeatmapView } from "../../features/heatmap/HeatmapView";
import { PageHeader } from "../../shared/ui/PageHeader";

export function ResidentMapPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const villageId = user?.villageId ?? "muong-pon-1";
  const village = getVillage(villageId);

  return (
    <div>
      <PageHeader
        eyebrow={t("resident.village", { village: village?.name ?? "" })}
        title={t("resident.mapPageTitle")}
        description={t("resident.mapPageDescription")}
      />
      <HeatmapView />
    </div>
  );
}
