from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import AppError
from database.models import ForecastSnapshot
from modules.forecasts.locations import LOCATIONS, ForecastLocation
from modules.hazards.schemas import RISK_LEVEL_NAMES, HazardDay, HazardRiskResponse


class HazardRiskService:
    """Serve the composite hazard risk for a location.

    Reads the latest forecast snapshot, whose per-day risk was computed once by
    the worker at ingest time (bias-correction → I–D trigger → risk). This
    service does no inference — it maps stored fields to the response and labels
    the numeric level, keeping the request path cheap (see AGENTS.md).
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    @staticmethod
    def resolve_location(location_code: str) -> ForecastLocation:
        location = LOCATIONS.get(location_code)
        if location is None:
            raise AppError(404, "Unknown forecast location", "location_not_found")
        return location

    @staticmethod
    def _to_hazard_day(day: dict) -> HazardDay:
        level = day.get("risk_level")
        risk_name = RISK_LEVEL_NAMES[level] if isinstance(level, int) and 0 <= level < len(
            RISK_LEVEL_NAMES
        ) else None
        return HazardDay(
            date=day["date"],
            rainfall_mm=day["rainfall_mm"],
            peak_intensity_mm_h=day.get("peak_intensity_mm_h"),
            corrected_rainfall_mm=day.get("corrected_rainfall_mm"),
            bias_corrected=day.get("bias_corrected"),
            id_exceedance=day.get("id_exceedance"),
            trigger_level=day.get("trigger_level"),
            risk_level=level,
            risk_name=risk_name,
        )

    async def latest(self, location_code: str) -> HazardRiskResponse:
        self.resolve_location(location_code)
        snapshot = await self.session.scalar(
            select(ForecastSnapshot)
            .where(ForecastSnapshot.location_code == location_code)
            .order_by(ForecastSnapshot.fetched_at.desc())
            .limit(1)
        )
        if snapshot is None:
            raise AppError(404, "No forecast has been ingested yet", "forecast_not_found")
        return HazardRiskResponse(
            location_code=snapshot.location_code,
            latitude=snapshot.latitude,
            longitude=snapshot.longitude,
            source=snapshot.source,
            computed_at=snapshot.fetched_at,
            days=[self._to_hazard_day(day) for day in snapshot.days],
        )
