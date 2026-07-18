import { Download } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { PageHeader, Card } from "../../shared/ui/PageHeader";
import { Button } from "../../shared/ui/Button";
import { ALERTS, VILLAGES } from "../../shared/domain/mockData";
import { HAZARD_TYPE_LABELS } from "../../shared/domain/labels";
import { HazardLevelBadge, TierBadge } from "../../shared/ui/HazardBadge";
import { Countdown } from "../../shared/ui/Countdown";

export function OfficerAlertsPage() {
  const [params] = useSearchParams();
  const villageFilter = params.get("village");
  const alerts = villageFilter ? ALERTS.filter((a) => a.villageId === villageFilter) : ALERTS;

  return (
    <div>
      <PageHeader
        eyebrow="Cán bộ PCTT xã"
        title="Lịch sử cảnh báo"
        description={villageFilter ? `Lọc theo bản: ${VILLAGES.find((v) => v.id === villageFilter)?.name}` : "Toàn xã"}
        actions={
          <Button variant="secondary" onClick={() => window.alert("Xuất báo cáo (mock) — dữ liệu dân cư trong báo cáo là dữ liệu mô phỏng, không phải PII thật.")}>
            <Download size={16} /> Xuất báo cáo
          </Button>
        }
      />
      <Card>
        <ul className="divide-y divide-border-soft">
          {alerts.map((alert) => {
            const village = VILLAGES.find((v) => v.id === alert.villageId);
            return (
              <li key={alert.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium text-fg">
                    {village?.name} — {HAZARD_TYPE_LABELS[alert.hazardType]}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    <Countdown deadlineUtc={alert.deadlineUtc} />
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <HazardLevelBadge level={alert.level} compact />
                  <TierBadge tier={alert.tier} size="sm" />
                </div>
              </li>
            );
          })}
          {alerts.length === 0 && <p className="py-3 text-sm text-muted">Không có cảnh báo trong phạm vi này.</p>}
        </ul>
      </Card>
    </div>
  );
}
