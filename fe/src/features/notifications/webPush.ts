import { apiClient } from "../../shared/lib/api-client";

type PushConfig = {
  public_key: string;
};

type PushSubscriptionResponse = {
  id: string;
  is_active: boolean;
  last_seen_at: string;
};

const CONTACT_ID_STORAGE_KEY = "wba:web-push-contact-id";

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
  for (let index = 0; index < raw.length; index += 1) output[index] = raw.charCodeAt(index);
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
    guidance = "iPhone/iPad: mở bằng Safari, bấm Chia sẻ > Thêm vào Màn hình chính, rồi mở Weather Bridge AI từ icon đó.";
  } else if (!hasApis) {
    guidance = android
      ? "Trình duyệt Android này chưa hỗ trợ Web Push. Hãy thử Chrome bản mới hoặc mở link bằng Chrome đầy đủ."
      : "Trình duyệt này chưa hỗ trợ Web Push.";
  } else if (android) {
    guidance = "Android Chrome/Google: có thể bật thông báo trực tiếp trên link HTTPS này.";
  } else if (ios) {
    guidance = "iPhone/iPad PWA: có thể bật thông báo sau khi mở từ icon trên màn hình chính.";
  }

  return { isIos: ios, isAndroid: android, isStandalone: standalone, isSecureContext: window.isSecureContext, canAttempt, guidance };
}

function assertWebPushSupport() {
  const environment = getWebPushEnvironment();
  if (!environment.canAttempt) throw new Error(environment.guidance);
}

export async function enableWebPush(): Promise<PushSubscriptionResponse> {
  assertWebPushSupport();
  const { public_key: publicKey } = await apiClient.get<PushConfig>("/notifications/web-push/config");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Bạn chưa cấp quyền nhận thông báo.");

  const registration = await navigator.serviceWorker.register("/web-push-sw.js", { updateViaCache: "none" });
  await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription()
    ?? await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToArrayBuffer(publicKey),
    });
  const result = await apiClient.post<PushSubscriptionResponse>(
    "/notifications/web-push/subscriptions",
    subscription.toJSON(),
  );
  localStorage.setItem(CONTACT_ID_STORAGE_KEY, result.id);
  return result;
}

export async function disableWebPush() {
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) await subscription.unsubscribe();
  const contactId = localStorage.getItem(CONTACT_ID_STORAGE_KEY);
  if (contactId) await apiClient.delete<void>(`/notifications/web-push/subscriptions/${contactId}`);
  localStorage.removeItem(CONTACT_ID_STORAGE_KEY);
}
