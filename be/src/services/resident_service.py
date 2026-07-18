from datetime import date
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth.keycloak import CurrentUser
from core.config import Settings
from core.errors import AppError
from core.pii import PiiProtector
from core.time import utc_now
from database.domain_models import (
    AlertSubscription,
    AuditLog,
    ConsentRecord,
    Household,
    HouseholdMembership,
    Resident,
    ResidentContact,
    ResidentLivelihood,
    ResidentLocation,
    SupportNeed,
    UserProfile,
)
from database.models import GeoLocation
from database.spatial import point_value
from modules.residents.schemas import (
    ContactCreateRequest,
    ContactResponse,
    ContactUpdateRequest,
    ConsentResponse,
    HouseholdCreateRequest,
    HouseholdMemberRequest,
    HouseholdResponse,
    LinkResidentAccountRequest,
    ResidentCreateRequest,
    ResidentDetailResponse,
    ResidentLocationResponse,
    ResidentPointRequest,
    ResidentResponse,
    SubscriptionCreateRequest,
    SubscriptionResponse,
    SubscriptionUpdateRequest,
    SupportNeedRequest,
)
from services.profile_service import AccessContext, ProfileService


class ResidentService:
    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self.session = session
        self.profiles = ProfileService(session)
        self.protector = PiiProtector(settings)

    async def list_residents(self, user: CurrentUser) -> list[ResidentResponse]:
        context = await self.profiles.access_context(user)
        query = select(Resident).where(Resident.deleted_at.is_(None)).order_by(Resident.created_at)
        if context.is_admin:
            pass
        elif context.domain_role in {"commune_officer", "village_head"}:
            self._require_scoped(context)
            query = query.where(Resident.managed_geo_location_id.in_(context.area_ids))
        elif context.domain_role == "resident":
            query = query.where(Resident.user_profile_id == context.profile.id)
        else:
            raise AppError(403, "Resident registry access is forbidden", "resident_forbidden")
        residents = (await self.session.scalars(query)).all()
        return [await self._resident_response(resident) for resident in residents]

    async def create_resident(
        self, payload: ResidentCreateRequest, user: CurrentUser
    ) -> ResidentResponse:
        context = await self.profiles.access_context(user)
        if not context.is_official:
            raise AppError(
                403,
                "Only assigned officials can create residents",
                "resident_forbidden",
            )
        village = await self.profiles.resolve_area(payload.village_code)
        await self.profiles.assert_area_access(context, village.id)
        if not payload.simulated and self.protector.mode != "live":
            raise AppError(409, "Live PII mode is not enabled", "pii_mode_disabled")

        protected_name = self.protector.protect(payload.full_name, context="resident.full_name")
        now = utc_now()
        resident = Resident(
            managed_geo_location_id=village.id,
            full_name_ciphertext=protected_name.ciphertext,
            full_name_lookup_hash=self.protector.lookup_hash(payload.full_name),
            full_name_key_version=protected_name.key_version,
            birth_year=payload.birth_year,
            verification_status="verified_by_official" if context.is_official else "unverified",
            source=payload.source,
            simulated=payload.simulated,
            created_by_profile_id=context.profile.id,
            created_at=now,
            updated_at=now,
        )
        self.session.add(resident)
        await self.session.flush()

        for contact_payload in payload.contacts:
            existing = await self.session.scalar(
                select(ResidentContact).where(
                    ResidentContact.channel == contact_payload.channel,
                    ResidentContact.value_lookup_hash
                    == self.protector.lookup_hash(contact_payload.value),
                )
            )
            if existing:
                raise AppError(409, "Contact is already registered", "contact_duplicate")
            protected = self.protector.protect(
                contact_payload.value, context="resident_contact.value"
            )
            self.session.add(
                ResidentContact(
                    resident_id=resident.id,
                    channel=contact_payload.channel,
                    value_ciphertext=protected.ciphertext,
                    value_lookup_hash=self.protector.lookup_hash(contact_payload.value),
                    key_version=protected.key_version,
                    verified_at=now if contact_payload.verified else None,
                    is_primary=contact_payload.is_primary,
                    is_active=True,
                    created_at=now,
                )
            )

        dialect_name = self.session.get_bind().dialect.name
        for location_payload in payload.locations:
            protected_label = (
                self.protector.protect(location_payload.label, context="resident_location.label")
                if location_payload.label
                else None
            )
            self.session.add(
                ResidentLocation(
                    resident_id=resident.id,
                    geo_location_id=village.id,
                    location_type=location_payload.location_type,
                    label_ciphertext=(protected_label.ciphertext if protected_label else None),
                    label_key_version=(protected_label.key_version if protected_label else None),
                    location=point_value(
                        dialect_name, location_payload.longitude, location_payload.latitude
                    ),
                    precision_m=location_payload.precision_m,
                    is_active=True,
                    created_at=now,
                )
            )

        if payload.livelihood_type:
            self.session.add(
                ResidentLivelihood(
                    resident_id=resident.id,
                    livelihood_type=payload.livelihood_type,
                    details=payload.livelihood_details,
                    schema_version=1,
                    is_primary=True,
                    created_at=now,
                )
            )
        self._audit(
            context,
            "resident.create",
            "resident",
            resident.id,
            village.id,
            {"simulated": payload.simulated, "source": payload.source},
        )
        await self.session.commit()
        return await self._resident_response(resident)

    async def link_account(
        self, resident_id: UUID, payload: LinkResidentAccountRequest, user: CurrentUser
    ) -> ResidentResponse:
        context = await self.profiles.access_context(user)
        if not context.is_official:
            raise AppError(403, "Only officials can link resident accounts", "resident_forbidden")
        resident = await self._scoped_resident(resident_id, context)
        profile = await self.session.scalar(
            select(UserProfile).where(UserProfile.keycloak_subject == payload.keycloak_subject)
        )
        if profile is None:
            now = utc_now()
            profile = UserProfile(
                keycloak_subject=payload.keycloak_subject,
                display_name="Pending identity sync",
                preferred_locale="vi",
                status="pending_sync",
                synced_at=now,
                created_at=now,
                updated_at=now,
            )
            self.session.add(profile)
            await self.session.flush()
        linked = await self.session.scalar(
            select(Resident).where(
                Resident.user_profile_id == profile.id,
                Resident.id != resident.id,
                Resident.deleted_at.is_(None),
            )
        )
        if linked:
            raise AppError(409, "Account is already linked", "resident_account_linked")
        resident.user_profile_id = profile.id
        resident.verification_status = "account_linked"
        resident.updated_at = utc_now()
        self._audit(
            context,
            "resident.link_account",
            "resident",
            resident.id,
            resident.managed_geo_location_id,
            {"profile_id": str(profile.id)},
        )
        await self.session.commit()
        return await self._resident_response(resident)

    async def resident_detail(
        self, resident_id: UUID, user: CurrentUser
    ) -> ResidentDetailResponse:
        context = await self.profiles.access_context(user)
        resident = await self._scoped_resident(resident_id, context)
        base = await self._resident_response(resident)
        contacts = list(
            await self.session.scalars(
                select(ResidentContact)
                .where(ResidentContact.resident_id == resident.id)
                .order_by(ResidentContact.created_at)
            )
        )
        locations = list(
            await self.session.scalars(
                select(ResidentLocation)
                .where(ResidentLocation.resident_id == resident.id)
                .order_by(ResidentLocation.created_at)
            )
        )
        return ResidentDetailResponse(
            **base.model_dump(),
            contacts=[self._contact_response(item) for item in contacts],
            locations=[await self._location_response(item) for item in locations],
        )

    async def add_contact(
        self, resident_id: UUID, payload: ContactCreateRequest, user: CurrentUser
    ) -> ContactResponse:
        context = await self.profiles.access_context(user)
        resident = await self._scoped_resident(resident_id, context)
        existing = await self.session.scalar(
            select(ResidentContact).where(
                ResidentContact.channel == payload.channel,
                ResidentContact.value_lookup_hash == self.protector.lookup_hash(
                    payload.value
                ),
            )
        )
        if existing:
            raise AppError(409, "Contact is already registered", "contact_duplicate")
        now = utc_now()
        protected = self.protector.protect(payload.value, context="resident_contact.value")
        if payload.is_primary:
            await self._clear_primary_contacts(resident.id, payload.channel)
        contact = ResidentContact(
            resident_id=resident.id,
            channel=payload.channel,
            value_ciphertext=protected.ciphertext,
            value_lookup_hash=self.protector.lookup_hash(payload.value),
            key_version=protected.key_version,
            verified_at=now if payload.verified else None,
            is_primary=payload.is_primary,
            is_active=True,
            delivery_metadata={},
            created_at=now,
        )
        self.session.add(contact)
        await self.session.flush()
        self._audit(
            context,
            "resident.contact.create",
            "resident_contact",
            contact.id,
            resident.managed_geo_location_id,
            {"channel": payload.channel},
        )
        await self.session.commit()
        return self._contact_response(contact)

    async def update_contact(
        self,
        resident_id: UUID,
        contact_id: UUID,
        payload: ContactUpdateRequest,
        user: CurrentUser,
    ) -> ContactResponse:
        context = await self.profiles.access_context(user)
        resident = await self._scoped_resident(resident_id, context)
        contact = await self.session.scalar(
            select(ResidentContact).where(
                ResidentContact.id == contact_id,
                ResidentContact.resident_id == resident.id,
            )
        )
        if contact is None:
            raise AppError(404, "Contact not found", "contact_not_found")
        if payload.value is not None:
            protected = self.protector.protect(payload.value, context="resident_contact.value")
            contact.value_ciphertext = protected.ciphertext
            contact.value_lookup_hash = self.protector.lookup_hash(payload.value)
            contact.key_version = protected.key_version
            contact.verified_at = None
        if payload.is_primary is True:
            await self._clear_primary_contacts(resident.id, contact.channel)
            contact.is_primary = True
        elif payload.is_primary is False:
            contact.is_primary = False
        if payload.is_active is not None:
            contact.is_active = payload.is_active
            contact.revoked_at = utc_now() if not payload.is_active else None
        self._audit(
            context,
            "resident.contact.update",
            "resident_contact",
            contact.id,
            resident.managed_geo_location_id,
            {"channel": contact.channel, "is_active": contact.is_active},
        )
        await self.session.commit()
        return self._contact_response(contact)

    async def add_location(
        self, resident_id: UUID, payload: ResidentPointRequest, user: CurrentUser
    ) -> ResidentLocationResponse:
        context = await self.profiles.access_context(user)
        resident = await self._scoped_resident(resident_id, context)
        protected_label = (
            self.protector.protect(payload.label, context="resident_location.label")
            if payload.label
            else None
        )
        location = ResidentLocation(
            resident_id=resident.id,
            geo_location_id=resident.managed_geo_location_id,
            location_type=payload.location_type,
            label_ciphertext=protected_label.ciphertext if protected_label else None,
            label_key_version=protected_label.key_version if protected_label else None,
            location=point_value(
                self.session.get_bind().dialect.name,
                payload.longitude,
                payload.latitude,
            ),
            precision_m=payload.precision_m,
            is_active=True,
            created_at=utc_now(),
        )
        self.session.add(location)
        await self.session.flush()
        self._audit(
            context,
            "resident.location.create",
            "resident_location",
            location.id,
            resident.managed_geo_location_id,
            {"location_type": location.location_type},
        )
        await self.session.commit()
        return await self._location_response(location)

    async def add_support_need(
        self, resident_id: UUID, payload: SupportNeedRequest, user: CurrentUser
    ) -> None:
        context = await self.profiles.access_context(user)
        resident = await self._scoped_resident(resident_id, context)
        item = SupportNeed(
            resident_id=resident.id,
            need_type=payload.need_type,
            details=payload.details,
            is_active=True,
            created_at=utc_now(),
        )
        self.session.add(item)
        await self.session.flush()
        self._audit(
            context,
            "resident.support_need.create",
            "support_need",
            item.id,
            resident.managed_geo_location_id,
            {"need_type": payload.need_type},
        )
        await self.session.commit()

    async def list_households(self, user: CurrentUser) -> list[HouseholdResponse]:
        context = await self.profiles.access_context(user)
        query = select(Household).order_by(Household.code)
        if context.is_admin:
            pass
        elif context.domain_role in {"commune_officer", "village_head"}:
            self._require_scoped(context)
            query = query.where(Household.village_id.in_(context.area_ids))
        elif context.domain_role == "resident":
            query = (
                query.join(HouseholdMembership)
                .join(Resident)
                .where(Resident.user_profile_id == context.profile.id)
            )
        else:
            raise AppError(403, "Household access is forbidden", "household_forbidden")
        households = (await self.session.scalars(query)).all()
        return [await self._household_response(item) for item in households]

    async def create_household(
        self, payload: HouseholdCreateRequest, user: CurrentUser
    ) -> HouseholdResponse:
        context = await self.profiles.access_context(user)
        if not context.is_official:
            raise AppError(403, "Only officials can create households", "household_forbidden")
        village = await self.profiles.resolve_area(payload.village_code)
        await self.profiles.assert_area_access(context, village.id)
        if not payload.simulated and self.protector.mode != "live":
            raise AppError(409, "Live PII mode is not enabled", "pii_mode_disabled")
        if await self.session.scalar(select(Household).where(Household.code == payload.code)):
            raise AppError(409, "Household code already exists", "household_duplicate")
        now = utc_now()
        address = (
            self.protector.protect(payload.address, context="household.address")
            if payload.address
            else None
        )
        household = Household(
            code=payload.code,
            village_id=village.id,
            address_ciphertext=address.ciphertext if address else None,
            address_key_version=address.key_version if address else None,
            status="active",
            source=payload.source,
            simulated=payload.simulated,
            created_by_profile_id=context.profile.id,
            created_at=now,
            updated_at=now,
        )
        self.session.add(household)
        await self.session.flush()
        self._audit(
            context,
            "household.create",
            "household",
            household.id,
            village.id,
            {"code": payload.code, "simulated": payload.simulated},
        )
        await self.session.commit()
        return await self._household_response(household)

    async def add_household_member(
        self,
        household_id: UUID,
        payload: HouseholdMemberRequest,
        user: CurrentUser,
    ) -> HouseholdResponse:
        context = await self.profiles.access_context(user)
        household = await self.session.get(Household, household_id)
        if household is None:
            raise AppError(404, "Household not found", "household_not_found")
        await self.profiles.assert_area_access(context, household.village_id)
        await self._scoped_resident(payload.resident_id, context)
        self.session.add(
            HouseholdMembership(
                household_id=household.id,
                resident_id=payload.resident_id,
                relationship=payload.relationship,
                is_head=payload.is_head,
                valid_from=date.today(),
            )
        )
        await self.session.commit()
        return await self._household_response(household)

    async def list_subscriptions(self, user: CurrentUser) -> list[SubscriptionResponse]:
        context, resident = await self._self_resident(user)
        return await self._list_subscriptions_for(resident)

    async def _list_subscriptions_for(self, resident: Resident) -> list[SubscriptionResponse]:
        rows = (
            await self.session.scalars(
                select(AlertSubscription)
                .where(AlertSubscription.resident_id == resident.id)
                .order_by(AlertSubscription.created_at)
            )
        ).all()
        return [self._subscription_response(row) for row in rows]

    async def create_subscription(
        self, payload: SubscriptionCreateRequest, user: CurrentUser
    ) -> SubscriptionResponse:
        context, resident = await self._self_resident(user)
        return await self._create_subscription_for(context, resident, payload)

    async def _create_subscription_for(
        self, context: AccessContext, resident: Resident, payload: SubscriptionCreateRequest
    ) -> SubscriptionResponse:
        if payload.resident_location_id:
            location = await self.session.get(ResidentLocation, payload.resident_location_id)
            if location is None or location.resident_id != resident.id:
                raise AppError(404, "Resident location not found", "resident_location_not_found")
        existing = await self.session.scalar(
            select(AlertSubscription).where(
                AlertSubscription.resident_id == resident.id,
                AlertSubscription.resident_location_id == payload.resident_location_id,
                AlertSubscription.hazard_type == payload.hazard_type,
                AlertSubscription.channel == payload.channel,
            )
        )
        if existing:
            raise AppError(409, "Subscription already exists", "subscription_duplicate")
        row = AlertSubscription(
            resident_id=resident.id,
            resident_location_id=payload.resident_location_id,
            hazard_type=payload.hazard_type,
            minimum_level=payload.minimum_level,
            channel=payload.channel,
            quiet_hours_start=payload.quiet_hours_start,
            quiet_hours_end=payload.quiet_hours_end,
            is_active=True,
            created_at=utc_now(),
        )
        self.session.add(row)
        self._audit(
            context,
            "subscription.create",
            "alert_subscription",
            row.id,
            resident.managed_geo_location_id,
            {"hazard_type": payload.hazard_type, "channel": payload.channel},
        )
        await self.session.commit()
        return self._subscription_response(row)

    async def grant_alert_consent(self, user: CurrentUser, policy_version: str) -> None:
        context, resident = await self._self_resident(user)
        self.session.add(
            ConsentRecord(
                resident_id=resident.id,
                purpose="alert_delivery",
                policy_version=policy_version,
                granted_at=utc_now(),
                recorded_by_profile_id=context.profile.id,
            )
        )
        await self.session.commit()

    async def list_consents(self, user: CurrentUser) -> list[ConsentResponse]:
        _, resident = await self._self_resident(user)
        rows = list(
            await self.session.scalars(
                select(ConsentRecord)
                .where(ConsentRecord.resident_id == resident.id)
                .order_by(ConsentRecord.granted_at.desc())
            )
        )
        return [
            ConsentResponse(
                id=row.id,
                purpose=row.purpose,
                policy_version=row.policy_version,
                granted_at=row.granted_at,
                withdrawn_at=row.withdrawn_at,
            )
            for row in rows
        ]

    async def withdraw_alert_consent(self, user: CurrentUser, consent_id: UUID) -> None:
        context, resident = await self._self_resident(user)
        consent = await self.session.scalar(
            select(ConsentRecord).where(
                ConsentRecord.id == consent_id,
                ConsentRecord.resident_id == resident.id,
            )
        )
        if consent is None:
            raise AppError(404, "Consent not found", "consent_not_found")
        consent.withdrawn_at = utc_now()
        self._audit(
            context,
            "consent.withdraw",
            "consent",
            consent.id,
            resident.managed_geo_location_id,
            {"purpose": consent.purpose},
        )
        await self.session.commit()

    async def update_subscription(
        self,
        subscription_id: UUID,
        payload: SubscriptionUpdateRequest,
        user: CurrentUser,
    ) -> SubscriptionResponse:
        context, resident = await self._self_resident(user)
        row = await self.session.scalar(
            select(AlertSubscription).where(
                AlertSubscription.id == subscription_id,
                AlertSubscription.resident_id == resident.id,
            )
        )
        if row is None:
            raise AppError(404, "Subscription not found", "subscription_not_found")
        for field in ("minimum_level", "quiet_hours_start", "quiet_hours_end", "is_active"):
            value = getattr(payload, field)
            if value is not None:
                setattr(row, field, value)
        self._audit(
            context,
            "subscription.update",
            "alert_subscription",
            row.id,
            resident.managed_geo_location_id,
            {"is_active": row.is_active},
        )
        await self.session.commit()
        return self._subscription_response(row)

    async def _self_resident(self, user: CurrentUser) -> tuple[AccessContext, Resident]:
        context = await self.profiles.access_context(user)
        resident = await self.session.scalar(
            select(Resident).where(
                Resident.user_profile_id == context.profile.id,
                Resident.deleted_at.is_(None),
            )
        )
        if resident is None:
            raise AppError(404, "Resident account is not linked", "resident_not_linked")
        return context, resident

    async def _scoped_resident(self, resident_id: UUID, context: AccessContext) -> Resident:
        resident = await self.session.get(Resident, resident_id)
        if resident is None or resident.deleted_at is not None:
            raise AppError(404, "Resident not found", "resident_not_found")
        if context.domain_role == "resident" and resident.user_profile_id != context.profile.id:
            raise AppError(403, "Residents can only access themselves", "resident_forbidden")
        await self.profiles.assert_area_access(context, resident.managed_geo_location_id)
        return resident

    async def _clear_primary_contacts(self, resident_id: UUID, channel: str) -> None:
        contacts = list(
            await self.session.scalars(
                select(ResidentContact).where(
                    ResidentContact.resident_id == resident_id,
                    ResidentContact.channel == channel,
                    ResidentContact.is_primary.is_(True),
                )
            )
        )
        for contact in contacts:
            contact.is_primary = False

    async def _resident_response(self, resident: Resident) -> ResidentResponse:
        village_code = await self.session.scalar(
            select(GeoLocation.code).where(GeoLocation.id == resident.managed_geo_location_id)
        )
        contacts = list(
            await self.session.scalars(
                select(ResidentContact.channel).where(
                    ResidentContact.resident_id == resident.id,
                    ResidentContact.is_active.is_(True),
                )
            )
        )
        livelihoods = list(
            await self.session.scalars(
                select(ResidentLivelihood.livelihood_type).where(
                    ResidentLivelihood.resident_id == resident.id
                )
            )
        )
        return ResidentResponse(
            id=resident.id,
            user_profile_id=resident.user_profile_id,
            full_name=self.protector.reveal(
                resident.full_name_ciphertext, context="resident.full_name"
            ),
            village_code=village_code or "unknown",
            birth_year=resident.birth_year,
            verification_status=resident.verification_status,
            simulated=resident.simulated,
            contact_channels=contacts,
            livelihood_types=livelihoods,
            created_at=resident.created_at,
        )

    async def _household_response(self, household: Household) -> HouseholdResponse:
        village_code = await self.session.scalar(
            select(GeoLocation.code).where(GeoLocation.id == household.village_id)
        )
        address = (
            self.protector.reveal(household.address_ciphertext, context="household.address")
            if household.address_ciphertext
            else None
        )
        return HouseholdResponse(
            id=household.id,
            code=household.code,
            village_code=village_code or "unknown",
            address=address,
            status=household.status,
            simulated=household.simulated,
        )

    def _contact_response(self, contact: ResidentContact) -> ContactResponse:
        value = self.protector.reveal(contact.value_ciphertext, context="resident_contact.value")
        visible = value[-4:] if len(value) > 4 else value
        return ContactResponse(
            id=contact.id,
            channel=contact.channel,
            masked_value=f"***{visible}",
            is_primary=contact.is_primary,
            is_active=contact.is_active,
            verified_at=contact.verified_at,
        )

    async def _location_response(self, location: ResidentLocation) -> ResidentLocationResponse:
        coordinates = (
            location.location.get("coordinates")
            if isinstance(location.location, dict)
            else None
        )
        if coordinates is None:
            longitude = await self.session.scalar(select(func.ST_X(location.location)))
            latitude = await self.session.scalar(select(func.ST_Y(location.location)))
        else:
            longitude, latitude = coordinates
        label = (
            self.protector.reveal(
                location.label_ciphertext, context="resident_location.label"
            )
            if location.label_ciphertext
            else None
        )
        return ResidentLocationResponse(
            id=location.id,
            location_type=location.location_type,
            latitude=float(latitude),
            longitude=float(longitude),
            label=label,
            precision_m=location.precision_m,
            is_active=location.is_active,
        )

    @staticmethod
    def _subscription_response(row: AlertSubscription) -> SubscriptionResponse:
        return SubscriptionResponse(
            id=row.id,
            resident_location_id=row.resident_location_id,
            hazard_type=row.hazard_type,
            minimum_level=row.minimum_level,
            channel=row.channel,
            quiet_hours_start=row.quiet_hours_start,
            quiet_hours_end=row.quiet_hours_end,
            is_active=row.is_active,
        )

    @staticmethod
    def _require_scoped(context: AccessContext) -> None:
        if not context.area_ids:
            raise AppError(403, "No area is assigned to this account", "area_unassigned")

    def _audit(
        self,
        context: AccessContext,
        action: str,
        entity_type: str,
        entity_id: UUID,
        geo_location_id: UUID,
        after_values: dict[str, object],
    ) -> None:
        self.session.add(
            AuditLog(
                actor_profile_id=context.profile.id,
                action=action,
                entity_type=entity_type,
                entity_id=str(entity_id),
                geo_location_id=geo_location_id,
                after_values=after_values,
                created_at=utc_now(),
            )
        )
