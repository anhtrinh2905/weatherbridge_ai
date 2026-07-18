import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import { RASTER_VILLAGES } from "../../shared/hazard-raster/villages";
import { HeatmapView } from "./HeatmapView";

afterEach(cleanup);

test("inspects both hazards from a village anchor in the dominant layer", async () => {
  const user = userEvent.setup();
  render(<HeatmapView />);
  const village = RASTER_VILLAGES.find((entry) => entry.located);
  if (!village) throw new Error("Expected at least one located raster village");

  const villageButton = screen.getAllByRole("button").find((button) => button.textContent?.startsWith(village.village.name));
  await user.click(villageButton as HTMLButtonElement);

  expect(screen.getByText(/Nguy cơ trội tại điểm này/i)).toBeInTheDocument();
  expect(screen.getByText(/Lũ quét.*trội|Sạt lở.*trội/i)).toBeInTheDocument();
});

test("switches the inspector to an individual hazard layer", async () => {
  const user = userEvent.setup();
  render(<HeatmapView />);
  const village = RASTER_VILLAGES.find((entry) => entry.located);
  if (!village) throw new Error("Expected at least one located raster village");
  const villageButton = screen.getAllByRole("button").find((button) => button.textContent?.startsWith(village.village.name));
  await user.click(villageButton as HTMLButtonElement);
  await user.click(screen.getByRole("tab", { name: /Lũ quét/i }));

  expect(screen.queryByText(/Nguy cơ trội tại điểm này/i)).not.toBeInTheDocument();
  expect(screen.getByText(/Kích hoạt mưa/i)).toBeInTheDocument();
});
