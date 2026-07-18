import { Link } from "react-router-dom";
import { activeHazardDataSource } from "../../features/heatmap/dataSource";
import { useResidents } from "../../features/operations/hooks";
import { RASTER_VILLAGES } from "../../shared/hazard-raster/villages";
import { HazardLevelBadge } from "../../shared/ui/HazardBadge";
import { Card, PageHeader } from "../../shared/ui/PageHeader";
import { useTranslation } from "../../shared/i18n/I18nProvider";

export function OfficerTriagePage() {
  const { t } = useTranslation();
  const residents = useResidents();
  const ranked = RASTER_VILLAGES.map((entry) => {
    const exposure = entry.located && activeHazardDataSource ? activeHazardDataSource.inspect(entry.point, "dominant", 0).primary.level : 0;
    const people = residents.data?.filter((item) => item.village_code === entry.village.id || item.village_code === `village-${entry.village.id}`) ?? [];
    return { village: entry.village, exposure, residentCount: people.length, score: exposure * (1 + people.length) };
  }).sort((left, right) => right.score - left.score);
  return <div><PageHeader eyebrow={t("role.commune_officer")} title={t("officer.triage.title")} description={t("officer.triage.description")} /><Card><table className="w-full text-left text-sm"><thead><tr className="border-b border-border-soft text-xs uppercase tracking-wide text-muted"><th className="pb-2">{t("officer.triage.colVillage")}</th><th className="pb-2">{t("officer.triage.colHighestLevel")}</th><th className="pb-2">{t("officer.triage.colTotalHouseholds")}</th><th className="pb-2">{t("officer.triage.colTriageScore")}</th><th /></tr></thead><tbody className="divide-y divide-border-soft">{ranked.map((item) => <tr key={item.village.id}><td className="py-2.5 font-medium">{item.village.name}</td><td>{item.exposure ? <HazardLevelBadge level={item.exposure as 1|2|3|4|5} compact /> : "-"}</td><td className="text-muted">{item.residentCount}</td><td className="font-mono font-semibold">{item.score}</td><td className="text-right"><Link to="/officer/alerts" className="text-xs text-accent">{t("officer.triage.viewAlerts")}</Link></td></tr>)}</tbody></table></Card></div>;
}
