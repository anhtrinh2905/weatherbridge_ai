import asyncio
import json
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Protocol
from uuid import UUID

import httpx
from core.pii import PiiProtector
from pywebpush import WebPushException, webpush  # type: ignore[import-untyped]
from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
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
    Column("is_active", Boolean, nullable=False, default=True),
    Column("revoked_at", DateTime(timezone=True)),
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


def render_plain_text(content: dict[str, str]) -> str:
    return "\n".join(
        value.strip()
        for value in (
            content["what_happened"],
            content["danger_description"],
            content["action_instruction"],
            content["deadline_instruction"],
        )
        if value.strip()
    )


class TwilioSmsNotificationProvider:
    name = "twilio_sms"

    def __init__(self, settings: Settings, client: httpx.AsyncClient | None = None) -> None:
        self.account_sid = settings.sms_twilio_account_sid
        self.auth_token = settings.sms_twilio_auth_token
        self.sender = settings.sms_twilio_from
        self.messaging_service_sid = settings.sms_twilio_messaging_service_sid
        self._client = client

    async def send(
        self,
        *,
        channel: str,
        destination: str,
        content: dict[str, str],
        idempotency_key: str,
    ) -> DeliveryResult:
        if channel != "sms" or not self.account_sid or not self.auth_token:
            raise ValueError("Twilio provider received an invalid delivery request")
        data = {"To": destination, "Body": render_plain_text(content)}
        if self.messaging_service_sid:
            data["MessagingServiceSid"] = self.messaging_service_sid
        elif self.sender:
            data["From"] = self.sender
        else:
            raise ValueError("Twilio provider requires a sender or messaging service")
        response = await self._post(
            f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}/Messages.json",
            data=data,
            auth=(self.account_sid, self.auth_token),
            headers={"Idempotency-Key": idempotency_key},
        )
        response.raise_for_status()
        payload = response.json()
        return DeliveryResult(
            status="sent",
            provider_message_id=payload.get("sid"),
            response_status_code=response.status_code,
            metadata={"provider_status": payload.get("status", "accepted")},
        )

    async def _post(self, url: str, **kwargs: object) -> httpx.Response:
        if self._client:
            return await self._client.post(url, **kwargs)
        async with httpx.AsyncClient(timeout=15.0) as client:
            return await client.post(url, **kwargs)


class ZaloOANotificationProvider:
    name = "zalo_oa"

    def __init__(self, settings: Settings, client: httpx.AsyncClient | None = None) -> None:
        self.access_token = settings.zalo_oa_access_token
        self.api_base_url = settings.zalo_oa_api_base_url.rstrip("/")
        self._client = client

    async def send(
        self,
        *,
        channel: str,
        destination: str,
        content: dict[str, str],
        idempotency_key: str,
    ) -> DeliveryResult:
        if channel != "zalo" or not self.access_token:
            raise ValueError("Zalo OA provider received an invalid delivery request")
        response = await self._post(
            f"{self.api_base_url}/v3.0/oa/message/cs",
            json={
                "recipient": {"user_id": destination},
                "message": {"text": render_plain_text(content)},
            },
            headers={
                "access_token": self.access_token,
                "X-Idempotency-Key": idempotency_key,
            },
        )
        response.raise_for_status()
        payload = response.json()
        if payload.get("error", 0) != 0:
            raise RuntimeError(f"ZaloOAError{payload['error']}")
        return DeliveryResult(
            status="sent",
            provider_message_id=str(payload.get("data", {}).get("message_id") or "") or None,
            response_status_code=response.status_code,
            metadata={"provider_status": "accepted"},
        )

    async def _post(self, url: str, **kwargs: object) -> httpx.Response:
        if self._client:
            return await self._client.post(url, **kwargs)
        async with httpx.AsyncClient(timeout=15.0) as client:
            return await client.post(url, **kwargs)


