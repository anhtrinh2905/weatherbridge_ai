from modules.hazard_archive.schemas import (
    ArchiveCoverageResponse,
    DisasterEventResponse,
    EventLocationResponse,
    EventSourceResponse,
    GeoLocationResponse,
)
from repositories.hazard_archive_repository import HazardArchiveRepository


class HazardArchiveService:
    def __init__(self, repository: HazardArchiveRepository) -> None:
        self.repository = repository

    async def list_locations(
        self, *, sampling_only: bool = False, unresolved_only: bool = False
    ) -> list[GeoLocationResponse]:
        locations = await self.repository.list_locations(
            sampling_only=sampling_only, unresolved_only=unresolved_only
        )
        return [
            GeoLocationResponse(
                code=location.code,
                canonical_name=location.canonical_name,
                location_type=location.location_type,
                historical_admin_name=location.historical_admin_name,
                current_admin_name=location.current_admin_name,
                latitude=location.latitude,
                longitude=location.longitude,
                uncertainty_m=location.uncertainty_m,
                coordinate_confidence=location.coordinate_confidence,
                coordinate_source=location.coordinate_source,
                source_url=location.source_url,
                is_sampling_location=location.is_sampling_location,
            )
            for location in locations
        ]

    async def list_events(
        self, verification_status: str | None = None
    ) -> list[DisasterEventResponse]:
        events = await self.repository.list_events(verification_status=verification_status)
        result: list[DisasterEventResponse] = []
        for event in events:
            locations = await self.repository.event_locations(event.id)
            sources = await self.repository.event_sources(event.id)
            result.append(
                DisasterEventResponse(
                    code=event.code,
                    hazard_type=event.hazard_type,
                    started_at_utc=event.started_at_utc,
                    ended_at_utc=event.ended_at_utc,
                    local_date=event.local_date,
                    description=event.description,
                    verification_status=event.verification_status,
                    severity=event.severity,
                    locations=[EventLocationResponse(**location) for location in locations],
                    sources=[
                        EventSourceResponse(
                            title=source.title,
                            url=source.url,
                            publisher=source.publisher,
                            accessed_at=source.accessed_at,
                        )
                        for source in sources
                    ],
                )
            )
        return result

    async def coverage(self) -> list[ArchiveCoverageResponse]:
        return [ArchiveCoverageResponse(**row) for row in await self.repository.coverage()]
