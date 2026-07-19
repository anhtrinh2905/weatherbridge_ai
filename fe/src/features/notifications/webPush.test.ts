import { beforeEach, expect, test, vi } from "vitest";
import { disableWebPush, enableWebPush } from "./webPush";

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("../../shared/lib/api-client", () => {
  class ApiError extends Error {
    constructor(
      public readonly status: number,
      public readonly body: unknown,
    ) {
      super(`Request failed with status ${status}`);
    }
  }

  return {
    ApiError,
    apiClient: api,
  };
});

const contactIdKey = "wba:web-push-contact-id";

beforeEach(() => {
  localStorage.clear();
  api.get.mockReset();
  api.post.mockReset();
  api.delete.mockReset();

  Object.defineProperty(window, "isSecureContext", {
    configurable: true,
    value: true,
  });
  Object.defineProperty(window, "PushManager", {
    configurable: true,
    value: class PushManager {},
  });
  Object.defineProperty(window, "Notification", {
    configurable: true,
    value: {
      permission: "granted",
      requestPermission: vi.fn(async () => "granted"),
    },
  });
  Object.defineProperty(globalThis, "Notification", {
    configurable: true,
    value: window.Notification,
  });
});

test("disables the backend record before unsubscribing and remains safe when repeated", async () => {
  const callOrder: string[] = [];
  let subscription: { unsubscribe: ReturnType<typeof vi.fn> } | null = {
    unsubscribe: vi.fn(async () => {
      callOrder.push("browser");
      subscription = null;
      return true;
    }),
  };
  const registration = {
    pushManager: {
      getSubscription: vi.fn(async () => subscription),
    },
  };
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: {
      getRegistration: vi.fn(async () => registration),
    },
  });
  api.delete.mockImplementation(async () => {
    callOrder.push("database");
  });
  localStorage.setItem(contactIdKey, "contact-id");

  await disableWebPush();
  await disableWebPush();

  expect(callOrder).toEqual(["database", "browser"]);
  expect(api.delete).toHaveBeenCalledTimes(1);
  expect(localStorage.getItem(contactIdKey)).toBeNull();
});

test("enabling again reuses the current browser subscription", async () => {
  const existingSubscription = {
    toJSON: vi.fn(() => ({
      endpoint: "https://push.example.test/device",
      expirationTime: null,
      keys: { p256dh: "public", auth: "secret" },
    })),
  };
  const subscribe = vi.fn();
  const registration = {
    active: {},
    pushManager: {
      getSubscription: vi.fn(async () => existingSubscription),
      subscribe,
    },
  };
  const register = vi.fn(async () => registration);
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: {
      register,
      ready: Promise.resolve(registration),
    },
  });
  api.get.mockResolvedValue({ public_key: "AQID" });
  api.post.mockResolvedValue({
    id: "contact-id",
    is_active: true,
    last_seen_at: new Date().toISOString(),
  });

  await enableWebPush();

  expect(register).toHaveBeenCalledTimes(1);
  expect(subscribe).not.toHaveBeenCalled();
  expect(api.post).toHaveBeenCalledWith(
    "/notifications/web-push/subscriptions",
    existingSubscription.toJSON(),
  );
  expect(localStorage.getItem(contactIdKey)).toBe("contact-id");
});
