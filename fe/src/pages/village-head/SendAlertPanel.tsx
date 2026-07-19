import { AlertTriangle, CheckCircle2, Loader2, Radio } from "lucide-react";
import { useState } from "react";
import {
  sendVillageAlert,
  type AlertCreateRequest,
  type PublishAlertResponse,
} from "../../features/village-head/broadcastApi";
import type { HazardType, Tier } from "../../shared/domain/types";
import { useTranslation } from "../../shared/i18n/I18nProvider";
import { useLocalizedLabels } from "../../shared/i18n/useLocalizedLabels";
import { ApiError } from "../../shared/lib/api-client";
import { cn } from "../../shared/lib/cn";
import { Button } from "../../shared/ui/Button";

const HAZARD_OPTIONS: HazardType[] = ["flash_flood", "landslide"];
const DEADLINE_OPTIONS = [15, 30, 60] as const;

export function SendAlertPanel({ villageId }: { villageId: string | undefined }) {
  const { t } = useTranslation();
  const labels = useLocalizedLabels();
  const [hazardType, setHazardType] = useState<HazardType>("flash_flood");
  const [tier, setTier] = useState<Tier>("prepare");
  const [deadlineMinutes, setDeadlineMinutes] = useState<number>(30);
  const [whatHappened, setWhatHappened] = useState("");
  const [dangerDescription, setDangerDescription] = useState("");
  const [actionInstruction, setActionInstruction] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<PublishAlertResponse | null>(null);

  const isGoNow = tier === "go_now";
  const canSubmit = Boolean(
    villageId && whatHappened.trim() && dangerDescription.trim() && actionInstruction.trim(),
  );

  const reset = () => {
    setWhatHappened("");
    setDangerDescription("");
    setActionInstruction("");
    setStatus("idle");
    setResult(null);
    setErrorMessage(null);
  };

  const submit = async () => {
    if (!villageId || !canSubmit) return;

    setStatus("sending");
    setErrorMessage(null);
    const deadlineAt = new Date(Date.now() + deadlineMinutes * 60_000);
    const expiresAt = new Date(deadlineAt.getTime() + 3 * 60 * 60_000);
    const payload: AlertCreateRequest = {
      source: "manual",
      hazard_type: hazardType,
      level: isGoNow ? 5 : 3,
      tier,
      confidence: 1,
      what_happened: whatHappened.trim(),
      danger_description: dangerDescription.trim(),
      action_instruction: actionInstruction.trim(),
      deadline_at: deadlineAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      target_area_codes: [villageId],
    };

    try {
      const response = await sendVillageAlert(payload);
      setResult(response);
      setStatus("sent");
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : String(error));
      setStatus("error");
    }
  };

  if (status === "sent" && result) {
    return (
      <section className="rounded-lg border border-positive/30 bg-positive/10 p-4">
        <div className="flex items-start gap-2.5">
          <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-positive" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-fg-strong">
              {t("villageHead.sendAlert.successTitle")}
            </p>
            <p className="mt-1 text-sm leading-6 text-muted">
              {t("villageHead.sendAlert.successSummary", {
                recipients: result.recipient_count,
                deliveries: result.delivery_count,
              })}
            </p>
          </div>
        </div>
        <Button variant="secondary" className="mt-3 w-full" onClick={reset}>
          {t("villageHead.sendAlert.sendAnother")}
        </Button>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-surface-2 p-4">
      <div className="flex items-start gap-2.5">
        <Radio
          size={20}
          className={cn("mt-0.5 shrink-0", isGoNow ? "text-danger" : "text-accent")}
        />
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase text-muted">
            {t("villageHead.sendAlert.title")}
          </p>
          <p className="mt-1 text-sm leading-6 text-muted">
            {t("villageHead.sendAlert.description")}
          </p>
        </div>
      </div>

      <div className="mt-3.5 grid grid-cols-2 gap-2">
        {HAZARD_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setHazardType(option)}
            className={cn(
              "min-h-10 rounded-lg border px-2 text-sm font-semibold transition-colors",
              hazardType === option
                ? "border-accent bg-accent/10 text-accent"
                : "border-border-soft text-muted hover:bg-surface-3",
            )}
          >
            {labels.hazardType[option]}
          </button>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setTier("prepare")}
          className={cn(
            "min-h-10 rounded-lg border px-2 text-sm font-semibold transition-colors",
            tier === "prepare"
              ? "border-accent bg-accent/10 text-accent"
              : "border-border-soft text-muted hover:bg-surface-3",
          )}
        >
          {t("tier.prepare")}
        </button>
        <button
          type="button"
          onClick={() => setTier("go_now")}
          className={cn(
            "min-h-10 rounded-lg border px-2 text-sm font-semibold transition-colors",
            tier === "go_now"
              ? "border-danger bg-danger/10 text-danger"
              : "border-border-soft text-muted hover:bg-surface-3",
          )}
        >
          {t("tier.go_now")}
        </button>
      </div>

      <label className="mt-3.5 block text-xs font-bold uppercase text-muted">
        {t("villageHead.sendAlert.whatHappenedLabel")}
        <textarea
          value={whatHappened}
          onChange={(event) => setWhatHappened(event.target.value)}
          placeholder={t("villageHead.sendAlert.whatHappenedPlaceholder")}
          rows={2}
          className="mt-1.5 w-full rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm font-normal normal-case text-fg placeholder:text-muted-2"
        />
      </label>

      <label className="mt-3 block text-xs font-bold uppercase text-muted">
        {t("villageHead.sendAlert.dangerDescriptionLabel")}
        <textarea
          value={dangerDescription}
          onChange={(event) => setDangerDescription(event.target.value)}
          placeholder={t("villageHead.sendAlert.dangerDescriptionPlaceholder")}
          rows={2}
          className="mt-1.5 w-full rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm font-normal normal-case text-fg placeholder:text-muted-2"
        />
      </label>

      <label className="mt-3 block text-xs font-bold uppercase text-muted">
        {t("villageHead.sendAlert.actionInstructionLabel")}
        <textarea
          value={actionInstruction}
          onChange={(event) => setActionInstruction(event.target.value)}
          placeholder={t("villageHead.sendAlert.actionInstructionPlaceholder")}
          rows={2}
          className="mt-1.5 w-full rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm font-normal normal-case text-fg placeholder:text-muted-2"
        />
      </label>

      <p className="mt-3.5 text-xs font-bold uppercase text-muted">
        {t("villageHead.sendAlert.deadlineLabel")}
      </p>
      <div className="mt-1.5 grid grid-cols-3 gap-2">
        {DEADLINE_OPTIONS.map((minutes) => (
          <button
            key={minutes}
            type="button"
            onClick={() => setDeadlineMinutes(minutes)}
            className={cn(
              "min-h-10 rounded-lg border px-2 text-sm font-semibold transition-colors",
              deadlineMinutes === minutes
                ? "border-accent bg-accent/10 text-accent"
                : "border-border-soft text-muted hover:bg-surface-3",
            )}
          >
            {t(`villageHead.sendAlert.deadline${minutes}`)}
          </button>
        ))}
      </div>

      {status === "error" && errorMessage ? (
        <p className="mt-3 flex items-start gap-2 text-xs font-semibold text-danger">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {t("villageHead.sendAlert.errorPrefix")}: {errorMessage}
        </p>
      ) : null}

      {!villageId ? (
        <p className="mt-3 text-xs font-semibold text-danger">
          {t("villageHead.sendAlert.noVillageError")}
        </p>
      ) : null}

      <Button
        variant={isGoNow ? "danger" : "primary"}
        className="mt-4 w-full"
        disabled={!canSubmit || status === "sending"}
        onClick={() => void submit()}
      >
        {status === "sending" ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            {t("villageHead.sendAlert.sending")}
          </>
        ) : (
          <>
            <Radio size={18} />
            {t("villageHead.sendAlert.submitButton")}
          </>
        )}
      </Button>
    </section>
  );
}
