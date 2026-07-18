"""Rainfall forecast bias-correction (MOS) for the Mường Pồn commune.

The risk raster splits into a *static terrain* susceptibility surface (see
``terrain``/``train``) and a *rainfall trigger* factor. This module improves the
rainfall side: it learns to correct the raw GFS precipitation forecast toward
the ERA5/ERA5-Land observation, so the intensity–duration trigger is fed a
de-biased rainfall series instead of the raw model output.

Input is the paired ``training_samples.csv`` produced offline (forecast columns
joined to observed columns per location/valid-time). Only the Mường Pồn subset
is used here — copy it under ``ai/data/raw/muong_pon`` (never committed; see
``AGENTS.md`` Compliance and ``docs/compliance/oss-register.yaml``).

The model is a ``HistGradientBoostingRegressor``: it handles the many missing
forecast fields (CAPE, cloud cover, …) natively and is CPU-only. Training is
offline; serving loads the saved artifact — no fitting in the API path.
"""

from __future__ import annotations

import csv
import json
import math
from datetime import datetime
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import HistGradientBoostingRegressor

from config import Config, load_config
from registry import ModelRecord

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw" / "muong_pon"
RUNS_DIR = ROOT / "runs"

# Feature contract shared by training and serving. Order is significant: the
# saved artifact records it so inference can rebuild the matrix identically.
FORECAST_FEATURES: tuple[str, ...] = (
    "lead_hours",
    "forecast_temperature_2m_c",
    "forecast_relative_humidity_2m_pct",
    "forecast_dew_point_2m_c",
    "forecast_precipitation_mm",
    "forecast_rain_mm",
    "forecast_showers_mm",
    "forecast_surface_pressure_hpa",
    "forecast_cloud_cover_pct",
    "forecast_cape_j_kg",
    "forecast_wind_speed_10m_kmh",
    "forecast_wind_gusts_10m_kmh",
    # Cyclic season/time-of-day terms derived from valid_time_utc.
    "month_sin",
    "month_cos",
    "hour_sin",
    "hour_cos",
)

# The raw forecast column is both a feature and the baseline the corrected
# series must beat.
RAW_FORECAST_COLUMN = "forecast_precipitation_mm"
TARGET_COLUMN = "observed_precipitation_mm"


def _to_float(value: str | None) -> float:
    """Parse a CSV cell to float; blank/unparseable becomes NaN."""
    if value is None or value == "":
        return math.nan
    try:
        return float(value)
    except ValueError:
        return math.nan


def _cyclic_time_features(valid_time_utc: str) -> dict[str, float]:
    """Month- and hour-of-day cyclic encodings from an ISO-8601 timestamp."""
    try:
        moment = datetime.fromisoformat(valid_time_utc)
    except ValueError:
        return {"month_sin": math.nan, "month_cos": math.nan,
                "hour_sin": math.nan, "hour_cos": math.nan, "_epoch": math.nan}
    month_angle = 2.0 * math.pi * (moment.month - 1) / 12.0
    hour_angle = 2.0 * math.pi * moment.hour / 24.0
    return {
        "month_sin": math.sin(month_angle),
        "month_cos": math.cos(month_angle),
        "hour_sin": math.sin(hour_angle),
        "hour_cos": math.cos(hour_angle),
        "_epoch": moment.timestamp(),
    }


def load_training_samples(path: Path) -> dict[str, np.ndarray]:
    """Read paired forecast/observation rows into model-ready arrays.

    Returns ``X`` (features in ``FORECAST_FEATURES`` order), ``y`` (observed
    precipitation), ``raw`` (raw forecast precipitation baseline) and ``times``
    (epoch seconds, for the temporal split). Rows without an observed target
    are dropped — they carry no supervision signal.
    """
    rows: list[list[float]] = []
    targets: list[float] = []
    raw: list[float] = []
    times: list[float] = []

    with path.open(encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for record in reader:
            target = _to_float(record.get(TARGET_COLUMN))
            if math.isnan(target):
                continue
            cyclic = _cyclic_time_features(record.get("valid_time_utc", ""))
            features = [
                cyclic[name] if name in cyclic else _to_float(record.get(name))
                for name in FORECAST_FEATURES
            ]
            rows.append(features)
            targets.append(target)
            raw.append(_to_float(record.get(RAW_FORECAST_COLUMN)))
            times.append(cyclic["_epoch"])

    return {
        "X": np.asarray(rows, dtype=float),
        "y": np.asarray(targets, dtype=float),
        "raw": np.asarray(raw, dtype=float),
        "times": np.asarray(times, dtype=float),
    }


def temporal_split(times: np.ndarray, val_ratio: float = 0.2) -> np.ndarray:
    """Forward-in-time hold-out mask (``True`` for validation rows).

    Bias correction is deployed on *future* forecasts, so the hold-out must be
    the latest slice of history — a random split would leak future weather into
    training. The most recent ``val_ratio`` of the time span is validation.
    """
    finite = times[np.isfinite(times)]
    if finite.size == 0:
        return np.zeros(times.shape[0], dtype=bool)
    threshold = float(np.quantile(finite, 1.0 - val_ratio))
    return times >= threshold


def fit_bias_model(X: np.ndarray, y: np.ndarray, config: Config) -> HistGradientBoostingRegressor:
    """Fit the gradient-boosted regressor that maps forecast → observation.

    The target is fit in ``log1p`` space. Hourly precipitation is heavily
    zero-inflated and right-skewed; on raw millimetres a squared loss chases the
    dry-hour mean and *raises* MAE, while ``log1p`` compresses the tail so the
    model improves both MAE and RMSE without a systematic dry bias. Invert with
    :func:`predict_precip`.
    """
    model = HistGradientBoostingRegressor(
        max_depth=config.max_depth,
        random_state=config.seed,
    )
    model.fit(X, np.log1p(y))
    return model


def predict_precip(model: HistGradientBoostingRegressor, X: np.ndarray) -> np.ndarray:
    """Predict precipitation in mm: invert the ``log1p`` fit, clip at 0."""
    return np.clip(np.expm1(model.predict(X)), 0.0, None)


def _error_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, float]:
    error = y_pred - y_true
    return {
        "mae": float(np.mean(np.abs(error))),
        "rmse": float(np.sqrt(np.mean(error**2))),
        "bias": float(np.mean(error)),  # >0 = over-forecast, <0 = under-forecast
    }


