import { PageHeader, Card } from "../../shared/ui/PageHeader";
import { Spinner } from "../../shared/ui/Spinner";
import { Alert } from "../../shared/ui/Alert";
import { Button } from "../../shared/ui/Button";
import { useJobs, useRetryJob } from "../../features/admin/hooks";
import type { JobStatus } from "../../features/admin/api";

const STATUS_LABELS: Record<JobStatus, string> = {
  queued: "Chờ xử lý",
  running: "Đang chạy",
  succeeded: "Thành công",
  failed: "Thất bại",
};

const STATUS_CLASSES: Record<JobStatus, string> = {
  queued: "text-muted",
  running: "text-accent",
  succeeded: "text-positive",
  failed: "text-danger",
};

export function AdminPipelinePage() {
  const { data: jobs, isPending, isError, error } = useJobs();
  const retry = useRetryJob();

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Pipeline & vận hành"
        description="Hàng đợi job (AI + forecast ingest) — worker chạy toàn chuỗi refresh, API chỉ đọc kết quả (AD-5)."
      />
      <Card>
        {isPending && <Spinner label="Đang tải danh sách job" />}
        {isError && <Alert variant="error">Không tải được job: {error.message}</Alert>}
        {jobs && jobs.length === 0 && <p className="py-3 text-sm text-muted">Chưa có job nào.</p>}
        {jobs && jobs.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border-soft text-xs uppercase tracking-wide text-muted">
                <th className="pb-2">Job ID</th>
                <th className="pb-2">Tác vụ</th>
                <th className="pb-2">Người tạo</th>
                <th className="pb-2">Cập nhật</th>
                <th className="pb-2">Trạng thái</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-soft">
              {jobs.map((job) => {
                const status = job.status as JobStatus;
                return (
                  <tr key={job.id}>
                    <td className="py-2.5 font-mono text-xs text-fg">{job.id.slice(0, 8)}</td>
                    <td className="py-2.5 font-mono text-xs text-muted">{job.task}</td>
                    <td className="py-2.5 font-mono text-xs text-muted">{job.user_id}</td>
                    <td className="py-2.5 text-fg">
                      {new Date(job.updated_at).toLocaleString("vi-VN")}
                    </td>
                    <td className="py-2.5">
                      <span className={`font-medium ${STATUS_CLASSES[status] ?? "text-fg"}`}>
                        {STATUS_LABELS[status] ?? job.status}
                      </span>
                      {status === "failed" && job.error && (
                        <p className="mt-0.5 text-xs text-danger/80">{job.error}</p>
                      )}
                    </td>
                    <td className="py-2.5 text-right">
                      {status === "failed" && (
                        <Button
                          variant="secondary"
                          className="min-h-9 px-3 text-xs"
                          isLoading={retry.isPending && retry.variables === job.id}
                          onClick={() => retry.mutate(job.id)}
                        >
                          Chạy lại
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
      <p className="mt-4 text-xs leading-5 text-muted-2">
        Run là bất biến — không có thao tác "sửa lại kết quả". Job thất bại có thể chạy lại (re-enqueue);
        nếu artifact ghim (calibration/feature-stack) bị thiếu, run phải chuyển trạng thái thất bại rõ
        ràng thay vì chạy với dữ liệu sai (AD-7, fail-closed).
      </p>
    </div>
  );
}
