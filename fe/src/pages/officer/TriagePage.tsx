import { Link } from "react-router-dom";
import { PageHeader, Card } from "../../shared/ui/PageHeader";
import { VILLAGES, getDominantLevel, getResidentsByVillage } from "../../shared/domain/mockData";
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
  const ranked = VILLAGES.map((v) => ({ village: v, ...villageTriage(v.id) })).sort((a, b) => b.score - a.score);

  return (
    <div>
      <PageHeader
        eyebrow="Cán bộ PCTT xã"
        title="Ưu tiên theo bản"
        description="Điểm triage = Phơi nhiễm (cấp nguy hiểm cao nhất) × Ưu tiên (số hộ ưu tiên hỗ trợ trong bản)."
      />
      <Card>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border-soft text-xs uppercase tracking-wide text-muted">
              <th className="pb-2">Bản</th>
              <th className="pb-2">Cấp cao nhất</th>
              <th className="pb-2">Hộ ưu tiên hỗ trợ</th>
              <th className="pb-2">Tổng hộ</th>
              <th className="pb-2">Điểm triage</th>
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
                    Xem cảnh báo →
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
