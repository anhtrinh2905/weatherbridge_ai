import { BellOff, BellRing } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../../shared/ui/Button";
import { disableWebPush, enableWebPush, getWebPushEnvironment } from "./webPush";

type PanelStatus = "idle" | "working" | "active" | "error";

export function WebPushPanel() {
  const environment = useMemo(() => getWebPushEnvironment(), []);
  const [status, setStatus] = useState<PanelStatus>("idle");
  const [message, setMessage] = useState(environment.guidance);

  const enable = async () => {
    setStatus("working");
    setMessage("Đang xin quyền và lưu thiết bị này...");
    try {
      await enableWebPush();
      setStatus("active");
      setMessage("Đã bật Web Push trên trình duyệt này. Cảnh báo phù hợp sẽ được gửi qua luồng thông báo chính thức.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Không bật được Web Push.");
    }
  };

  const disable = async () => {
    setStatus("working");
    setMessage("Đang tắt thông báo trên thiết bị này...");
    try {
      await disableWebPush();
      setStatus("idle");
      setMessage(environment.guidance);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Không tắt được Web Push.");
    }
  };

  return (
    <section className="rounded-lg border border-border bg-surface-2 p-4">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
          <BellRing size={19} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-fg-strong">Thông báo Web Push</p>
          <p className="mt-1 text-sm leading-6 text-muted">{message}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Button variant={status === "active" ? "secondary" : "primary"} onClick={enable} isLoading={status === "working"}>
          <BellRing size={16} /> Bật thông báo
        </Button>
        <Button variant="secondary" onClick={disable} isLoading={status === "working"}>
          <BellOff size={16} /> Tắt trên thiết bị này
        </Button>
      </div>
    </section>
  );
}
