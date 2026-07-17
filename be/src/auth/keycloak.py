import asyncio
import time
from dataclasses import dataclass
from typing import Any

import httpx
import jwt
from jwt.algorithms import RSAAlgorithm

from core.config import Settings
from core.errors import AppError


@dataclass(frozen=True)
class CurrentUser:
    id: str
    email: str | None
    display_name: str
    username: str | None
    email_verified: bool
    roles: frozenset[str]
    claims: dict[str, Any]


class KeycloakVerifier:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._metadata: dict[str, Any] | None = None
        self._jwks: dict[str, Any] | None = None
        self._jwks_expires_at = 0.0
        self._lock = asyncio.Lock()

    async def verify(self, token: str) -> CurrentUser:
        await self._get_metadata()
        header = self._get_header(token)
        jwks_url = (
            f"{self.settings.resolved_keycloak_discovery_base}/realms/"
            f"{self.settings.keycloak_realm}/protocol/openid-connect/certs"
        )
        key = await self._get_signing_key(jwks_url, str(header.get("kid", "")))
        audience = self.settings.keycloak_audience or None
        try:
            claims = jwt.decode(
                token,
                key,
                algorithms=["RS256"],
                issuer=self.settings.resolved_keycloak_issuer,
                audience=audience,
                options={"verify_aud": audience is not None},
            )
        except jwt.PyJWTError as exc:
            raise AppError(401, "Authentication is invalid", "authentication_invalid") from exc

        if claims.get("azp") not in {None, self.settings.keycloak_client_id}:
            raise AppError(401, "Authentication is for another client", "client_mismatch")
        user_id = claims.get("sub")
        if not user_id:
            raise AppError(401, "Authentication has no subject", "subject_missing")
        return self._to_user(claims)

    async def _get_metadata(self) -> dict[str, Any]:
        if self._metadata:
            return self._metadata
        async with self._lock:
            if self._metadata:
                return self._metadata
            url = (
                f"{self.settings.resolved_keycloak_discovery_base}/realms/"
                f"{self.settings.keycloak_realm}/.well-known/openid-configuration"
            )
            self._metadata = await self._fetch_json(url)
            return self._metadata

    async def _get_signing_key(self, jwks_url: str, kid: str) -> Any:
        if time.monotonic() >= self._jwks_expires_at or not self._jwks:
            async with self._lock:
                if time.monotonic() >= self._jwks_expires_at or not self._jwks:
                    self._jwks = await self._fetch_json(jwks_url)
                    self._jwks_expires_at = (
                        time.monotonic() + self.settings.keycloak_jwks_cache_seconds
                    )
        for item in self._jwks.get("keys", []):
            if item.get("kid") == kid:
                return RSAAlgorithm.from_jwk(item)
        self._jwks = None
        raise AppError(401, "Authentication signing key is unknown", "signing_key_unknown")

    @staticmethod
    def _get_header(token: str) -> dict[str, Any]:
        try:
            header = jwt.get_unverified_header(token)
        except jwt.PyJWTError as exc:
            raise AppError(401, "Authentication is invalid", "authentication_invalid") from exc
        if header.get("alg") != "RS256":
            raise AppError(401, "Authentication algorithm is not allowed", "algorithm_not_allowed")
        return header

    async def _fetch_json(self, url: str) -> dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.get(url)
                response.raise_for_status()
                return response.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise AppError(
                503, "Identity provider is unavailable", "identity_provider_unavailable"
            ) from exc

    def _to_user(self, claims: dict[str, Any]) -> CurrentUser:
        realm_roles = claims.get("realm_access", {}).get("roles", [])
        client_roles = (
            claims.get("resource_access", {})
            .get(self.settings.keycloak_client_id, {})
            .get("roles", [])
        )
        roles = frozenset(str(role) for role in [*realm_roles, *client_roles])
        email = claims.get("email")
        username = claims.get("preferred_username")
        display_name = claims.get("name") or username or email or str(claims["sub"])
        return CurrentUser(
            id=str(claims["sub"]),
            email=str(email) if email else None,
            display_name=str(display_name),
            username=str(username) if username else None,
            email_verified=bool(claims.get("email_verified", False)),
            roles=roles,
            claims=claims,
        )
