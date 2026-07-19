import { ApiError, apiClient } from "../../shared/lib/api-client";
import type { components } from "../../shared/api/generated";

type PushConfig = components["schemas"]["WebPushConfigResponse"];
type PushSubscriptionResponse = components["schemas"]["WebPushSubscriptionResponse"];
type PushSubscriptionStatusResponse =
  components["schemas"]["WebPushSubscriptionStatusResponse"];

const CONTACT_ID_STORAGE_KEY = "wba:web-push-contact-id";
const WEB_PUSH_SERVICE_WORKER_URL = "/web-push-sw.js?v=2";

export type WebPushEnvironment = {
  isIos: boolean;
  isAndroid: boolean;
  isStandalone: boolean;
  isSecureContext: boolean;
  canAttempt: boolean;
  guidance: string;
};

export type WebPushBrowserState = {
  permission: NotificationPermission | "unsupported";
  hasSubscription: boolean;
  contactId: string | null;
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
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

function isStandaloneWebApp() {
  return (
    Boolean(window.matchMedia?.("(display-mode: standalone)").matches) ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

export function getWebPushEnvironment(): WebPushEnvironment {
  const ios = isIos();
  const android = isAndroid();
  const standalone = isStandaloneWebApp();
  const hasApis =
    "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  const canAttempt = window.isSecureContext && hasApis && (!ios || standalone);
  let guidance = "Bật thông báo để nhận cảnh báo ngay cả khi không mở trang.";

  if (!window.isSecureContext) {
    guidance =
      "Thông báo cần HTTPS. Trên điện thoại hãy mở bằng link HTTPS, không dùng IP LAN hoặc http.";
  } else if (ios && !standalone) {
    guidance =
      "iPhone/iPad: mở bằng Safari, bấm Chia sẻ > Thêm vào Màn hình chính, rồi mở Weather Bridge AI từ icon đó.";
  } else if (!hasApis) {
    guidance = android
      ? "Trình duyệt Android này chưa hỗ trợ thông báo. Hãy thử Chrome bản mới hoặc mở link bằng Chrome đầy đủ."
      : "Trình duyệt này chưa hỗ trợ thông báo.";
  } else if (android) {
    guidance = "Android Chrome/Google: có thể bật thông báo trực tiếp trên link HTTPS này.";
  } else if (ios) {
    guidance =
      "iPhone/iPad PWA: có thể bật thông báo sau khi mở từ icon trên màn hình chính.";
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
  if (!environment.canAttempt) throw new Error(environment.guidance);
}

export async function getWebPushBrowserState(): Promise<WebPushBrowserState> {
  const permission = "Notification" in window ? Notification.permission : "unsupported";
  const registration =
    "serviceWorker" in navigator
      ? await navigator.serviceWorker.getRegistration()
      : undefined;
  const subscription = await registration?.pushManager.getSubscription();

  return {
    permission,
    hasSubscription: Boolean(subscription),
    contactId: localStorage.getItem(CONTACT_ID_STORAGE_KEY),
  };
}

export async function refreshWebPushServiceWorker(): Promise<void> {
  assertWebPushSupport();
  const registration = await navigator.serviceWorker.register(
    WEB_PUSH_SERVICE_WORKER_URL,
    { updateViaCache: "none" },
  );
  await registration.update();
}

export async function getStoredWebPushSubscriptionStatus(): Promise<PushSubscriptionStatusResponse | null> {
  const contactId = localStorage.getItem(CONTACT_ID_STORAGE_KEY);
  if (!contactId) return null;

  try {
    return await apiClient.get<PushSubscriptionStatusResponse>(
      `/notifications/web-push/subscriptions/${contactId}`,
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      localStorage.removeItem(CONTACT_ID_STORAGE_KEY);
      return null;
    }
    throw error;
  }
}

async function requestNotificationPermission(): Promise<void> {
  if (Notification.permission === "granted") return;
  if (Notification.permission === "denied") {
    throw new Error(
      "Thông báo đang bị chặn. Hãy vào Cài đặt của trình duyệt/app và cho phép thông báo cho Weather Bridge AI.",
    );
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(
      "Bạn chưa cấp quyền nhận thông báo. Trên iPhone cần mở từ icon đã thêm vào Màn hình chính rồi bấm Bật thông báo.",
    );
  }
}

async function waitForActiveServiceWorker(
  timeoutMs = 15000,
): Promise<ServiceWorkerRegistration> {
  const timeout = new Promise<ServiceWorkerRegistration>((_, reject) => {
    window.setTimeout(() => {
      reject(
        new Error("Service worker chưa sẵn sàng. Hãy tải lại app rồi bật thông báo lại."),
      );
    }, timeoutMs);
  });

  const registration = await Promise.race([navigator.serviceWorker.ready, timeout]);
  if (!registration.active) {
    throw new Error("Service worker chưa active. Hãy tải lại app rồi bật thông báo lại.");
  }

  return registration;
}

export async function enableWebPush(): Promise<PushSubscriptionResponse> {
  assertWebPushSupport();
  await requestNotificationPermission();

  const { public_key: publicKey } = await apiClient.get<PushConfig>(
    "/notifications/web-push/config",
  );

  await navigator.serviceWorker.register(WEB_PUSH_SERVICE_WORKER_URL, {
    updateViaCache: "none",
  });
  const registration = await waitForActiveServiceWorker();
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToArrayBuffer(publicKey),
    }));
  const result = await apiClient.post<PushSubscriptionResponse>(
    "/notifications/web-push/subscriptions",
    subscription.toJSON(),
  );
  localStorage.setItem(CONTACT_ID_STORAGE_KEY, result.id);
  return result;
}

export async function disableWebPush() {
  const contactId = localStorage.getItem(CONTACT_ID_STORAGE_KEY);
  if (contactId) {
    try {
      await apiClient.delete<void>(
        `/notifications/web-push/subscriptions/${contactId}`,
      );
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 404)) throw error;
    }
  }

  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  try {
    if (subscription) await subscription.unsubscribe();
  } finally {
    localStorage.removeItem(CONTACT_ID_STORAGE_KEY);
  }
}