def evaluate_bias_correction(
    y_true: np.ndarray, raw: np.ndarray, corrected: np.ndarray
) -> dict[str, object]:
    """Compare raw GFS against the corrected series on the same hold-out.

    ``skill`` is the fractional MAE reduction (1 = perfect, 0 = no gain,
    negative = worse than raw). NaNs in the raw baseline are dropped pairwise so
    both series are scored on identical rows.
    """
    y_true = np.asarray(y_true, dtype=float)
    raw = np.asarray(raw, dtype=float)
    corrected = np.asarray(corrected, dtype=float)
    valid = np.isfinite(y_true) & np.isfinite(raw) & np.isfinite(corrected)
    y_true, raw, corrected = y_true[valid], raw[valid], corrected[valid]
    raw_metrics = _error_metrics(y_true, raw)
    corrected_metrics = _error_metrics(y_true, corrected)
    skill = (
        1.0 - corrected_metrics["mae"] / raw_metrics["mae"]
        if raw_metrics["mae"] > 0
        else 0.0
    )
    return {
        "count": int(y_true.size),
        "raw": raw_metrics,
        "corrected": corrected_metrics,
        "mae_skill_score": float(skill),
    }


def bias_correct(config: Config | None = None) -> dict[str, object]:
    """CLI entry: train + evaluate the Mường Pồn rainfall bias-correction model."""
    config = config or load_config()
    samples_path = RAW_DIR / "training_samples.csv"
    if not samples_path.exists():
        return {
            "status": "awaiting_data",
            "missing": str(samples_path.relative_to(ROOT)),
            "next": "copy the Mường Pồn training_samples.csv into ai/data/raw/muong_pon",
        }

    data = load_training_samples(samples_path)
    if data["y"].size == 0:
        return {"status": "no_labelled_rows", "path": str(samples_path.relative_to(ROOT))}

    val_mask = temporal_split(data["times"], val_ratio=0.2)
    if val_mask.all() or not val_mask.any():
        val_mask = np.zeros(data["y"].size, dtype=bool)

    train_mask = ~val_mask
    model = fit_bias_model(data["X"][train_mask], data["y"][train_mask], config)

    eval_mask = val_mask if val_mask.any() else train_mask
    corrected = predict_precip(model, data["X"][eval_mask])
    metrics = evaluate_bias_correction(
        data["y"][eval_mask], data["raw"][eval_mask], corrected
    )

    RUNS_DIR.mkdir(parents=True, exist_ok=True)
    artifact = RUNS_DIR / f"{config.experiment}_precip_bias_correction.joblib"
    joblib.dump(
        {"model": model, "features": list(FORECAST_FEATURES), "target": TARGET_COLUMN},
        artifact,
    )
    record = ModelRecord(
        name=f"{config.experiment}-precip-bias-correction",
        version="0.1.0-poc",
        data="weatherbridge_dien_bien_hazard_training (Mường Pồn subset)",
        license="training-code Apache-2.0; data CC-BY-4.0 (Open-Meteo), see oss-register.yaml",
        artifact=str(artifact.relative_to(ROOT)),
        report=json.dumps(metrics),
    )
    (RUNS_DIR / f"{config.experiment}_precip_bias_correction_record.json").write_text(
        record.model_dump_json(indent=2), encoding="utf-8"
    )

    return {
        "status": "trained",
        "model": "HistGradientBoostingRegressor",
        "target": TARGET_COLUMN,
        "train_samples": int(train_mask.sum()),
        "val_samples": int(val_mask.sum()),
        "metrics": metrics,
        "artifact": str(artifact.relative_to(ROOT)),
    }
