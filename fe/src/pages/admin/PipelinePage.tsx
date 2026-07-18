import { PageHeader, Card } from "../../shared/ui/PageHeader";
import { HAZARD_RUN_MOCK } from "../../shared/domain/mockData";
import { CheckCircle2 } from "lucide-react";

const HISTORY = [
  HAZARD_RUN_MOCK,
  { runId: "run-mock-0000", forecastIssued: new Date(Date.now() - 6 * 3600 * 1000).toISOString(), status: "succeeded" as const, featureStackVersion: "stack-20260718-1", calibrationVersion: "calib-20260718-1" },
  { runId: "run-mock-0000-a", forecastIssued: new Date(Date.now() - 12 * 3600 * 1000).toISOString(), status: "succeeded" as const, featureStackVersion: "stack-20260717-3", calibrationVersion: "calib-20260718-1" },
];

export function AdminPipelinePage() {
  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Pipeline & vận hành"
        description="Lịch sử hazard_run — worker chạy toàn chuỗi refresh, API chỉ đọc kết quả (AD-5)."
      />
      <Card>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border-soft text-xs uppercase tracking-wide text-muted">
              <th className="pb-2">Run ID</th>
              <th className="pb-2">Thời điểm dự báo</th>
              <th className="pb-2">Feature stack</th>
              <th className="pb-2">Calibration</th>
              <th className="pb-2">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-soft">
            {HISTORY.map((run) => (
              <tr key={run.runId}>
                <td className="py-2.5 font-mono text-xs text-fg">{run.runId}</td>
                <td className="py-2.5 text-fg">{new Date(run.forecastIssued).toLocaleString("vi-VN")}</td>
                <td className="py-2.5 font-mono text-xs text-muted">{run.featureStackVersion}</td>
                <td className="py-2.5 font-mono text-xs text-muted">{run.calibrationVersion}</td>
                <td className="py-2.5">
                  <span className="inline-flex items-center gap-1.5 text-positive">
                    <CheckCircle2 size={14} /> Thành công
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="mt-4 text-xs leading-5 text-muted-2">
        Run là bất biến — không có thao tác "sửa lại kết quả". Nếu artifact ghim (calibration/
        feature-stack) bị thiếu, run phải chuyển trạng thái thất bại rõ ràng thay vì chạy với dữ
        liệu sai (AD-7, fail-closed).
      </p>
    </div>
  );
}
