import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks";
import { HAZARD_TYPE_LABELS } from "../../shared/domain/labels";
import { HAZARD_RUN_MOCK, getHazardLevel, getVillage } from "../../shared/domain/mockData";
import type { HazardType } from "../../shared/domain/types";
import { HazardLevelBadge, ConfidenceBadge } from "../../shared/ui/HazardBadge";
import { SafetyDisclaimer } from "../../shared/ui/SafetyDisclaimer";

export function ResidentDetailsPage() {
  const { user } = useAuth();
  const villageId = user?.villageId ?? "muong-pon-1";
  const village = getVillage(villageId);

  return (
    <div className="space-y-4">
      <Link to="/resident" className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline">
        <ArrowLeft size={16} /> Quay lại
      </Link>

      <div>
        <p className="text-xs uppercase tracking-wide text-muted">Số liệu chi tiết — {village?.name}</p>
        <p className="mt-1 text-sm text-muted">
          Cập nhật lúc {new Date(HAZARD_RUN_MOCK.forecastIssued).toLocaleString("vi-VN")} · Nguồn: Open-Meteo (CC BY 4.0)
        </p>
      </div>

      {(["flash_flood", "landslide"] as HazardType[]).map((type) => {
        const hazard = getHazardLevel(villageId, type, 0);
        if (!hazard) return null;
        return (
          <div key={type} className="rounded-2xl border border-border bg-surface-2 p-4">
            <p className="text-sm font-semibold text-fg-strong">{HAZARD_TYPE_LABELS[type]}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <HazardLevelBadge level={hazard.level} />
              <ConfidenceBadge value={hazard.confidence} />
            </div>
          </div>
        );
      })}

      <div className="rounded-2xl border border-dashed border-border-strong p-4 text-xs leading-6 text-muted">
        Độ phân giải trong xã đến từ địa hình (30m), không phải từ thời tiết (~9–25km). Bản đồ
        không cá nhân hoá tới từng hộ dựa trên thời tiết.
      </div>

      <SafetyDisclaimer />
    </div>
  );
}
