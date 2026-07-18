import asyncio
import time
from typing import Any

import httpx

from core.config import Settings
from core.errors import AppError

_TIMEOUT = httpx.Timeout(10.0)
_TOKEN_EXPIRY_MARGIN = 30.0


class KeycloakAdminClient:
    """Thin async wrapper over the Keycloak Admin REST API.

    Authenticates as a confidential service-account client (client_credentials)
    and exposes only the primitives the admin user page needs. Higher-level rules
    (e.g. "exactly one domain role") live in the service, not here.
    """

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._token: str | None = None
        self._token_expires_at = 0.0
        self._lock = asyncio.Lock()

    @property
    def _base(self) -> str:
        return self.settings.resolved_keycloak_discovery_base

    @property
    def _realm(self) -> str:
        return self.settings.keycloak_realm

    @property
    def _admin_base(self) -> str:
        return f"{self._base}/admin/realms/{self._realm}"

    async def _get_token(self) -> str:
        if self._token and time.time() < self._token_expires_at:
            return self._token
        async with self._lock:
            if self._token and time.time() < self._token_expires_at:
                return self._token
            url = f"{self._base}/realms/{self._realm}/protocol/openid-connect/token"
            async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
                response = await client.post(
                    url,
                    data={
                        "grant_type": "client_credentials",
                        "client_id": self.settings.keycloak_admin_client_id,
                        "client_secret": self.settings.keycloak_admin_client_secret,
                    },
                )
            if response.status_code != 200:
                raise AppError(
                    502, "Unable to authenticate to Keycloak admin API", "keycloak_admin_auth_error"
                )
            payload = response.json()
            self._token = str(payload["access_token"])
            expires_in = float(payload["expires_in"])
            self._token_expires_at = time.time() + expires_in - _TOKEN_EXPIRY_MARGIN
            return self._token

    async def _request(self, method: str, path: str, **kwargs: Any) -> httpx.Response:
        token = await self._get_token()
        headers = {"Authorization": f"Bearer {token}"}
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            response = await client.request(
                method, f"{self._admin_base}{path}", headers=headers, **kwargs
            )
        if response.status_code == 404:
            raise AppError(404, "User not found", "user_not_found")
        if response.status_code >= 400:
            raise AppError(502, "Keycloak admin request failed", "keycloak_admin_error")
        return response

    async def list_users(self, limit: int = 100) -> list[dict[str, Any]]:
        response = await self._request(
            "GET", "/users", params={"max": limit, "briefRepresentation": "false"}
        )
        return list(response.json())

    async def get_realm_roles(self, user_id: str) -> list[str]:
        response = await self._request("GET", f"/users/{user_id}/role-mappings/realm")
        return [role["name"] for role in response.json()]

    async def _resolve_roles(self, names: list[str]) -> list[dict[str, Any]]:
        roles: list[dict[str, Any]] = []
        for name in names:
            response = await self._request("GET", f"/roles/{name}")
            role = response.json()
            roles.append({"id": role["id"], "name": role["name"]})
        return roles

    async def add_realm_roles(self, user_id: str, names: list[str]) -> None:
        if not names:
            return
        roles = await self._resolve_roles(names)
        await self._request("POST", f"/users/{user_id}/role-mappings/realm", json=roles)

    async def remove_realm_roles(self, user_id: str, names: list[str]) -> None:
        if not names:
            return
        roles = await self._resolve_roles(names)
        await self._request(
            "DELETE", f"/users/{user_id}/role-mappings/realm", json=roles
        )

    async def set_user_attribute(self, user_id: str, key: str, value: str | None) -> None:
        # PUT the full representation, not just {"attributes": ...}: Keycloak's user
        # profile re-validates on update and rejects a body that omits required fields
        # (e.g. email) — so merge the attribute into the fetched user and send it whole.
        response = await self._request("GET", f"/users/{user_id}")
        user = response.json()
        attributes = dict(user.get("attributes") or {})
        if value is None:
            attributes.pop(key, None)
        else:
            attributes[key] = [value]
        user["attributes"] = attributes
        await self._request("PUT", f"/users/{user_id}", json=user)
