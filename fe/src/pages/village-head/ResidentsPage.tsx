import { useNavigate } from "react-router-dom";
import { CheckCircle2, CircleHelp, MapPin, Navigation, ShieldCheck, Siren, type LucideIcon } from "lucide-react";
import { PageHeader, Card } from "../../shared/ui/PageHeader";
import { Button } from "../../shared/ui/Button";
import { useAuth } from "../../features/auth/hooks";
import { getResidentsByVillage, getVillage, triageScore } from "../../shared/domain/mockData";
import { OCCUPATION_LABELS, VULNERABILITY_LABELS } from "../../shared/domain/labels";
import { useResidentStatusStore } from "../../shared/domain/residentStatusStore";
import { cn } from "../../shared/lib/cn";
import type { ResidentSim, SafetyStatus } from "../../shared/domain/types";
import type { ResidentStatus } from "../../shared/domain/residentStatusStore";

const SAFETY_META: Record<SafetyStatus, { label: string; classes: string; icon: LucideIcon }> = {
  safe: { label: "Đã an toàn", classes: "border-positive/25 bg-positive/10 text-positive", icon: ShieldCheck },
  need_help: { label: "Cần giúp", classes: "border-danger/30 bg-danger/10 text-danger", icon: Siren },
  unknown: { label: "Chưa xác nhận", classes: "border-border-strong bg-surface text-muted", icon: CircleHelp },
};

function SummaryPill({ label, value, tone }: { label: string; value: number; tone: "default" | "positive" | "warning" | "danger" }) {
  const classes = {
    default: "border-border bg-surface-2 text-fg",
    positive: "border-positive/25 bg-positive/10 text-positive",
    warning: "border-accent/25 bg-accent/10 text-accent",
    danger: "border-danger/30 bg-danger/10 text-danger",
  };
  return (
    <div className={cn("rounded-lg border px-4 py-3", classes[tone])}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-fg-strong">{value}</p>
    </div>
  );
}

function ResidentCard({
  resident,
  status,
  onOpenMap,
  onMarkVisited,
}: {
  resident: ResidentSim;
  status: ResidentStatus;
  onOpenMap: () => void;
  onMarkVisited: () => void;
}) {
  const safety = SAFETY_META[status.safetyStatus];
  const SafetyIcon = safety.icon;
  const score = triageScore(resident);

  return (
    <article
      className={cn(
        "grid gap-4 rounded-lg border bg-surface-2 p-4 md:grid-cols-[minmax(0,1fr)_auto]",
        status.safetyStatus === "need_help" ? "border-danger/35" : "border-border",
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold text-fg-strong">{resident.fullName}</h2>
          {resident.priority === "vulnerable" && (
            <span className="rounded-full border border-accent/25 bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
              Hộ ưu tiên hỗ trợ
            </span>
          )}
          <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold", safety.classes)}>
            <SafetyIcon size={14} aria-hidden />
            {safety.label}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-muted sm:grid-cols-3">
          <p>{OCCUPATION_LABELS[resident.occupation]} · {resident.age} tuổi</p>
          <p>Điểm ưu tiên: <span className="font-semibold text-fg">{score}</span></p>
          <p>{status.visitedByHeadAt ? "Đã đến nhắc" : "Chưa đến nhắc"}</p>
        </div>

        {resident.vulnerabilityReason.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {resident.vulnerabilityReason.map((reason) => (
              <span key={reason} className="rounded-md border border-border-soft bg-surface px-2 py-1 text-xs text-muted">
                {VULNERABILITY_LABELS[reason]}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 md:justify-end">
        <Button variant="secondary" className="min-h-10 rounded-lg px-3 text-xs" onClick={onOpenMap}>
          <Navigation size={14} /> Vị trí
        </Button>
        <Button
          variant={status.visitedByHeadAt ? "secondary" : "primary"}
          className={cn("min-h-10 rounded-lg px-3 text-xs", status.visitedByHeadAt && "cursor-default opacity-70")}
          disabled={Boolean(status.visitedByHeadAt)}
          onClick={onMarkVisited}
        >
          {status.visitedByHeadAt ? (
            <>
              <CheckCircle2 size={14} /> Đã nhắc
            </>
          ) : (
            <>
              <MapPin size={14} /> Đánh dấu đã nhắc
            </>
          )}
        </Button>
      </div>
    </article>
  );
}

export function VillageHeadResidentsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const villageId = user?.villageId ?? "muong-pon-1";
  const village = getVillage(villageId);
  const residents = [...getResidentsByVillage(villageId)].sort((a, b) => triageScore(b) - triageScore(a));
  const { getStatus, markVisited } = useResidentStatusStore();

  const priorityCount = residents.filter((r) => r.priority === "vulnerable").length;
  const pendingVisits = residents.filter((r) => r.priority === "vulnerable" && !getStatus(r.id).visitedByHeadAt).length;
  const needHelpCount = residents.filter((r) => getStatus(r.id).safetyStatus === "need_help").length;
  const safeCount = residents.filter((r) => getStatus(r.id).safetyStatus === "safe").length;

  return (
    <div>
      <PageHeader
        eyebrow="Trưởng bản"
        title={`Danh sách hộ dân - ${village?.name ?? "bản của tôi"}`}
        description="Chỉ hiển thị hộ thuộc bản của bạn. Danh sách đã sắp theo điểm ưu tiên để đi nhắc đúng người trước."
      />

      <section className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryPill label="Tổng hộ" value={residents.length} tone="default" />
        <SummaryPill label="Hộ ưu tiên" value={priorityCount} tone="warning" />
        <SummaryPill label="Cần giúp" value={needHelpCount} tone={needHelpCount > 0 ? "danger" : "default"} />
        <SummaryPill label="Đã an toàn" value={safeCount} tone="positive" />
      </section>

      <Card className="rounded-lg">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border-soft pb-4">
          <div>
            <p className="text-sm font-semibold text-fg-strong">Hàng đợi đi nhắc</p>
            <p className="mt-1 text-xs text-muted">{pendingVisits} hộ ưu tiên hỗ trợ chưa được đánh dấu đã đến nhắc.</p>
          </div>
          <span className="rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
            Ưu tiên cao ở trên
          </span>
        </div>
        <div className="space-y-3">
          {residents.map((resident) => (
            <ResidentCard
              key={resident.id}
              resident={resident}
              status={getStatus(resident.id)}
              onOpenMap={() => navigate("/village-head/map")}
              onMarkVisited={() => markVisited(resident.id)}
            />
          ))}
        </div>
      </Card>

      <p className="mt-3 text-xs leading-5 text-muted-2">
        Trạng thái "đã đến nhắc" hiện lưu tạm trên trình duyệt. Backend chưa có trường
        `resident_sim.visited_by_head_at`; xem docs/design/ui-ux-role-spec.md §7.
      </p>
    </div>
  );
}
