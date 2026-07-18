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

export type WebPushEnvironment = {
  isIos: boolean;
  isAndroid: boolean;
  isStandalone: boolean;
  isSecureContext: boolean;
  canAttempt: boolean;
  guidance: string;
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

function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

function isStandaloneWebApp() {
  return Boolean(window.matchMedia?.("(display-mode: standalone)").matches)
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export function getWebPushEnvironment(): WebPushEnvironment {
  const ios = isIos();
  const android = isAndroid();
  const standalone = isStandaloneWebApp();
  const hasApis = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  const canAttempt = window.isSecureContext && hasApis && (!ios || standalone);
  let guidance = "Bật thông báo để nhận cảnh báo ngay cả khi không mở trang.";

  if (!window.isSecureContext) {
    guidance = "Thông báo cần HTTPS. Trên điện thoại hãy mở bằng link HTTPS, không dùng IP LAN hoặc http.";
  } else if (ios && !standalone) {
    guidance = "iPhone/iPad: mở bằng Safari, bấm Chia sẻ > Thêm vào Màn hình chính, rồi mở icon Weather Bridge AI để bật thông báo.";
  } else if (!hasApis) {
    guidance = android
      ? "Trình duyệt Android này chưa hỗ trợ Web Push. Hãy thử Chrome bản mới hoặc mở link bằng Chrome đầy đủ."
      : "Trình duyệt này chưa hỗ trợ Web Push.";
  } else if (android) {
    guidance = "Android Chrome/Google: có thể bật thông báo trực tiếp trên link HTTPS này.";
  } else if (ios) {
    guidance = "iPhone/iPad PWA: có thể bật thông báo sau khi mở từ icon trên màn hình chính.";
  }

  return {
    isIos: ios,
    isAndroid: android,
    isStandalone: standalone,
    isSecureContext: window.isSecureContext,
    canAttempt,
    guidance,
  };
}

function assertWebPushSupport() {
  const environment = getWebPushEnvironment();
  if (!environment.isSecureContext) throw new Error("Thông báo cần HTTPS. Hãy mở bằng link HTTPS, không dùng IP LAN hoặc http.");
  if (environment.isIos && !environment.isStandalone) {
    throw new Error("iPhone/iPad chỉ nhận Web Push khi mở app từ màn hình chính. Trong Safari bấm Chia sẻ > Thêm vào Màn hình chính, rồi mở icon Weather Bridge AI.");
  }
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
