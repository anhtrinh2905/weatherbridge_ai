import { ShieldCheck, HandHelping, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks";
import { AlertCard, SafeStatusCard } from "../../shared/ui/AlertCard";
import { SafetyDisclaimer } from "../../shared/ui/SafetyDisclaimer";
import { VillageMap } from "../../shared/ui/VillageMap";
import { Button } from "../../shared/ui/Button";
import { WebPushPanel } from "../../features/notifications/WebPushPanel";
import { getHighestTierAlert, getSelfResident, getVillage } from "../../shared/domain/mockData";
import { useResidentStatusStore } from "../../shared/domain/residentStatusStore";
import { cn } from "../../shared/lib/cn";

export function ResidentHomePage() {
  const { user } = useAuth();
  const villageId = user?.villageId ?? "muong-pon-1";
  const village = getVillage(villageId);
  const alert = getHighestTierAlert(villageId);
  const self = getSelfResident(villageId);
  const { getStatus, setSafetyStatus } = useResidentStatusStore();
  const status = self ? getStatus(self.id) : undefined;

  return (
    <div className="space-y-4">
      <SafetyDisclaimer />
      <WebPushPanel />

      <div>
        <p className="text-xs uppercase tracking-wide text-muted">Bản {village?.name}</p>
        {alert ? <AlertCard alert={alert} /> : <SafeStatusCard />}
      </div>

      <VillageMap layer="dominant" day={0} detailLevel="simple" focusVillageId={villageId} className="min-h-[220px]" />

      {self && (
        <div className="rounded-2xl border border-border bg-surface-2 p-4">
          <p className="text-sm font-semibold text-fg-strong">Bạn có an toàn không?</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Button
              variant={status?.safetyStatus === "safe" ? "primary" : "secondary"}
              className={cn("min-h-14 flex-col gap-1", status?.safetyStatus === "safe" && "ring-2 ring-positive")}
              onClick={() => setSafetyStatus(self.id, "safe")}
            >
              <ShieldCheck size={20} />
              Tôi an toàn
            </Button>
            <Button
              variant={status?.safetyStatus === "need_help" ? "danger" : "secondary"}
              className="min-h-14 flex-col gap-1"
              onClick={() => setSafetyStatus(self.id, "need_help")}
            >
              <HandHelping size={20} />
              Tôi cần giúp đỡ
            </Button>
          </div>
          {status?.safetyStatusUpdatedAt && (
            <p className="mt-2 text-center text-xs text-muted">
              Đã ghi nhận lúc {new Date(status.safetyStatusUpdatedAt).toLocaleTimeString("vi-VN")}
            </p>
          )}
        </div>
      )}

      <Link
        to="/resident/details"
        className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-border-strong bg-surface-2 text-sm font-medium text-fg hover:bg-surface-3"
      >
        Xem số liệu chi tiết <ChevronRight size={16} />
      </Link>
    </div>
  );
}
