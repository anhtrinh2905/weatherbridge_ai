import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  HelpCircle,
  MapPinned,
  Radio,
  Square,
  UsersRound,
  Volume2,
  type LucideIcon,
} from "lucide-react";
import { PageHeader, Card } from "../../shared/ui/PageHeader";
import { useAuth } from "../../features/auth/hooks";
import { AlertCard, SafeStatusCard } from "../../shared/ui/AlertCard";
import { SafetyDisclaimer } from "../../shared/ui/SafetyDisclaimer";
import { DataFreshnessBadge } from "../../shared/ui/DataFreshnessBadge";
import { Button } from "../../shared/ui/Button";
import { cn } from "../../shared/lib/cn";
import {
  getDominantLevel,
  getHighestTierAlert,
  getResidentsByVillage,
  getVillage,
  HAZARD_RUN_MOCK,
  triageScore,
} from "../../shared/domain/mockData";
import { useTranslation } from "../../shared/i18n/I18nProvider";
import { useLocalizedLabels } from "../../shared/i18n/useLocalizedLabels";
import { useResidentStatusStore } from "../../shared/domain/residentStatusStore";
import type { Alert, ResidentSim } from "../../shared/domain/types";
import { SendAlertPanel } from "./SendAlertPanel";

function StatCard({
  icon: Icon,
  label,
  value,
  tone = "default",
  helper,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: "default" | "positive" | "warning" | "danger";
  helper?: string;
}) {
  const toneClasses = {
    default: "border-border bg-surface-2 text-fg",
    positive: "border-positive/25 bg-positive/10 text-positive",
    warning: "border-accent/25 bg-accent/10 text-accent",
    danger: "border-danger/30 bg-danger/10 text-danger",
  };

  return (
    <div className={cn("rounded-lg border p-4", toneClasses[tone])}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
        <Icon size={18} aria-hidden />
      </div>
      <p className="mt-3 text-2xl font-bold text-fg-strong">{value}</p>
      {helper && <p className="mt-1 text-xs leading-5 text-muted">{helper}</p>}
    </div>
  );
}

function ResidentRow({ resident, visited }: { resident: ResidentSim; visited: boolean }) {
  const { t } = useTranslation();
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-border-soft bg-surface px-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-fg">{resident.fullName}</p>
        <p className="text-xs text-muted">
          {t("villageHead.overview.priorityScore", { score: triageScore(resident), age: resident.age })}
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold",
          visited ? "border-positive/25 bg-positive/10 text-positive" : "border-accent/25 bg-accent/10 text-accent",
        )}
      >
        {visited ? t("villageHead.overview.visited") : t("villageHead.overview.needsVisit")}
      </span>
    </li>
  );
}

function VillageBroadcastPanel({ alert }: { alert: Alert | undefined }) {
  const { t } = useTranslation();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const isGoNow = alert?.tier === "go_now";
  const audioSrc = alert ? `/audio/alerts/${isGoNow ? "go-now-vi-hmn.mp3" : "prepare-vi-hmn.mp3"}` : null;

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      window.speechSynthesis?.cancel();
    };
  }, []);

  // No pre-recorded file is bundled in this demo (see fe/public/audio/alerts/README.md — real
  // audio is intentionally hand-reviewed, not generated). Fall back to the browser's built-in
  // TTS so "Phát bản tin" is still audible end to end during a demo instead of silently erroring.
  const speakFallback = () => {
    if (!alert || !("speechSynthesis" in window)) {
      setIsPlaying(false);
      setError(t("villageHead.broadcast.missingAudio"));
      return;
    }
    setUsingFallback(true);
    setError(null);
    const script = [
      isGoNow ? t("villageHead.broadcast.goNowTitle") : t("villageHead.broadcast.prepareTitle"),
      alert.what,
      alert.howDangerous,
      alert.whatToDo,
    ].join(". ");
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(script);
    utterance.lang = "vi-VN";
    utterance.rate = 0.95;
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => {
      setIsPlaying(false);
      setError(t("villageHead.broadcast.missingAudio"));
    };
    setIsPlaying(true);
    window.speechSynthesis.speak(utterance);
  };

  const play = async () => {
    if (!audioSrc) return;
    setError(null);
    setUsingFallback(false);
    audioRef.current?.pause();
    window.speechSynthesis?.cancel();
    const audio = new Audio(audioSrc);
    audioRef.current = audio;
    audio.onended = () => setIsPlaying(false);
    audio.onerror = speakFallback;
    try {
      setIsPlaying(true);
      await audio.play();
    } catch {
      speakFallback();
    }
  };

  const stop = () => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    window.speechSynthesis?.cancel();
    setIsPlaying(false);
  };

  if (!alert) {
    return (
      <Card className="rounded-lg">
        <div className="flex items-center gap-3">
          <Radio className="text-muted" size={22} aria-hidden />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("villageHead.broadcast.title")}</p>
            <p className="mt-1 text-sm text-muted">{t("villageHead.broadcast.inactive")}</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("rounded-lg border-2", isGoNow ? "border-danger bg-danger/10" : "border-accent bg-accent/10")}>
      <div className="flex items-start gap-3">
        <Radio className={isGoNow ? "text-danger" : "text-accent"} size={24} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("villageHead.broadcast.title")}</p>
          <h2 className="mt-1 text-lg font-semibold text-fg-strong">
            {isGoNow ? t("villageHead.broadcast.goNowTitle") : t("villageHead.broadcast.prepareTitle")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            {isGoNow ? t("villageHead.broadcast.goNowDescription") : t("villageHead.broadcast.prepareDescription")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant={isGoNow ? "danger" : "primary"}
              className="min-h-10 rounded-lg px-4"
              onClick={play}
              disabled={isPlaying}
            >
              <Volume2 size={16} /> {isGoNow ? t("villageHead.broadcast.playGoNow") : t("villageHead.broadcast.playPrepare")}
            </Button>
            {isPlaying && (
              <Button variant="secondary" className="min-h-10 rounded-lg px-4" onClick={stop}>
                <Square size={14} /> {t("villageHead.broadcast.stop")}
              </Button>
            )}
          </div>
          <p className="mt-3 text-xs text-muted-2">
            {usingFallback ? t("villageHead.broadcast.ttsFallback") : t("villageHead.broadcast.assetHint", { file: audioSrc ?? "" })}
          </p>
          {error && <p className="mt-2 text-xs font-semibold text-danger">{error}</p>}
        </div>
      </div>
    </Card>
  );
}

