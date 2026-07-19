import json
from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth.keycloak import CurrentUser
from core.config import Settings
from core.errors import AppError
from core.pii import PiiProtector
from core.time import utc_now
from database.domain_models import AuditLog, ConsentRecord, Resident, ResidentContact
from modules.notifications.schemas import (
    WebPushSubscriptionRequest,
    WebPushSubscriptionResponse,
    WebPushSubscriptionStatusResponse,
)
from services.profile_service import ProfileService


class NotificationEndpointService:
    """Owns persisted device endpoints; transport remains in the worker."""

    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self.session = session
        self.profiles = ProfileService(session)
        self.protector = PiiProtector(settings)

    async def upsert_web_push_subscription(
        self, payload: WebPushSubscriptionRequest, user: CurrentUser
    ) -> WebPushSubscriptionResponse:
        context = await self.profiles.access_context(user)
        if context.domain_role != "resident":
            raise AppError(
                403,
                "Only residents can register notification devices",
                "web_push_forbidden",
            )
        resident = await self._resident_for_profile(context.profile.id, user)
        endpoint = str(payload.endpoint)
        endpoint_hash = self.protector.lookup_hash(endpoint)
        existing = await self.session.scalar(
            select(ResidentContact).where(
                ResidentContact.channel == "web_push",
                ResidentContact.value_lookup_hash == endpoint_hash,
            )
        )
        if existing is not None and existing.resident_id != resident.id:
            raise AppError(
                409,
                "This browser is already linked to another resident",
                "web_push_owned",
            )

        now = utc_now()
        subscription = {
            "endpoint": endpoint,
            "expirationTime": payload.expiration_time,
            "keys": payload.keys.model_dump(),
        }
        protected = self.protector.protect(
            json.dumps(subscription, sort_keys=True, separators=(",", ":")),
            context="resident_contact.value",
        )
        metadata: dict[str, object] = (
            {"device_label": payload.device_label} if payload.device_label else {}
        )
        if existing is None:
            contact = ResidentContact(
                resident_id=resident.id,
                channel="web_push",
                value_ciphertext=protected.ciphertext,
                value_lookup_hash=endpoint_hash,
                key_version=protected.key_version,
                verified_at=now,
                is_primary=False,
                is_active=True,
                delivery_metadata=metadata,
                last_seen_at=now,
                revoked_at=None,
                created_at=now,
            )
            self.session.add(contact)
            action = "notification.web_push.register"
        else:
            contact = existing
            contact.value_ciphertext = protected.ciphertext
            contact.key_version = protected.key_version
            contact.verified_at = now
            contact.is_active = True
            contact.delivery_metadata = metadata
            contact.last_seen_at = now
            contact.revoked_at = None
            action = "notification.web_push.refresh"
        await self._ensure_alert_delivery_consent(resident, context.profile.id, now)
        await self.session.flush()
        self.session.add(
            AuditLog(
                actor_profile_id=context.profile.id,
                action=action,
                entity_type="resident_contact",
                entity_id=str(contact.id),
                geo_location_id=resident.managed_geo_location_id,
                after_values={"channel": "web_push", "is_active": True},
                created_at=now,
            )
        )
        await self.session.commit()
        return WebPushSubscriptionResponse(id=contact.id, is_active=True, last_seen_at=now)

    async def _ensure_alert_delivery_consent(
        self,
        resident: Resident,
        profile_id: UUID,
        granted_at: datetime,
    ) -> None:
        active_consent = await self.session.scalar(
            select(ConsentRecord.id)
            .where(
                ConsentRecord.resident_id == resident.id,
                ConsentRecord.purpose == "alert_delivery",
                ConsentRecord.withdrawn_at.is_(None),
            )
            .limit(1)
        )
        if active_consent is None:
            self.session.add(
                ConsentRecord(
                    resident_id=resident.id,
                    purpose="alert_delivery",
                    policy_version="web-push-opt-in-v1",
                    granted_at=granted_at,
                    recorded_by_profile_id=profile_id,
                )
            )

    async def get_web_push_subscription_status(
        self, contact_id: UUID, user: CurrentUser
    ) -> WebPushSubscriptionStatusResponse:
        context = await self.profiles.access_context(user)
        if context.domain_role != "resident":
            raise AppError(
                403,
                "Only residents can manage notification devices",
                "web_push_forbidden",
            )
        resident = await self._resident_for_profile(context.profile.id, user)
        contact = await self.session.scalar(
            select(ResidentContact).where(
                ResidentContact.id == contact_id,
                ResidentContact.resident_id == resident.id,
                ResidentContact.channel == "web_push",
            )
        )
        if contact is None:
            raise AppError(404, "Notification device not found", "web_push_not_found")
        return WebPushSubscriptionStatusResponse(
            id=contact.id,
            is_active=contact.is_active,
            last_seen_at=contact.last_seen_at,
        )

    async def revoke_web_push_subscription(self, contact_id: UUID, user: CurrentUser) -> None:
        context = await self.profiles.access_context(user)
        if context.domain_role != "resident":
            raise AppError(
                403,
                "Only residents can manage notification devices",
                "web_push_forbidden",
            )
        resident = await self._resident_for_profile(context.profile.id)
        contact = await self.session.scalar(
            select(ResidentContact).where(
                ResidentContact.id == contact_id,
                ResidentContact.resident_id == resident.id,
                ResidentContact.channel == "web_push",
            )
        )
        if contact is None:
            raise AppError(404, "Notification device not found", "web_push_not_found")
        now = utc_now()
        contact.is_active = False
        contact.revoked_at = now
        self.session.add(
            AuditLog(
                actor_profile_id=context.profile.id,
                action="notification.web_push.revoke",
                entity_type="resident_contact",
                entity_id=str(contact.id),
                geo_location_id=resident.managed_geo_location_id,
                after_values={"channel": "web_push", "is_active": False},
                created_at=now,
            )
        )
        await self.session.commit()

    async def _resident_for_profile(
        self,
        profile_id: UUID,
        user: CurrentUser | None = None,
    ) -> Resident:
        resident = await self.session.scalar(
            select(Resident).where(
                Resident.user_profile_id == profile_id,
                Resident.deleted_at.is_(None),
            )
        )
        if resident is None and user is not None:
            village_claim = user.claims.get("village_id")
            if isinstance(village_claim, list):
                village_claim = village_claim[0] if village_claim else None
            if not isinstance(village_claim, str) or not village_claim.strip():
                raise AppError(
                    404,
                    "Resident account has no assigned village",
                    "resident_village_unassigned",
                )
            village = await self.profiles.resolve_area(village_claim)
            if village.location_type != "village":
                raise AppError(
                    409,
                    "Resident account must be assigned to a village",
                    "resident_village_invalid",
                )
            now = utc_now()
            protected_name = self.protector.protect(
                user.display_name,
                context="resident.full_name",
            )
            resident = Resident(
                user_profile_id=profile_id,
                managed_geo_location_id=village.id,
                full_name_ciphertext=protected_name.ciphertext,
                full_name_lookup_hash=self.protector.lookup_hash(user.display_name),
                full_name_key_version=protected_name.key_version,
                verification_status="account_linked",
                source="self",
                simulated=self.protector.mode == "simulated",
                created_by_profile_id=profile_id,
                created_at=now,
                updated_at=now,
            )
            self.session.add(resident)
            await self.session.flush()
            self.session.add(
                AuditLog(
                    actor_profile_id=profile_id,
                    action="resident.self_link",
                    entity_type="resident",
                    entity_id=str(resident.id),
                    geo_location_id=village.id,
                    after_values={"source": "self", "account_linked": True},
                    created_at=now,
                )
            )
        if resident is None:
            raise AppError(404, "Resident account is not linked", "resident_not_linked")
        return resident
