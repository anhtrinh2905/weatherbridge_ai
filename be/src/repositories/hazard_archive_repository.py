from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from database.models import (
    DisasterEvent,
    DisasterEventLocation,
    DisasterEventSource,
    ForecastHourly,
    GeoLocation,
    WeatherObservationHourly,
)


class HazardArchiveRepository:
    """Read-only queries over normalized research data for internal services."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_locations(
        self, *, sampling_only: bool = False, unresolved_only: bool = False, limit: int = 500
    ) -> list[GeoLocation]:
        query = (
            select(GeoLocation).order_by(GeoLocation.location_type, GeoLocation.code).limit(limit)
        )
        if sampling_only:
            query = query.where(GeoLocation.is_sampling_location.is_(True))
        if unresolved_only:
            query = query.where(GeoLocation.coordinate_confidence == "unresolved")
        return list((await self.session.scalars(query)).all())

    async def list_events(
        self, *, verification_status: str | None = None, limit: int = 200
    ) -> list[DisasterEvent]:
        query = select(DisasterEvent).order_by(DisasterEvent.started_at_utc.desc()).limit(limit)
        if verification_status:
            query = query.where(DisasterEvent.verification_status == verification_status)
        return list((await self.session.scalars(query)).all())

    async def event_locations(self, event_id: Any) -> list[dict[str, Any]]:
        rows = await self.session.execute(
            select(DisasterEventLocation, GeoLocation)
            .join(GeoLocation, GeoLocation.id == DisasterEventLocation.location_id)
            .where(DisasterEventLocation.event_id == event_id)
            .order_by(GeoLocation.code)
        )
        return [
            {
                "code": location.code,
                "name": location.canonical_name,
                "impact_role": link.impact_role,
                "confidence": link.confidence,
                "latitude": location.latitude,
                "longitude": location.longitude,
                "fatalities": link.fatalities,
                "missing_people": link.missing_people,
                "injured_people": link.injured_people,
                "damaged_houses": link.damaged_houses,
            }
            for link, location in rows.all()
        ]

    async def event_sources(self, event_id: Any) -> list[DisasterEventSource]:
        return list(
            (
                await self.session.scalars(
                    select(DisasterEventSource)
                    .where(DisasterEventSource.event_id == event_id)
                    .order_by(DisasterEventSource.id)
                )
            ).all()
        )

    async def coverage(self) -> list[dict[str, Any]]:
        forecast_rows = await self.session.execute(
            select(
                GeoLocation.code,
                ForecastHourly.product,
                ForecastHourly.model,
                ForecastHourly.lead_hours,
                func.min(ForecastHourly.valid_time_utc),
                func.max(ForecastHourly.valid_time_utc),
                func.count(ForecastHourly.id),
            )
            .join(GeoLocation, GeoLocation.id == ForecastHourly.location_id)
            .group_by(
                GeoLocation.code,
                ForecastHourly.product,
                ForecastHourly.model,
                ForecastHourly.lead_hours,
            )
            .order_by(
                GeoLocation.code,
                ForecastHourly.product,
                ForecastHourly.model,
                ForecastHourly.lead_hours,
            )
        )
        observation_rows = await self.session.execute(
            select(
                GeoLocation.code,
                WeatherObservationHourly.model,
                func.min(WeatherObservationHourly.valid_time_utc),
                func.max(WeatherObservationHourly.valid_time_utc),
                func.count(WeatherObservationHourly.id),
            )
            .join(GeoLocation, GeoLocation.id == WeatherObservationHourly.location_id)
            .group_by(GeoLocation.code, WeatherObservationHourly.model)
            .order_by(GeoLocation.code, WeatherObservationHourly.model)
        )
        result = [
            {
                "location_code": code,
                "product": product,
                "model": model,
                "lead_hours": lead_hours,
                "first_valid_time": first_time,
                "last_valid_time": last_time,
                "row_count": row_count,
            }
            for code, product, model, lead_hours, first_time, last_time, row_count in forecast_rows
        ]
        result.extend(
            {
                "location_code": code,
                "product": "archive",
                "model": model,
                "lead_hours": None,
                "first_valid_time": first_time,
                "last_valid_time": last_time,
                "row_count": row_count,
            }
            for code, model, first_time, last_time, row_count in observation_rows
        )
        return result
