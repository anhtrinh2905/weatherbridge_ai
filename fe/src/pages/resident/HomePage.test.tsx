import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, test, vi } from "vitest";
import { ResidentStatusProvider } from "../../shared/domain/residentStatusStore";
import { getOccupationRecommendation } from "../../shared/domain/recommendations";
import { getAlertForVillageDay, getSelfResident, personalizeAlert } from "../../shared/domain/mockData";
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

test("resident home shows occupation-personalized action for demo farmer", () => {
  const self = getSelfResident("muong-pon-1");
  expect(self?.occupation).toBe("nong_dan");

  const base = getAlertForVillageDay("muong-pon-1", 0);
  expect(base).toBeDefined();
  const personalized = personalizeAlert(base!, self!.occupation);
  const expected = getOccupationRecommendation(self!.occupation, personalized.hazardType, personalized.tier);

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

  expect(screen.getByText(/Vàng A Quàng/i)).toBeInTheDocument();
  expect(screen.getByText(/Nông dân/i)).toBeInTheDocument();
  expect(screen.getByText(expected.whatToDo)).toBeInTheDocument();
  expect(screen.getByText(/Diễn tập/i)).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: /Hôm nay/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Xem vì sao có cảnh báo này/i })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /số liệu chi tiết/i })).not.toBeInTheDocument();
});
