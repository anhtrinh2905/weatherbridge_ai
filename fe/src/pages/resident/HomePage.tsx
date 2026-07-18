import { useMemo, useState } from "react";
import { ShieldCheck, HandHelping } from "lucide-react";
import { useAuth } from "../../features/auth/hooks";
import { AlertCard, SafeStatusCard } from "../../shared/ui/AlertCard";
import { SafetyDisclaimer } from "../../shared/ui/SafetyDisclaimer";
import { VillageMap } from "../../shared/ui/VillageMap";
import { Button } from "../../shared/ui/Button";
import { OCCUPATION_LABELS } from "../../shared/domain/labels";
import {
  getAlertForVillageDay,
  getSelfResident,
  getVillage,
  personalizeAlert,
} from "../../shared/domain/mockData";
import { useResidentStatusStore } from "../../shared/domain/residentStatusStore";
import { cn } from "../../shared/lib/cn";

const DAY_TABS = [
  { day: 0, label: "Hôm nay" },
  { day: 1, label: "+1 ngày" },
  { day: 2, label: "+2 ngày" },
] as const;

export function ResidentHomePage() {
  const { user } = useAuth();
  const villageId = user?.villageId ?? "muong-pon-1";
  const village = getVillage(villageId);
  const self = getSelfResident(villageId);
  const { getStatus, setSafetyStatus } = useResidentStatusStore();
  const status = self ? getStatus(self.id) : undefined;
  const [day, setDay] = useState(0);

  const alert = useMemo(() => {
    const base = getAlertForVillageDay(villageId, day);
    if (!base || !self) return base;
    return personalizeAlert(base, self.occupation);
  }, [villageId, day, self]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="px-4 sm:px-0">
        <SafetyDisclaimer />
      </div>

      <div className="px-4 sm:px-0">
        <p className="text-xs uppercase tracking-wide text-muted">Bản {village?.name}</p>
        {self && (
          <p className="mt-0.5 text-base text-fg">
            <span className="font-semibold text-fg-strong">{self.fullName}</span>
            <span className="text-muted"> · {OCCUPATION_LABELS[self.occupation]}</span>
          </p>
        )}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-12 lg:gap-6">
        <div className="lg:col-span-7">
          {alert ? (
            <AlertCard alert={alert} size="hero" forecastDay={day} />
          ) : (
            <SafeStatusCard size="hero" />
          )}
        </div>

        <aside className="space-y-4 px-4 sm:px-0 lg:col-span-5">
          <div className="flex gap-2" role="tablist" aria-label="Xem 3 ngày tới">
            {DAY_TABS.map((tab) => (
              <button
                key={tab.day}
                type="button"
                role="tab"
                aria-selected={day === tab.day}
                onClick={() => setDay(tab.day)}
                className={cn(
                  "min-h-12 flex-1 rounded-xl border text-sm font-semibold transition-colors",
                  day === tab.day
                    ? "border-accent bg-accent/15 text-fg-strong"
                    : "border-border bg-surface-2 text-muted hover:bg-surface-3",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-surface-2 sm:rounded-3xl">
            <p className="border-b border-border-soft px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted">
              Bản đồ khu vực · 2 mức
            </p>
            <VillageMap
              layer="dominant"
              day={day}
              detailLevel="simple"
              focusVillageId={villageId}
              className="min-h-[240px] lg:min-h-[320px]"
            />
          </div>

          {self && (
            <div className="rounded-2xl border border-border bg-surface-2 p-4 sm:rounded-3xl sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-base font-semibold text-fg-strong">Bạn có an toàn không?</p>
                <span className="rounded-md border border-dashed border-accent/50 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-accent">
                  Diễn tập
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Button
                  variant={status?.safetyStatus === "safe" ? "primary" : "secondary"}
                  className={cn(
                    "min-h-16 flex-col gap-1 text-sm",
                    status?.safetyStatus === "safe" && "ring-2 ring-positive",
                  )}
                  onClick={() => setSafetyStatus(self.id, "safe")}
                >
                  <ShieldCheck size={22} />
                  Tôi an toàn
                </Button>
                <Button
                  variant={status?.safetyStatus === "need_help" ? "danger" : "secondary"}
                  className="min-h-16 flex-col gap-1 text-sm"
                  onClick={() => setSafetyStatus(self.id, "need_help")}
                >
                  <HandHelping size={22} />
                  Tôi cần giúp đỡ
                </Button>
              </div>
              {status?.safetyStatusUpdatedAt && (
                <p className="mt-3 text-center text-xs text-muted">
                  Đã ghi nhận lúc {new Date(status.safetyStatusUpdatedAt).toLocaleTimeString("vi-VN")}
                </p>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
