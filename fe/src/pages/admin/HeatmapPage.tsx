import { PageHeader } from "../../shared/ui/PageHeader";
import { HeatmapView } from "../../features/heatmap/HeatmapView";
import { useTranslation } from "../../shared/i18n/I18nProvider";

export function AdminHeatmapPage() {
  const { t } = useTranslation();
  return (
    <div>
      <PageHeader eyebrow={t("role.admin")} title={t("admin.heatmap.title")} description={t("admin.heatmap.description")} />
      <HeatmapView />
    </div>
  );
}
