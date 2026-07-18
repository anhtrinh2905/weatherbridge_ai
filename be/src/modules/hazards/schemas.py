from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

HazardType = Literal["flash_flood", "landslide", "fog", "dominant"]

# Composite risk / rainfall trigger level names (0..4), matching the offline
# scoring and the frontend "raster nguy cơ 5 cấp".
RISK_LEVEL_NAMES: tuple[str, ...] = ("không", "thấp", "trung bình", "cao", "rất cao")


class HazardLayerResponse(BaseModel):
    id: UUID
    run_id: UUID
    hazard_type: str
    forecast_day: date
    raster_url: str
    web_png_url: str
    bbox: dict[str, object]
    crs: str
    resolution_m: float
    level_bins: list[object]
    legend: dict[str, object]
    confidence: float
    contribution_summary: dict[str, object]
    issued_at: datetime


class HazardManifestResponse(BaseModel):
    requested_type: HazardType
    layers: list[HazardLayerResponse]


class HazardCellSample(BaseModel):
    hazard_type: str
    layer_id: UUID
    forecast_day: date
    risk_level: int | None
    score_min: float | None
    score_max: float | None
    confidence: float


class HazardCellResponse(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    samples: list[HazardCellSample]
    dominant_source: str | None


class HazardDay(BaseModel):
    """One forecast day with its rainfall trigger and composite risk.

    Risk fields are optional so snapshots written before the scoring pipeline
    (or by a future field-set) still deserialize.
    """

    date: str
    rainfall_mm: float
    peak_intensity_mm_h: float | None = None
    corrected_rainfall_mm: float | None = None
    bias_corrected: bool | None = None
    id_exceedance: float | None = None
    trigger_level: int | None = None
    risk_level: int | None = None
    risk_name: str | None = None


class HazardRiskResponse(BaseModel):
    location_code: str
    latitude: float
    longitude: float
    source: str
    computed_at: datetime
    days: list[HazardDay]
