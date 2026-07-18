from collections.abc import AsyncIterator
from typing import Any

import pytest
from api.deps import get_admin_user_service, get_current_user, get_keycloak_admin_client
from auth.keycloak import CurrentUser
from core.config import get_settings
from httpx import ASGITransport, AsyncClient
from main import create_app
from services.admin_user_service import AdminUserService


class FakeKeycloakAdminClient:
    """In-memory stand-in for the Keycloak Admin API used by AdminUserService."""

    def __init__(self) -> None:
        self.users: list[dict[str, Any]] = [
            {
                "id": "u-admin",
                "username": "admin@wb.local",
                "email": "admin@wb.local",
                "firstName": "Admin",
                "lastName": "Demo",
                "enabled": True,
                "attributes": {},
            },
            {
                "id": "u-head",
                "username": "head@wb.local",
                "email": "head@wb.local",
                "firstName": "Truong",
                "lastName": "Ban",
                "enabled": True,
                "attributes": {"village_id": ["muong-pon-1"]},
            },
        ]
        self.roles: dict[str, set[str]] = {
            "u-admin": {"user", "admin"},
            "u-head": {"user", "village_head"},
        }

    async def list_users(self, limit: int = 100) -> list[dict[str, Any]]:
        return self.users

    async def get_realm_roles(self, user_id: str) -> list[str]:
        return sorted(self.roles.get(user_id, set()))

    async def add_realm_roles(self, user_id: str, names: list[str]) -> None:
        self.roles.setdefault(user_id, set()).update(names)

    async def remove_realm_roles(self, user_id: str, names: list[str]) -> None:
        self.roles.setdefault(user_id, set()).difference_update(names)

    async def set_user_attribute(self, user_id: str, key: str, value: str | None) -> None:
        user = next(u for u in self.users if u["id"] == user_id)
        attributes = dict(user.get("attributes") or {})
        if value is None:
            attributes.pop(key, None)
        else:
            attributes[key] = [value]
        user["attributes"] = attributes


def _user(role: str) -> CurrentUser:
    return CurrentUser(
        id="caller",
        email="caller@wb.local",
        display_name="Caller",
        username="caller",
        email_verified=True,
        roles=frozenset({role}),
        claims={"sub": "caller"},
    )


async def _client(role: str, fake: FakeKeycloakAdminClient) -> AsyncIterator[AsyncClient]:
    app = create_app(get_settings())
    app.dependency_overrides[get_current_user] = lambda: _user(role)
    app.dependency_overrides[get_keycloak_admin_client] = lambda: fake
    app.dependency_overrides[get_admin_user_service] = lambda: AdminUserService(fake)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver"
    ) as http_client:
        yield http_client
    app.dependency_overrides.clear()


@pytest.fixture
def fake() -> FakeKeycloakAdminClient:
    return FakeKeycloakAdminClient()


@pytest.fixture
async def admin_users_client(fake: FakeKeycloakAdminClient) -> AsyncIterator[AsyncClient]:
    async for http_client in _client("admin", fake):
        yield http_client


async def test_list_users_forbidden_for_non_admin(fake: FakeKeycloakAdminClient) -> None:
    async for http_client in _client("resident", fake):
        response = await http_client.get("/api/v1/admin/users")
        assert response.status_code == 403


async def test_list_users_maps_role_and_village(admin_users_client: AsyncClient) -> None:
    response = await admin_users_client.get("/api/v1/admin/users")
    assert response.status_code == 200
    by_id = {u["id"]: u for u in response.json()}
    assert by_id["u-admin"]["domain_role"] == "admin"
    assert by_id["u-admin"]["village_id"] is None
    assert by_id["u-head"]["domain_role"] == "village_head"
    assert by_id["u-head"]["village_id"] == "muong-pon-1"
    assert by_id["u-head"]["display_name"] == "Truong Ban"


async def test_set_role_replaces_domain_role_and_keeps_base(
    admin_users_client: AsyncClient, fake: FakeKeycloakAdminClient
) -> None:
    response = await admin_users_client.put(
        "/api/v1/admin/users/u-head/role", json={"role": "commune_officer"}
    )
    assert response.status_code == 204
    assert fake.roles["u-head"] == {"user", "commune_officer"}


async def test_set_role_rejects_unknown_role(admin_users_client: AsyncClient) -> None:
    response = await admin_users_client.put(
        "/api/v1/admin/users/u-head/role", json={"role": "superuser"}
    )
    assert response.status_code == 422


async def test_set_village_updates_attribute(
    admin_users_client: AsyncClient, fake: FakeKeycloakAdminClient
) -> None:
    response = await admin_users_client.put(
        "/api/v1/admin/users/u-admin/village", json={"village_id": "muong-pon-2"}
    )
    assert response.status_code == 204
    admin_user = next(u for u in fake.users if u["id"] == "u-admin")
    assert admin_user["attributes"]["village_id"] == ["muong-pon-2"]


async def test_clear_village_removes_attribute(
    admin_users_client: AsyncClient, fake: FakeKeycloakAdminClient
) -> None:
    response = await admin_users_client.put(
        "/api/v1/admin/users/u-head/village", json={"village_id": None}
    )
    assert response.status_code == 204
    head = next(u for u in fake.users if u["id"] == "u-head")
    assert "village_id" not in head["attributes"]
