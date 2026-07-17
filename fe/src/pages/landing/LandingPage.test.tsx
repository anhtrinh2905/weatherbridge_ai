import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, test } from "vitest";
import { LandingPage } from "./LandingPage";

test("renders the primary landing page call to action", () => {
  render(<MemoryRouter><LandingPage /></MemoryRouter>);
  expect(screen.getByRole("heading", { name: /build the thing people remember/i })).toBeInTheDocument();
  expect(screen.getAllByRole("link", { name: /get started/i }).length).toBeGreaterThan(0);
});
