import { BellOff, BellRing } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../../shared/ui/Button";
import {
  disableWebPush,
  enableWebPush,
  getStoredWebPushSubscriptionStatus,
  getWebPushBrowserState,
  getWebPushEnvironment,
  refreshWebPushServiceWorker,
  type WebPushEnvironment,
} from "./webPush";

type PanelOperation = "checking" | "enabling" | "disabling" | null;

type PanelSnapshot = {
  isActive: boolean;
  message: string;
};

async function readPanelSnapshot(environment: WebPushEnvironment): Promise<PanelSnapshot> {
  const [browserState, databaseState] = await Promise.all([
    getWebPushBrowserState(),
    getStoredWebPushSubscriptionStatus(),
  ]);

  if (databaseState?.is_active && browserState.hasSubscription) {
    return {
      isActive: true,
      message: "Đã bật thông báo trên thiết bị này.",
    };
  }

  if (databaseState?.is_active && !browserState.hasSubscription) {
    return {
      isActive: false,
      message:
        "Thiết bị đang bật trong hệ thống nhưng trình duyệt đã mất kết nối thông báo. Bấm bật để đăng ký lại.",
    };
  }

  return {
    isActive: false,
    message:
      browserState.permission === "granted"
        ? "Thông báo đang tắt trên thiết bị này. Bạn có thể bật lại bất cứ lúc nào."
        : environment.guidance,
  };
}

export function WebPushPanel() {
  const environment = useMemo(() => getWebPushEnvironment(), []);
  const [isActive, setIsActive] = useState(false);
  const [operation, setOperation] = useState<PanelOperation>(null);
  const [message, setMessage] = useState(environment.guidance);
  const isWorking = operation !== null;

  useEffect(() => {
    let isMounted = true;

    const syncStatus = async () => {
      if (!environment.canAttempt) return;
      setOperation("checking");
      try {
        await refreshWebPushServiceWorker();
        const snapshot = await readPanelSnapshot(environment);
        if (!isMounted) return;
        setIsActive(snapshot.isActive);
        setMessage(snapshot.message);
      } catch (error) {
        if (!isMounted) return;
        setIsActive(false);
        setMessage(error instanceof Error ? error.message : environment.guidance);
      } finally {
        if (isMounted) setOperation(null);
      }
    };

    void syncStatus();

    return () => {
      isMounted = false;
    };
  }, [environment]);

  const toggle = async () => {
    if (isWorking) return;

    const shouldEnable = !isActive;
    setOperation(shouldEnable ? "enabling" : "disabling");
    setMessage(
      shouldEnable
        ? "Đang xin quyền và lưu thiết bị này..."
        : "Đang tắt thông báo trên thiết bị này...",
    );

    try {
      if (shouldEnable) await enableWebPush();
      else await disableWebPush();

      const snapshot = await readPanelSnapshot(environment);
      setIsActive(snapshot.isActive);
      if (snapshot.isActive !== shouldEnable) {
        throw new Error(
          shouldEnable
            ? "Thông báo chưa được bật hoàn tất. Hãy thử bật lại."
            : "Thông báo chưa được tắt hoàn tất. Hãy thử lại.",
        );
      }
      setMessage(snapshot.message);
    } catch (error) {
      try {
        const snapshot = await readPanelSnapshot(environment);
        setIsActive(snapshot.isActive);
      } catch {
        setIsActive(false);
      }
      setMessage(
        error instanceof Error
          ? error.message
          : shouldEnable
            ? "Không bật được thông báo."
            : "Không tắt được thông báo.",
      );
    } finally {
      setOperation(null);
    }
  };

  return (
    <section className="rounded-lg border border-border bg-surface-2 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
            {isActive ? <BellRing size={19} /> : <BellOff size={19} />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-fg-strong">Thông báo</p>
              <span
                className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                  isActive
                    ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-200"
                    : "border-border bg-surface-1 text-muted"
                }`}
              >
                {isActive ? "Đang bật" : "Đang tắt"}
              </span>
            </div>
            <p className="mt-1 text-sm leading-6 text-muted">{message}</p>
          </div>
        </div>
        <Button
          className="w-full shrink-0 justify-center sm:w-auto"
          variant={isActive ? "secondary" : "primary"}
          onClick={() => void toggle()}
          isLoading={isWorking}
          disabled={!environment.canAttempt}
        >
          {isActive ? <BellOff size={16} /> : <BellRing size={16} />}
          {isActive ? "Tắt thông báo" : "Bật thông báo"}
        </Button>
      </div>
    </section>
  );
}
