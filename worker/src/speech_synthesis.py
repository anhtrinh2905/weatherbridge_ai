import hashlib
import logging
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

import aioboto3
import httpx
from sqlalchemy import (
    Column,
    Integer,
    MetaData,
    String,
    Table,
    Text,
    Uuid,
    insert,
    select,
)
from sqlalchemy.ext.asyncio import AsyncSession

if TYPE_CHECKING:
    from settings import Settings

GENERATE_SPEECH_TASK = "generate_speech"

metadata = MetaData()

alert_contents = Table(
    "alert_contents",
    metadata,
    Column("id", Uuid(as_uuid=True), primary_key=True),
    Column("alert_id", Uuid(as_uuid=True), nullable=False),
    Column("locale", String(35), nullable=False),
    Column("what_happened", Text, nullable=False),
    Column("danger_description", Text, nullable=False),
    Column("action_instruction", Text, nullable=False),
)

media_assets = Table(
    "media_assets",
    metadata,
    Column("id", Uuid(as_uuid=True), primary_key=True, default=uuid4),
    Column("source_content_id", Uuid(as_uuid=True), nullable=True),
    Column("asset_type", String(30), nullable=False),
    Column("locale", String(35), nullable=False),
    Column("voice", String(120), nullable=True),
    Column("provider", String(60), nullable=True),
    Column("model_version", String(120), nullable=True),
    Column("object_key", Text, nullable=False),
    Column("checksum", String(64), nullable=False),
    Column("generation_status", String(30), nullable=False, default="ready"),
    Column("review_status", String(30), nullable=False),
    Column("generated_from_hash", String(64), nullable=False),
    Column("generation_error_code", String(80), nullable=True),
    Column("generation_error_message_sanitized", Text, nullable=True),
    Column("duration_ms", Integer, nullable=True),
)


async def generate_speech(session: AsyncSession, payload: dict, settings: "Settings") -> dict:
    """Generate TTS audio via internal backend API and upload to MinIO."""
    alert_id = UUID(payload["alert_id"])
    content_id = UUID(payload["content_id"])
    locale = payload["locale"]

    content = (
        (
            await session.execute(
                select(alert_contents).where(alert_contents.c.id == content_id)
            )
        )
        .mappings()
        .first()
    )

    if not content:
        raise ValueError(f"AlertContent not found: {content_id}")

    text = (
        f"{content['what_happened']} {content['danger_description']} "
        f"{content['action_instruction']}"
    )
    text_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()

    # Map locale to language code (similar to AlertService mapping)
    language = {"hmn-x-dienbien": "hmn", "tai-x-muongpon": "blt"}.get(locale)
    if not language:
        raise ValueError(f"Speech not enabled for locale {locale}")

    logging.info(f"Generating speech for alert {alert_id} (locale: {locale}, lang: {language})")

    audio_bytes = None
    model_name = None

    be_url = f"{settings.backend_internal_url}/speech/synthesize"
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            resp = await client.post(
                be_url,
                json={"text": text, "language": language},
            )
            resp.raise_for_status()
            audio_bytes = resp.content
            model_name = resp.headers.get("X-Speech-Model", "mms")
        except httpx.HTTPStatusError as e:
            logging.error(f"Speech synthesis failed: {e.response.text}")
            raise RuntimeError(f"Speech synthesis HTTP error: {e.response.status_code}") from e
        except Exception:
            logging.exception("Failed to connect to backend for speech synthesis")
            raise

    if not audio_bytes:
        raise RuntimeError("No audio bytes received from synthesis")

    object_key = f"media/alerts/{alert_id}/{locale}.wav"
    checksum = hashlib.sha256(audio_bytes).hexdigest()

    if settings.object_storage_s3_endpoint and settings.object_storage_bucket:
        s3_session = aioboto3.Session()
        s3_client_ctx = s3_session.client(
            "s3",
            endpoint_url=settings.object_storage_s3_endpoint,
            aws_access_key_id=settings.object_storage_access_key,
            aws_secret_access_key=settings.object_storage_secret_key,
        )
        async with s3_client_ctx as s3:
            await s3.put_object(
                Bucket=settings.object_storage_bucket,
                Key=object_key,
                Body=audio_bytes,
                ContentType="audio/wav",
            )
            logging.info(f"Uploaded audio to {object_key}")
    else:
        logging.warning("Object storage is not configured, skipping upload")

    asset_id = uuid4()
    await session.execute(
        insert(media_assets).values(
            id=asset_id,
            source_content_id=content_id,
            asset_type="audio/wav",
            locale=locale,
            voice=language,
            provider="mms",
            model_version=model_name,
            object_key=object_key,
            checksum=checksum,
            generation_status="ready",
            review_status="approved",
            generated_from_hash=text_hash,
        )
    )
    await session.commit()

    return {
        "asset_id": str(asset_id),
        "object_key": object_key,
        "bytes_len": len(audio_bytes),
    }
