"""Offline data preparation for the landslide-susceptibility PoC.

Builds a supervised feature table from:

- a DEM (Copernicus GLO-30), turned into conditioning factors by ``terrain``;
- an open landslide inventory (COOLR points, the digitised 25/07/2024 Mường
  Pồn event, and inventories from published papers) as positive samples;
- randomly drawn stable cells as pseudo-negatives (standard for
  susceptibility, which lacks true "no-landslide" observations).

Every dataset must be described by a reviewed manifest under
``ai/data/manifests`` recording source, licence and provenance before use
(see ``AGENTS.md`` Compliance). Raw rasters are never committed to Git — only
the manifest and, optionally, small digitised label files.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import yaml
from pydantic import BaseModel, Field

from terrain import FEATURE_NAMES, feature_stack

ROOT = Path(__file__).resolve().parents[1]
MANIFESTS_DIR = ROOT / "data" / "manifests"
PROCESSED_DIR = ROOT / "data" / "processed"


class LabelPoint(BaseModel):
    """One inventoried landslide, in pixel (row, col) coordinates."""

    row: int = Field(ge=0)
    col: int = Field(ge=0)


class GeoLabelPoint(BaseModel):
    """One inventoried landslide, in geographic (lat, lon) coordinates.

    The natural form for an open inventory (COOLR points, digitised scarps,
    geocoded sites). Converted to pixel ``LabelPoint`` against the DEM's own
    georeferencing at prepare time — no hand-computed pixel indices.
    """

    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)


class DatasetManifest(BaseModel):
    """Provenance + parameters for one susceptibility dataset."""

    name: str
    source: str
    license: str
    dem_path: str
    dem_cellsize_m: float = Field(gt=0)
    labels: list[LabelPoint] = Field(default_factory=list)
    labels_lonlat: list[GeoLabelPoint] = Field(default_factory=list)
    negative_ratio: float = Field(default=2.0, gt=0)
    exclusion_radius_px: int = Field(default=2, ge=0)
    seed: int = 42
    notes: str = ""


def load_manifest(path: Path) -> DatasetManifest:
    return DatasetManifest.model_validate(yaml.safe_load(path.read_text(encoding="utf-8")))


def discover_manifests() -> list[Path]:
    """Real manifests only — ``*.example.yaml`` are templates, not data."""
    if not MANIFESTS_DIR.exists():
        return []
    return sorted(p for p in MANIFESTS_DIR.glob("*.yaml") if not p.name.endswith(".example.yaml"))


def load_dem(path: Path) -> np.ndarray:
    """Load a DEM as a 2-D float array.

    GeoTIFF/other rasters go through rasterio (imported lazily so the rest of
    the pipeline and the tests do not depend on the geospatial stack). ``.npy``
    fixtures load directly, which keeps unit tests fast and offline.
    """
    if path.suffix == ".npy":
        return np.load(path).astype(float)
    try:
        import rasterio
    except ImportError as exc:  # pragma: no cover - only when geo extras absent
        raise RuntimeError(
            f"reading {path.suffix} DEMs needs rasterio: uv add --project ai rasterio"
        ) from exc
    with rasterio.open(path) as dataset:
        return dataset.read(1).astype(float)


def load_dem_bounds(path: Path) -> tuple[float, float, float, float]:
    """Read a raster's geographic bounds as ``(west, south, east, north)``."""
    import rasterio  # lazy: only the geographic-label path needs it

    with rasterio.open(path) as dataset:
        b = dataset.bounds
        return (b.left, b.bottom, b.right, b.top)


def lonlat_to_rowcol(
    bounds: tuple[float, float, float, float],
    shape: tuple[int, int],
    lon: float,
    lat: float,
) -> tuple[int, int]:
    """Map a geographic point to a north-up raster pixel ``(row, col)``.

    Pure arithmetic (no rasterio) so it is unit-testable offline. Assumes the
    DEM is north-up in the same CRS as the point (Copernicus GLO-30 is
    EPSG:4326). Raises ``ValueError`` if the point falls outside ``bounds``.
    """
    west, south, east, north = bounds
    height, width = shape
    if not (west <= lon <= east and south <= lat <= north):
        raise ValueError(f"point ({lat}, {lon}) is outside the DEM extent {bounds}")
    col = int((lon - west) / (east - west) * width)
    row = int((north - lat) / (north - south) * height)
    # Clamp the far edge (lon==east / lat==south) back into range.
    return min(row, height - 1), min(col, width - 1)


def geographic_labels_to_pixels(
    geo_labels: list[GeoLabelPoint],
    bounds: tuple[float, float, float, float],
    shape: tuple[int, int],
) -> list[LabelPoint]:
    """Convert geographic inventory points to pixel labels against a DEM."""
    pixels = []
    for point in geo_labels:
        row, col = lonlat_to_rowcol(bounds, shape, point.lon, point.lat)
        pixels.append(LabelPoint(row=row, col=col))
    return pixels


