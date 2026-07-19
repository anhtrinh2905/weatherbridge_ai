from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth.keycloak import CurrentUser
from core.errors import AppError
from core.time import utc_now
from database.domain_models import Locale, Resident, UserAreaAssignment, UserProfile
from database.models import GeoLocation
from modules.profiles.schemas import ProfileResponse

ROLE_PRIORITY = ("admin", "commune_officer", "village_head", "resident", "expert")


@dataclass(frozen=True)
class AccessContext:
    user: CurrentUser
    profile: UserProfile
    domain_role: str | None
    area_ids: frozenset[UUID]

    @property
    def is_admin(self) -> bool:
        return self.domain_role == "admin"

    @property
    def is_official(self) -> bool:
        return self.domain_role in {"admin", "commune_officer", "village_head"}


class ProfileService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def sync_user(self, user: CurrentUser) -> UserProfile:
        now = utc_now()
        profile = await self.session.scalar(
            select(UserProfile).where(UserProfile.keycloak_subject == user.id)
        )
        if profile is None:
            profile = UserProfile(
                keycloak_subject=user.id,
                display_name=user.display_name,
                preferred_locale="vi",
                status="active",
                synced_at=now,
                created_at=now,
                updated_at=now,
            )
            self.session.add(profile)
        else:
            profile.display_name = user.display_name
            profile.synced_at = now
            profile.updated_at = now
        await self.session.commit()
        return profile

    async def access_context(self, user: CurrentUser) -> AccessContext:
        profile = await self.sync_user(user)
        role = next((candidate for candidate in ROLE_PRIORITY if candidate in user.roles), None)
        if role == "admin":
            return AccessContext(user, profile, role, frozenset())

        now = utc_now()
        assignments = (
            await self.session.scalars(
                select(UserAreaAssignment).where(
                    UserAreaAssignment.profile_id == profile.id,
                    UserAreaAssignment.valid_from <= now,
                    (UserAreaAssignment.valid_to.is_(None) | (UserAreaAssignment.valid_to > now)),
                )
            )
        ).all()
        root_ids = {assignment.geo_location_id for assignment in assignments}
        if role == "village_head":
            village_claim = user.claims.get("village_id")
            if isinstance(village_claim, list):
                village_claim = village_claim[0] if village_claim else None
            if isinstance(village_claim, str) and village_claim.strip():
                village = await self.resolve_area(village_claim)
                if village.location_type != "village":
                    raise AppError(
                        409,
                        "Village head account must be assigned to a village",
                        "village_head_area_invalid",
                    )
                root_ids.add(village.id)
                has_assignment = any(
                    assignment.role == "village_head"
                    and assignment.geo_location_id == village.id
                    for assignment in assignments
                )
                if not has_assignment:
                    self.session.add(
                        UserAreaAssignment(
                            profile_id=profile.id,
                            role="village_head",
                            geo_location_id=village.id,
                            valid_from=now,
                            created_at=now,
                        )
                    )
                    await self.session.commit()
        if role == "resident":
            resident = await self.session.scalar(
                select(Resident).where(
                    Resident.user_profile_id == profile.id,
                    Resident.deleted_at.is_(None),
                )
            )
            if resident:
                root_ids.add(resident.managed_geo_location_id)
        area_ids = await self._expand_descendants(root_ids)
        return AccessContext(user, profile, role, frozenset(area_ids))

    async def response(self, user: CurrentUser) -> ProfileResponse:
        context = await self.access_context(user)
        codes: list[str] = []
        if context.area_ids:
            codes = list(
                await self.session.scalars(
                    select(GeoLocation.code)
                    .where(GeoLocation.id.in_(context.area_ids))
                    .order_by(GeoLocation.code)
                )
            )
        return ProfileResponse(
            id=context.profile.id,
            keycloak_subject=context.profile.keycloak_subject,
            display_name=context.profile.display_name,
            preferred_locale=context.profile.preferred_locale,
            status=context.profile.status,
            domain_role=context.domain_role,
            area_codes=codes,
            synced_at=context.profile.synced_at,
        )

    async def update_locale(self, user: CurrentUser, locale: str) -> ProfileResponse:
        context = await self.access_context(user)
        locale_record = await self.session.get(Locale, locale)
        if (
            locale_record is None
            or not locale_record.is_active
            or locale_record.status != "published"
        ):
            raise AppError(409, "Locale is not available for residents", "locale_unavailable")
        context.profile.preferred_locale = locale
        context.profile.updated_at = utc_now()
        await self.session.commit()
        return await self.response(user)

    async def assert_area_access(self, context: AccessContext, area_id: UUID) -> None:
        if context.is_admin:
            return
        if area_id not in context.area_ids:
            raise AppError(403, "Area is outside your assigned scope", "area_forbidden")

    async def resolve_area(self, code: str) -> GeoLocation:
        candidate_codes = [code]
        if not code.startswith(("village-", "commune-")):
            candidate_codes.extend((f"village-{code}", f"commune-{code}"))
        area = None
        for candidate_code in candidate_codes:
            area = await self.session.scalar(
                select(GeoLocation).where(
                    GeoLocation.code == candidate_code,
                    GeoLocation.is_active.is_(True),
                )
            )
            if area is not None:
                break
        if area is None:
            raise AppError(404, "Area not found", "area_not_found")
        return area

    async def _expand_descendants(self, root_ids: set[UUID]) -> set[UUID]:
        if not root_ids:
            return set()
        locations = (await self.session.scalars(select(GeoLocation))).all()
        allowed = set(root_ids)
        changed = True
        while changed:
            changed = False
            for location in locations:
                if location.parent_id in allowed and location.id not in allowed:
                    allowed.add(location.id)
                    changed = True
        return allowed
