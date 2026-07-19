import base64
import os
from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta
from uuid import UUID

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user
from auth.keycloak import CurrentUser
from core.config import Settings, get_settings
from core.pii import PiiProtector
from database.domain_models import (
    AlertSubscription,
    ConsentRecord,
    HazardLayer,
    HazardModelVersion,
    HazardRun,
    NotificationOutbox,
    Resident,
    ResidentContact,
    UserAreaAssignment,
    UserProfile,
)
from database.models import GeoLocation
from database.session import get_db
from main import create_app
from services.hazard_service import HazardService


def _area(code: str, name: str, parent_id=None) -> GeoLocation:
    now = datetime.now(UTC)
    return GeoLocation(
        code=code,
        canonical_name=name,
        parent_id=parent_id,
        location_type="village" if parent_id else "commune",
        latitude=21.59,
        longitude=103.03,
        coordinate_confidence="exercise_only",
        is_sampling_location=False,
        is_active=True,
        created_at=now,
    )


def _user(user_id: str, role: str) -> CurrentUser:
    return CurrentUser(
        id=user_id,
        email=f"{user_id}@example.test",
        display_name=user_id,
        username=user_id,
        email_verified=True,
        roles=frozenset({role}),
        claims={"sub": user_id},
    )


async def _scoped_client(session: AsyncSession, user: CurrentUser) -> AsyncIterator[AsyncClient]:
    app = create_app(get_settings())

    async def override_db() -> AsyncIterator[AsyncSession]:
        yield session

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = lambda: user
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver"
    ) as http_client:
        yield http_client
    app.dependency_overrides.clear()


def test_live_pii_uses_authenticated_encryption_and_blind_index() -> None:
    encryption_key = base64.urlsafe_b64encode(os.urandom(32)).decode()
    hash_key = base64.urlsafe_b64encode(os.urandom(32)).decode()
    settings = Settings(
        pii_mode="live",
        pii_encryption_key=encryption_key,
        pii_hash_key=hash_key,
        pii_key_version="test-v1",
    )
    protector = PiiProtector(settings)
    protected = protector.protect("Vang A Demo", context="resident.full_name")

    assert b"Vang A Demo" not in protected.ciphertext
    assert protector.reveal(protected.ciphertext, context="resident.full_name") == "Vang A Demo"
    assert protector.lookup_hash(" VANG  A demo ") == protector.lookup_hash("vang a demo")


@pytest.mark.asyncio
async def test_admin_creates_only_encrypted_simulated_resident(
    admin_client: AsyncClient, db_session: AsyncSession
) -> None:
    commune = _area("commune-muong-pon", "Muong Pon")
    db_session.add(commune)
    await db_session.flush()
    village = _area("village-test-one", "Test One", commune.id)
    db_session.add(village)
    await db_session.commit()

    response = await admin_client.post(
        "/api/v1/residents",
        json={
            "full_name": "Synthetic Resident",
            "village_code": "village-test-one",
            "simulated": True,
            "source": "demo",
            "contacts": [{"channel": "sms", "value": "+84000000000"}],
            "livelihood_type": "farmer",
        },
    )

    assert response.status_code == 201, response.text
    assert response.json()["full_name"] == "Synthetic Resident"
    resident = await db_session.scalar(select(Resident))
    assert resident is not None
    assert b"Synthetic Resident" not in resident.full_name_ciphertext


@pytest.mark.asyncio
async def test_village_head_registry_is_scoped_by_database_assignment(
    admin_client: AsyncClient, db_session: AsyncSession
) -> None:
    commune = _area("commune-scope", "Scope Commune")
    db_session.add(commune)
    await db_session.flush()
    village_a = _area("village-scope-a", "Scope A", commune.id)
    village_b = _area("village-scope-b", "Scope B", commune.id)
    db_session.add_all((village_a, village_b))
    await db_session.commit()

    for code, name in (("village-scope-a", "Resident A"), ("village-scope-b", "Resident B")):
        response = await admin_client.post(
            "/api/v1/residents",
            json={"full_name": name, "village_code": code, "simulated": True, "source": "demo"},
        )
        assert response.status_code == 201, response.text

    head = _user("head-scope", "village_head")
    async for scoped_client in _scoped_client(db_session, head):
        profile_response = await scoped_client.get("/api/v1/profile")
        assert profile_response.status_code == 200
        profile = await db_session.scalar(
            select(UserProfile).where(UserProfile.keycloak_subject == head.id)
        )
        assert profile is not None
        now = datetime.now(UTC)
        db_session.add(
            UserAreaAssignment(
                profile_id=profile.id,
                role="village_head",
                geo_location_id=village_a.id,
                valid_from=now - timedelta(minutes=1),
                created_at=now,
            )
        )
        await db_session.commit()
        response = await scoped_client.get("/api/v1/residents")

    assert response.status_code == 200, response.text
    assert [item["full_name"] for item in response.json()] == ["Resident A"]


