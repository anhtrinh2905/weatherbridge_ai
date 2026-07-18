"""Rainfall I–D trigger + composite risk, computed at ingest time.

Ported from the offline pipeline (``ai/src/rainfall_trigger.py`` and
``ai/src/risk.py``) into the worker so the risk of an incoming 3–7 day forecast
is scored once, on write, and the API only reads it (no inference in the request
path). Kept in pure Python — the I–D maths needs no numpy, so the worker stays
lean. The optional bias-correction step lazily imports numpy/joblib and degrades
gracefully when the model artifact or those extras are absent.

Design (see ai/README.md for the evidence):
- The trigger runs on the RAW forecast rainfall. The bias-correction model is
  tuned for average accuracy and damps peaks, which hurts extreme-event
  detection; raw GFS rainfall detects the 25/07/2024 event well. So the model
  only produces the *displayed* corrected rainfall, it does not feed the trigger.
- ``alpha`` is calibrated offline per location (ForecastLocation.trigger_alpha).
"""

from __future__ import annotations

import math

DURATIONS_H: tuple[int, ...] = (3, 6, 12, 24)
LEVEL_BOUNDS: tuple[float, ...] = (0.5, 1.0, 1.5, 2.0)  # trigger levels 0..4
LEVEL_NAMES: tuple[str, ...] = ("không", "thấp", "trung bình", "cao", "rất cao")
RISK_BOUNDS: tuple[float, ...] = (0.05, 0.15, 0.30, 0.50)  # composite risk 0..4
TRIGGER_SATURATION = 2.0


def _level_from_bounds(value: float, bounds: tuple[float, ...]) -> int:
    level = 0
    for bound in bounds:
        if value >= bound:
            level += 1
        else:
            break
    return level


def id_exceedance_series(
    precip: list[float], alpha: float, beta: float = 0.5, durations: tuple[int, ...] = DURATIONS_H
) -> list[float]:
    """Per-hour I–D exceedance ratio for a regular hourly rainfall series.

    Assumes hourly spacing (Open-Meteo hourly is regular), so a duration-``D``
    window is the trailing ``D`` samples. Ratio ≥ 1 means the threshold
    ``C(D)=alpha·D^(1-beta)`` is crossed; the reported value is the strongest
    exceedance across durations.
    """
    n = len(precip)
    ratios = [0.0] * n
    for duration in durations:
        threshold = alpha * duration ** (1.0 - beta)
        running = 0.0
        for i in range(n):
            running += precip[i]
            if i >= duration:
                running -= precip[i - duration]
            ratios[i] = max(ratios[i], running / threshold)
    return ratios


def daily_max_exceedance(
    hourly_times: list[str], hourly_precip: list[float], alpha: float, beta: float = 0.5
) -> dict[str, float]:
    """Map each date to the peak I–D exceedance ratio among its hours."""
    ratios = id_exceedance_series(hourly_precip, alpha, beta)
    per_day: dict[str, float] = {}
    for stamp, ratio in zip(hourly_times, ratios, strict=False):
        date = stamp[:10]
        per_day[date] = max(per_day.get(date, 0.0), ratio)
    return per_day


def trigger_level(ratio: float) -> int:
    """5-level rainfall trigger from the exceedance ratio."""
    return _level_from_bounds(ratio, LEVEL_BOUNDS)


def risk_level(trigger_ratio: float, terrain_factor: float) -> int:
    """Composite risk level = normalised trigger × terrain susceptibility.

    AND semantics: high only where an active trigger meets susceptible terrain.
    """
    trigger_strength = min(max(trigger_ratio, 0.0) / TRIGGER_SATURATION, 1.0)
    return _level_from_bounds(trigger_strength * terrain_factor, RISK_BOUNDS)


# --- Optional bias-correction (displayed corrected rainfall) ----------------

# Open-Meteo hourly variable → model feature name. The cyclic time features are
# derived from valid_time; lead_hours from the row's forecast offset.
_OPEN_METEO_TO_FEATURE = {
    "temperature_2m": "forecast_temperature_2m_c",
    "relative_humidity_2m": "forecast_relative_humidity_2m_pct",
    "dew_point_2m": "forecast_dew_point_2m_c",
    "precipitation": "forecast_precipitation_mm",
    "rain": "forecast_rain_mm",
    "showers": "forecast_showers_mm",
    "surface_pressure": "forecast_surface_pressure_hpa",
    "cloud_cover": "forecast_cloud_cover_pct",
    "cape": "forecast_cape_j_kg",
    "wind_speed_10m": "forecast_wind_speed_10m_kmh",
    "wind_gusts_10m": "forecast_wind_gusts_10m_kmh",
}

# The hourly variables the worker must request from Open-Meteo for the model.
BIAS_CORRECTION_HOURLY_VARS = list(_OPEN_METEO_TO_FEATURE.keys())


def _feature_row(feature_names: list[str], hourly: dict, index: int) -> list[float]:
    """Build one feature vector in the artifact's own feature order."""
    stamp = hourly["time"][index]
    moment_month = int(stamp[5:7])
    moment_hour = int(stamp[11:13]) if len(stamp) >= 13 else 0
    month_angle = 2.0 * math.pi * (moment_month - 1) / 12.0
    hour_angle = 2.0 * math.pi * moment_hour / 24.0
    derived = {
        "lead_hours": float(index),
        "month_sin": math.sin(month_angle),
        "month_cos": math.cos(month_angle),
        "hour_sin": math.sin(hour_angle),
        "hour_cos": math.cos(hour_angle),
    }
    row: list[float] = []
    for name in feature_names:
        if name in derived:
            row.append(derived[name])
            continue
        # find the Open-Meteo column feeding this feature
        source = next((k for k, v in _OPEN_METEO_TO_FEATURE.items() if v == name), None)
        values = hourly.get(source, []) if source else []
        value = values[index] if source and index < len(values) else None
        row.append(float("nan") if value is None else float(value))
    return row


def bias_correct_hourly(hourly: dict, model_path: str | None) -> list[float] | None:
    """Corrected hourly precipitation via the trained model, or None if disabled.

    Returns ``None`` (caller falls back to raw) when no model path is configured
    or when numpy/joblib/the artifact are unavailable — so the worker runs
    without the ML extras and the trigger path is never blocked.
    """
    if not model_path:
        return None
    try:
        import joblib
        import numpy as np
    except ImportError:
        return None
    try:
        bundle = joblib.load(model_path)
    except (FileNotFoundError, OSError):
        return None

    model = bundle["model"]
    feature_names = bundle["features"]
    times = hourly.get("time", [])
    rows = [_feature_row(feature_names, hourly, i) for i in range(len(times))]
    matrix = np.array(rows, dtype=float)
    if matrix.size == 0:
        return None
    corrected = np.clip(np.expm1(model.predict(matrix)), 0.0, None)
    return [float(v) for v in corrected]


def daily_sums(hourly_times: list[str], hourly_values: list[float]) -> dict[str, float]:
    """Sum an hourly series per date."""
    out: dict[str, float] = {}
    for stamp, value in zip(hourly_times, hourly_values, strict=False):
        out[stamp[:10]] = out.get(stamp[:10], 0.0) + (value or 0.0)
    return out
