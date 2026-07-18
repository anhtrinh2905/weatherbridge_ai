import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import { RasterHazardMap } from "./RasterHazardMap";

afterEach(cleanup);

function renderMap(day = 0, layer: "dominant" | "flash_flood" | "landslide" = "flash_flood") {
  return render(<RasterHazardMap layer={layer} day={day} selected={null} selectedVillageId={null} showVillageMarkers={false} onSelect={() => undefined} />);
}

test("zooms and resets the raster viewport with the map toolbar", async () => {
  const user = userEvent.setup();
  renderMap();

  expect(screen.getByLabelText("Mức zoom 100%")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Phóng to bản đồ" }));
  expect(screen.getByLabelText("Mức zoom 150%")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Đặt lại góc nhìn" }));
  expect(screen.getByLabelText("Mức zoom 100%")).toBeInTheDocument();
});

test("resets the viewport when the forecast day changes", async () => {
  const user = userEvent.setup();
  const view = renderMap();
  await user.click(screen.getByRole("button", { name: "Phóng to bản đồ" }));
  view.rerender(<RasterHazardMap layer="flash_flood" day={1} selected={null} selectedVillageId={null} showVillageMarkers={false} onSelect={() => undefined} />);
  expect(screen.getByLabelText("Mức zoom 100%")).toBeInTheDocument();
});
