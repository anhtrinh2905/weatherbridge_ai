import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { WebPushPanel } from "./WebPushPanel";

const webPush = vi.hoisted(() => ({
  browserHasSubscription: true,
  databaseIsActive: true,
  enable: vi.fn(),
  disable: vi.fn(),
}));

vi.mock("./webPush", () => ({
  getWebPushEnvironment: () => ({
    isIos: false,
    isAndroid: false,
    isStandalone: false,
    isSecureContext: true,
    canAttempt: true,
    guidance: "Bật thông báo để nhận cảnh báo.",
  }),
  getWebPushBrowserState: vi.fn(async () => ({
    permission: "granted",
    hasSubscription: webPush.browserHasSubscription,
    contactId: webPush.databaseIsActive ? "contact-id" : null,
  })),
  getStoredWebPushSubscriptionStatus: vi.fn(async () =>
    webPush.databaseIsActive
      ? { id: "contact-id", is_active: true, last_seen_at: null }
      : null,
  ),
  refreshWebPushServiceWorker: vi.fn(async () => undefined),
  enableWebPush: webPush.enable,
  disableWebPush: webPush.disable,
}));

beforeEach(() => {
  webPush.browserHasSubscription = true;
  webPush.databaseIsActive = true;
  webPush.enable.mockReset().mockImplementation(async () => {
    webPush.browserHasSubscription = true;
    webPush.databaseIsActive = true;
    return {
      id: "contact-id",
      is_active: true,
      last_seen_at: new Date().toISOString(),
    };
  });
  webPush.disable.mockReset().mockImplementation(async () => {
    webPush.browserHasSubscription = false;
    webPush.databaseIsActive = false;
  });
});

afterEach(cleanup);

test("toggles web push off and back on without getting stuck", async () => {
  const user = userEvent.setup();
  render(<WebPushPanel />);

  const disableButton = await screen.findByRole("button", {
    name: /Tắt thông báo/i,
  });
  await user.click(disableButton);

  await waitFor(() => {
    expect(
      screen.getByRole("button", { name: /Bật thông báo/i }),
    ).toBeEnabled();
  });
  expect(webPush.disable).toHaveBeenCalledTimes(1);

  await user.click(screen.getByRole("button", { name: /Bật thông báo/i }));

  await waitFor(() => {
    expect(
      screen.getByRole("button", { name: /Tắt thông báo/i }),
    ).toBeEnabled();
  });
  expect(webPush.enable).toHaveBeenCalledTimes(1);
});
