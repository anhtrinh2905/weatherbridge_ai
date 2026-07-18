import json
from datetime import UTC, datetime
from urllib.parse import parse_qs
from uuid import uuid4

import httpx
import pytest
from core.pii import PiiProtector
from sqlalchemy import insert, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from notification_dispatch import (
    DeliveryResult,
    SimulatedNotificationProvider,
    TwilioSmsNotificationProvider,
    ZaloOANotificationProvider,
    alert_contents,
    alert_recipients,
    configured_providers,
    metadata,
    notification_attempts,
    notification_outbox,
    process_outbox_batch,
    resident_contacts,
)
from settings import Settings


async def test_twilio_sms_provider_uses_configured_sender_and_hides_destination() -> None:
    captured: dict[str, object] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["headers"] = dict(request.headers)
        captured["form"] = parse_qs(request.content.decode())
        return httpx.Response(201, json={"sid": "SM123", "status": "queued"})

    settings = Settings(
        notification_delivery_mode="configured",
        pii_mode="simulated",
        sms_provider="twilio",
        sms_twilio_account_sid="AC123",
        sms_twilio_auth_token="token",
        sms_twilio_from="+84123456789",
    )
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        result = await TwilioSmsNotificationProvider(settings, client).send(
            channel="sms",
            destination="+84987654321",
            content={
                "what_happened": "Mua lon",
                "danger_description": "Nguy co lu quet",
                "action_instruction": "Di chuyen den noi an toan",
                "deadline_instruction": "Truoc 18:00",
            },
            idempotency_key="sms-test",
        )

    assert result.status == "sent"
    assert result.provider_message_id == "SM123"
    assert captured["url"] == "https://api.twilio.com/2010-04-01/Accounts/AC123/Messages.json"
    assert captured["form"] == {
        "To": ["+84987654321"],
        "From": ["+84123456789"],
        "Body": ["Mua lon\nNguy co lu quet\nDi chuyen den noi an toan\nTruoc 18:00"],
    }


async def test_zalo_oa_provider_posts_customer_service_message() -> None:
    captured: dict[str, object] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["headers"] = dict(request.headers)
        captured["payload"] = json.loads(request.content)
        return httpx.Response(200, json={"error": 0, "data": {"message_id": "zalo-123"}})

    settings = Settings(
        notification_delivery_mode="configured",
        pii_mode="simulated",
        zalo_provider="oa",
        zalo_oa_access_token="oa-token",
    )
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        result = await ZaloOANotificationProvider(settings, client).send(
            channel="zalo",
            destination="zalo-user-id",
            content={
                "what_happened": "Canh bao",
                "danger_description": "",
                "action_instruction": "Theo doi thong bao",
                "deadline_instruction": "",
            },
            idempotency_key="zalo-test",
        )

    assert result.status == "sent"
    assert result.provider_message_id == "zalo-123"
    assert captured["url"] == "https://openapi.zalo.me/v3.0/oa/message/cs"
    assert captured["headers"]["access_token"] == "oa-token"
    assert captured["payload"] == {
        "recipient": {"user_id": "zalo-user-id"},
        "message": {"text": "Canh bao\nTheo doi thong bao"},
    }


def test_configured_delivery_requires_provider_and_resolves_enabled_channels() -> None:
    with pytest.raises(ValueError, match="at least one configured provider"):
        Settings(
            notification_delivery_mode="configured",
            pii_mode="simulated",
            sms_provider="disabled",
            zalo_provider="disabled",
            web_push_vapid_private_key=None,
            web_push_vapid_public_key=None,
        )

    settings = Settings(
        notification_delivery_mode="configured",
        pii_mode="simulated",
        sms_provider="twilio",
        sms_twilio_account_sid="AC123",
        sms_twilio_auth_token="token",
        sms_twilio_messaging_service_sid="MG123",
        zalo_provider="oa",
        zalo_oa_access_token="oa-token",
        web_push_vapid_private_key=None,
        web_push_vapid_public_key=None,
    )

    assert set(configured_providers(settings)) == {"sms", "zalo"}


