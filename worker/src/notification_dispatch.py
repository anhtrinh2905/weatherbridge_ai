from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Protocol
from uuid import UUID

from core.pii import PiiProtector
from sqlalchemy import (
    JSON,
    BigInteger,
    Column,
    DateTime,
    Integer,
    LargeBinary,
    MetaData,
    String,
    Table,
    Text,
    Uuid,
    insert,
    select,
    update,
)
from sqlalchemy.ext.asyncio import AsyncSession

from settings import Settings

metadata = MetaData()
notification_outbox = Table(
    "notification_outbox",
    metadata,
    Column("id", Uuid(as_uuid=True), primary_key=True),
    Column("alert_recipient_id", Uuid(as_uuid=True), nullable=False),
    Column("resident_contact_id", Uuid(as_uuid=True), nullable=False),
    Column("channel", String(20), nullable=False),
    Column("status", String(30), nullable=False),
    Column("idempotency_key", String(160), nullable=False),
    Column("attempt_count", Integer, nullable=False),
    Column("next_attempt_at", DateTime(timezone=True), nullable=False),
    Column("locked_at", DateTime(timezone=True)),
    Column("last_error_code", String(80)),
    Column("created_at", DateTime(timezone=True), nullable=False),
    Column("updated_at", DateTime(timezone=True), nullable=False),
)
notification_attempts = Table(
    "notification_attempts",
    metadata,
    Column("id", BigInteger().with_variant(Integer, "sqlite"), primary_key=True),
    Column("outbox_id", Uuid(as_uuid=True), nullable=False),
    Column("provider", String(60), nullable=False),
    Column("provider_message_id", String(255)),
    Column("status", String(30), nullable=False),
    Column("response_status_code", Integer),
    Column("response_metadata", JSON, nullable=False),
    Column("attempted_at", DateTime(timezone=True), nullable=False),
)
resident_contacts = Table(
    "resident_contacts",
    metadata,
    Column("id", Uuid(as_uuid=True), primary_key=True),
    Column("value_ciphertext", LargeBinary, nullable=False),
)
alert_recipients = Table(
    "alert_recipients",
    metadata,
    Column("id", Uuid(as_uuid=True), primary_key=True),
    Column("content_id", Uuid(as_uuid=True), nullable=False),
)
alert_contents = Table(
    "alert_contents",
    metadata,
    Column("id", Uuid(as_uuid=True), primary_key=True),
    Column("what_happened", Text, nullable=False),
    Column("danger_description", Text, nullable=False),
    Column("action_instruction", Text, nullable=False),
    Column("deadline_instruction", Text, nullable=False),
)


@dataclass(frozen=True)
class DeliveryResult:
    status: str
    provider_message_id: str | None = None
    response_status_code: int | None = None
    metadata: dict | None = None


class NotificationProvider(Protocol):
    name: str

    async def send(
        self,
        *,
        channel: str,
        destination: str,
        content: dict[str, str],
        idempotency_key: str,
    ) -> DeliveryResult: ...


class SimulatedNotificationProvider:
    name = "simulated-local"

    async def send(
        self,
        *,
        channel: str,
        destination: str,
        content: dict[str, str],
        idempotency_key: str,
    ) -> DeliveryResult:
        return DeliveryResult(status="simulated", metadata={"channel": channel})


async def process_outbox_batch(
    session: AsyncSession,
    settings: Settings,
    providers: dict[str, NotificationProvider] | None = None,
    *,
    limit: int = 50,
) -> int:
    if settings.notification_delivery_mode == "disabled":
        return 0
    resolved_providers = providers or {}
    if settings.notification_delivery_mode == "simulate":
        simulated = SimulatedNotificationProvider()
        resolved_providers = {
            channel: simulated for channel in ("sms", "zalo", "email", "web_push", "webhook")
        }
    now = datetime.now(UTC)
    rows = (
        await session.execute(
            select(
                notification_outbox,
                resident_contacts.c.value_ciphertext,
                alert_contents.c.what_happened,
                alert_contents.c.danger_description,
                alert_contents.c.action_instruction,
                alert_contents.c.deadline_instruction,
            )
            .join(
                resident_contacts,
                resident_contacts.c.id == notification_outbox.c.resident_contact_id,
            )
            .join(
                alert_recipients,
                alert_recipients.c.id == notification_outbox.c.alert_recipient_id,
            )
            .join(alert_contents, alert_contents.c.id == alert_recipients.c.content_id)
            .where(
                notification_outbox.c.status.in_(("pending", "retry")),
                notification_outbox.c.next_attempt_at <= now,
            )
            .order_by(notification_outbox.c.next_attempt_at)
            .limit(limit)
            .with_for_update(skip_locked=True)
        )
    ).mappings().all()
    protector = PiiProtector(settings)
    processed = 0
    for row in rows:
        provider = resolved_providers.get(row["channel"])
        if provider is None:
            continue
        outbox_id: UUID = row["id"]
        attempt_count = int(row["attempt_count"]) + 1
        try:
            destination = protector.reveal(
                row["value_ciphertext"], context="resident_contact.value"
            )
            result = await provider.send(
                channel=row["channel"],
                destination=destination,
                content={
                    "what_happened": row["what_happened"],
                    "danger_description": row["danger_description"],
                    "action_instruction": row["action_instruction"],
                    "deadline_instruction": row["deadline_instruction"],
                },
                idempotency_key=row["idempotency_key"],
            )
            await session.execute(
                update(notification_outbox)
                .where(notification_outbox.c.id == outbox_id)
                .values(
                    status=result.status,
                    attempt_count=attempt_count,
                    locked_at=None,
                    last_error_code=None,
                    updated_at=now,
                )
            )
            await session.execute(
                insert(notification_attempts).values(
                    outbox_id=outbox_id,
                    provider=provider.name,
                    provider_message_id=result.provider_message_id,
                    status=result.status,
                    response_status_code=result.response_status_code,
                    response_metadata=result.metadata or {},
                    attempted_at=now,
                )
            )
        except Exception as exc:
            delay_minutes = min(2**attempt_count, 60)
            await session.execute(
                update(notification_outbox)
                .where(notification_outbox.c.id == outbox_id)
                .values(
                    status="retry" if attempt_count < 8 else "failed",
                    attempt_count=attempt_count,
                    next_attempt_at=now + timedelta(minutes=delay_minutes),
                    locked_at=None,
                    last_error_code=type(exc).__name__,
                    updated_at=now,
                )
            )
            await session.execute(
                insert(notification_attempts).values(
                    outbox_id=outbox_id,
                    provider=provider.name,
                    status="failed",
                    response_metadata={"error_code": type(exc).__name__},
                    attempted_at=now,
                )
            )
        processed += 1
    if processed:
        await session.commit()
    return processed
