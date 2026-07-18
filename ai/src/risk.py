"""Composite hazard risk = terrain susceptibility × rainfall trigger.

The two factors of the risk raster brought together (the UI's "Địa hình /
Kích hoạt mưa" split):

- **Susceptibility** (spatial, static) — where the terrain is prone to failure,
  a per-pixel index from the real DEM. Today this is a physically-motivated
  *heuristic*; :func:`susceptibility_index` takes an optional trained model so
  the landslide-susceptibility ``GradientBoostingClassifier`` can be dropped in
  behind the same interface once an inventory exists (M2-terrain).
- **Trigger** (temporal, per-location) — when rainfall makes failure imminent,
  the I–D exceedance from :mod:`rainfall_trigger`.

Risk is their product: high only where susceptible terrain **and** an active
rainfall trigger coincide — the empirical finding that rainfall is necessary
but not sufficient (see ``ai/README.md``). The product is mapped to the same
5 levels as the trigger.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np

from data import load_dem
from rainfall_trigger import (
    EVENT_WINDOW,
    LEVEL_NAMES,
    calibrate_alpha,
    corrected_forecast_series,
    id_exceedance,
    load_location_series,
    to_epoch,
)
from terrain import feature_stack, terrain_features

ROOT = Path(__file__).resolve().parents[1]
DEM_PATH = ROOT / "data" / "raw" / "muong_pon_glo30.tif"

# Trigger ratio at/above which the rainfall factor is considered "fully on".
TRIGGER_SATURATION = 2.0
# Composite-risk level boundaries on the 0..1 product (0|1|2|3|4).
RISK_BOUNDS: tuple[float, ...] = (0.05, 0.15, 0.30, 0.50)


def _normalise(array: np.ndarray) -> np.ndarray:
    lo, hi = float(np.nanmin(array)), float(np.nanmax(array))
    if hi - lo < 1e-9:
        return np.zeros_like(array, dtype=float)
    return (array - lo) / (hi - lo)


def susceptibility_index(
    dem: np.ndarray, cellsize: float = 30.0, model: object | None = None
) -> np.ndarray:
    """Per-pixel landslide susceptibility in [0, 1] from a DEM.

    With ``model`` (a fitted classifier exposing ``predict_proba``) this returns
    the model's positive-class probability over the ``FEATURE_NAMES`` stack —
    the production path once the susceptibility model is trained. Without one it
    falls back to a heuristic: steeper, wetter (high TWI), rougher terrain is
    more prone. Weights are physically motivated, not learned.
    """
    if model is not None:
        stack = feature_stack(dem, cellsize)
        height, width, n_features = stack.shape
        proba = model.predict_proba(stack.reshape(-1, n_features))[:, 1]
        return proba.reshape(height, width)

    feats = terrain_features(dem, cellsize)
    heuristic = (
        0.50 * _normalise(feats["slope"])
        + 0.35 * _normalise(feats["twi"])
        + 0.15 * _normalise(feats["roughness"])
    )
    return _normalise(heuristic)


def normalised_trigger(ratio: float, saturation: float = TRIGGER_SATURATION) -> float:
    """Map an I–D exceedance ratio to a [0, 1] trigger strength."""
    return float(min(max(ratio, 0.0) / saturation, 1.0))


def composite_risk(susceptibility: np.ndarray, trigger_strength: float) -> np.ndarray:
    """Risk raster = susceptibility × trigger strength (AND semantics)."""
    return susceptibility * trigger_strength


def risk_levels(risk: np.ndarray, bounds: tuple[float, ...] = RISK_BOUNDS) -> np.ndarray:
    """Bin a risk raster/scalar into 0..len(bounds) levels."""
    return np.digitize(risk, bounds).astype(int)


def _area_distribution(levels: np.ndarray) -> dict[str, dict[str, float]]:
    counts = np.bincount(levels.ravel(), minlength=len(LEVEL_NAMES))
    total = levels.size
    return {
        LEVEL_NAMES[i]: {"pixels": int(counts[i]), "pct": round(float(counts[i]) / total * 100, 2)}
        for i in range(len(LEVEL_NAMES))
    }


def run_risk_pipeline(location_code: str = "commune-muong-pon") -> dict[str, object]:
    """End-to-end: DEM susceptibility × rainfall trigger → composite risk.

    Contrasts the 25/07/2024 event peak against a dry baseline on the *same*
    terrain, to show the composite reacts to the trigger, not just the terrain.
    """
    if not DEM_PATH.exists():
        return {"status": "awaiting_dem", "missing": str(DEM_PATH.relative_to(ROOT)),
                "next": "run ai/scripts/fetch_dem.py"}

    dem = load_dem(DEM_PATH)
    susceptibility = susceptibility_index(dem)

    series = load_location_series(location_code=location_code)
    if series["epochs"].size == 0:
        return {"status": "no_rainfall_data", "location": location_code}

    epochs = series["epochs"]
    try:
        precip = corrected_forecast_series(series["forecast_records"])
        source = "bias_corrected_forecast"
    except FileNotFoundError:
        precip = series["forecast_raw"]
        source = "raw_forecast"

    event = (epochs >= to_epoch(EVENT_WINDOW[0])) & (epochs <= to_epoch(EVENT_WINDOW[1]))
    alpha = calibrate_alpha(epochs, precip, event)
    ratio = id_exceedance(epochs, precip, alpha=alpha)

    event_ratio = float(ratio[event].max()) if event.any() else 0.0
    dry_ratio = float(np.median(ratio))  # a typical (mostly dry) hour

    event_risk = composite_risk(susceptibility, normalised_trigger(event_ratio))
    dry_risk = composite_risk(susceptibility, normalised_trigger(dry_ratio))

    return {
        "status": "ok",
        "location": location_code,
        "trigger_source": source,
        "dem_shape": [int(dem.shape[0]), int(dem.shape[1])],
        "susceptibility": {
            "mean": round(float(susceptibility.mean()), 3),
            "max": round(float(susceptibility.max()), 3),
            "note": "heuristic (slope/TWI/roughness); swap in trained model when available",
        },
        "event_25_07_2024": {
            "trigger_ratio": round(event_ratio, 3),
            "trigger_strength": round(normalised_trigger(event_ratio), 3),
            "risk_area": _area_distribution(risk_levels(event_risk)),
        },
        "dry_baseline": {
            "trigger_ratio": round(dry_ratio, 3),
            "risk_area": _area_distribution(risk_levels(dry_risk)),
        },
    }
