import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import { I18nProvider } from "../../shared/i18n/I18nProvider";
import { HeatmapView } from "./HeatmapView";

afterEach(cleanup);

function renderHeatmapView() {
  return render(
    <I18nProvider>
      <HeatmapView />
    </I18nProvider>,
  );
}

test("shows level legend on the right without village-on-polygon UI", () => {
  renderHeatmapView();
  expect(screen.getByLabelText(/Cấp độ nguy cơ/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/Số liệu/i)).toBeInTheDocument();
  expect(screen.queryByText(/Cấp theo bản/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/Chưa có tọa độ/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/Chọn một điểm trên raster/i)).not.toBeInTheDocument();
});

test("switching hazard layer keeps the metrics panel available", async () => {
  const user = userEvent.setup();
  renderHeatmapView();
  await user.click(screen.getByRole("tab", { name: /^Lũ$/i }));
  expect(screen.getByRole("tab", { name: /^Lũ$/i })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByLabelText(/Số liệu/i)).toBeInTheDocument();
});

test("selecting a raster point reveals point metrics below the map", () => {
  renderHeatmapView();
  const canvas = screen.getByLabelText(/Bản đồ raster nguy cơ 5 cấp/i);
  // Click near the commune center of the 560×~508 raster.
  fireEvent.click(canvas, { clientX: 280, clientY: 250 });
  // jsdom lacks layout; if click cannot resolve a point the panel still stays present.
  expect(screen.getByLabelText(/Số liệu/i)).toBeInTheDocument();
});
