import { PageHeader, Card } from "../../shared/ui/PageHeader";
import { useAuth } from "../../features/auth/hooks";
import { AlertCard, SafeStatusCard } from "../../shared/ui/AlertCard";
import { SafetyDisclaimer } from "../../shared/ui/SafetyDisclaimer";
import { DataFreshnessBadge } from "../../shared/ui/DataFreshnessBadge";
import { getHighestTierAlert, getResidentsByVillage, getVillage, HAZARD_RUN_MOCK } from "../../shared/domain/mockData";
import { useResidentStatusStore } from "../../shared/domain/residentStatusStore";

export function VillageHeadOverviewPage() {
  const { user } = useAuth();
  const villageId = user?.villageId ?? "muong-pon-1";
  const village = getVillage(villageId);
  const alert = getHighestTierAlert(villageId);
  const residents = getResidentsByVillage(villageId);
  const { getStatus } = useResidentStatusStore();

  const safeCount = residents.filter((r) => getStatus(r.id).safetyStatus === "safe").length;
  const needHelpCount = residents.filter((r) => getStatus(r.id).safetyStatus === "need_help").length;
  const priorityResidents = residents.filter((r) => r.priority === "vulnerable");
  const pendingVisits = priorityResidents.filter((r) => !getStatus(r.id).visitedByHeadAt).length;

  return (
    <div>
      <PageHeader eyebrow="Trưởng bản" title={`Bản của tôi: ${village?.name ?? "—"}`} description="Tình trạng hiện tại và việc cần làm hôm nay." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div>
          {alert ? <AlertCard alert={alert} /> : <SafeStatusCard />}
          <div className="mt-4">
            <SafetyDisclaimer />
          </div>
        </div>
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-muted">Dữ liệu</p>
              <DataFreshnessBadge status="fresh" timestamp={HAZARD_RUN_MOCK.forecastIssued} />
            </div>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-wide text-muted">Xác nhận an toàn</p>
            <p className="mt-1 text-2xl font-bold text-fg-strong">
              {safeCount}/{residents.length} hộ
            </p>
            {needHelpCount > 0 && <p className="mt-1 text-sm font-medium text-danger">{needHelpCount} hộ báo cần giúp đỡ</p>}
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-wide text-muted">Hộ ưu tiên hỗ trợ chưa đến nhắc</p>
            <p className="mt-1 text-2xl font-bold text-accent">{pendingVisits}</p>
            <p className="mt-1 text-xs text-muted">/{priorityResidents.length} hộ ưu tiên hỗ trợ trong bản</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
