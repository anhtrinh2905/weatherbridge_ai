import { apiClient } from "../../shared/lib/api-client";

type PushConfig = {
  public_key: string;
};

type TestPushResponse = {
  attempted: number;
  sent: number;
};

type PushSubscriptionResponse = {
  subscription_count: number;
};

function base64UrlToArrayBuffer(value: string): ArrayBuffer {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) {
    output[index] = raw.charCodeAt(index);
  }
  return output.buffer;
}

function assertWebPushSupport() {
  if (!("serviceWorker" in navigator)) throw new Error("Trình duyệt chưa hỗ trợ service worker.");
  if (!("PushManager" in window)) throw new Error("Trình duyệt chưa hỗ trợ Web Push.");
  if (!("Notification" in window)) throw new Error("Trình duyệt chưa hỗ trợ thông báo.");
}

export async function enableWebPush() {
  assertWebPushSupport();

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Bạn chưa cấp quyền nhận thông báo.");

  const { public_key: publicKey } = await apiClient.get<PushConfig>("/notifications/web-push/config");
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations
      .filter((item) => item.active?.scriptURL.endsWith("/web-push-sw.js"))
      .map((item) => item.unregister()),
  );

  let registration: ServiceWorkerRegistration;
  try {
    registration = await navigator.serviceWorker.register("/web-push-sw.js", {
      updateViaCache: "none",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.toLowerCase().includes("storage error")) {
      throw new Error("Chrome đang lỗi storage service worker. Hãy xóa dữ liệu site này rồi bật thông báo lại.", {
        cause: error,
      });
    }
    throw error;
  }

  const existing = await registration.pushManager.getSubscription();
  if (existing) await existing.unsubscribe();

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64UrlToArrayBuffer(publicKey),
  });

  return apiClient.post<PushSubscriptionResponse>(
    "/notifications/web-push/subscriptions",
    subscription.toJSON(),
  );
}

export async function sendTestWebPush(): Promise<TestPushResponse> {
  return apiClient.post<TestPushResponse>("/notifications/web-push/test", {
    title: "Weather Bridge AI",
    body: "Đây là thông báo thử từ hệ thống cảnh báo.",
    url: "/resident",
  });
}
