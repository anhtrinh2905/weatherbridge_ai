import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, test } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../../features/auth/keycloak";
import { I18nProvider } from "../../shared/i18n/I18nProvider";
import { LandingPage } from "./LandingPage";

test("renders the primary landing page call to action", () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <I18nProvider>
          <AuthProvider>
            <LandingPage />
          </AuthProvider>
        </I18nProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  expect(screen.getByRole("heading", { name: /từ dấu hiệu đầu tiên đến hành động kịp thời/i })).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: /đăng nhập/i }).length).toBeGreaterThan(0);
});
