from datetime import UTC, datetime
from uuid import uuid4

from core.pii import PiiProtector
from sqlalchemy import insert, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from notification_dispatch import (
    DeliveryResult,
    alert_contents,
    alert_recipients,
    metadata,
    notification_attempts,
    notification_outbox,
    process_outbox_batch,
    resident_contacts,
)
from settings import Settings


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
