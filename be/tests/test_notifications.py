import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth.keycloak import CurrentUser
from core.config import Settings
from core.time import utc_now
from database.domain_models import ConsentRecord, Resident, ResidentContact
from database.models import GeoLocation
from modules.notifications.schemas import WebPushSubscriptionRequest
from services.notification_endpoint_service import NotificationEndpointService
from services.profile_service import ProfileService


@pytest.mark.asyncio
async def test_web_push_config_is_unavailable_without_persistent_vapid_key(
    client: AsyncClient,
) -> None:
    response = await client.get("/api/v1/notifications/web-push/config")

    assert response.status_code == 503
    assert response.json()["code"] == "web_push_unavailable"


def test_web_push_subscription_accepts_browser_payload_shape() -> None:
    payload = WebPushSubscriptionRequest.model_validate(
        {
            "endpoint": "https://push.example.test/subscription-id",
            "expirationTime": None,
            "keys": {"p256dh": "test-public-key", "auth": "test-auth-secret"},
        }
    )

    assert str(payload.endpoint) == "https://push.example.test/subscription-id"
    assert payload.expiration_time is None


@pytest.mark.asyncio
async def test_direct_web_push_test_endpoint_is_not_exposed(client: AsyncClient) -> None:
    response = await client.post("/api/v1/notifications/web-push/test", json={})

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_web_push_subscription_is_encrypted_and_upserted(db_session: AsyncSession) -> None:
    now = utc_now()
    area = GeoLocation(
        code="village-web-push-test",
        canonical_name="Web Push Test",
        location_type="village",
        latitude=21.59,
        longitude=103.03,
        coordinate_confidence="exercise_only",
        is_sampling_location=False,
        is_active=True,
        created_at=now,
    )
    db_session.add(area)
    await db_session.commit()
    user = CurrentUser(
        id="resident-web-push-test",
        email="resident@example.test",
        display_name="Resident Test",
        username="resident-test",
        email_verified=True,
        roles=frozenset({"resident"}),
        claims={"sub": "resident-web-push-test", "village_id": area.code},
    )
    settings = Settings()
    profile = await ProfileService(db_session).sync_user(user)
    payload = WebPushSubscriptionRequest.model_validate(
        {
            "endpoint": "https://push.example.test/subscription-id",
            "keys": {"p256dh": "test-public-key", "auth": "test-auth-secret"},
        }
    )
    service = NotificationEndpointService(db_session, settings)

    first = await service.upsert_web_push_subscription(payload, user)
    second = await service.upsert_web_push_subscription(payload, user)
    status = await service.get_web_push_subscription_status(first.id, user)
    resident = await db_session.scalar(
        select(Resident).where(Resident.user_profile_id == profile.id)
    )
    assert resident is not None
    contacts = list(
        await db_session.scalars(
            select(ResidentContact).where(ResidentContact.resident_id == resident.id)
        )
    )
    consents = list(
        await db_session.scalars(
            select(ConsentRecord).where(
                ConsentRecord.resident_id == resident.id,
                ConsentRecord.purpose == "alert_delivery",
                ConsentRecord.withdrawn_at.is_(None),
            )
        )
    )

    assert first.id == second.id
    assert resident.managed_geo_location_id == area.id
    assert resident.verification_status == "account_linked"
    assert len(contacts) == 1
    assert b"push.example.test" not in contacts[0].value_ciphertext
    assert contacts[0].is_active is True
    assert status.is_active is True
    assert len(consents) == 1
    assert consents[0].policy_version == "web-push-opt-in-v1"

    await service.revoke_web_push_subscription(first.id, user)
    revoked_status = await service.get_web_push_subscription_status(first.id, user)

    assert revoked_status.is_active is False
