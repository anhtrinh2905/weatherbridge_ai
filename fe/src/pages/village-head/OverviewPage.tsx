import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Clock3, HelpCircle, MapPinned, ShieldCheck, UsersRound, type LucideIcon } from "lucide-react";
import { PageHeader, Card } from "../../shared/ui/PageHeader";
import { useAuth } from "../../features/auth/hooks";
import { AlertCard, SafeStatusCard } from "../../shared/ui/AlertCard";
import { SafetyDisclaimer } from "../../shared/ui/SafetyDisclaimer";
import { DataFreshnessBadge } from "../../shared/ui/DataFreshnessBadge";
import { Button } from "../../shared/ui/Button";
import { cn } from "../../shared/lib/cn";
import {
  getDominantLevel,
  getHighestTierAlert,
  getResidentsByVillage,
  getVillage,
  HAZARD_RUN_MOCK,
  triageScore,
} from "../../shared/domain/mockData";
import { HAZARD_LEVEL_LABELS, HAZARD_TYPE_LABELS } from "../../shared/domain/labels";
import { useResidentStatusStore } from "../../shared/domain/residentStatusStore";
import type { ResidentSim } from "../../shared/domain/types";

function StatCard({
  icon: Icon,
  label,
  value,
  tone = "default",
  helper,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: "default" | "positive" | "warning" | "danger";
  helper?: string;
}) {
  const toneClasses = {
    default: "border-border bg-surface-2 text-fg",
    positive: "border-positive/25 bg-positive/10 text-positive",
    warning: "border-accent/25 bg-accent/10 text-accent",
    danger: "border-danger/30 bg-danger/10 text-danger",
  };

  return (
    <div className={cn("rounded-lg border p-4", toneClasses[tone])}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
        <Icon size={18} aria-hidden />
      </div>
      <p className="mt-3 text-2xl font-bold text-fg-strong">{value}</p>
      {helper && <p className="mt-1 text-xs leading-5 text-muted">{helper}</p>}
    </div>
  );
}

function ResidentRow({ resident, visited }: { resident: ResidentSim; visited: boolean }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-border-soft bg-surface px-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-fg">{resident.fullName}</p>
        <p className="text-xs text-muted">Điểm ưu tiên {triageScore(resident)} · {resident.age} tuổi</p>
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold",
          visited ? "border-positive/25 bg-positive/10 text-positive" : "border-accent/25 bg-accent/10 text-accent",
        )}
      >
        {visited ? "Đã nhắc" : "Cần đi"}
      </span>
    </li>
  );
}

export function VillageHeadOverviewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const villageId = user?.villageId ?? "muong-pon-1";
  const village = getVillage(villageId);
  const alert = getHighestTierAlert(villageId);
  const residents = getResidentsByVillage(villageId);
  const dominant = getDominantLevel(villageId, 0);
  const { getStatus } = useResidentStatusStore();

  const safeCount = residents.filter((r) => getStatus(r.id).safetyStatus === "safe").length;
  const needHelpCount = residents.filter((r) => getStatus(r.id).safetyStatus === "need_help").length;
  const unknownCount = residents.length - safeCount - needHelpCount;
  const priorityResidents = residents.filter((r) => r.priority === "vulnerable");
  const pendingPriority = priorityResidents.filter((r) => !getStatus(r.id).visitedByHeadAt);
  const nextVisits = [...priorityResidents].sort((a, b) => triageScore(b) - triageScore(a)).slice(0, 4);
  const alertTone = alert?.tier === "go_now" ? "danger" : alert ? "warning" : "positive";

  return (
    <div>
      <PageHeader
        eyebrow="Trưởng bản"
        title={`Bản của tôi: ${village?.name ?? "Chưa rõ"}`}
        description="Bảng việc cần làm hôm nay: nhìn cảnh báo, ưu tiên hộ cần nhắc, theo dõi ai đã an toàn và ai cần giúp."
        actions={
          <Button className="min-h-10 rounded-lg px-4" onClick={() => navigate("/village-head/residents")}>
            <UsersRound size={16} /> Mở danh sách hộ
          </Button>
        }
      />

      <section className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-4">
        <StatCard
          icon={AlertTriangle}
          label="Tình trạng bản"
          value={alert?.tier === "go_now" ? "Đi ngay" : alert ? "Chuẩn bị" : "An toàn"}
          tone={alertTone}
          helper={dominant ? `${HAZARD_LEVEL_LABELS[dominant.level]} · tin cậy ${Math.round(dominant.confidence * 100)}%` : undefined}
        />
        <StatCard icon={CheckCircle2} label="Đã an toàn" value={`${safeCount}/${residents.length} hộ`} tone="positive" helper={`${unknownCount} hộ chưa tự xác nhận`} />
        <StatCard icon={HelpCircle} label="Cần giúp" value={`${needHelpCount} hộ`} tone={needHelpCount > 0 ? "danger" : "default"} helper="Ưu tiên gọi/đến trước nếu có báo đỏ" />
        <StatCard icon={MapPinned} label="Chưa đến nhắc" value={`${pendingPriority.length} hộ`} tone={pendingPriority.length > 0 ? "warning" : "positive"} helper={`Trong ${priorityResidents.length} hộ ưu tiên hỗ trợ`} />
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-4">
          {alert ? <AlertCard alert={alert} /> : <SafeStatusCard />}
          <SafetyDisclaimer />
        </div>

        <aside className="space-y-4">
          <Card className="rounded-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Dữ liệu cảnh báo</p>
                <p className="mt-2 text-sm text-fg">
                  {alert ? `${HAZARD_TYPE_LABELS[alert.hazardType]} đang có hiệu lực` : "Không có cảnh báo hiệu lực"}
                </p>
              </div>
              <DataFreshnessBadge status="fresh" timestamp={HAZARD_RUN_MOCK.forecastIssued} />
            </div>
          </Card>

          <Card className="rounded-lg">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Việc cần làm tiếp theo</p>
                <h2 className="mt-1 text-lg font-semibold text-fg-strong">Đi nhắc hộ ưu tiên</h2>
              </div>
              <Clock3 className="text-accent" size={20} aria-hidden />
            </div>
            <ul className="mt-4 space-y-2">
              {nextVisits.map((resident) => (
                <ResidentRow key={resident.id} resident={resident} visited={Boolean(getStatus(resident.id).visitedByHeadAt)} />
              ))}
            </ul>
            <Link to="/village-head/residents" className="mt-4 inline-flex text-sm font-semibold">
              Xem toàn bộ danh sách
            </Link>
          </Card>
        </aside>
      </div>
    </div>
  );
}
