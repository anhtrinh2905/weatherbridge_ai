import base64
import io
import sys
from contextlib import asynccontextmanager
from pathlib import Path

import numpy as np
import rasterio
from fastapi import FastAPI, HTTPException
from PIL import Image
from pydantic import BaseModel
from rasterio.features import shapes

SRC_DIR = Path(__file__).resolve().parent
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from data import load_dem
from risk import (
    DEM_PATH,
    composite_risk,
    normalised_trigger,
    risk_levels,
    susceptibility_index,
)

# Cache DEM and susceptibility to avoid recomputing
app_state = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    if DEM_PATH.exists():
        dem = load_dem(DEM_PATH)
        app_state["susceptibility"] = susceptibility_index(dem)
        with rasterio.open(DEM_PATH) as src:
            app_state["transform"] = src.transform
            app_state["crs"] = src.crs
            app_state["bounds"] = src.bounds
    yield
    app_state.clear()


app = FastAPI(lifespan=lifespan, title="Weather Bridge AI Inference API")

class InferenceRequest(BaseModel):
    location_code: str
    trigger_ratio: float

# Color map for WebP (Levels 0..4)
# 0: None, 1: Thấp (Yellow), 2: TB (Orange), 3: Cao (Red), 4: Rất Cao (Purple)
COLOR_MAP = {
    0: (0, 0, 0, 0),
    1: (255, 255, 0, 180),
    2: (255, 165, 0, 180),
    3: (255, 0, 0, 180),
    4: (128, 0, 128, 180),
}


@app.post("/infer")
async def infer(req: InferenceRequest):
    if "susceptibility" not in app_state:
        raise HTTPException(status_code=503, detail="DEM not loaded on server")

    susceptibility = app_state["susceptibility"]
    transform = app_state["transform"]
    crs = app_state["crs"]
    bounds = app_state["bounds"]

    trigger_strength = normalised_trigger(req.trigger_ratio)
    risk = composite_risk(susceptibility, trigger_strength)
    levels = risk_levels(risk)

    # 1. Generate WebP
    h, w = levels.shape
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    for level, color in COLOR_MAP.items():
        if level > 0:
            rgba[levels == level] = color

    img = Image.fromarray(rgba, "RGBA")
    webp_io = io.BytesIO()
    img.save(webp_io, format="WEBP")
    webp_base64 = base64.b64encode(webp_io.getvalue()).decode("utf-8")

    # 2. Polygonize levels >= 1
    mask = levels >= 1
    polygons = []
    if mask.any():
        for geom, val in shapes(levels.astype(np.int16), mask=mask, transform=transform):
            polygons.append({
                "type": "Feature",
                "geometry": geom,
                "properties": {"level": int(val)},
            })

    geojson = {
        "type": "FeatureCollection",
        "features": polygons,
        "crs": {
            "type": "name",
            "properties": {"name": crs.to_string() if hasattr(crs, "to_string") else str(crs)},
        },
    }

    return {
        "status": "ok",
        "location": req.location_code,
        "webp_base64": webp_base64,
        "geojson": geojson,
        "bbox": [bounds.left, bounds.bottom, bounds.right, bounds.top],
    }
