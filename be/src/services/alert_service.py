import hashlib
from datetime import UTC, datetime, time
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth.keycloak import CurrentUser
from core.errors import AppError
from core.time import utc_now
from database.domain_models import (
    Alert,
    AlertContent,
    AlertRecipient,
    AlertSubscription,
    AlertTarget,
    AuditLog,
    ConsentRecord,
    Locale,
    NotificationOutbox,
    Resident,
    ResidentContact,
    ResidentLivelihood,
    UserProfile,
)
from database.models import GeoLocation
from modules.alerts.schemas import (
    AcknowledgeAlertRequest,
    AlertCreateRequest,
    AlertInboxItem,
    AlertResponse,
    DeliverySummaryItem,
    PublishAlertResponse,
)
from services.profile_service import AccessContext, ProfileService


class AlertService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.profiles = ProfileService(session)

    async def list_alerts(self, user: CurrentUser) -> list[AlertResponse]:
        context = await self.profiles.access_context(user)
        query = select(Alert).order_by(Alert.created_at.desc()).distinct()
        if context.is_admin:
            pass
        elif context.domain_role in {"commune_officer", "village_head"}:
            if not context.area_ids:
                raise AppError(403, "No area is assigned", "area_unassigned")
            query = query.join(AlertTarget).where(
                AlertTarget.geo_location_id.in_(context.area_ids)
            )
        elif context.domain_role == "resident":
            resident = await self._resident_for_profile(context.profile.id)
            query = query.join(AlertRecipient).where(AlertRecipient.resident_id == resident.id)
        else:
            raise AppError(403, "Alert access is forbidden", "alert_forbidden")
        alerts = (await self.session.scalars(query)).unique().all()
        return [await self._response(alert) for alert in alerts]

    async def create_alert(self, payload: AlertCreateRequest, user: CurrentUser) -> AlertResponse:
        context = await self.profiles.access_context(user)
        if not context.is_official:
            raise AppError(403, "Only officials can create alerts", "alert_forbidden")
        areas: list[GeoLocation] = []
        for code in set(payload.target_area_codes):
            area = await self.profiles.resolve_area(code)
            await self.profiles.assert_area_access(context, area.id)
            areas.append(area)
        now = utc_now()
        alert = Alert(
            source=payload.source,
            status="draft",
            hazard_type=payload.hazard_type,
            level=payload.level,
            tier=payload.tier,
            confidence=payload.confidence,
            canonical_locale="vi",
            what_happened=payload.what_happened,
            danger_description=payload.danger_description,
            action_instruction=payload.action_instruction,
            deadline_at=payload.deadline_at,
            expires_at=payload.expires_at,
            created_by_profile_id=context.profile.id,
            created_at=now,
            updated_at=now,
        )
        self.session.add(alert)
        await self.session.flush()
        content = AlertContent(
            alert_id=alert.id,
            locale="vi",
            what_happened=payload.what_happened,
            danger_description=payload.danger_description,
            action_instruction=payload.action_instruction,
            deadline_instruction=payload.deadline_at.isoformat(),
            created_at=now,
        )
        self.session.add(content)
        for area in areas:
            self.session.add(
                AlertTarget(
                    alert_id=alert.id,
                    target_type="geo_location",
                    geo_location_id=area.id,
                    reason="Selected by issuing official",
                )
            )
        self._audit(context, "alert.create", alert.id, areas[0].id, {"status": "draft"})
        await self.session.commit()
        return await self._response(alert)

    async def submit_alert(self, alert_id: UUID, user: CurrentUser) -> AlertResponse:
        context = await self.profiles.access_context(user)
        alert = await self._scoped_alert(alert_id, context)
        if alert.status != "draft":
            raise AppError(409, "Only draft alerts can be submitted", "alert_not_submittable")
        alert.status = "pending_review"
        alert.updated_at = utc_now()
        self._audit(context, "alert.submit", alert.id, None, {"status": alert.status})
        await self.session.commit()
        return await self._response(alert)

    async def publish_alert(self, alert_id: UUID, user: CurrentUser) -> PublishAlertResponse:
        context = await self.profiles.access_context(user)
        if context.domain_role not in {"admin", "commune_officer", "village_head"}:
            raise AppError(403, "This role cannot publish alerts", "alert_publish_forbidden")
        alert = await self._scoped_alert(alert_id, context)
        if alert.status not in {"draft", "pending_review"}:
            if alert.status == "published":
                response = await self._response(alert)
                return PublishAlertResponse(
                    alert=response,
                    recipient_count=response.recipient_count,
                    delivery_count=response.delivery_count,
                )
            raise AppError(409, "Alert cannot be published", "alert_not_publishable")
        now = utc_now()
        expires_at = (
            alert.expires_at.replace(tzinfo=UTC)
            if alert.expires_at.tzinfo is None
            else alert.expires_at
        )
        if expires_at <= now:
            raise AppError(409, "Expired alert cannot be published", "alert_expired")

        target_ids = set(
            await self.session.scalars(
                select(AlertTarget.geo_location_id).where(
                    AlertTarget.alert_id == alert.id,
                    AlertTarget.geo_location_id.is_not(None),
                )
            )
        )
        expanded_ids = await self.profiles._expand_descendants(  # domain-internal reuse
            {area_id for area_id in target_ids if area_id is not None}
        )
        residents = (
            await self.session.scalars(
                select(Resident).where(
                    Resident.managed_geo_location_id.in_(expanded_ids),
                    Resident.deleted_at.is_(None),
                )
            )
        ).all()
        contents = list(
            await self.session.scalars(
                select(AlertContent).where(AlertContent.alert_id == alert.id)
            )
        )
        canonical_content = next(
            (
                item
                for item in contents
                if item.locale == "vi" and item.livelihood_type is None
            ),
            None,
        )
        if canonical_content is None:
            raise AppError(409, "Alert has no canonical content", "alert_content_missing")

        recipient_count = 0
        delivery_count = 0
        is_village_head_danger_broadcast = (
            context.domain_role == "village_head" and alert.tier == "go_now"
        )
        for resident in residents:
            existing = await self.session.scalar(
                select(AlertRecipient).where(
                    AlertRecipient.alert_id == alert.id,
                    AlertRecipient.resident_id == resident.id,
                )
            )
            if existing:
                continue
            profile = (
                await self.session.get(UserProfile, resident.user_profile_id)
                if resident.user_profile_id
                else None
            )
            livelihoods = set(
                await self.session.scalars(
                    select(ResidentLivelihood.livelihood_type).where(
                        ResidentLivelihood.resident_id == resident.id
                    )
                )
            )
            content = self._select_content(
                contents,
                canonical_content,
                profile.preferred_locale if profile else "vi",
                livelihoods,
            )
            recipient = AlertRecipient(
                alert_id=alert.id,
                resident_id=resident.id,
                content_id=content.id,
                preferred_locale=(profile.preferred_locale if profile else "vi"),
                acknowledgement_status="unacknowledged",
                created_at=now,
            )
            self.session.add(recipient)
            await self.session.flush()
            recipient_count += 1

            has_consent = await self.session.scalar(
                select(ConsentRecord.id)
                .where(
                    ConsentRecord.resident_id == resident.id,
                    ConsentRecord.purpose == "alert_delivery",
                    ConsentRecord.withdrawn_at.is_(None),
                )
                .limit(1)
            )
            if not has_consent:
                continue
            contacts = (
                await self.session.scalars(
                    select(ResidentContact).where(
                        ResidentContact.resident_id == resident.id,
                        ResidentContact.is_active.is_(True),
                    )
                )
            ).all()
            subscriptions = (
                await self.session.scalars(
                    select(AlertSubscription).where(
                        AlertSubscription.resident_id == resident.id,
                        AlertSubscription.is_active.is_(True),
                        AlertSubscription.hazard_type == alert.hazard_type,
                        AlertSubscription.minimum_level <= alert.level,
                    )
                )
            ).all()
            subscription_channels = {
                item.channel
                for item in subscriptions
                if not self._is_quiet_hour(item.quiet_hours_start, item.quiet_hours_end, now)
            }
            for contact in contacts:
                if context.domain_role == "village_head" and alert.tier != "go_now":
                    continue
                if (
                    not is_village_head_danger_broadcast
                    and alert.source != "evacuation"
                    and contact.channel not in subscription_channels
                ):
                    continue
                idempotency_key = hashlib.sha256(
                    f"{alert.id}:{resident.id}:{contact.id}:{contact.channel}".encode()
                ).hexdigest()
                self.session.add(
                    NotificationOutbox(
                        alert_recipient_id=recipient.id,
                        resident_contact_id=contact.id,
                        channel=contact.channel,
                        status="pending",
                        idempotency_key=idempotency_key,
                        attempt_count=0,
                        next_attempt_at=now,
                        created_at=now,
                        updated_at=now,
                    )
                )
                delivery_count += 1

        alert.status = "published"
        alert.approved_by_profile_id = context.profile.id
        alert.published_at = now
        alert.updated_at = now
        self._audit(
            context,
            "alert.publish",
            alert.id,
            next(iter(expanded_ids), None),
            {"recipients": recipient_count, "deliveries": delivery_count},
        )
        await self.session.commit()
        response = await self._response(alert)
        return PublishAlertResponse(
            alert=response,
            recipient_count=response.recipient_count,
            delivery_count=response.delivery_count,
        )

    async def inbox(self, user: CurrentUser) -> list[AlertInboxItem]:
        context = await self.profiles.access_context(user)
        resident = await self._resident_for_profile(context.profile.id)
        rows = (
            await self.session.execute(
                select(AlertRecipient, Alert, AlertContent)
                .join(Alert, Alert.id == AlertRecipient.alert_id)
                .join(AlertContent, AlertContent.id == AlertRecipient.content_id)
                .where(
                    AlertRecipient.resident_id == resident.id,
                    Alert.status == "published",
                )
                .order_by(Alert.published_at.desc())
            )
        ).all()
        return [
            await self._inbox_item(recipient, alert, content)
            for recipient, alert, content in rows
        ]

    async def delivery_summary(
        self, alert_id: UUID, user: CurrentUser
    ) -> list[DeliverySummaryItem]:
        context = await self.profiles.access_context(user)
        await self._scoped_alert(alert_id, context)
        rows = (
            await self.session.execute(
                select(
                    NotificationOutbox.channel,
                    NotificationOutbox.status,
                    func.count(NotificationOutbox.id),
                )
                .join(AlertRecipient, AlertRecipient.id == NotificationOutbox.alert_recipient_id)
                .where(AlertRecipient.alert_id == alert_id)
                .group_by(NotificationOutbox.channel, NotificationOutbox.status)
                .order_by(NotificationOutbox.channel, NotificationOutbox.status)
            )
        ).all()
        return [
            DeliverySummaryItem(channel=channel, status=status, count=count)
            for channel, status, count in rows
        ]

    async def acknowledge(
        self, alert_id: UUID, payload: AcknowledgeAlertRequest, user: CurrentUser
    ) -> AlertInboxItem:
        context = await self.profiles.access_context(user)
        resident = await self._resident_for_profile(context.profile.id)
        row = (
            await self.session.execute(
                select(AlertRecipient, Alert, AlertContent)
                .join(Alert, Alert.id == AlertRecipient.alert_id)
                .join(AlertContent, AlertContent.id == AlertRecipient.content_id)
                .where(
                    AlertRecipient.alert_id == alert_id,
                    AlertRecipient.resident_id == resident.id,
                    Alert.status == "published",
                )
            )
        ).first()
        if row is None:
            raise AppError(404, "Alert was not delivered to this resident", "alert_not_found")
        recipient, alert, content = row
        recipient.acknowledgement_status = payload.status
        recipient.acknowledged_at = utc_now()
        await self.session.commit()
        return await self._inbox_item(recipient, alert, content)

    async def speech_text(self, alert_id: UUID, user: CurrentUser) -> tuple[str, str]:
        """Returns reviewed recipient content only; the endpoint never speaks a draft."""
        context = await self.profiles.access_context(user)
        resident = await self._resident_for_profile(context.profile.id)
        row = (
            await self.session.execute(
                select(AlertRecipient, Alert, AlertContent)
                .join(Alert, Alert.id == AlertRecipient.alert_id)
                .join(AlertContent, AlertContent.id == AlertRecipient.content_id)
                .where(
                    AlertRecipient.alert_id == alert_id,
                    AlertRecipient.resident_id == resident.id,
                    Alert.status == "published",
                )
            )
        ).first()
        if row is None:
            raise AppError(404, "Alert was not delivered to this resident", "alert_not_found")
        _recipient, _alert, content = row
        locale = await self.session.get(Locale, content.locale)
        if locale is None or not locale.tts_enabled:
            raise AppError(
                409,
                "Speech is not enabled for this alert language",
                "speech_unavailable",
            )
        speech_language = {"hmn-x-dienbien": "hmn", "tai-x-muongpon": "blt"}.get(content.locale)
        if speech_language is None:
            raise AppError(409, "No reviewed speech voice is configured", "speech_unavailable")
        return (
            " ".join(
                (
                    content.what_happened,
                    content.danger_description,
                    content.action_instruction,
                    content.deadline_instruction,
                )
            ),
            speech_language,
        )

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

    async def _resident_for_profile(self, profile_id: UUID) -> Resident:
        resident = await self.session.scalar(
            select(Resident).where(
                Resident.user_profile_id == profile_id,
                Resident.deleted_at.is_(None),
            )
        )
        if resident is None:
            raise AppError(404, "Resident account is not linked", "resident_not_linked")
        return resident

    async def _response(self, alert: Alert) -> AlertResponse:
        target_codes = list(
            await self.session.scalars(
                select(GeoLocation.code)
                .join(AlertTarget, AlertTarget.geo_location_id == GeoLocation.id)
                .where(AlertTarget.alert_id == alert.id)
                .order_by(GeoLocation.code)
            )
        )
        recipient_count = int(
            await self.session.scalar(
                select(func.count(AlertRecipient.id)).where(AlertRecipient.alert_id == alert.id)
            )
            or 0
        )
        delivery_count = int(
            await self.session.scalar(
                select(func.count(NotificationOutbox.id))
                .join(AlertRecipient)
                .where(AlertRecipient.alert_id == alert.id)
            )
            or 0
        )
        return AlertResponse(
            id=alert.id,
            source=alert.source,
            status=alert.status,
            hazard_type=alert.hazard_type,
            level=alert.level,
            tier=alert.tier,
            confidence=alert.confidence,
            what_happened=alert.what_happened,
            danger_description=alert.danger_description,
            action_instruction=alert.action_instruction,
            deadline_at=alert.deadline_at,
            expires_at=alert.expires_at,
            target_area_codes=target_codes,
            recipient_count=recipient_count,
            delivery_count=delivery_count,
            published_at=alert.published_at,
        )

    async def _inbox_item(
        self, recipient: AlertRecipient, alert: Alert, content: AlertContent
    ) -> AlertInboxItem:
        locale = await self.session.get(Locale, content.locale)
        audio_available = bool(
            locale and locale.tts_enabled and content.media_asset_id is not None
        )
        audio_url = f"/api/v1/alerts/{alert.id}/audio?locale={content.locale}"
        return AlertInboxItem(
            alert_id=alert.id,
            recipient_id=recipient.id,
            hazard_type=alert.hazard_type,
            level=alert.level,
            tier=alert.tier,
            what_happened=alert.what_happened,
            danger_description=alert.danger_description,
            action_instruction=alert.action_instruction,
            deadline_instruction=alert.deadline_at.isoformat(),
            deadline_at=alert.deadline_at,
            content_locale="vi",
            is_locale_fallback=False,
            audio_available=audio_available,
            audio_asset_url=audio_url if audio_available else None,
            acknowledgement_status=recipient.acknowledgement_status,
            acknowledged_at=recipient.acknowledged_at,
        )

    def _audit(
        self,
        context: AccessContext,
        action: str,
        alert_id: UUID,
        area_id: UUID | None,
        values: dict[str, object],
    ) -> None:
        self.session.add(
            AuditLog(
                actor_profile_id=context.profile.id,
                action=action,
                entity_type="alert",
                entity_id=str(alert_id),
                geo_location_id=area_id,
                after_values=values,
                created_at=utc_now(),
            )
        )

    @staticmethod
    def _select_content(
        contents: list[AlertContent],
        canonical_content: AlertContent,
        preferred_locale: str,
        livelihoods: set[str],
    ) -> AlertContent:
        for locale in (preferred_locale, "vi"):
            for content in contents:
                if content.locale == locale and content.livelihood_type in livelihoods:
                    return content
            for content in contents:
                if content.locale == locale and content.livelihood_type is None:
                    return content
        return canonical_content

    @staticmethod
    def _is_quiet_hour(
        start: time | None,
        end: time | None,
        now: datetime,
    ) -> bool:
        if start is None or end is None or start == end:
            return False
        local_time = now.astimezone(ZoneInfo("Asia/Ho_Chi_Minh")).time().replace(tzinfo=None)
        if start < end:
            return start <= local_time < end
        return local_time >= start or local_time < end
