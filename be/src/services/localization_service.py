from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth.keycloak import CurrentUser
from core.errors import AppError
from core.time import utc_now
from database.domain_models import (
    Alert,
    AlertContent,
    AlertRecipient,
    AlertTarget,
    AuditLog,
    ContentTranslation,
    Locale,
)
from modules.localization.schemas import (
    AlertLocalizedContentResponse,
    AlertTranslationDraftRequest,
    AlertTranslationResponse,
    AlertTranslationReviewRequest,
    LocaleResponse,
)
from services.profile_service import AccessContext, ProfileService

if TYPE_CHECKING:
    from services.translation_service import TranslationCacheService


class LocalizationService:
    """Keeps Vietnamese canonical alert content separate from reviewed translations."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.profiles = ProfileService(session)

    async def list_locales(self, include_inactive: bool, user: CurrentUser) -> list[LocaleResponse]:
        context = await self.profiles.access_context(user)
        if include_inactive and not context.is_official:
            raise AppError(403, "Only officials can view inactive locales", "locale_forbidden")
        query = select(Locale).order_by(Locale.display_name)
        if not include_inactive:
            query = query.where(Locale.is_active.is_(True), Locale.status == "published")
        locales = (await self.session.scalars(query)).all()
        return [self._locale_response(locale) for locale in locales]

    async def create_alert_draft(
        self, alert_id: UUID, payload: AlertTranslationDraftRequest, user: CurrentUser
    ) -> AlertTranslationResponse:
        context = await self.profiles.access_context(user)
        self._require_official(context)
        await self._scoped_alert(alert_id, context)
        locale = await self._locale(payload.locale)
        if locale.code == "vi":
            raise AppError(
                409,
                "Vietnamese content is canonical and cannot be translated",
                "locale_canonical",
            )
        latest = await self.session.scalar(
            select(func.max(ContentTranslation.version)).where(
                ContentTranslation.source_kind == "alert",
                ContentTranslation.source_id == alert_id,
                ContentTranslation.locale == locale.code,
            )
        )
        now = utc_now()
        draft = ContentTranslation(
            source_kind="alert",
            source_id=alert_id,
            locale=locale.code,
            content={
                "what_happened": payload.what_happened,
                "danger_description": payload.danger_description,
                "action_instruction": payload.action_instruction,
                "deadline_instruction": payload.deadline_instruction,
            },
            translation_status=(
                "machine_draft" if payload.translation_method == "machine" else "draft"
            ),
            translation_method=payload.translation_method,
            version=(latest or 0) + 1,
            created_at=now,
            updated_at=now,
        )
        self.session.add(draft)
        self._audit(
            context,
            "alert.translation.create",
            alert_id,
            {"locale": locale.code, "version": draft.version},
        )
        await self.session.commit()
        return self._translation_response(draft)

    async def generate_machine_translation(
        self,
        alert_id: UUID,
        locale_code: str,
        user: CurrentUser,
        translation_cache: TranslationCacheService,
    ) -> AlertTranslationResponse:
        context = await self.profiles.access_context(user)
        self._require_official(context)
        alert = await self._scoped_alert(alert_id, context)
        locale = await self._locale(locale_code)

        if locale.code == "vi":
            raise AppError(
                409,
                "Vietnamese content is canonical and cannot be translated",
                "locale_canonical",
            )

        canonical = await self.session.scalar(
            select(AlertContent).where(
                AlertContent.alert_id == alert.id,
                AlertContent.locale == "vi",
                AlertContent.livelihood_type.is_(None),
            )
        )
        if not canonical:
            raise AppError(404, "Canonical content not found", "canonical_missing")

        from ai.translation.models import TranslationRequest
        
        request = TranslationRequest(
            texts=[
                canonical.what_happened,
                canonical.danger_description,
                canonical.action_instruction,
                canonical.deadline_instruction,
            ],
            source_language="Vietnamese",
            target_language=locale.display_name,
        )
        response = await translation_cache.translate(request)

        latest = await self.session.scalar(
            select(func.max(ContentTranslation.version)).where(
                ContentTranslation.source_kind == "alert",
                ContentTranslation.source_id == alert_id,
                ContentTranslation.locale == locale.code,
            )
        )
        now = utc_now()
        draft = ContentTranslation(
            source_kind="alert",
            source_id=alert_id,
            locale=locale.code,
            content={
                "what_happened": response.translations[0],
                "danger_description": response.translations[1],
                "action_instruction": response.translations[2],
                "deadline_instruction": response.translations[3],
            },
            translation_status="machine_draft",
            translation_method="machine",
            version=(latest or 0) + 1,
            created_at=now,
            updated_at=now,
        )
        self.session.add(draft)
        self._audit(
            context,
            "alert.translation.generate",
            alert_id,
            {"locale": locale.code, "version": draft.version},
        )
        await self.session.commit()
        return self._translation_response(draft)

    async def list_alert_translations(
        self, alert_id: UUID, user: CurrentUser
    ) -> list[AlertTranslationResponse]:
        context = await self.profiles.access_context(user)
        await self._scoped_alert(alert_id, context)
        translations = (
            await self.session.scalars(
                select(ContentTranslation)
                .where(
                    ContentTranslation.source_kind == "alert",
                    ContentTranslation.source_id == alert_id,
                )
                .order_by(ContentTranslation.locale, ContentTranslation.version.desc())
            )
        ).all()
        return [self._translation_response(item) for item in translations]

    async def review_translation(
        self,
        translation_id: UUID,
        payload: AlertTranslationReviewRequest,
        user: CurrentUser,
    ) -> AlertTranslationResponse:
        context = await self.profiles.access_context(user)
        if context.domain_role not in {"admin", "commune_officer"}:
            raise AppError(
                403,
                "Only commune officers and admins can review translations",
                "review_forbidden",
            )
        translation = await self._translation(translation_id)
        await self._scoped_alert(translation.source_id, context)
        if translation.translation_status not in {"draft", "machine_draft"}:
            raise AppError(409, "Only pending drafts can be reviewed", "translation_not_reviewable")
        translation.translation_status = (
            "human_reviewed" if payload.decision == "approve" else "rejected"
        )
        translation.reviewed_by_profile_id = context.profile.id
        translation.reviewed_at = utc_now()
        translation.review_note = payload.review_note
        translation.updated_at = translation.reviewed_at
        self._audit(
            context,
            f"alert.translation.{payload.decision}",
            translation.source_id,
            {"translation_id": str(translation.id), "locale": translation.locale},
        )
        await self.session.commit()
        return self._translation_response(translation)

    async def publish_translation(
        self, translation_id: UUID, user: CurrentUser
    ) -> AlertLocalizedContentResponse:
        context = await self.profiles.access_context(user)
        if context.domain_role not in {"admin", "commune_officer"}:
            raise AppError(
                403,
                "Only commune officers and admins can publish translations",
                "translation_publish_forbidden",
            )
        translation = await self._translation(translation_id)
        alert = await self._scoped_alert(translation.source_id, context)
        locale = await self._locale(translation.locale)
        if translation.translation_status != "human_reviewed":
            raise AppError(
                409,
                "Only human-reviewed translations can be published",
                "translation_not_reviewed",
            )
        if not locale.is_active or locale.status != "published":
            raise AppError(409, "Locale is not enabled for recipient delivery", "locale_not_active")

        content = dict(translation.content)
        localized = await self.session.scalar(
            select(AlertContent).where(
                AlertContent.alert_id == alert.id,
                AlertContent.locale == locale.code,
                AlertContent.livelihood_type.is_(None),
            )
        )
        if localized is None:
            localized = AlertContent(
                alert_id=alert.id,
                locale=locale.code,
                livelihood_type=None,
                what_happened=self._field(content, "what_happened"),
                danger_description=self._field(content, "danger_description"),
                action_instruction=self._field(content, "action_instruction"),
                deadline_instruction=self._field(content, "deadline_instruction"),
                created_at=utc_now(),
            )
            self.session.add(localized)
            await self.session.flush()
        else:
            localized.what_happened = self._field(content, "what_happened")
            localized.danger_description = self._field(content, "danger_description")
            localized.action_instruction = self._field(content, "action_instruction")
            localized.deadline_instruction = self._field(content, "deadline_instruction")

        if alert.status == "published":
            recipients = (
                await self.session.scalars(
                    select(AlertRecipient).where(
                        AlertRecipient.alert_id == alert.id,
                        AlertRecipient.preferred_locale == locale.code,
                    )
                )
            ).all()
            for recipient in recipients:
                recipient.content_id = localized.id

        translation.translation_status = "published"
        translation.updated_at = utc_now()
        self._audit(
            context,
            "alert.translation.publish",
            alert.id,
            {"translation_id": str(translation.id), "locale": locale.code},
        )
        await self.session.commit()
        return self._localized_response(localized)

    async def localized_contents(
        self, alert_id: UUID, user: CurrentUser
    ) -> list[AlertLocalizedContentResponse]:
        context = await self.profiles.access_context(user)
        await self._scoped_alert(alert_id, context)
        contents = (
            await self.session.scalars(
                select(AlertContent)
                .where(AlertContent.alert_id == alert_id, AlertContent.livelihood_type.is_(None))
                .order_by(AlertContent.locale)
            )
        ).all()
        return [self._localized_response(content) for content in contents]

    async def _scoped_alert(self, alert_id: UUID, context: AccessContext) -> Alert:
        alert = await self.session.get(Alert, alert_id)
        if alert is None:
            raise AppError(404, "Alert not found", "alert_not_found")
        if context.is_admin:
            return alert
        target_ids = set(
            await self.session.scalars(
                select(AlertTarget.geo_location_id).where(
                    AlertTarget.alert_id == alert.id,
                    AlertTarget.geo_location_id.is_not(None),
                )
            )
        )
        if not target_ids.intersection(context.area_ids):
            raise AppError(403, "Alert is outside your assigned scope", "alert_forbidden")
        return alert

    async def _locale(self, code: str) -> Locale:
        locale = await self.session.get(Locale, code)
        if locale is None:
            raise AppError(404, "Locale not found", "locale_not_found")
        return locale

    async def _translation(self, translation_id: UUID) -> ContentTranslation:
        translation = await self.session.get(ContentTranslation, translation_id)
        if translation is None or translation.source_kind != "alert":
            raise AppError(404, "Alert translation not found", "translation_not_found")
        return translation

    @staticmethod
    def _field(content: dict[str, object], name: str) -> str:
        value = content.get(name)
        if not isinstance(value, str) or not value.strip():
            raise AppError(409, "Translation content is incomplete", "translation_content_invalid")
        return value

    @staticmethod
    def _locale_response(locale: Locale) -> LocaleResponse:
        return LocaleResponse(
            code=locale.code,
            display_name=locale.display_name,
            native_name=locale.native_name,
            status=locale.status,
            is_active=locale.is_active,
            tts_enabled=locale.tts_enabled,
            fallback_locale_code=locale.fallback_locale_code,
        )

    @staticmethod
    def _translation_response(translation: ContentTranslation) -> AlertTranslationResponse:
        content = translation.content
        return AlertTranslationResponse(
            id=translation.id,
            alert_id=translation.source_id,
            locale=translation.locale,
            what_happened=LocalizationService._field(content, "what_happened"),
            danger_description=LocalizationService._field(content, "danger_description"),
            action_instruction=LocalizationService._field(content, "action_instruction"),
            deadline_instruction=LocalizationService._field(content, "deadline_instruction"),
            translation_status=translation.translation_status,
            translation_method=translation.translation_method,
            version=translation.version,
            reviewed_at=translation.reviewed_at,
            review_note=translation.review_note,
            created_at=translation.created_at,
        )

    @staticmethod
    def _localized_response(content: AlertContent) -> AlertLocalizedContentResponse:
        return AlertLocalizedContentResponse(
            id=content.id,
            alert_id=content.alert_id,
            locale=content.locale,
            what_happened=content.what_happened,
            danger_description=content.danger_description,
            action_instruction=content.action_instruction,
            deadline_instruction=content.deadline_instruction,
            is_published=True,
        )

    @staticmethod
    def _require_official(context: AccessContext) -> None:
        if not context.is_official:
            raise AppError(403, "Only officials can manage translations", "translation_forbidden")

    def _audit(
        self,
        context: AccessContext,
        action: str,
        alert_id: UUID,
        values: dict[str, object],
    ) -> None:
        self.session.add(
            AuditLog(
                actor_profile_id=context.profile.id,
                action=action,
                entity_type="alert",
                entity_id=str(alert_id),
                geo_location_id=None,
                after_values=values,
                created_at=utc_now(),
            )
        )
