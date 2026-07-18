import { useState } from "react";
import { CheckCircle2, HandHelping, ShieldAlert, Volume2 } from "lucide-react";
import { WebPushPanel } from "../../features/notifications/WebPushPanel";
import { operationsApi } from "../../features/operations/api";
import { useAcknowledgeAlert, useInbox } from "../../features/operations/hooks";
import { HeatmapView } from "../../features/heatmap/HeatmapView";
import { Button } from "../../shared/ui/Button";
import { HazardLevelBadge, TierBadge } from "../../shared/ui/HazardBadge";
import { SafetyDisclaimer } from "../../shared/ui/SafetyDisclaimer";
import { Spinner } from "../../shared/ui/Spinner";

export function ResidentHomePage() {
  const [day, setDay] = useState(0);
  const inbox = useInbox();
  const acknowledge = useAcknowledgeAlert();

  const playAudio = async (alertId: string) => {
    const audio = await operationsApi.alertAudio(alertId);
    const url = URL.createObjectURL(audio);
    const player = new Audio(url);
    player.addEventListener("ended", () => URL.revokeObjectURL(url), { once: true });
    await player.play();
  };

  if (inbox.isPending) return <Spinner label="Đang tải cảnh báo" />;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="space-y-4 px-4 sm:px-0">
        <SafetyDisclaimer />
        <WebPushPanel />
      </div>

      <div className="px-4 sm:px-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Cảnh báo của bạn</p>
        <h1 className="mt-1 text-2xl font-semibold text-fg-strong">Theo dõi và phản hồi an toàn</h1>
      </div>

      <div className="grid items-start gap-5 px-4 sm:px-0 lg:grid-cols-12 lg:gap-6">
        <section className="lg:col-span-7">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Bản đồ nguy cơ</p>
          <HeatmapView compact variant="resident" day={day} onDayChange={setDay} hideChrome />
        </section>

        <aside className="space-y-4 lg:col-span-5">
          {inbox.isError && (
            <p className="rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
              Không thể tải hộp thư cảnh báo.
            </p>
          )}
          {inbox.data?.length === 0 && (
            <div className="rounded-lg border border-positive/30 bg-positive/10 p-6 text-center">
              <CheckCircle2 className="mx-auto text-positive" size={32} />
              <p className="mt-3 font-semibold">Chưa có cảnh báo đang hiệu lực</p>
            </div>
          )}
          {inbox.data?.map((alert) => (
            <article key={alert.alert_id} className="rounded-lg border border-border bg-surface-2 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="text-accent" size={20} />
                  <span className="font-semibold">{alert.hazard_type ?? "Cảnh báo"}</span>
                </div>
                <div className="flex gap-2">
                  <HazardLevelBadge level={alert.level as 1 | 2 | 3 | 4 | 5} compact />
                  <TierBadge tier={alert.tier as "prepare" | "go_now"} size="sm" />
                </div>
              </div>
              <h2 className="mt-4 text-lg font-semibold text-fg-strong">{alert.what_happened}</h2>
              <p className="mt-2 text-sm text-muted">{alert.danger_description}</p>
              <p className="mt-3 rounded-lg bg-surface px-3 py-2 text-sm font-medium text-fg">
                {alert.action_instruction}
              </p>
              <p className="mt-3 text-xs text-muted">
                Thực hiện trước: {new Date(alert.deadline_at).toLocaleString("vi-VN")}
              </p>
              {alert.is_locale_fallback && (
                <p className="mt-2 text-xs text-muted">Đang hiển thị nội dung tiếng Việt đã được phát hành.</p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  className="min-h-9 px-3"
                  isLoading={acknowledge.isPending}
                  onClick={() => acknowledge.mutate({ id: alert.alert_id, status: "seen" })}
                >
                  Đã xem
                </Button>
                <Button
                  className="min-h-9 px-3"
                  isLoading={acknowledge.isPending}
                  onClick={() => acknowledge.mutate({ id: alert.alert_id, status: "safe" })}
                >
                  <CheckCircle2 size={15} /> Tôi an toàn
                </Button>
                <Button
                  variant="danger"
                  className="min-h-9 px-3"
                  isLoading={acknowledge.isPending}
                  onClick={() => acknowledge.mutate({ id: alert.alert_id, status: "need_help" })}
                >
                  <HandHelping size={15} /> Cần hỗ trợ
                </Button>
                {alert.audio_available && (
                  <Button variant="ghost" className="min-h-9 px-3" onClick={() => void playAudio(alert.alert_id)}>
                    <Volume2 size={15} /> Nghe
                  </Button>
                )}
              </div>
              {alert.acknowledged_at && (
                <p className="mt-3 text-xs text-muted">Trạng thái: {alert.acknowledgement_status}</p>
              )}
            </article>
          ))}
        </aside>
      </div>
    </div>
  );
}
