from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth.keycloak import CurrentUser
from core.errors import AppError
from core.time import utc_now
from database.domain_models import Resident, UserAreaAssignment, UserProfile
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
        candidates = {code}
        if not code.startswith(("village-", "commune-")):
            candidates.add(f"village-{code}")
            candidates.add(f"commune-{code}")
        area = await self.session.scalar(
            select(GeoLocation).where(
                GeoLocation.code.in_(candidates), GeoLocation.is_active.is_(True)
            )
        )
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