@pytest.mark.asyncio
async def test_village_head_claim_is_persisted_as_area_assignment(
    db_session: AsyncSession,
) -> None:
    commune = _area("commune-claim-scope", "Claim Scope Commune")
    db_session.add(commune)
    await db_session.flush()
    village = _area("village-claim-scope", "Claim Scope Village", commune.id)
    db_session.add(village)
    await db_session.commit()
    head = CurrentUser(
        id="head-claim-scope",
        email="head-claim-scope@example.test",
        display_name="Claim Scope Head",
        username="head-claim-scope",
        email_verified=True,
        roles=frozenset({"village_head"}),
        claims={"sub": "head-claim-scope", "village_id": "claim-scope"},
    )

    async for scoped_client in _scoped_client(db_session, head):
        response = await scoped_client.get("/api/v1/profile")

    assert response.status_code == 200, response.text
    assert response.json()["area_codes"] == [village.code]
    profile = await db_session.scalar(
        select(UserProfile).where(UserProfile.keycloak_subject == head.id)
    )
    assert profile is not None
    assignment = await db_session.scalar(
        select(UserAreaAssignment).where(
            UserAreaAssignment.profile_id == profile.id,
            UserAreaAssignment.role == "village_head",
            UserAreaAssignment.geo_location_id == village.id,
        )
    )
    assert assignment is not None


@pytest.mark.asyncio
async def test_village_head_only_pushes_danger_alerts_to_every_enabled_resident(
    admin_client: AsyncClient, db_session: AsyncSession
) -> None:
    commune = _area("commune-village-push", "Push Commune")
    db_session.add(commune)
    await db_session.flush()
    village = _area("village-push", "Push Village", commune.id)
    db_session.add(village)
    await db_session.commit()

    resident_ids: list[UUID] = []
    for index in range(2):
        response = await admin_client.post(
            "/api/v1/residents",
            json={
                "full_name": f"Push Resident {index}",
                "village_code": village.code,
                "simulated": True,
                "source": "demo",
            },
        )
        assert response.status_code == 201, response.text
        resident_ids.append(UUID(response.json()["id"]))

    now = datetime.now(UTC)
    protector = PiiProtector(Settings())
    for index, resident_id in enumerate(resident_ids):
        endpoint = f"https://push.example.test/village-resident-{index}"
        protected = protector.protect(endpoint, context="resident_contact.value")
        db_session.add_all(
            (
                ConsentRecord(
                    resident_id=resident_id,
                    purpose="alert_delivery",
                    policy_version="web-push-opt-in-v1",
                    granted_at=now,
                ),
                ResidentContact(
                    resident_id=resident_id,
                    channel="web_push",
                    value_ciphertext=protected.ciphertext,
                    value_lookup_hash=protector.lookup_hash(endpoint),
                    key_version=protected.key_version,
                    verified_at=now,
                    is_primary=False,
                    is_active=True,
                    delivery_metadata={},
                    last_seen_at=now,
                    created_at=now,
                ),
            )
        )
    await db_session.commit()

    head = _user("head-village-push", "village_head")
    async for scoped_client in _scoped_client(db_session, head):
        assert (await scoped_client.get("/api/v1/profile")).status_code == 200
        profile = await db_session.scalar(
            select(UserProfile).where(UserProfile.keycloak_subject == head.id)
        )
        assert profile is not None
        db_session.add(
            UserAreaAssignment(
                profile_id=profile.id,
                role="village_head",
                geo_location_id=village.id,
                valid_from=now - timedelta(minutes=1),
                created_at=now,
            )
        )
        await db_session.commit()

        async def publish(http_client: AsyncClient, tier: str) -> dict[str, object]:
            alert = await http_client.post(
                "/api/v1/alerts",
                json={
                    "source": "manual",
                    "hazard_type": "flash_flood",
                    "level": 5 if tier == "go_now" else 3,
                    "tier": tier,
                    "confidence": 1,
                    "what_happened": "Stream level is rising",
                    "danger_description": "Residents may be in danger",
                    "action_instruction": "Move to a safe location",
                    "deadline_at": (now + timedelta(minutes=30)).isoformat(),
                    "expires_at": (now + timedelta(hours=2)).isoformat(),
                    "target_area_codes": [village.code],
                },
            )
            assert alert.status_code == 201, alert.text
            response = await http_client.post(
                f"/api/v1/alerts/{alert.json()['id']}/publish"
            )
            assert response.status_code == 200, response.text
            return response.json()

        prepare_result = await publish(scoped_client, "prepare")
        danger_result = await publish(scoped_client, "go_now")

    assert prepare_result["recipient_count"] == 2
    assert prepare_result["delivery_count"] == 0
    assert danger_result["recipient_count"] == 2
    assert danger_result["delivery_count"] == 2
    assert len(list(await db_session.scalars(select(NotificationOutbox)))) == 2


