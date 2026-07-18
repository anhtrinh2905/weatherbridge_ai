import asyncio
import time
from dataclasses import dataclass
from typing import Any

import httpx
import jwt
from jwt.algorithms import RSAAlgorithm

from auth.authorization import AppRole, normalize_village_id, primary_role, resolve_roles
from core.config import Settings
from core.errors import AppError


@dataclass(frozen=True)
class CurrentUser:
    id: str
    email: str | None
    display_name: str
    username: str | None
    email_verified: bool
    roles: frozenset[AppRole]
    effective_role: AppRole
    village_id: str | None
    claims: dict[str, Any]


class KeycloakVerifier:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._metadata: dict[str, Any] | None = None
        self._jwks: dict[str, Any] | None = None
        self._jwks_expires_at = 0.0
        self._lock = asyncio.Lock()

    async def verify(self, token: str) -> CurrentUser:
        metadata = await self._get_metadata()
        if metadata.get("issuer") != self.settings.resolved_keycloak_issuer:
            raise AppError(
                503,
                "Identity provider configuration is invalid",
                "identity_provider_invalid",
            )
        header = self._get_header(token)
        jwks_url = (
            f"{self.settings.resolved_keycloak_discovery_base}/realms/"
            f"{self.settings.keycloak_realm}/protocol/openid-connect/certs"
        )
        kid = header.get("kid")
        if not isinstance(kid, str) or not kid:
            raise AppError(401, "Authentication signing key is unknown", "signing_key_unknown")
        key = await self._get_signing_key(jwks_url, kid)
        audience = self.settings.keycloak_audience or None
        required_claims = ["exp", "iss", "sub", "azp"]
        if audience is not None:
            required_claims.append("aud")
        try:
            claims = jwt.decode(
                token,
                key,
                algorithms=["RS256"],
                issuer=self.settings.resolved_keycloak_issuer,
                audience=audience,
                options={"verify_aud": audience is not None, "require": required_claims},
            )
        except jwt.PyJWTError as exc:
            raise AppError(401, "Authentication is invalid", "authentication_invalid") from exc

        if claims.get("azp") != self.settings.keycloak_client_id:
            raise AppError(401, "Authentication is for another client", "client_mismatch")
        user_id = claims.get("sub")
        if not isinstance(user_id, str) or not user_id.strip():
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
        cache_was_current = self._jwks is not None and time.monotonic() < self._jwks_expires_at
        jwks = await self._get_jwks(jwks_url)
        key = self._find_signing_key(jwks, kid)
        if key is not None:
            return key

        # A previously cached set may be stale after Keycloak rotates keys. Refresh
        # exactly once before rejecting the token; never fall back to an old key.
        if cache_was_current:
            jwks = await self._get_jwks(jwks_url, force_refresh=True)
            key = self._find_signing_key(jwks, kid)
            if key is not None:
                return key
        raise AppError(401, "Authentication signing key is unknown", "signing_key_unknown")

    async def _get_jwks(self, jwks_url: str, *, force_refresh: bool = False) -> dict[str, Any]:
        if (
            not force_refresh
            and self._jwks is not None
            and time.monotonic() < self._jwks_expires_at
        ):
            return self._jwks
        async with self._lock:
            if (
                not force_refresh
                and self._jwks is not None
                and time.monotonic() < self._jwks_expires_at
            ):
                return self._jwks
            jwks = await self._fetch_json(jwks_url)
            if not isinstance(jwks.get("keys"), list):
                raise AppError(
                    503,
                    "Identity provider returned invalid signing keys",
                    "identity_provider_invalid",
                )
            self._jwks = jwks
            self._jwks_expires_at = time.monotonic() + self.settings.keycloak_jwks_cache_seconds
            return jwks

    @staticmethod
    def _find_signing_key(jwks: dict[str, Any], kid: str) -> Any | None:
        for item in jwks.get("keys", []):
            if not isinstance(item, dict) or item.get("kid") != kid:
                continue
            if item.get("kty") != "RSA" or item.get("alg") != "RS256":
                continue
            if item.get("use") not in {None, "sig"}:
                continue
            try:
                return RSAAlgorithm.from_jwk(item)
            except (ValueError, TypeError):
                return None
        return None

    @staticmethod
    def _get_header(token: str) -> dict[str, Any]:
        try:
            header = jwt.get_unverified_header(token)
        except jwt.PyJWTError as exc:
            raise AppError(401, "Authentication is invalid", "authentication_invalid") from exc
        if not isinstance(header, dict) or header.get("alg") != "RS256":
            raise AppError(401, "Authentication algorithm is not allowed", "algorithm_not_allowed")
        return header

    async def _fetch_json(self, url: str) -> dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.get(url)
                response.raise_for_status()
                payload = response.json()
                if not isinstance(payload, dict):
                    raise ValueError("Identity provider response must be an object")
                return payload
        except (httpx.HTTPError, ValueError) as exc:
            raise AppError(
                503, "Identity provider is unavailable", "identity_provider_unavailable"
            ) from exc

    def _to_user(self, claims: dict[str, Any]) -> CurrentUser:
        realm_access = claims.get("realm_access", {})
        resource_access = claims.get("resource_access", {})
        if not isinstance(realm_access, dict) or not isinstance(resource_access, dict):
            raise AppError(401, "Authentication claims are invalid", "authentication_invalid")
        client_access = resource_access.get(self.settings.keycloak_client_id, {})
        if not isinstance(client_access, dict):
            raise AppError(401, "Authentication claims are invalid", "authentication_invalid")
        realm_roles = realm_access.get("roles", [])
        client_roles = client_access.get("roles", [])
        if not self._is_string_list(realm_roles) or not self._is_string_list(client_roles):
            raise AppError(401, "Authentication claims are invalid", "authentication_invalid")
        roles = resolve_roles([*realm_roles, *client_roles])
        effective_role = primary_role(roles)
        if effective_role is None:
            raise AppError(401, "Authentication has no application role", "role_missing")

        village_id: str | None = None
        village_claim = claims.get("village_id")
        if village_claim is not None:
            try:
                village_id = normalize_village_id(village_claim)
            except ValueError as exc:
                raise AppError(
                    401,
                    "Authentication village scope is invalid",
                    "village_scope_invalid",
                ) from exc
        if effective_role in {AppRole.VILLAGE_HEAD, AppRole.RESIDENT} and village_id is None:
            raise AppError(
                401,
                "Authentication has no village scope",
                "village_scope_missing",
            )

        email = self._optional_string(claims, "email")
        username = self._optional_string(claims, "preferred_username")
        name = self._optional_string(claims, "name")
        email_verified = claims.get("email_verified", False)
        if not isinstance(email_verified, bool):
            raise AppError(401, "Authentication claims are invalid", "authentication_invalid")
        display_name = name or username or email or str(claims["sub"])
        return CurrentUser(
            id=str(claims["sub"]),
            email=str(email) if email else None,
            display_name=str(display_name),
            username=str(username) if username else None,
            email_verified=email_verified,
            roles=roles,
            effective_role=effective_role,
            village_id=village_id,
            claims=claims,
        )

    @staticmethod
    def _is_string_list(value: object) -> bool:
        return isinstance(value, list) and all(isinstance(item, str) for item in value)

    @staticmethod
    def _optional_string(claims: dict[str, Any], name: str) -> str | None:
        value = claims.get(name)
        if value is None:
            return None
        if not isinstance(value, str):
            raise AppError(401, "Authentication claims are invalid", "authentication_invalid")
        return value or None
