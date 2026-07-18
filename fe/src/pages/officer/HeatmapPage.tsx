import { PageHeader } from "../../shared/ui/PageHeader";
import { HeatmapView } from "../../features/heatmap/HeatmapView";
import { useTranslation } from "../../shared/i18n/I18nProvider";

export function OfficerHeatmapPage() {
  const { t } = useTranslation();
  return (
    <div>
      <PageHeader
        eyebrow={t("role.commune_officer")}
        title={t("officer.heatmap.title")}
        description={t("officer.heatmap.description")}
      />
      <HeatmapView />
    </div>
  );
}
