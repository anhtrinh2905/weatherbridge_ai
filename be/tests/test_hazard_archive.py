from datetime import UTC, date, datetime
from uuid import uuid4

from httpx import AsyncClient

from database.models import (
    DisasterEvent,
    DisasterEventLocation,
    DisasterEventSource,
    GeoLocation,
)


async def test_hazard_archive_requires_admin(client: AsyncClient) -> None:
    response = await client.get("/api/v1/admin/hazard-archive/locations")
    assert response.status_code == 403


async def test_admin_reads_locations_and_events(admin_client: AsyncClient, db_session) -> None:
    now = datetime(2026, 7, 18, tzinfo=UTC)
    location = GeoLocation(
        id=uuid4(),
        code="commune-muong-pon",
        canonical_name="Xã Mường Pồn",
        location_type="commune",
        latitude=21.5869655,
        longitude=103.0296833,
        uncertainty_m=15000,
        coordinate_source="OpenStreetMap",
        source_url="https://www.openstreetmap.org/relation/19571212",
        coordinate_confidence="C",
        is_sampling_location=True,
        created_at=now,
    )
    event = DisasterEvent(
        id=uuid4(),
        code="muong-pon-flash-flood-2024-07-25",
        hazard_type="flash_flood",
        started_at_utc=datetime(2024, 7, 24, 18, tzinfo=UTC),
        local_date=date(2024, 7, 25),
        description="Lũ quét Mường Pồn",
        verification_status="verified_public_sources",
        severity="major",
        source_count=1,
        created_at=now,
    )
    db_session.add_all([location, event])
    await db_session.flush()
    db_session.add(
        DisasterEventLocation(
            event_id=event.id,
            location_id=location.id,
            impact_role="sampling_area",
            confidence="C",
        )
    )
    db_session.add(
        DisasterEventSource(
            event_id=event.id,
            title="Public report",
            url="https://example.test/report",
            publisher="Test",
            accessed_at=now,
        )
    )
    await db_session.commit()

    locations = await admin_client.get(
        "/api/v1/admin/hazard-archive/locations", params={"sampling_only": True}
    )
    assert locations.status_code == 200
    assert locations.json()[0]["code"] == "commune-muong-pon"

    events = await admin_client.get("/api/v1/admin/hazard-archive/events")
    assert events.status_code == 200
    body = events.json()[0]
    assert body["code"] == "muong-pon-flash-flood-2024-07-25"
    assert body["locations"][0]["impact_role"] == "sampling_area"
    assert body["sources"][0]["title"] == "Public report"


async def test_admin_enqueues_backfill_and_export(admin_client: AsyncClient) -> None:
    backfill = await admin_client.post(
        "/api/v1/admin/hazard-archive/backfills",
        json={
            "start_date": "2024-07-01",
            "end_date": "2024-07-31",
            "products": ["previous_runs", "archive"],
            "location_codes": ["commune-muong-pon"],
        },
    )
    assert backfill.status_code == 202
    assert backfill.json()["task"] == "historical_weather_backfill"

    export = await admin_client.post("/api/v1/admin/hazard-archive/exports")
    assert export.status_code == 202
    assert export.json()["task"] == "training_csv_export"
