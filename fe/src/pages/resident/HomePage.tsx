import { CheckCircle2, CloudLightning, CloudRain, CloudSun, HandHelping, ListChecks, MapPin, ShieldAlert, Volume2 } from "lucide-react";
import { useAuth } from "../../features/auth/hooks";
import { useWatchPoints } from "../../features/notifications/useWatchPoints";
import { WebPushPanel } from "../../features/notifications/WebPushPanel";
import { operationsApi, type AlertInboxItem, type WeatherActionPlan } from "../../features/operations/api";
import { useAcknowledgeAlert, useInbox, useResidentActions, useWeatherActions } from "../../features/operations/hooks";
import { getSelfResident } from "../../shared/domain/mockData";
import { cn } from "../../shared/lib/cn";
import { Button } from "../../shared/ui/Button";
import { HazardLevelBadge, TierBadge } from "../../shared/ui/HazardBadge";
import { SafetyDisclaimer } from "../../shared/ui/SafetyDisclaimer";
import { Spinner } from "../../shared/ui/Spinner";

const RISK_STYLE: Record<
  WeatherActionPlan["risk_level"],
  { wrap: string; accent: string; label: string; Icon: typeof CloudRain }
> = {
  normal: { wrap: "border-positive/30 bg-positive/5", accent: "text-positive", label: "Bình thường", Icon: CloudSun },
  watch: { wrap: "border-accent/30 bg-accent/5", accent: "text-accent", label: "Theo dõi", Icon: CloudRain },
  warning: { wrap: "border-accent/50 bg-accent/10", accent: "text-accent", label: "Cảnh báo", Icon: CloudRain },
  danger: { wrap: "border-danger/50 bg-danger/10", accent: "text-danger", label: "Nguy hiểm", Icon: CloudLightning },
};

type AdvisoryLocation = { key: string; label: string; latitude: number; longitude: number };

function WeatherAdvisoryCard({ label, latitude, longitude }: Omit<AdvisoryLocation, "key">) {
  const weather = useWeatherActions({ latitude, longitude, label });
  const plan = weather.data;
  const style = plan ? RISK_STYLE[plan.risk_level] : null;
  const Icon = style?.Icon ?? CloudRain;

  return (
    <article className={cn("flex flex-col gap-3 rounded-2xl border p-5", style ? style.wrap : "border-border bg-surface-2")}>
      <header className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <MapPin size={16} className="shrink-0 text-muted" />
          <h3 className="truncate font-semibold text-fg-strong">{label}</h3>
        </div>
        {style && (
          <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide", style.accent)}>
            <Icon size={13} /> {style.label}
          </span>
        )}
      </header>

      {weather.isPending && <p className="text-sm text-muted">Đang phân tích thời tiết…</p>}
      {weather.isError && <p className="text-sm text-danger">Chưa lấy được đề xuất cho điểm này.</p>}

      {plan && (
        <>
          <p className="flex items-start gap-2 text-sm text-muted">
            <Icon size={16} className={cn("mt-0.5 shrink-0", style?.accent)} />
            <span>{plan.weather_summary}</span>
          </p>
          {plan.risk_level !== "normal" && plan.risk_note && (
            <p className="rounded-lg bg-surface px-3 py-2 text-sm font-medium text-fg">{plan.risk_note}</p>
          )}
          {plan.summary && <p className="text-sm font-semibold text-fg-strong">{plan.summary}</p>}
          {plan.steps && plan.steps.length > 0 && (
            <ol className="list-decimal space-y-1 pl-5 text-sm text-fg">
              {plan.steps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          )}
          <p className="mt-auto pt-1 text-xs text-muted">Nguồn: Open-Meteo · Nội dung do AI đề xuất, chỉ tham khảo.</p>
        </>
      )}
    </article>
  );
}

function WeatherAdvisorySection() {
  const { user } = useAuth();
  const villageId = user?.villageId ?? "muong-pon-1";
  const self = getSelfResident(villageId);
  const { points } = useWatchPoints(self?.id);

  const locations: AdvisoryLocation[] = [];
  if (self && Number.isFinite(self.lat) && Number.isFinite(self.lon)) {
    locations.push({ key: "home", label: "Nhà của bạn", latitude: self.lat, longitude: self.lon });
  }
  points.forEach((point, index) => {
    if (Number.isFinite(point.lat) && Number.isFinite(point.lon)) {
      locations.push({ key: point.id, label: `Điểm theo dõi ${index + 1}`, latitude: point.lat, longitude: point.lon });
    }
  });

  if (locations.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <CloudRain size={18} className="text-accent" />
        <h2 className="font-semibold text-fg-strong">Đề xuất theo thời tiết</h2>
        <span className="ml-1 rounded-full bg-surface px-2 py-0.5 text-xs text-muted">{locations.length} địa điểm</span>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {locations.map((location) => (
          <WeatherAdvisoryCard key={location.key} label={location.label} latitude={location.latitude} longitude={location.longitude} />
        ))}
      </div>
    </section>
  );
}

function AlertActionPlan({ alert }: { alert: AlertInboxItem }) {
  const actions = useResidentActions();
  const plan = actions.data;
  return (
    <div className="mt-4">
      {!plan && (
        <Button
          variant="ghost"
          className="min-h-9 px-3"
          isLoading={actions.isPending}
          onClick={() =>
            actions.mutate({
              hazard_type: (alert.hazard_type as "flash_flood" | "landslide" | "fog" | null) ?? undefined,
              level: alert.level,
              tier: alert.tier as "prepare" | "go_now",
              what_happened: alert.what_happened,
              danger_description: alert.danger_description,
              action_instruction: alert.action_instruction,
              language: "vi",
            })
          }
        >
          <ListChecks size={15} /> Hướng dẫn chi tiết (AI)
        </Button>
      )}
      {actions.isError && (
        <p className="text-xs text-danger">Chưa tạo được hướng dẫn chi tiết. Vui lòng làm theo hướng dẫn ở trên.</p>
      )}
      {plan && (
        <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-fg-strong">
            <ListChecks size={16} className="text-accent" /> Các bước nên làm
          </p>
          {plan.summary && <p className="mt-1 text-sm text-muted">{plan.summary}</p>}
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-fg">
            {plan.steps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-muted">Nội dung do AI diễn giải từ cảnh báo — chỉ mang tính tham khảo.</p>
        </div>
      )}
    </div>
  );
}

export function ResidentHomePage() {
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
        <WeatherAdvisorySection />
      </div>

      <div className="px-4 sm:px-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Cảnh báo của bạn</p>
        <h1 className="mt-1 text-2xl font-semibold text-fg-strong">Theo dõi và phản hồi an toàn</h1>
      </div>

      <div className="space-y-4 px-4 sm:px-0">
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
            <AlertActionPlan alert={alert} />
            {alert.acknowledged_at && (
              <p className="mt-3 text-xs text-muted">Trạng thái: {alert.acknowledgement_status}</p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
