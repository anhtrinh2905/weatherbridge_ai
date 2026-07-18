import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { I18nProvider } from "../../shared/i18n/I18nProvider";
import { ResidentHomePage } from "./HomePage";

const mutate = vi.fn();

vi.mock("../../features/operations/hooks", () => ({
  useInbox: () => ({
    isPending: false,
    isError: false,
    data: [{
      alert_id: "alert-1", recipient_id: "recipient-1", hazard_type: "flash_flood", level: 4,
      tier: "go_now", what_happened: "Mua lon tren luu vuc", danger_description: "Nguy co lu quet cao",
      action_instruction: "Di chuyen den noi an toan", deadline_instruction: "Ngay", deadline_at: "2026-07-20T08:00:00Z",
      acknowledgement_status: "pending", acknowledged_at: null,
    }],
  }),
  useAcknowledgeAlert: () => ({ mutate, isPending: false }),
}));

test("resident inbox displays a personalized delivery and stores acknowledgement", () => {
  render(<I18nProvider><ResidentHomePage /></I18nProvider>);
  expect(screen.getByText("Mua lon tren luu vuc")).toBeInTheDocument();
  expect(screen.getByText("Di chuyen den noi an toan")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Tôi an toàn/i }));
  expect(mutate).toHaveBeenCalledWith({ id: "alert-1", status: "safe" });
});
