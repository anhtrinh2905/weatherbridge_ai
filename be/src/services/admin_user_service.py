from typing import Any, Protocol

from modules.admin.schemas import DOMAIN_ROLES, AdminUserResponse

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

    def __init__(self, client: KeycloakAdmin) -> None:
        self.client = client

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

    async def set_village(self, user_id: str, village_id: str | None) -> None:
        await self.client.set_user_attribute(user_id, "village_id", village_id or None)

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
