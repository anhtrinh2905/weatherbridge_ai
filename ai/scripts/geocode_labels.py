"""Geocode affected villages into landslide positive-label coordinates.

The 25/07/2024 Mường Pồn event reports name the affected hamlets but no precise
scarp coordinates. As a PoC inventory we geocode each hamlet with OSM Nominatim,
constrained to the DEM AOI, and treat the returned village centre as a positive
sample. These are *coarse* labels (village centre ≠ failure surface, ~1–2 km
error); replace them with a digitised scarp inventory for a production model.

Nominatim usage policy: a descriptive User-Agent and ≤1 request/second. Results
are cached to a JSON so the network call runs once. Provenance: OpenStreetMap
(ODbL) — record in docs/compliance/oss-register.yaml.

    PYTHONPATH=ai/src uv run --project ai python ai/scripts/geocode_labels.py
"""

from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_PATH = ROOT / "data" / "raw" / "muong_pon_labels.json"
NOMINATIM = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "weatherbridge-ai/0.1 (offline susceptibility PoC; contact repo maintainers)"

# AOI = the fetched DEM bounds; results outside are rejected as mis-geocodes.
AOI = (102.93, 21.47, 103.18, 21.72)  # west, south, east, north

# Affected hamlets of the Mường Pồn flash-flood/landslide event (25/07/2024).
QUERIES = [
    "Bản Mường Pồn 1, Mường Pồn, Điện Biên, Việt Nam",
    "Bản Mường Pồn 2, Mường Pồn, Điện Biên, Việt Nam",
    "Bản Lĩnh, Mường Pồn, Điện Biên, Việt Nam",
    "Bản Tin Tốc, Mường Pồn, Điện Biên, Việt Nam",
    "Mường Pồn, Điện Biên, Việt Nam",  # commune fallback anchor
]


def _in_aoi(lat: float, lon: float) -> bool:
    w, s, e, n = AOI
    return w <= lon <= e and s <= lat <= n


def geocode(query: str) -> dict[str, object] | None:
    w, s, e, n = AOI
    params = urllib.parse.urlencode({
        "q": query,
        "format": "jsonv2",
        "limit": 1,
        "viewbox": f"{w},{n},{e},{s}",
        "bounded": 1,
    })
    request = urllib.request.Request(f"{NOMINATIM}?{params}", headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=20) as response:  # noqa: S310 (trusted host)
        hits = json.loads(response.read().decode("utf-8"))
    if not hits:
        return None
    hit = hits[0]
    lat, lon = float(hit["lat"]), float(hit["lon"])
    if not _in_aoi(lat, lon):
        return None
    return {"query": query, "lat": lat, "lon": lon, "display_name": hit.get("display_name", "")}


def main() -> None:
    results = []
    for query in QUERIES:
        try:
            hit = geocode(query)
        except Exception as exc:  # network/HTTP errors shouldn't abort the batch
            hit = {"query": query, "error": str(exc)}
        if hit and "lat" in hit:
            print(f"OK   {query[:40]:40s} -> {hit['lat']:.5f}, {hit['lon']:.5f}")
            results.append(hit)
        else:
            reason = hit.get("error", "no result in AOI") if hit else "no result"
            print(f"MISS {query[:40]:40s} -> {reason}")
        time.sleep(1.1)  # Nominatim rate limit

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nwrote {len(results)} labels -> {OUT_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
