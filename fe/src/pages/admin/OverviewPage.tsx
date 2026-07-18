import { PageHeader, Card } from "../../shared/ui/PageHeader";
import { SafetyDisclaimer } from "../../shared/ui/SafetyDisclaimer";
import { DataFreshnessBadge } from "../../shared/ui/DataFreshnessBadge";
import { ALERTS, HAZARD_RUN_MOCK, VILLAGES } from "../../shared/domain/mockData";
import { TierBadge } from "../../shared/ui/HazardBadge";
import { HAZARD_TYPE_LABELS } from "../../shared/domain/labels";
import { Link } from "react-router-dom";

export function AdminOverviewPage() {
  const goNowCount = ALERTS.filter((a) => a.tier === "go_now").length;
  const prepareCount = ALERTS.filter((a) => a.tier === "prepare").length;

  return (
    <div>
      <PageHeader eyebrow="Admin" title="Tổng quan hệ thống" description="Trạng thái pipeline, cảnh báo hiệu lực và các việc cần chú ý." />
      <SafetyDisclaimer />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-wide text-muted">Bản đang ở mức "đi ngay"</p>
          <p className="mt-2 text-3xl font-bold text-danger">{goNowCount}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-muted">Bản đang ở mức "chuẩn bị"</p>
          <p className="mt-2 text-3xl font-bold text-accent">{prepareCount}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-muted">Tổng số bản theo dõi</p>
          <p className="mt-2 text-3xl font-bold text-fg-strong">{VILLAGES.length}</p>
        </Card>
      </div>

      <Card className="mt-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-fg-strong">Lần chạy pipeline gần nhất</p>
          <DataFreshnessBadge status="fresh" timestamp={HAZARD_RUN_MOCK.forecastIssued} />
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-muted">Run ID</dt>
            <dd className="font-mono text-fg">{HAZARD_RUN_MOCK.runId}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Feature stack</dt>
            <dd className="font-mono text-fg">{HAZARD_RUN_MOCK.featureStackVersion}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Calibration</dt>
            <dd className="font-mono text-fg">{HAZARD_RUN_MOCK.calibrationVersion}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Trạng thái</dt>
            <dd className="font-medium text-positive">Thành công</dd>
          </div>
        </dl>
        <Link to="/admin/pipeline" className="mt-3 inline-block text-sm text-accent hover:underline">
          Xem lịch sử pipeline →
        </Link>
      </Card>

      <Card className="mt-6">
        <p className="text-sm font-semibold text-fg-strong">Cảnh báo hiệu lực</p>
        <ul className="mt-3 divide-y divide-border-soft">
          {ALERTS.map((alert) => {
            const village = VILLAGES.find((v) => v.id === alert.villageId);
            return (
              <li key={alert.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="text-fg">
                  {village?.name} — {HAZARD_TYPE_LABELS[alert.hazardType]}
                </span>
                <TierBadge tier={alert.tier} size="sm" />
              </li>
            );
          })}
          {ALERTS.length === 0 && <p className="py-3 text-sm text-muted">Không có cảnh báo hiệu lực.</p>}
        </ul>
      </Card>
    </div>
  );
}