def sample_dataset(
    dem: np.ndarray,
    cellsize: float,
    labels: list[LabelPoint],
    negative_ratio: float = 2.0,
    exclusion_radius_px: int = 2,
    seed: int = 42,
) -> dict[str, np.ndarray]:
    """Turn a DEM + label points into (X, y, coords).

    Positives are the inventoried cells; negatives are random cells kept at
    least ``exclusion_radius_px`` from any positive to avoid mislabelling the
    immediate failure surroundings. Returns feature order = FEATURE_NAMES.
    """
    height, width = dem.shape
    stack = feature_stack(dem, cellsize)  # (H, W, F)

    positives = np.array([[lbl.row, lbl.col] for lbl in labels], dtype=int)
    if positives.size:
        if positives[:, 0].max() >= height or positives[:, 1].max() >= width:
            raise ValueError("a label point falls outside the DEM extent")

    blocked = np.zeros((height, width), dtype=bool)
    for row, col in positives:
        r0, r1 = max(0, row - exclusion_radius_px), min(height, row + exclusion_radius_px + 1)
        c0, c1 = max(0, col - exclusion_radius_px), min(width, col + exclusion_radius_px + 1)
        blocked[r0:r1, c0:c1] = True

    rng = np.random.default_rng(seed)
    n_negative = int(round(len(positives) * negative_ratio))
    candidate_rows, candidate_cols = np.where(~blocked)
    if n_negative > candidate_rows.size:
        n_negative = candidate_rows.size
    chosen = rng.choice(candidate_rows.size, size=n_negative, replace=False)
    negatives = np.column_stack([candidate_rows[chosen], candidate_cols[chosen]])

    coords = np.vstack([positives, negatives]) if positives.size else negatives
    labels_arr = np.concatenate(
        [np.ones(len(positives), dtype=int), np.zeros(len(negatives), dtype=int)]
    )
    features = stack[coords[:, 0], coords[:, 1]]
    return {"X": features, "y": labels_arr, "coords": coords}


def spatial_split(
    coords: np.ndarray,
    block_size: int = 8,
    val_ratio: float = 0.25,
    seed: int = 42,
) -> np.ndarray:
    """Block-hold-out split to curb spatial autocorrelation leakage.

    Cells are grouped into ``block_size`` × ``block_size`` blocks; whole blocks
    go to validation so train and val never share neighbouring pixels. Returns
    a boolean mask that is ``True`` for validation rows.
    """
    block_ids = (coords[:, 0] // block_size) * 100_000 + (coords[:, 1] // block_size)
    unique_blocks = np.unique(block_ids)
    rng = np.random.default_rng(seed)
    rng.shuffle(unique_blocks)
    n_val = max(1, int(round(len(unique_blocks) * val_ratio)))
    val_blocks = set(unique_blocks[:n_val].tolist())
    return np.array([bid in val_blocks for bid in block_ids])


def split(items: list[str], ratio: float = 0.8) -> tuple[list[str], list[str]]:
    """Generic ordered split retained for simple, non-spatial use."""
    boundary = int(len(items) * ratio)
    return items[:boundary], items[boundary:]


def build_from_manifest(manifest: DatasetManifest) -> dict[str, np.ndarray]:
    dem_path = (ROOT / manifest.dem_path).resolve()
    dem = load_dem(dem_path)
    labels = list(manifest.labels)
    if manifest.labels_lonlat:
        bounds = load_dem_bounds(dem_path)
        labels += geographic_labels_to_pixels(manifest.labels_lonlat, bounds, dem.shape)
    return sample_dataset(
        dem,
        manifest.dem_cellsize_m,
        labels,
        negative_ratio=manifest.negative_ratio,
        exclusion_radius_px=manifest.exclusion_radius_px,
        seed=manifest.seed,
    )


def prepare() -> dict[str, str | int]:
    """CLI entry: build every discoverable dataset into ``data/processed``."""
    manifests = discover_manifests()
    if not manifests:
        return {
            "status": "not_configured",
            "next": "add a reviewed manifest under ai/data/manifests "
            "(see muong_pon_landslide.example.yaml)",
        }
    manifest = load_manifest(manifests[0])
    dem_path = (ROOT / manifest.dem_path).resolve()
    if not dem_path.exists():
        return {
            "status": "awaiting_data",
            "manifest": manifest.name,
            "missing": manifest.dem_path,
            "next": "download the Copernicus GLO-30 tile (see ai/scripts/fetch_dem.py)",
        }
    if not manifest.labels and not manifest.labels_lonlat:
        return {
            "status": "awaiting_labels",
            "manifest": manifest.name,
            "next": "add a digitised landslide inventory to the manifest "
            "(labels_lonlat: lat/lon points); open sources do not cover this AOI",
        }
    dataset = build_from_manifest(manifest)
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    out = PROCESSED_DIR / f"{manifest.name}.npz"
    np.savez(out, X=dataset["X"], y=dataset["y"], coords=dataset["coords"])
    return {
        "status": "prepared",
        "manifest": manifest.name,
        "samples": int(dataset["y"].size),
        "positives": int(dataset["y"].sum()),
        "features": len(FEATURE_NAMES),
        "artifact": str(out.relative_to(ROOT)),
    }
