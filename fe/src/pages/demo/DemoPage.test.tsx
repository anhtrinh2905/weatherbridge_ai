import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { DemoPage } from "./DemoPage";

// keep tests offline: the live-forecast hook falls back to simulated data
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("offline"))));
});

afterEach(() => {
  vi.unstubAllGlobals();
  cleanup();
});

test("resident view leads with an action and shows the 4-part bulletin", () => {
  render(<MemoryRouter><DemoPage /></MemoryRouter>);
  // layered resident card exposes an action label and the non-replacement disclaimer
  expect(screen.getByRole("heading", { name: /từ dự báo mưa đến hành động/i })).toBeInTheDocument();
  expect(screen.getByText(/bản tin hành động · 4 phần/i)).toBeInTheDocument();
  expect(screen.getAllByText(/không thay thế/i).length).toBeGreaterThan(0);
});

test("switching to the officer role reveals the hazard grid and triage", async () => {
  const user = userEvent.setup();
  render(<MemoryRouter><DemoPage /></MemoryRouter>);
  const roleTabs = screen.getByRole("tablist", { name: /chọn vai trò/i });
  await user.click(within(roleTabs).getByRole("tab", { name: /cán bộ xã/i }));
  expect(screen.getByRole("group", { name: /lưới nguy cơ/i })).toBeInTheDocument();
  const triage = screen.getByText(/triage = phơi nhiễm × ưu tiên/i);
  expect(within(triage.closest("section") as HTMLElement).getByRole("table")).toBeInTheDocument();
});
