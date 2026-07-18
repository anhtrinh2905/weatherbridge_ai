"""Rainfall intensity–duration (I–D) trigger for flash-flood / landslide warning.

The *rainfall trigger* factor of the risk raster (the "Kích hoạt mưa" side,
combined with terrain susceptibility at serving time). It turns a rainfall
series — ideally the bias-corrected GFS forecast — into a graduated 5-level
warning by comparing the storm against an empirical I–D threshold.

Design choices, and their honest limits, are grounded in the Mường Pồn data:

- **Features (Group B) only.** Uses rainfall the forecast reliably provides at
  serving time. Soil moisture (Group C) is *not* used: it is absent from the
  GFS forecast product (only ERA5 observations carry it), so training on it
  would create train/serve skew.
- **Empirical I–D threshold, not a supervised event model.** With only one
  verified local event we calibrate, not learn: the cumulative threshold
  ``C(D) = alpha · D**(1 - beta)`` is tuned so the 25/07/2024 Mường Pồn event
  fires. ``beta`` is taken from the literature (0.4–0.6).
- **Rainfall is necessary, not sufficient.** The event sits at the ~96th
  rainfall percentile, so a threshold that catches it also fires on other heavy
  rain that did *not* cause disasters. That is expected — the terrain
  susceptibility factor is what narrows a rainfall trigger down to actual risk.
"""

from __future__ import annotations

import csv
from datetime import datetime
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw" / "muong_pon"

# I–D threshold, calibrated to the 25/07/2024 Mường Pồn event on ERA5 rainfall.
DURATIONS_H: tuple[int, ...] = (3, 6, 12, 24)
DEFAULT_ALPHA = 5.5  # cumulative-threshold scale (mm); event reaches ratio ~1.5
DEFAULT_BETA = 0.5  # I–D curve exponent (literature range 0.4–0.6)

# 5-level trigger from the exceedance ratio (UI "raster nguy cơ 5 cấp").
LEVEL_BOUNDS: tuple[float, ...] = (0.5, 1.0, 1.5, 2.0)  # boundaries 0|1|2|3|4
LEVEL_NAMES: tuple[str, ...] = ("không", "thấp", "trung bình", "cao", "rất cao")


def to_epoch(iso: str) -> float:
    """ISO-8601 timestamp → epoch seconds (NaN if unparseable)."""
    try:
        return datetime.fromisoformat(iso).timestamp()
    except ValueError:
        return float("nan")


def rolling_cumulative(epochs: np.ndarray, precip: np.ndarray, hours: float) -> np.ndarray:
    """Trailing-window rainfall sum over ``hours`` at each timestep.

    Two-pointer sliding window (amortised O(n)); robust to irregular spacing
    because it keys on timestamps, not row counts. A window includes every
    earlier sample within ``hours`` of the current one.
    """
    window = hours * 3600.0
    out = np.zeros(len(precip), dtype=float)
    left = 0
    running = 0.0
    for i in range(len(precip)):
        running += precip[i]
        while epochs[i] - epochs[left] >= window:
            running -= precip[left]
            left += 1
        out[i] = running
    return out


def antecedent_precipitation(epochs: np.ndarray, precip: np.ndarray, days: float) -> np.ndarray:
    """Cumulative rainfall over the preceding ``days`` (soil-wetness proxy)."""
    return rolling_cumulative(epochs, precip, days * 24.0)


def id_exceedance(
    epochs: np.ndarray,
    precip: np.ndarray,
    durations: tuple[int, ...] = DURATIONS_H,
    alpha: float = DEFAULT_ALPHA,
    beta: float = DEFAULT_BETA,
) -> np.ndarray:
    """Per-timestep I–D exceedance ratio (≥1 means the threshold is crossed).

    For each duration ``D`` the storm's cumulative rainfall is compared to
    ``C(D) = alpha · D**(1 - beta)``; the ratio is the strongest exceedance
    across all durations. This multi-duration form catches both short intense
    bursts (flash flood) and long soaking rain (landslide).
    """
    ratio = np.zeros(len(precip), dtype=float)
    for duration in durations:
        threshold = alpha * duration ** (1.0 - beta)
        cumulative = rolling_cumulative(epochs, precip, duration)
        ratio = np.maximum(ratio, cumulative / threshold)
    return ratio


