import { expect, test } from "vitest";
import { mapOpenMeteoToForecastDays } from "./useLiveForecast";

test("maps Open-Meteo daily sums and hourly peaks to forecast days", () => {
  const days = mapOpenMeteoToForecastDays({
    daily: {
      time: ["2026-07-18", "2026-07-19"],
      precipitation_sum: [12.4, null],
    },
    hourly: {
      time: ["2026-07-18T06:00", "2026-07-18T07:00", "2026-07-19T06:00"],
      precipitation: [1.2, 4.8, null],
    },
  });

  expect(days).toHaveLength(2);
  expect(days[0]).toMatchObject({ offset: 0, label: "Hôm nay", rainfallMm: 12.4, intensityMmH: 4.8 });
  // null precipitation is treated as no rain
  expect(days[1]).toMatchObject({ offset: 1, label: "Ngày mai", rainfallMm: 0, intensityMmH: 0 });
  // confidence decays with horizon
  expect(days[0].confidence).toBeGreaterThan(days[1].confidence);
});

test("caps at five days to match the demo slider", () => {
  const time = ["2026-07-18", "2026-07-19", "2026-07-20", "2026-07-21", "2026-07-22", "2026-07-23", "2026-07-24"];
  const days = mapOpenMeteoToForecastDays({
    daily: { time, precipitation_sum: time.map(() => 10) },
  });
  expect(days).toHaveLength(5);
  expect(days[4].label).toBe("+4 ngày");
});
