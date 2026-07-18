import json
import time
from typing import Any

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import FastAPI
from httpx import AsyncClient
from jwt.algorithms import RSAAlgorithm

from api.deps import get_current_user, get_keycloak_verifier
from auth.authorization import AppRole, primary_role
from auth.keycloak import KeycloakVerifier
from core.config import Settings
from core.errors import AppError

ISSUER = "http://keycloak.test/realms/weather-bridge"
CLIENT_ID = "weather-bridge-fe"


@pytest.fixture
def signing_key() -> tuple[rsa.RSAPrivateKey, dict[str, Any]]:
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    jwk = json.loads(RSAAlgorithm.to_jwk(private_key.public_key()))
    jwk.update({"kid": "test-key", "alg": "RS256", "use": "sig"})
    return private_key, jwk


def make_claims(**overrides: Any) -> dict[str, Any]:
    claims: dict[str, Any] = {
        "iss": ISSUER,
        "sub": "kc-user",
        "azp": CLIENT_ID,
        "exp": int(time.time()) + 300,
        "preferred_username": "person",
        "email": "person@example.com",
        "email_verified": True,
        "realm_access": {"roles": ["user", AppRole.COMMUNE_OFFICER.value]},
    }
    claims.update(overrides)
    return claims


def sign_token(
    private_key: rsa.RSAPrivateKey,
    claims: dict[str, Any],
    *,
    kid: str = "test-key",
) -> str:
    return jwt.encode(claims, private_key, algorithm="RS256", headers={"kid": kid})


def make_verifier(jwk: dict[str, Any], *, audience: str | None = None) -> KeycloakVerifier:
    verifier = KeycloakVerifier(
        Settings(
            keycloak_url="http://keycloak.test",
            keycloak_issuer=ISSUER,
            keycloak_client_id=CLIENT_ID,
            keycloak_audience=audience,
        )
    )

    async def fetch_json(url: str) -> dict[str, Any]:
        if url.endswith("openid-configuration"):
            return {"issuer": ISSUER}
        return {"keys": [jwk]}

    verifier._fetch_json = fetch_json  # type: ignore[method-assign]
    return verifier


@pytest.mark.asyncio
async def test_signed_token_maps_normalized_identity_and_role_priority(
    signing_key: tuple[rsa.RSAPrivateKey, dict[str, Any]],
) -> None:
    private_key, jwk = signing_key
    claims = make_claims(
        realm_access={"roles": [AppRole.RESIDENT.value, AppRole.ADMIN.value]},
        village_id="  MUONG-PON-1  ",
    )

    user = await make_verifier(jwk).verify(sign_token(private_key, claims))

    assert user.id == "kc-user"
    assert user.roles == frozenset({AppRole.ADMIN, AppRole.RESIDENT})
    assert user.effective_role is AppRole.ADMIN
    assert user.village_id == "muong-pon-1"
    assert primary_role(AppRole) is AppRole.ADMIN


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("claim", "value"),
    [
        ("iss", "http://wrong-issuer.test/realms/weather-bridge"),
        ("exp", int(time.time()) - 1),
        ("sub", ""),
        ("azp", "another-client"),
    ],
)
async def test_invalid_required_claim_is_rejected(
    signing_key: tuple[rsa.RSAPrivateKey, dict[str, Any]], claim: str, value: object
) -> None:
    private_key, jwk = signing_key
    token = sign_token(private_key, make_claims(**{claim: value}))

    with pytest.raises(AppError) as raised:
        await make_verifier(jwk).verify(token)

    assert raised.value.status_code == 401


@pytest.mark.asyncio
@pytest.mark.parametrize("missing_claim", ["exp", "iss", "sub", "azp"])
async def test_missing_required_claim_is_rejected(
    signing_key: tuple[rsa.RSAPrivateKey, dict[str, Any]], missing_claim: str
) -> None:
    private_key, jwk = signing_key
    claims = make_claims()
    claims.pop(missing_claim)

    with pytest.raises(AppError) as raised:
        await make_verifier(jwk).verify(sign_token(private_key, claims))

    assert raised.value.status_code == 401