export function VillageHeadOverviewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const labels = useLocalizedLabels();
  const villageId = user?.villageId ?? "muong-pon-1";
  const village = getVillage(villageId);
  const alert = getHighestTierAlert(villageId);
  const residents = getResidentsByVillage(villageId);
  const dominant = getDominantLevel(villageId, 0);
  const { getStatus } = useResidentStatusStore();

  const safeCount = residents.filter((r) => getStatus(r.id).safetyStatus === "safe").length;
  const needHelpCount = residents.filter((r) => getStatus(r.id).safetyStatus === "need_help").length;
  const unknownCount = residents.length - safeCount - needHelpCount;
  const priorityResidents = residents.filter((r) => r.priority === "vulnerable");
  const pendingPriority = priorityResidents.filter((r) => !getStatus(r.id).visitedByHeadAt);
  const nextVisits = [...priorityResidents].sort((a, b) => triageScore(b) - triageScore(a)).slice(0, 4);
  const alertTone = alert?.tier === "go_now" ? "danger" : alert ? "warning" : "positive";

  return (
    <div>
      <PageHeader
        eyebrow={t("role.village_head")}
        title={t("villageHead.overview.title", { village: village?.name ?? t("villageHead.overview.unknownVillage") })}
        description={t("villageHead.overview.description")}
        actions={
          <Button className="min-h-10 rounded-lg px-4" onClick={() => navigate("/village-head/residents")}>
            <UsersRound size={16} /> {t("villageHead.overview.openResidentList")}
          </Button>
        }
      />

      <section className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-4">
        <StatCard
          icon={AlertTriangle}
          label={t("villageHead.overview.villageStatus")}
          value={
            alert?.tier === "go_now"
              ? t("villageHead.overview.statusGoNow")
              : alert
                ? t("villageHead.overview.statusPrepare")
                : t("villageHead.overview.statusSafe")
          }
          tone={alertTone}
          helper={
            dominant
              ? `${labels.hazardLevel[dominant.level]} ${t("villageHead.overview.confidenceSuffix", { percent: Math.round(dominant.confidence * 100) })}`
              : undefined
          }
        />
        <StatCard
          icon={CheckCircle2}
          label={t("villageHead.overview.safeCount")}
          value={t("villageHead.overview.safeCountValue", { safe: safeCount, total: residents.length })}
          tone="positive"
          helper={t("villageHead.overview.unconfirmedHelper", { count: unknownCount })}
        />
        <StatCard
          icon={HelpCircle}
          label={t("villageHead.overview.needHelp")}
          value={t("villageHead.overview.needHelpValue", { count: needHelpCount })}
          tone={needHelpCount > 0 ? "danger" : "default"}
          helper={t("villageHead.overview.needHelpHelper")}
        />
        <StatCard
          icon={MapPinned}
          label={t("villageHead.overview.pendingVisits")}
          value={t("villageHead.overview.pendingVisitsValue", { count: pendingPriority.length })}
          tone={pendingPriority.length > 0 ? "warning" : "positive"}
          helper={t("villageHead.overview.pendingVisitsHelper", { count: priorityResidents.length })}
        />
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-4">
          {alert ? <AlertCard alert={alert} /> : <SafeStatusCard />}
          <SafetyDisclaimer />
        </div>

        <aside className="space-y-4">
          <SendAlertPanel villageId={village?.id} />

          <VillageBroadcastPanel alert={alert} />

          <Card className="rounded-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {t("villageHead.overview.alertData")}
                </p>
                <p className="mt-2 text-sm text-fg">
                  {alert
                    ? t("villageHead.overview.alertActive", { hazardType: labels.hazardType[alert.hazardType] })
                    : t("villageHead.overview.noActiveAlert")}
                </p>
              </div>
              <DataFreshnessBadge status="fresh" timestamp={HAZARD_RUN_MOCK.forecastIssued} />
            </div>
          </Card>

          <Card className="rounded-lg">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {t("villageHead.overview.nextTask")}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-fg-strong">
                  {t("villageHead.overview.nextTaskTitle")}
                </h2>
              </div>
              <Clock3 className="text-accent" size={20} aria-hidden />
            </div>
            <ul className="mt-4 space-y-2">
              {nextVisits.map((resident) => (
                <ResidentRow key={resident.id} resident={resident} visited={Boolean(getStatus(resident.id).visitedByHeadAt)} />
              ))}
            </ul>
            <Link to="/village-head/residents" className="mt-4 inline-flex text-sm font-semibold">
              {t("villageHead.overview.viewFullList")}
            </Link>
          </Card>
        </aside>
      </div>
    </div>
  );
}
