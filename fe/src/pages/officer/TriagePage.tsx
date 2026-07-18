import { Link } from "react-router-dom";
import { PageHeader, Card } from "../../shared/ui/PageHeader";
import { VILLAGES, getDominantLevel, getResidentsByVillage } from "../../shared/domain/mockData";
import { useTranslation } from "../../shared/i18n/I18nProvider";
import { HazardLevelBadge } from "../../shared/ui/HazardBadge";

/** FR18: triage = exposure (dominant hazard level) x priority (count of hộ ưu tiên hỗ trợ). */
function villageTriage(villageId: string) {
  const dominant = getDominantLevel(villageId, 0);
  const exposure = dominant?.level ?? 1;
  const residents = getResidentsByVillage(villageId);
  const priorityCount = residents.filter((r) => r.priority === "vulnerable").length;
  return { exposure, priorityCount, score: exposure * (1 + priorityCount), residentCount: residents.length };
}

export function OfficerTriagePage() {
  const { t } = useTranslation();
  const ranked = VILLAGES.map((v) => ({ village: v, ...villageTriage(v.id) })).sort((a, b) => b.score - a.score);

  return (
    <div>
      <PageHeader
        eyebrow={t("role.commune_officer")}
        title={t("officer.triage.title")}
        description={t("officer.triage.description")}
      />
      <Card>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border-soft text-xs uppercase tracking-wide text-muted">
              <th className="pb-2">{t("officer.triage.colVillage")}</th>
              <th className="pb-2">{t("officer.triage.colHighestLevel")}</th>
              <th className="pb-2">{t("officer.triage.colPriorityHouseholds")}</th>
              <th className="pb-2">{t("officer.triage.colTotalHouseholds")}</th>
              <th className="pb-2">{t("officer.triage.colTriageScore")}</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border-soft">
            {ranked.map(({ village, exposure, priorityCount, score, residentCount }) => (
              <tr key={village.id}>
                <td className="py-2.5 font-medium text-fg">{village.name}</td>
                <td className="py-2.5">
                  <HazardLevelBadge level={exposure as 1 | 2 | 3 | 4 | 5} compact />
                </td>
                <td className="py-2.5 text-muted">{priorityCount}</td>
                <td className="py-2.5 text-muted">{residentCount}</td>
                <td className="py-2.5 font-mono font-semibold text-fg-strong">{score}</td>
                <td className="py-2.5 text-right">
                  <Link to={`/officer/alerts?village=${village.id}`} className="text-xs text-accent hover:underline">
                    {t("officer.triage.viewAlerts")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
