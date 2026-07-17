import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, test } from "vitest";
import { AuthProvider } from "../../features/auth/keycloak";
import { LandingPage } from "./LandingPage";

test("renders the primary landing page call to action", () => {
  render(<MemoryRouter><AuthProvider><LandingPage /></AuthProvider></MemoryRouter>);
  expect(screen.getByRole("heading", { name: /không đẩy con số\. đẩy hành động đúng hạn/i })).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: /bắt đầu/i }).length).toBeGreaterThan(0);
});
