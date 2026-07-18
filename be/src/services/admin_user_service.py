from typing import Any, Protocol

from core.errors import AppError
from core.time import utc_now
from database.domain_models import UserAreaAssignment, UserProfile
from database.models import GeoLocation
from modules.admin.schemas import DOMAIN_ROLES, AdminUserResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# Priority order when a user (wrongly) holds more than one domain role — the
# broadest scope wins, mirroring the frontend ROLE_PRIORITY.
_ROLE_PRIORITY = ("admin", "commune_officer", "village_head", "resident")


class KeycloakAdmin(Protocol):
    async def list_users(self, limit: int = 100) -> list[dict[str, Any]]: ...
    async def get_realm_roles(self, user_id: str) -> list[str]: ...
    async def add_realm_roles(self, user_id: str, names: list[str]) -> None: ...
    async def remove_realm_roles(self, user_id: str, names: list[str]) -> None: ...
    async def set_user_attribute(self, user_id: str, key: str, value: str | None) -> None: ...


class AdminUserService:
    """User administration on top of Keycloak. Enforces the domain rule that a
    user has exactly one of the four domain roles at a time."""

    def __init__(self, client: KeycloakAdmin, session: AsyncSession | None = None) -> None:
        self.client = client
        self.session = session

    async def list_users(self) -> list[AdminUserResponse]:
        users = await self.client.list_users()
        result: list[AdminUserResponse] = []
        for user in users:
            roles = await self.client.get_realm_roles(user["id"])
            result.append(self._to_response(user, roles))
        return result

    async def set_domain_role(self, user_id: str, role: str) -> None:
        current = await self.client.get_realm_roles(user_id)
        stale = [r for r in current if r in DOMAIN_ROLES and r != role]
        await self.client.remove_realm_roles(user_id, stale)
        if role not in current:
            await self.client.add_realm_roles(user_id, [role])
        if self.session is not None:
            profile = await self._ensure_profile(user_id)
            assignments = (
                await self.session.scalars(
                    select(UserAreaAssignment).where(
                        UserAreaAssignment.profile_id == profile.id,
                        UserAreaAssignment.valid_to.is_(None),
                    )
                )
            ).all()
            for assignment in assignments:
                assignment.role = role
            await self.session.commit()

    async def set_village(self, user_id: str, village_id: str | None) -> None:
        area: GeoLocation | None = None
        if self.session is not None and village_id:
            candidates = {village_id, f"village-{village_id}", f"commune-{village_id}"}
            area = await self.session.scalar(
                select(GeoLocation).where(GeoLocation.code.in_(candidates))
            )
            if area is None:
                raise AppError(404, "Area not found", "area_not_found")
        await self.client.set_user_attribute(user_id, "village_id", village_id or None)
        if self.session is None:
            return
        profile = await self._ensure_profile(user_id)
        now = utc_now()
        active = (
            await self.session.scalars(
                select(UserAreaAssignment).where(
                    UserAreaAssignment.profile_id == profile.id,
                    UserAreaAssignment.valid_to.is_(None),
                )
            )
        ).all()
        for assignment in active:
            assignment.valid_to = now
        if area is not None:
            roles = await self.client.get_realm_roles(user_id)
            role = next((item for item in _ROLE_PRIORITY if item in roles), "resident")
            self.session.add(
                UserAreaAssignment(
                    profile_id=profile.id,
                    role=role,
                    geo_location_id=area.id,
                    valid_from=now,
                    created_at=now,
                )
            )
        await self.session.commit()

    async def _ensure_profile(self, user_id: str) -> UserProfile:
        assert self.session is not None
        profile = await self.session.scalar(
            select(UserProfile).where(UserProfile.keycloak_subject == user_id)
        )
        if profile is not None:
            return profile
        now = utc_now()
        profile = UserProfile(
            keycloak_subject=user_id,
            display_name=user_id,
            preferred_locale="vi",
            status="pending_sync",
            synced_at=now,
            created_at=now,
            updated_at=now,
        )
        self.session.add(profile)
        await self.session.flush()
        return profile

    @staticmethod
    def _to_response(user: dict[str, Any], roles: list[str]) -> AdminUserResponse:
        domain_role = next((r for r in _ROLE_PRIORITY if r in roles), None)
        attributes = user.get("attributes") or {}
        village = attributes.get("village_id")
        village_id = village[0] if isinstance(village, list) and village else None
        name = " ".join(
            part for part in (user.get("firstName"), user.get("lastName")) if part
        ).strip()
        return AdminUserResponse(
            id=user["id"],
            username=user.get("username"),
            email=user.get("email"),
            display_name=name or user.get("username") or user["id"],
            enabled=bool(user.get("enabled", True)),
            domain_role=domain_role,  # type: ignore[arg-type]
            village_id=village_id,
        )