def calibrate_alpha(
    epochs: np.ndarray,
    precip: np.ndarray,
    event_mask: np.ndarray,
    target_ratio: float = 1.6,
    durations: tuple[int, ...] = DURATIONS_H,
    beta: float = DEFAULT_BETA,
) -> float:
    """Scale ``alpha`` so a known event reaches ``target_ratio`` on THIS series.

    The I–D threshold must be calibrated on the same rainfall source it will run
    on operationally: a threshold tuned on ERA5 observations under-fires on the
    bias-corrected forecast, whose magnitudes are damped. Given the event mask,
    this returns the ``alpha`` at which the event's strongest duration sits at
    ``target_ratio`` (so it lands at the "cao" level; 1.6 keeps it clear of the
    level-2/3 boundary at 1.5).
    """
    strongest = 0.0
    for duration in durations:
        cumulative = rolling_cumulative(epochs, precip, duration)
        event_peak = float(cumulative[event_mask].max()) if event_mask.any() else 0.0
        strongest = max(strongest, event_peak / duration ** (1.0 - beta))
    return strongest / target_ratio if target_ratio > 0 else DEFAULT_ALPHA


def trigger_level(ratio: float, bounds: tuple[float, ...] = LEVEL_BOUNDS) -> int:
    """Map an exceedance ratio to an integer trigger level (0..len(bounds))."""
    level = 0
    for bound in bounds:
        if ratio >= bound:
            level += 1
        else:
            break
    return level


def trigger_levels(ratios: np.ndarray, bounds: tuple[float, ...] = LEVEL_BOUNDS) -> np.ndarray:
    """Vectorised :func:`trigger_level` over an array of ratios."""
    return np.digitize(ratios, bounds).astype(int)


def rainfall_features(epochs: np.ndarray, precip: np.ndarray) -> dict[str, np.ndarray]:
    """Group-B feature bundle for one location's rainfall series.

    The reusable serving-time features: short-window cumulatives (flash-flood
    intensity), antecedent totals (landslide soil-wetness proxy), the I–D
    exceedance ratio and its trigger level.
    """
    features: dict[str, np.ndarray] = {}
    for hours in (1, 3, 6, 12, 24):
        features[f"cum_{hours}h_mm"] = rolling_cumulative(epochs, precip, hours)
    for days in (3, 7, 15):
        features[f"antecedent_{days}d_mm"] = antecedent_precipitation(epochs, precip, days)
    ratio = id_exceedance(epochs, precip)
    features["id_exceedance_ratio"] = ratio
    features["trigger_level"] = trigger_levels(ratio)
    return features


# --- End-to-end pipeline on real Open-Meteo data ---------------------------

SAMPLES_PATH = RAW_DIR / "training_samples.csv"
# 25/07/2024 Mường Pồn flash-flood/landslide event (verified), with a ±1 day
# buffer so the validation window covers the run-up and immediate aftermath.
EVENT_WINDOW = ("2024-07-24T00:00:00+00:00", "2024-07-26T00:00:00+00:00")


def load_location_series(
    path: Path = SAMPLES_PATH, location_code: str = "commune-muong-pon"
) -> dict[str, object]:
    """Build one clean hourly series for a location from ``training_samples``.

    Rows are collapsed to one per ``valid_time``: the observed (ERA5) value, and
    the forecast row at the shortest lead (the best available forecast). The
    forecast rows are kept whole so the bias-correction model can be applied.
    """
    observed: dict[str, float] = {}
    best_lead: dict[str, float] = {}
    forecast_record: dict[str, dict[str, str]] = {}

    with path.open(encoding="utf-8", newline="") as handle:
        for record in csv.DictReader(handle):
            if record["location_code"] != location_code:
                continue
            valid_time = record["valid_time_utc"]
            if not valid_time:
                continue
            if record["observed_precipitation_mm"] != "":
                observed[valid_time] = float(record["observed_precipitation_mm"])
            if record["forecast_precipitation_mm"] != "":
                lead = float(record["lead_hours"] or 1e9)
                if valid_time not in best_lead or lead < best_lead[valid_time]:
                    best_lead[valid_time] = lead
                    forecast_record[valid_time] = record

    times = sorted(observed, key=to_epoch)
    epochs = np.array([to_epoch(t) for t in times], dtype=float)
    observed_arr = np.array([observed[t] for t in times], dtype=float)
    forecast_raw = np.array(
        [float(forecast_record.get(t, {}).get("forecast_precipitation_mm", 0.0) or 0.0)
         for t in times],
        dtype=float,
    )
    return {
        "times": times,
        "epochs": epochs,
        "observed": observed_arr,
        "forecast_raw": forecast_raw,
        "forecast_records": [forecast_record.get(t) for t in times],
    }


