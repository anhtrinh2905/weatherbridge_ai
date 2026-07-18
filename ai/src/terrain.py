"""Derive terrain conditioning factors from a DEM.

Pure NumPy so the feature maths is unit-testable without a GeoTIFF or
rasterio. A real Copernicus GLO-30 tile is loaded in ``data.load_dem`` and
handed to :func:`terrain_features` as a plain 2-D array.

Features returned (one 2-D map each, same shape as the DEM):

- ``elevation``  normalised height 0..1 (mid elevations matter for slides)
- ``slope``      slope in degrees (finite-difference gradient)
- ``aspect_sin`` / ``aspect_cos``  circular encoding of aspect
- ``curvature``  profile curvature (Laplacian of elevation)
- ``twi``        topographic wetness index (contributing-area proxy)
- ``roughness``  local elevation standard deviation

These are standard landslide-susceptibility conditioning factors. TWI here
uses a cheap contributing-area proxy (see :func:`topographic_wetness_index`),
adequate for a PoC; a D8 flow-accumulation upgrade is a later milestone.
"""

from __future__ import annotations

import numpy as np
from scipy.ndimage import generic_filter, uniform_filter

# Feature column order is part of the model contract: train, evaluate and the
# eventual serving path must all agree on it. Keep this the single source.
FEATURE_NAMES: tuple[str, ...] = (
    "elevation",
    "slope",
    "aspect_sin",
    "aspect_cos",
    "curvature",
    "twi",
    "roughness",
)

_EPS = 1e-6


def _normalise(array: np.ndarray) -> np.ndarray:
    lo = float(np.nanmin(array))
    hi = float(np.nanmax(array))
    if hi - lo < _EPS:
        return np.zeros_like(array, dtype=float)
    return (array - lo) / (hi - lo)


def slope_aspect(dem: np.ndarray, cellsize: float) -> tuple[np.ndarray, np.ndarray]:
    """Return (slope in degrees, aspect in radians 0..2pi)."""
    # np.gradient returns d/drow, d/dcol; rows increase southward.
    dz_dy, dz_dx = np.gradient(dem.astype(float), cellsize)
    slope_rad = np.arctan(np.hypot(dz_dx, dz_dy))
    aspect = np.arctan2(dz_dy, -dz_dx)
    aspect = np.where(aspect < 0, aspect + 2 * np.pi, aspect)
    return np.degrees(slope_rad), aspect


def curvature(dem: np.ndarray, cellsize: float) -> np.ndarray:
    """Profile curvature approximated by the Laplacian of elevation."""
    dz_dy, dz_dx = np.gradient(dem.astype(float), cellsize)
    d2y, _ = np.gradient(dz_dy, cellsize)
    _, d2x = np.gradient(dz_dx, cellsize)
    return d2x + d2y


def topographic_wetness_index(dem: np.ndarray, cellsize: float) -> np.ndarray:
    """TWI = ln(a / tan(slope)) with a cheap contributing-area proxy.

    Full TWI needs D8/D-infinity flow accumulation. For a PoC we proxy the
    specific catchment area ``a`` with a downhill-weighted local mean: cells
    that sit low relative to their neighbourhood accumulate more water. The
    result preserves the spatial pattern (valleys wet, ridges dry) which is
    what the model keys on.
    """
    dem = dem.astype(float)
    slope_deg, _ = slope_aspect(dem, cellsize)
    tan_slope = np.tan(np.radians(slope_deg)) + _EPS
    neighbourhood_mean = uniform_filter(dem, size=5, mode="nearest")
    # Higher where the cell is below its surroundings (a drainage sink).
    relative_low = np.clip(neighbourhood_mean - dem, 0.0, None)
    catchment_proxy = 1.0 + relative_low / cellsize
    return np.log(catchment_proxy / tan_slope)


def roughness(dem: np.ndarray, window: int = 3) -> np.ndarray:
    """Local elevation standard deviation over a square window."""
    return generic_filter(dem.astype(float), np.std, size=window, mode="nearest")


def terrain_features(dem: np.ndarray, cellsize: float) -> dict[str, np.ndarray]:
    """Compute every conditioning factor in :data:`FEATURE_NAMES`."""
    if dem.ndim != 2:
        raise ValueError(f"DEM must be 2-D, got shape {dem.shape}")
    slope_deg, aspect = slope_aspect(dem, cellsize)
    return {
        "elevation": _normalise(dem),
        "slope": slope_deg,
        "aspect_sin": np.sin(aspect),
        "aspect_cos": np.cos(aspect),
        "curvature": curvature(dem, cellsize),
        "twi": topographic_wetness_index(dem, cellsize),
        "roughness": roughness(dem),
    }


def feature_stack(dem: np.ndarray, cellsize: float) -> np.ndarray:
    """Stack features into an (H, W, F) array ordered by FEATURE_NAMES."""
    features = terrain_features(dem, cellsize)
    return np.dstack([features[name] for name in FEATURE_NAMES])