class WebPushNotificationProvider:
    name = "web_push"

    def __init__(self, settings: Settings) -> None:
        self.subject = settings.web_push_subject
        self.private_key = settings.web_push_vapid_private_key

    async def send(
        self,
        *,
        channel: str,
        destination: str,
        content: dict[str, str],
        idempotency_key: str,
    ) -> DeliveryResult:
        if channel != "web_push" or not self.private_key:
            raise ValueError("Web Push provider received an invalid delivery request")
        try:
            subscription = json.loads(destination)
            payload = json.dumps(
                {
                    "title": "Canh bao Weather Bridge AI",
                    "body": f"{content['what_happened']} {content['action_instruction']}".strip(),
                    "url": "/resident/alerts",
                    "tag": f"weather-bridge-{idempotency_key[:24]}",
                },
                ensure_ascii=False,
            )
            await asyncio.to_thread(
                webpush,
                subscription_info=subscription,
                data=payload,
                vapid_private_key=self.private_key,
                vapid_claims={"sub": self.subject},
                ttl=3600,
            )
            return DeliveryResult(status="sent", metadata={"channel": "web_push"})
        except WebPushException as exc:
            status_code = getattr(getattr(exc, "response", None), "status_code", None)
            if status_code in {404, 410}:
                return DeliveryResult(
                    status="expired",
                    response_status_code=status_code,
                    metadata={"reason": "subscription_gone"},
                )
            raise


class EmailNotificationProvider:
    name = "smtp_email"

    def __init__(self, settings: Settings) -> None:
        self.host = settings.smtp_host
        self.port = settings.smtp_port
        self.username = settings.smtp_username
        self.password = settings.smtp_password
        self.sender = settings.smtp_from

    async def send(
        self,
        *,
        channel: str,
        destination: str,
        content: dict[str, str],
        idempotency_key: str,
    ) -> DeliveryResult:
        if channel != "email" or not self.host or not self.sender:
            raise ValueError("Email provider received an invalid delivery request")
        
        from email.message import EmailMessage

        import aiosmtplib

        msg = EmailMessage()
        msg["From"] = self.sender
        msg["To"] = destination
        msg["Subject"] = "Cảnh báo Thời tiết (WeatherBridge AI)"
        msg["Message-ID"] = f"<{idempotency_key}@weatherbridge.local>"
        msg.set_content(render_plain_text(content))

        try:
            await aiosmtplib.send(
                msg,
                hostname=self.host,
                port=self.port,
                username=self.username,
                password=self.password,
                use_tls=(self.port == 465),
                start_tls=(self.port == 587),
                timeout=15.0,
            )
            return DeliveryResult(status="sent", metadata={"channel": "email"})
        except aiosmtplib.SMTPException as exc:
            raise RuntimeError(f"SMTP Error: {exc}") from exc


def configured_providers(settings: Settings) -> dict[str, NotificationProvider]:
    providers: dict[str, NotificationProvider] = {}
    if settings.sms_provider == "twilio":
        providers["sms"] = TwilioSmsNotificationProvider(settings)
    if settings.zalo_provider == "oa":
        providers["zalo"] = ZaloOANotificationProvider(settings)
    if settings.email_provider == "smtp":
        providers["email"] = EmailNotificationProvider(settings)
    if settings.web_push_vapid_private_key and settings.web_push_vapid_public_key:
        providers["web_push"] = WebPushNotificationProvider(settings)
    return providers


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
    if providers is None and settings.notification_delivery_mode == "simulate":
        simulated = SimulatedNotificationProvider()
        resolved_providers = {
            channel: simulated for channel in ("sms", "zalo", "email", "web_push", "webhook")
        }
    elif providers is None and settings.notification_delivery_mode == "web_push":
        resolved_providers = {"web_push": WebPushNotificationProvider(settings)}
    elif providers is None and settings.notification_delivery_mode == "configured":
        resolved_providers = configured_providers(settings)
    if not resolved_providers:
        return 0
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
                notification_outbox.c.channel.in_(tuple(resolved_providers)),
                resident_contacts.c.is_active.is_(True),
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
            if result.status == "expired":
                await session.execute(
                    update(resident_contacts)
                    .where(resident_contacts.c.id == row["resident_contact_id"])
                    .values(is_active=False, revoked_at=now)
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
