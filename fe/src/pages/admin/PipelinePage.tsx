import { PageHeader, Card } from "../../shared/ui/PageHeader";
import { Spinner } from "../../shared/ui/Spinner";
import { Alert } from "../../shared/ui/Alert";
import { Button } from "../../shared/ui/Button";
import { useTranslation } from "../../shared/i18n/I18nProvider";
import { useJobs, useRetryJob } from "../../features/admin/hooks";
import type { JobStatus } from "../../features/admin/api";

const STATUS_KEYS: Record<JobStatus, string> = {
  queued: "admin.pipeline.statusPending",
  running: "admin.pipeline.statusRunning",
  succeeded: "admin.pipeline.statusSucceeded",
  failed: "admin.pipeline.statusFailed",
};

const STATUS_CLASSES: Record<JobStatus, string> = {
  queued: "text-muted",
  running: "text-accent",
  succeeded: "text-positive",
  failed: "text-danger",
};

export function AdminPipelinePage() {
  const { t } = useTranslation();
  const { data: jobs, isPending, isError, error } = useJobs();
  const retry = useRetryJob();

  return (
    <div>
      <PageHeader
        eyebrow={t("role.admin")}
        title={t("admin.pipeline.title")}
        description={t("admin.pipeline.description")}
      />
      <Card>
        {isPending && <Spinner label={t("admin.pipeline.loading")} />}
        {isError && <Alert variant="error">{t("admin.pipeline.loadError", { error: error.message })}</Alert>}
        {jobs && jobs.length === 0 && <p className="py-3 text-sm text-muted">{t("admin.pipeline.empty")}</p>}
        {jobs && jobs.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border-soft text-xs uppercase tracking-wide text-muted">
                <th className="pb-2">{t("admin.pipeline.colJobId")}</th>
                <th className="pb-2">{t("admin.pipeline.colTask")}</th>
                <th className="pb-2">{t("admin.pipeline.colCreatedBy")}</th>
                <th className="pb-2">{t("admin.pipeline.colUpdatedAt")}</th>
                <th className="pb-2">{t("admin.pipeline.colStatus")}</th>
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
                        {STATUS_KEYS[status] ? t(STATUS_KEYS[status]) : job.status}
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
                          {t("admin.pipeline.retry")}
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
      <p className="mt-4 text-xs leading-5 text-muted-2">{t("admin.pipeline.footnote")}</p>
    </div>
  );
}