async def test_simulated_dispatch_is_idempotent_and_records_attempt(tmp_path) -> None:
    database_path = tmp_path / "outbox.db"
    engine = create_async_engine(f"sqlite+aiosqlite:///{database_path}")
    async with engine.begin() as connection:
        await connection.run_sync(metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    settings = Settings(notification_delivery_mode="simulate", pii_mode="simulated")
    protected = PiiProtector(settings).protect("+84000000000", context="resident_contact.value")
    contact_id = uuid4()
    content_id = uuid4()
    recipient_id = uuid4()
    outbox_id = uuid4()
    now = datetime.now(UTC)
    async with factory() as session:
        await session.execute(
            insert(resident_contacts).values(
                id=contact_id,
                value_ciphertext=protected.ciphertext,
            )
        )
        await session.execute(
            insert(alert_contents).values(
                id=content_id,
                what_happened="Test",
                danger_description="High",
                action_instruction="Move",
                deadline_instruction="Now",
            )
        )
        await session.execute(
            insert(alert_recipients).values(id=recipient_id, content_id=content_id)
        )
        await session.execute(
            insert(notification_outbox).values(
                id=outbox_id,
                alert_recipient_id=recipient_id,
                resident_contact_id=contact_id,
                channel="sms",
                status="pending",
                idempotency_key="dispatch-test",
                attempt_count=0,
                next_attempt_at=now,
                created_at=now,
                updated_at=now,
            )
        )
        await session.commit()

        assert await process_outbox_batch(session, settings) == 1
        assert await process_outbox_batch(session, settings) == 0
        row = (await session.execute(select(notification_outbox))).mappings().one()
        attempts = (await session.execute(select(notification_attempts))).mappings().all()

    assert row["status"] == "simulated"
    assert row["attempt_count"] == 1
    assert len(attempts) == 1
    assert attempts[0]["provider"] == "simulated-local"
    await engine.dispose()


class ExpiredWebPushProvider:
    name = "web_push"

    async def send(self, **_: object) -> DeliveryResult:
        return DeliveryResult(
            status="expired",
            response_status_code=410,
            metadata={"reason": "subscription_gone"},
        )


async def test_expired_web_push_contact_is_deactivated(tmp_path) -> None:
    database_path = tmp_path / "expired-outbox.db"
    engine = create_async_engine(f"sqlite+aiosqlite:///{database_path}")
    async with engine.begin() as connection:
        await connection.run_sync(metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    settings = Settings(notification_delivery_mode="simulate", pii_mode="simulated")
    protected = PiiProtector(settings).protect("{}", context="resident_contact.value")
    contact_id = uuid4()
    content_id = uuid4()
    recipient_id = uuid4()
    outbox_id = uuid4()
    now = datetime.now(UTC)
    async with factory() as session:
        await session.execute(
            insert(resident_contacts).values(
                id=contact_id,
                value_ciphertext=protected.ciphertext,
            )
        )
        await session.execute(
            insert(alert_contents).values(
                id=content_id,
                what_happened="Test",
                danger_description="High",
                action_instruction="Move",
                deadline_instruction="Now",
            )
        )
        await session.execute(
            insert(alert_recipients).values(id=recipient_id, content_id=content_id)
        )
        await session.execute(
            insert(notification_outbox).values(
                id=outbox_id,
                alert_recipient_id=recipient_id,
                resident_contact_id=contact_id,
                channel="web_push",
                status="pending",
                idempotency_key="expired-web-push-test",
                attempt_count=0,
                next_attempt_at=now,
                created_at=now,
                updated_at=now,
            )
        )
        await session.commit()

        processed = await process_outbox_batch(
            session,
            settings,
            {"web_push": ExpiredWebPushProvider()},
        )
        assert processed == 1
        contact = (await session.execute(select(resident_contacts))).mappings().one()
        outbox = (await session.execute(select(notification_outbox))).mappings().one()

    assert contact["is_active"] is False
    assert contact["revoked_at"] is not None
    assert outbox["status"] == "expired"
    await engine.dispose()


async def test_unconfigured_channels_do_not_block_the_enabled_provider(tmp_path) -> None:
    database_path = tmp_path / "channel-filter.db"
    engine = create_async_engine(f"sqlite+aiosqlite:///{database_path}")
    async with engine.begin() as connection:
        await connection.run_sync(metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    settings = Settings(notification_delivery_mode="simulate", pii_mode="simulated")
    protected = PiiProtector(settings).protect("+84000000000", context="resident_contact.value")
    contact_id = uuid4()
    content_id = uuid4()
    recipient_id = uuid4()
    now = datetime.now(UTC)
    async with factory() as session:
        await session.execute(
            insert(resident_contacts).values(id=contact_id, value_ciphertext=protected.ciphertext)
        )
        await session.execute(
            insert(alert_contents).values(
                id=content_id,
                what_happened="Test",
                danger_description="High",
                action_instruction="Move",
                deadline_instruction="Now",
            )
        )
        await session.execute(
            insert(alert_recipients).values(id=recipient_id, content_id=content_id)
        )
        for channel in ("web_push", "sms"):
            await session.execute(
                insert(notification_outbox).values(
                    id=uuid4(),
                    alert_recipient_id=recipient_id,
                    resident_contact_id=contact_id,
                    channel=channel,
                    status="pending",
                    idempotency_key=f"filter-{channel}",
                    attempt_count=0,
                    next_attempt_at=now,
                    created_at=now,
                    updated_at=now,
                )
            )
        await session.commit()

        processed = await process_outbox_batch(
            session,
            settings,
            {"sms": SimulatedNotificationProvider()},
            limit=1,
        )
        rows = (await session.execute(select(notification_outbox))).mappings().all()

    assert processed == 1
    assert {row["channel"]: row["status"] for row in rows} == {
        "web_push": "pending",
        "sms": "simulated",
    }
    await engine.dispose()
