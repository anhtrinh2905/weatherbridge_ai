import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import { fitBoundaryViewport, RasterHazardMap } from "./RasterHazardMap";

afterEach(cleanup);

function renderMap(day = 0, layer: "dominant" | "flash_flood" | "landslide" = "flash_flood") {
  return render(<RasterHazardMap layer={layer} day={day} selected={null} selectedVillageId={null} showVillageMarkers={false} onSelect={() => undefined} />);
}

function readZoomPct() {
  const label = screen.getByLabelText(/Mức zoom \d+%/).getAttribute("aria-label") ?? "";
  return Number(label.replace(/\D/g, ""));
}

test("zooms in and out by 10% steps and resets the fitted viewport", async () => {
  const user = userEvent.setup();
  renderMap();

  const initialPct = readZoomPct();
  expect(initialPct).toBeGreaterThanOrEqual(100);

  await user.click(screen.getByRole("button", { name: "Phóng to bản đồ" }));
  expect(readZoomPct()).toBe(initialPct + 10);

  await user.click(screen.getByRole("button", { name: "Thu nhỏ bản đồ" }));
  expect(readZoomPct()).toBe(initialPct);

  await user.click(screen.getByRole("button", { name: "Thu nhỏ bản đồ" }));
  expect(readZoomPct()).toBe(initialPct - 10);

  await user.click(screen.getByRole("button", { name: "Đặt lại góc nhìn" }));
  expect(readZoomPct()).toBe(initialPct);
});

test("resets the viewport when the forecast day changes", async () => {
  const user = userEvent.setup();
  const view = renderMap();
  const initialPct = readZoomPct();
  await user.click(screen.getByRole("button", { name: "Phóng to bản đồ" }));
  view.rerender(<RasterHazardMap layer="flash_flood" day={1} selected={null} selectedVillageId={null} showVillageMarkers={false} onSelect={() => undefined} />);
  expect(screen.getByLabelText(`Mức zoom ${initialPct}%`)).toBeInTheDocument();
});

test("fitBoundaryViewport zooms past 100% to crop padding", () => {
  const viewport = fitBoundaryViewport(560, 508);
  expect(viewport.zoom).toBeGreaterThan(1);
});