@pytest.mark.asyncio
async def test_alert_publish_is_idempotent_and_can_start_evacuation(
    admin_client: AsyncClient, db_session: AsyncSession
) -> None:
    area = _area("village-alert", "Alert Village")
    db_session.add(area)
    await db_session.commit()
    resident_response = await admin_client.post(
        "/api/v1/residents",
        json={
            "full_name": "Alert Recipient",
            "village_code": area.code,
            "simulated": True,
            "source": "demo",
            "contacts": [{"channel": "sms", "value": "+84111111111"}],
        },
    )
    assert resident_response.status_code == 201, resident_response.text
    resident = await db_session.get(Resident, UUID(resident_response.json()["id"]))
    assert resident is not None
    now = datetime.now(UTC)
    db_session.add_all(
        (
            ConsentRecord(
                resident_id=resident.id,
                purpose="alert_delivery",
                policy_version="test-v1",
                granted_at=now,
            ),
            AlertSubscription(
                resident_id=resident.id,
                hazard_type="flash_flood",
                minimum_level=3,
                channel="sms",
                is_active=True,
                created_at=now,
            ),
        )
    )
    await db_session.commit()
    alert_response = await admin_client.post(
        "/api/v1/alerts",
        json={
            "source": "evacuation",
            "hazard_type": "flash_flood",
            "level": 5,
            "tier": "go_now",
            "confidence": 0.8,
            "what_happened": "Flash flood risk is increasing",
            "danger_description": "Very high risk",
            "action_instruction": "Move to the assigned shelter",
            "deadline_at": (now + timedelta(hours=1)).isoformat(),
            "expires_at": (now + timedelta(hours=2)).isoformat(),
            "target_area_codes": [area.code],
        },
    )
    assert alert_response.status_code == 201, alert_response.text
    alert_id = alert_response.json()["id"]
    first_publish = await admin_client.post(f"/api/v1/alerts/{alert_id}/publish")
    second_publish = await admin_client.post(f"/api/v1/alerts/{alert_id}/publish")
    assert first_publish.status_code == 200, first_publish.text
    assert second_publish.status_code == 200, second_publish.text
    assert first_publish.json()["recipient_count"] == 1
    assert first_publish.json()["delivery_count"] == 1
    assert second_publish.json()["recipient_count"] == 1
    assert second_publish.json()["delivery_count"] == 1

    shelter = await admin_client.post(
        "/api/v1/evacuations/shelters",
        json={
            "code": "exercise-shelter",
            "area_code": area.code,
            "name": "Exercise Shelter",
            "latitude": 21.59,
            "longitude": 103.03,
            "simulated": True,
        },
    )
    assert shelter.status_code == 201, shelter.text
    order = await admin_client.post(
        "/api/v1/evacuations/orders",
        json={
            "alert_id": alert_id,
            "area_code": area.code,
            "starts_at": now.isoformat(),
            "instructions": "Use the approved exercise route",
        },
    )
    assert order.status_code == 201, order.text


@pytest.mark.asyncio
async def test_dominant_manifest_returns_signed_physical_layers(
    admin_client: AsyncClient, db_session: AsyncSession
) -> None:
    now = datetime.now(UTC)
    forecast_day = now.date()
    for hazard_type in ("flash_flood", "landslide"):
        model = HazardModelVersion(
            hazard_type=hazard_type,
            calibration_version="calib-test",
            feature_stack_version="stack-test",
            checksum=f"{hazard_type:0<64}"[:64],
            provenance={"source": "test"},
            status="released",
            created_at=now,
        )
        db_session.add(model)
        await db_session.flush()
        run = HazardRun(
            hazard_type=hazard_type,
            model_version_id=model.id,
            issued_at=now,
            valid_from=now,
            valid_to=now + timedelta(days=5),
            status="succeeded",
            quality_flags={},
            created_at=now,
            updated_at=now,
        )
        db_session.add(run)
        await db_session.flush()
        db_session.add(
            HazardLayer(
                run_id=run.id,
                hazard_type=hazard_type,
                forecast_day=forecast_day,
                is_current=True,
                cog_object_key=f"hazards/{hazard_type}.tif",
                png_object_key=f"hazards/{hazard_type}.png",
                bbox={"west": 103.0, "south": 21.5, "east": 103.1, "north": 21.7},
                crs="EPSG:32648",
                resolution_m=100,
                level_bins=[0, 0.2, 0.4, 0.6, 0.8, 1],
                legend={"1": "low"},
                confidence=0.7,
                contribution_summary={},
                checksum=f"layer-{hazard_type:0<58}"[:64],
                created_at=now,
            )
        )
    await db_session.commit()
    settings = Settings(
        object_storage_base_url="https://objects.example.test/weatherbridge",
        object_storage_signing_key="test-signing-key",
    )
    response = await HazardService(db_session, settings).manifest("dominant", forecast_day)

    assert {layer.hazard_type for layer in response.layers} == {"flash_flood", "landslide"}
    assert all("signature=" in layer.raster_url for layer in response.layers)
