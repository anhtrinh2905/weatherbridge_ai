import { useEffect, useState } from "react";
import { setForecastDays } from "./data";
import type { ForecastDay } from "./types";

/**
 * Demo-only direct Open-Meteo fetch for the public `/demo` page, so the map
 * can score against real rainfall without the full backend stack running.
 * The production path is Story 2.2: worker ingests Open-Meteo → PostgreSQL →
 * `GET /api/v1/forecasts/{location}/latest` behind auth. Same coordinates,
 * same fields, same per-day shape.
 */

const MUONG_PON = { latitude: 21.59, longitude: 103.03 };
const FORECAST_URL =
  "https://api.open-meteo.com/v1/forecast" +
  `?latitude=${MUONG_PON.latitude}&longitude=${MUONG_PON.longitude}` +
  "&daily=precipitation_sum" +
  "&hourly=precipitation,visibility,temperature_2m,dew_point_2m" +
  "&forecast_days=8&timezone=Asia%2FBangkok";

/** forecast-model confidence is not served by the API; decay by horizon */
const CONFIDENCE_BY_OFFSET = [0.92, 0.86, 0.78, 0.68, 0.6, 0.52, 0.45, 0.4];

interface OpenMeteoResponse {
  daily: { time: string[]; precipitation_sum: (number | null)[] };
  hourly?: {
    time: string[];
    precipitation: (number | null)[];
    visibility?: (number | null)[];
    temperature_2m?: (number | null)[];
    dew_point_2m?: (number | null)[];
  };
}

function dayLabel(offset: number): string {
  if (offset === 0) return "Hiện tại";
  return `+${offset} ngày`;
}

function mean(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Pure mapping from the Open-Meteo payload to the demo's ForecastDay shape. */
export function mapOpenMeteoToForecastDays(data: OpenMeteoResponse): ForecastDay[] {
  const peakByDate = new Map<string, number>();
  const minVisibilityByDate = new Map<string, number>();
  const tempsByDate = new Map<string, number[]>();
  const dewByDate = new Map<string, number[]>();

  const hourlyTimes = data.hourly?.time ?? [];
  const hourlyRain = data.hourly?.precipitation ?? [];
  const hourlyVisibility = data.hourly?.visibility ?? [];
  const hourlyTemp = data.hourly?.temperature_2m ?? [];
  const hourlyDew = data.hourly?.dew_point_2m ?? [];

  hourlyTimes.forEach((stamp, i) => {
    const date = stamp.slice(0, 10);
    peakByDate.set(date, Math.max(peakByDate.get(date) ?? 0, hourlyRain[i] ?? 0));
    const visibility = hourlyVisibility[i];
    if (visibility !== null && visibility !== undefined) {
      minVisibilityByDate.set(date, Math.min(minVisibilityByDate.get(date) ?? visibility, visibility));
    }
    const temperature = hourlyTemp[i];
    if (temperature !== null && temperature !== undefined) {
      const list = tempsByDate.get(date) ?? [];
      list.push(temperature);
      tempsByDate.set(date, list);
    }
    const dew = hourlyDew[i];
    if (dew !== null && dew !== undefined) {
      const list = dewByDate.get(date) ?? [];
      list.push(dew);
      dewByDate.set(date, list);
    }
  });

  return data.daily.time.slice(0, CONFIDENCE_BY_OFFSET.length).map((date, offset) => {
    const temperatureC = mean(tempsByDate.get(date) ?? []);
    const dewPointC = mean(dewByDate.get(date) ?? []);
    return {
      offset,
      label: dayLabel(offset),
      rainfallMm: Math.round((data.daily.precipitation_sum[offset] ?? 0) * 10) / 10,
      intensityMmH: Math.round((peakByDate.get(date) ?? 0) * 10) / 10,
      confidence: CONFIDENCE_BY_OFFSET[offset],
      visibilityM: minVisibilityByDate.has(date)
        ? Math.round(minVisibilityByDate.get(date) as number)
        : undefined,
      temperatureC: temperatureC !== undefined ? Math.round(temperatureC * 10) / 10 : undefined,
      dewPointC: dewPointC !== undefined ? Math.round(dewPointC * 10) / 10 : undefined,
    };
  });
}

export interface LiveForecastStatus {
  /** "open-meteo" once real data is loaded; "simulated" before/on failure */
  source: "open-meteo" | "simulated";
  fetchedAt: Date | null;
}

export function useLiveForecast(): LiveForecastStatus {
  // initial state = simulated fallback; only a successful fetch updates state,
  // so an offline demo silently keeps the deterministic sample data
  const [status, setStatus] = useState<LiveForecastStatus>({
    source: "simulated",
    fetchedAt: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const response = await fetch(FORECAST_URL, { signal: controller.signal });
        if (!response.ok) return;
        const data = (await response.json()) as OpenMeteoResponse;
        const days = mapOpenMeteoToForecastDays(data);
        if (days.length === 0) return;
        setForecastDays(days);
        setStatus({ source: "open-meteo", fetchedAt: new Date() });
      } catch {
        // offline / blocked: keep the simulated forecast, no UI error needed
      }
    })();
    return () => controller.abort();
  }, []);

  return status;
}
