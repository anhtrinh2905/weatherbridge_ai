import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, test, vi } from "vitest";
import { ResidentStatusProvider } from "../../shared/domain/residentStatusStore";
import { I18nProvider } from "../../shared/i18n/I18nProvider";
import { ResidentHomePage } from "./HomePage";

vi.mock("../../features/auth/hooks", () => ({
  useAuth: () => ({
    user: {
      id: "demo-resident",
      displayName: "Người dân demo",
      emailVerified: true,
      roles: ["resident"],
      villageId: "muong-pon-1",
    },
    initialized: true,
    authenticated: true,
  }),
}));

vi.mock("../../features/operations/hooks", () => ({
  useInbox: () => ({
    data: [
      {
        alert_id: "test-alert-1",
        what_happened: "Sạt lở đất",
        danger_description: "Nguy cơ rất cao",
        action_instruction: "Chủ động di dời",
        deadline_at: "2026-07-20T00:00:00Z",
        hazard_type: "Sạt lở",
        level: 4,
        tier: "go_now",
      }
    ],
    isPending: false,
    isError: false,
  }),
  useAcknowledgeAlert: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useResidentActions: () => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    data: undefined,
  }),
  useWeatherActions: () => ({
    isPending: false,
    isError: false,
    data: undefined,
  })
}));

test("resident home displays inbox alerts and heatmap", () => {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <I18nProvider>
          <ResidentStatusProvider>
            <ResidentHomePage />
          </ResidentStatusProvider>
        </I18nProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );

  expect(screen.getByText(/Theo dõi và phản hồi an toàn/i)).toBeInTheDocument();
  expect(screen.getByText(/Sạt lở đất/i)).toBeInTheDocument();
  expect(screen.getByText(/Chủ động di dời/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Tôi an toàn/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Cần hỗ trợ/i })).toBeInTheDocument();
});
