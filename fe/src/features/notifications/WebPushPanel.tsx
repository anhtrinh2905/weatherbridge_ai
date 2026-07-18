import { BellRing, Send } from "lucide-react";
import { useState } from "react";
import { Button } from "../../shared/ui/Button";
import { enableWebPush, sendTestWebPush } from "./webPush";

type PanelStatus = "idle" | "ready" | "sending" | "sent" | "error";

export function WebPushPanel() {
  const [status, setStatus] = useState<PanelStatus>("idle");
  const [message, setMessage] = useState("Bật thông báo để nhận cảnh báo ngay cả khi không mở trang.");

  const enable = async () => {
    setStatus("ready");
    setMessage("Đang xin quyền và lưu subscription...");
    try {
      const result = await enableWebPush();
      setStatus("ready");
      setMessage(`Đã bật Web Push trên trình duyệt này. Backend đang lưu ${result.subscription_count} subscription.`);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Không bật được Web Push.");
    }
  };

  const sendTest = async () => {
    setStatus("sending");
    setMessage("Đang gửi thông báo thử...");
    try {
      const result = await sendTestWebPush();
      setStatus("sent");
      setMessage(
        result.sent > 0
          ? `Đã gửi ${result.sent}/${result.attempted} thông báo thử.`
          : "Chưa có subscription nào trên backend. Bấm bật thông báo trước.",
      );
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Không gửi được thông báo thử.");
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
        <Button variant={status === "ready" || status === "sent" ? "secondary" : "primary"} onClick={enable}>
          <BellRing size={16} /> Bật thông báo
        </Button>
        <Button variant="secondary" onClick={sendTest} isLoading={status === "sending"}>
          <Send size={16} /> Gửi thử
        </Button>
      </div>
    </section>
  );
}