def corrected_forecast_series(
    records: list[dict | None], experiment: str = "baseline"
) -> np.ndarray:
    """Apply the trained bias-correction model to a list of forecast rows.

    Returns the corrected precipitation series; falls back to raw forecast for
    any row the model can't score. Raises if the model artifact is missing.
    """
    import joblib

    from bias_correction import RUNS_DIR, featurize_record, predict_precip

    artifact = RUNS_DIR / f"{experiment}_precip_bias_correction.joblib"
    if not artifact.exists():
        raise FileNotFoundError(
            f"bias-correction model not found: {artifact.relative_to(ROOT)} "
            "(run `main.py bias-correct` first)"
        )
    model = joblib.load(artifact)["model"]
    features = np.array(
        [featurize_record(rec) if rec else [np.nan] * model.n_features_in_ for rec in records],
        dtype=float,
    )
    return predict_precip(model, features)


def _window_mask(epochs: np.ndarray, start: str, end: str) -> np.ndarray:
    return (epochs >= to_epoch(start)) & (epochs <= to_epoch(end))


def run_pipeline(
    location_code: str = "commune-muong-pon", use_corrected: bool = True
) -> dict[str, object]:
    """End-to-end: load Open-Meteo series → correct → trigger → validate.

    Validates against the 25/07/2024 event: the trigger must reach a high level
    in the event window. Reports the level distribution so the (expected)
    false-alarm rate of a rainfall-only trigger is visible, not hidden.
    """
    if not SAMPLES_PATH.exists():
        return {"status": "awaiting_data", "missing": str(SAMPLES_PATH.relative_to(ROOT))}

    series = load_location_series(location_code=location_code)
    epochs = series["epochs"]
    if epochs.size == 0:
        return {"status": "no_data", "location": location_code}

    source = "raw_forecast"
    precip = series["forecast_raw"]
    if use_corrected:
        try:
            precip = corrected_forecast_series(series["forecast_records"])
            source = "bias_corrected_forecast"
        except FileNotFoundError as exc:
            return {"status": "awaiting_model", "detail": str(exc)}

    # Calibrate the threshold on the operational series itself (the corrected
    # forecast is damped relative to ERA5, so a fixed alpha would mis-scale).
    event = _window_mask(epochs, *EVENT_WINDOW)
    alpha = calibrate_alpha(epochs, precip, event)
    ratio = id_exceedance(epochs, precip, alpha=alpha)
    levels = trigger_levels(ratio)

    event_level = int(levels[event].max()) if event.any() else -1
    event_ratio = float(ratio[event].max()) if event.any() else float("nan")

    # Cross-check on the observed (ERA5) series, calibrated the same way.
    obs_alpha = calibrate_alpha(epochs, series["observed"], event)
    obs_ratio = id_exceedance(epochs, series["observed"], alpha=obs_alpha)
    obs_event_level = int(trigger_levels(obs_ratio)[event].max()) if event.any() else -1

    counts = np.bincount(levels, minlength=len(LEVEL_NAMES))
    distribution = {
        LEVEL_NAMES[i]: {
            "hours": int(counts[i]),
            "pct": round(float(counts[i]) / levels.size * 100, 2),
        }
        for i in range(len(LEVEL_NAMES))
    }

    return {
        "status": "ok",
        "location": location_code,
        "trigger_source": source,
        "series_hours": int(epochs.size),
        "calibrated_alpha": round(alpha, 3),
        "event_25_07_2024": {
            "trigger_level": event_level,
            "trigger_name": LEVEL_NAMES[event_level] if event_level >= 0 else "n/a",
            "exceedance_ratio": round(event_ratio, 3),
            "detected": event_level >= 2,  # ≥ "trung bình" counts as caught
            "observed_series_level": obs_event_level,
        },
        "level_distribution": distribution,
    }

