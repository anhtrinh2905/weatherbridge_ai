"""Fetch a Copernicus GLO-30 DEM window from the AWS Open Data mirror.

The Copernicus DEM 30 m tiles are public COGs on S3 (no API key), organised as
1°×1° tiles. This script reads only the requested bounding box (windowed over
``/vsicurl/``), merges the tiles it spans, and writes a small local GeoTIFF for
the offline susceptibility pipeline. Raw rasters are never committed — the file
lands under ``ai/data/raw`` which is git-ignored.

Provenance: ESA Copernicus GLO-30, AWS Open Data ``copernicus-dem-30m`` bucket.
Record it in ``docs/compliance/oss-register.yaml`` before use (AGENTS.md).

Usage (defaults to the Mường Pồn commune AOI):

    PYTHONPATH=ai/src uv run --project ai python ai/scripts/fetch_dem.py
"""

from __future__ import annotations

import argparse
import math
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw"
BUCKET = "https://copernicus-dem-30m.s3.amazonaws.com"

# Mường Pồn commune AOI (straddles the 103°E tile boundary → spans E102+E103).
DEFAULT_BOUNDS = (102.93, 21.47, 103.18, 21.72)  # west, south, east, north


def _tile_name(lat: int, lon: int) -> str:
    ns = f"N{lat:02d}" if lat >= 0 else f"S{abs(lat):02d}"
    ew = f"E{lon:03d}" if lon >= 0 else f"W{abs(lon):03d}"
    return f"Copernicus_DSM_COG_10_{ns}_00_{ew}_00_DEM"


def tiles_for_bounds(west: float, south: float, east: float, north: float) -> list[str]:
    """1°×1° tiles intersecting the bbox, as ``/vsicurl/`` COG URLs."""
    urls = []
    for lat in range(math.floor(south), math.floor(north) + 1):
        for lon in range(math.floor(west), math.floor(east) + 1):
            name = _tile_name(lat, lon)
            urls.append(f"/vsicurl/{BUCKET}/{name}/{name}.tif")
    return urls


def fetch_dem(bounds: tuple[float, float, float, float], out_path: Path) -> dict[str, object]:
    os.environ.setdefault("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR")
    import rasterio
    from rasterio.merge import merge

    west, south, east, north = bounds
    sources = [rasterio.open(url) for url in tiles_for_bounds(*bounds)]
    try:
        mosaic, transform = merge(sources, bounds=(west, south, east, north))
        profile = sources[0].profile
    finally:
        for src in sources:
            src.close()

    band = mosaic[0]
    profile.update(
        driver="GTiff",
        height=band.shape[0],
        width=band.shape[1],
        transform=transform,
        count=1,
        compress="deflate",
    )
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with rasterio.open(out_path, "w", **profile) as dst:
        dst.write(band, 1)

    return {
        "status": "fetched",
        "out": str(out_path.relative_to(ROOT)),
        "tiles": len(sources),
        "shape": [int(band.shape[0]), int(band.shape[1])],
        "elevation_min": float(band.min()),
        "elevation_max": float(band.max()),
        "bounds": list(bounds),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch a Copernicus GLO-30 DEM window")
    parser.add_argument("--bounds", nargs=4, type=float, metavar=("W", "S", "E", "N"),
                        default=DEFAULT_BOUNDS)
    parser.add_argument("--out", type=Path, default=RAW_DIR / "muong_pon_glo30.tif")
    args = parser.parse_args()
    print(fetch_dem(tuple(args.bounds), args.out))


if __name__ == "__main__":
    main()
