import { PageHeader, Card } from "../../shared/ui/PageHeader";
import { Alert } from "../../shared/ui/Alert";
import { BACKTEST_REPORT_MOCK, HAZARD_RUN_MOCK } from "../../shared/domain/mockData";

export function AdminCalibrationPage() {
  return (
    <div>
      <PageHeader eyebrow="Admin" title="Kiểm định mô hình" description="Phiên bản calibration/feature-stack đang ghim (chỉ đọc) + báo cáo backtest 25/7/2024." />

      <Card>
        <p className="text-sm font-semibold text-fg-strong">Artifact đang ghim (pinned)</p>
        <dl className="mt-3 grid grid-cols-2 gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted">Feature-stack version</dt>
            <dd className="font-mono text-fg">{HAZARD_RUN_MOCK.featureStackVersion}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Calibration version</dt>
            <dd className="font-mono text-fg">{HAZARD_RUN_MOCK.calibrationVersion}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs leading-5 text-muted-2">
          Chỉ đọc — sửa calibration nghĩa là publish artifact mới từ <code>ai/</code>, không phải
          form web (AD-1, AD-7).
        </p>
      </Card>

      <Card className="mt-4">
        <p className="text-sm font-semibold text-fg-strong">Backtest: {BACKTEST_REPORT_MOCK.event}</p>
        <Alert variant="info">Đánh giá nội bộ — không phải chứng nhận hiệu năng.</Alert>
        <dl className="mt-3 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs text-muted">Recall@τ</dt>
            <dd className="text-2xl font-bold text-positive">{Math.round(BACKTEST_REPORT_MOCK.recallAtTau * 100)}%</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Tỉ lệ báo động giả (FPR)</dt>
            <dd className="text-2xl font-bold text-accent">{Math.round(BACKTEST_REPORT_MOCK.falsePositiveRate * 100)}%</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs leading-5 text-muted-2">{BACKTEST_REPORT_MOCK.note}</p>
      </Card>
    </div>
  );
}