@pytest.mark.asyncio
async def test_wrong_signature_and_algorithm_are_rejected(
    signing_key: tuple[rsa.RSAPrivateKey, dict[str, Any]],
) -> None:
    _, jwk = signing_key
    other_private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    wrong_signature = sign_token(other_private_key, make_claims())
    hs256 = jwt.encode(
        make_claims(),
        "not-a-real-key-that-is-at-least-32-bytes",
        algorithm="HS256",
        headers={"kid": "test-key"},
    )

    for token in (wrong_signature, hs256):
        with pytest.raises(AppError) as raised:
            await make_verifier(jwk).verify(token)
        assert raised.value.status_code == 401


@pytest.mark.asyncio
async def test_audience_is_only_enforced_when_configured(
    signing_key: tuple[rsa.RSAPrivateKey, dict[str, Any]],
) -> None:
    private_key, jwk = signing_key
    token_without_audience = sign_token(private_key, make_claims())
    await make_verifier(jwk).verify(token_without_audience)

    with pytest.raises(AppError) as missing_audience:
        await make_verifier(jwk, audience="weather-bridge-api").verify(token_without_audience)
    assert missing_audience.value.status_code == 401

    valid_token = sign_token(private_key, make_claims(aud="weather-bridge-api"))
    await make_verifier(jwk, audience="weather-bridge-api").verify(valid_token)

    wrong_token = sign_token(private_key, make_claims(aud="another-api"))
    with pytest.raises(AppError) as wrong_audience:
        await make_verifier(jwk, audience="weather-bridge-api").verify(wrong_token)
    assert wrong_audience.value.status_code == 401


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "claims",
    [
        make_claims(realm_access={"roles": ["user"]}),
        make_claims(realm_access={"roles": AppRole.ADMIN.value}),
        make_claims(realm_access={"roles": [AppRole.VILLAGE_HEAD.value]}),
        make_claims(realm_access={"roles": [AppRole.RESIDENT.value]}),
        make_claims(
            realm_access={"roles": [AppRole.VILLAGE_HEAD.value]}, village_id="not_a_slug"
        ),
    ],
)
async def test_role_and_village_claims_fail_closed(
    signing_key: tuple[rsa.RSAPrivateKey, dict[str, Any]], claims: dict[str, Any]
) -> None:
    private_key, jwk = signing_key

    with pytest.raises(AppError) as raised:
        await make_verifier(jwk).verify(sign_token(private_key, claims))

    assert raised.value.status_code == 401


@pytest.mark.asyncio
async def test_cached_jwks_refreshes_once_for_a_rotated_key(
    signing_key: tuple[rsa.RSAPrivateKey, dict[str, Any]],
) -> None:
    private_key, new_jwk = signing_key
    verifier = make_verifier(new_jwk)
    verifier._jwks = {"keys": [{"kid": "old-key", "kty": "RSA", "alg": "RS256"}]}
    verifier._jwks_expires_at = time.monotonic() + 300

    user = await verifier.verify(sign_token(private_key, make_claims()))

    assert user.id == "kc-user"


@pytest.mark.asyncio
async def test_signed_bearer_token_authenticates_http_request(
    app: FastAPI,
    client: AsyncClient,
    signing_key: tuple[rsa.RSAPrivateKey, dict[str, Any]],
) -> None:
    private_key, jwk = signing_key
    app.dependency_overrides.pop(get_current_user)
    app.dependency_overrides[get_keycloak_verifier] = lambda: make_verifier(jwk)

    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {sign_token(private_key, make_claims())}"},
    )

    assert response.status_code == 200
    assert response.json()["effective_role"] == AppRole.COMMUNE_OFFICER.value
