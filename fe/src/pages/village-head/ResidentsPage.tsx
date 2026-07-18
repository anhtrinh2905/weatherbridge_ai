import { CheckCircle2, MapPin } from "lucide-react";
import { PageHeader, Card } from "../../shared/ui/PageHeader";
import { Button } from "../../shared/ui/Button";
import { useAuth } from "../../features/auth/hooks";
import { getResidentsByVillage, triageScore } from "../../shared/domain/mockData";
import { OCCUPATION_LABELS, VULNERABILITY_LABELS } from "../../shared/domain/labels";
import { useResidentStatusStore } from "../../shared/domain/residentStatusContext";
import { cn } from "../../shared/lib/cn";

export function VillageHeadResidentsPage() {
  const { user } = useAuth();
  const villageId = user?.villageId ?? "muong-pon-1";
  const residents = [...getResidentsByVillage(villageId)].sort((a, b) => triageScore(b) - triageScore(a));
  const { getStatus, markVisited } = useResidentStatusStore();

  return (
    <div>
      <PageHeader
        eyebrow="Trưởng bản"
        title="Danh sách hộ dân trong bản"
        description="Chỉ hiện hộ thuộc bản của bạn (đúng quyền, không có cách xem bản khác) — sắp theo điểm ưu tiên giảm dần."
      />
      <Card>
        <ul className="divide-y divide-border-soft">
          {residents.map((resident) => {
            const status = getStatus(resident.id);
            return (
              <li key={resident.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="flex items-center gap-2 text-sm font-medium text-fg">
                    {resident.fullName}
                    {resident.priority === "vulnerable" && (
                      <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-accent">
                        Ưu tiên hỗ trợ
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {OCCUPATION_LABELS[resident.occupation]} · {resident.age} tuổi
                    {resident.vulnerabilityReason.length > 0 &&
                      ` · ${resident.vulnerabilityReason.map((r) => VULNERABILITY_LABELS[r]).join(", ")}`}
                  </p>
                  <p className="mt-1 text-xs">
                    {status.safetyStatus === "safe" && <span className="text-positive">Đã tự xác nhận an toàn</span>}
                    {status.safetyStatus === "need_help" && <span className="font-semibold text-danger">Báo cần giúp đỡ</span>}
                    {status.safetyStatus === "unknown" && <span className="text-muted">Chưa tự xác nhận</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={status.visitedByHeadAt ? "secondary" : "primary"}
                    className={cn("min-h-9 px-3 text-xs", status.visitedByHeadAt && "cursor-default opacity-70")}
                    disabled={Boolean(status.visitedByHeadAt)}
                    onClick={() => markVisited(resident.id)}
                  >
                    {status.visitedByHeadAt ? (
                      <>
                        <CheckCircle2 size={14} /> Đã đến nhắc
                      </>
                    ) : (
                      <>
                        <MapPin size={14} /> Đánh dấu đã đến nhắc
                      </>
                    )}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
      <p className="mt-3 text-xs leading-5 text-muted-2">
        Trạng thái "đã đến nhắc" hiện lưu tạm trên trình duyệt (chưa có trường
        `resident_sim.visited_by_head_at` ở backend — xem docs/design/ui-ux-role-spec.md §7).
      </p>
    </div>
  );
}
