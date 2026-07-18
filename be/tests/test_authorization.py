from uuid import uuid4

import pytest
from fastapi import Depends, FastAPI
from httpx import AsyncClient

from api.deps import get_current_user, get_village_scoped_user
from auth.authorization import AppRole
from auth.keycloak import CurrentUser


def override_user(
    app: FastAPI,
    role: AppRole,
    *,
    user_id: str = "test-user",
    village_id: str | None = None,
) -> None:
    if role in {AppRole.VILLAGE_HEAD, AppRole.RESIDENT} and village_id is None:
        village_id = "muong-pon-1"

    async def current_user() -> CurrentUser:
        return CurrentUser(
            id=user_id,
            email=None,
            display_name=user_id,
            username=user_id,
            email_verified=False,
            roles=frozenset({role}),
            effective_role=role,
            village_id=village_id,
            claims={"sub": user_id},
        )

    app.dependency_overrides[get_current_user] = current_user


@pytest.mark.asyncio
@pytest.mark.parametrize("role", list(AppRole))
async def test_all_application_roles_can_read_identity_and_latest_forecast(
    app: FastAPI, client: AsyncClient, role: AppRole
) -> None:
    override_user(app, role)

    identity = await client.get("/api/v1/auth/me")
    forecast = await client.get("/api/v1/forecasts/muong-pon/latest")

    assert identity.status_code == 200
    assert identity.json()["effective_role"] == role.value
    assert forecast.status_code == 404
    assert forecast.json()["code"] == "forecast_not_found"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("role", "expected_status"),
    [
        (AppRole.ADMIN, 202),
        (AppRole.COMMUNE_OFFICER, 202),
        (AppRole.VILLAGE_HEAD, 403),
        (AppRole.RESIDENT, 403),
    ],
)
async def test_forecast_refresh_permission_matrix(
    app: FastAPI, client: AsyncClient, role: AppRole, expected_status: int
) -> None:
    override_user(app, role)

    response = await client.post("/api/v1/forecasts/muong-pon/refresh")

    assert response.status_code == expected_status
    if expected_status == 403:
        assert response.json()["code"] == "permission_denied"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("role", "expected_status"),
    [
        (AppRole.ADMIN, 202),
        (AppRole.COMMUNE_OFFICER, 202),
        (AppRole.VILLAGE_HEAD, 403),
        (AppRole.RESIDENT, 403),
    ],
)
async def test_ai_job_create_permission_matrix(
    app: FastAPI, client: AsyncClient, role: AppRole, expected_status: int
) -> None:
    override_user(app, role)

    response = await client.post(
        "/api/v1/ai/jobs", json={"task": "analyze", "text": "test request"}
    )

    assert response.status_code == expected_status
    if expected_status == 403:
        assert response.json()["code"] == "permission_denied"


@pytest.mark.asyncio
async def test_ai_job_read_is_owner_only(app: FastAPI, client: AsyncClient) -> None:
    override_user(app, AppRole.COMMUNE_OFFICER, user_id="owner")
    created = await client.post(
        "/api/v1/ai/jobs", json={"task": "analyze", "text": "owned request"}
    )
    assert created.status_code == 202

    override_user(app, AppRole.COMMUNE_OFFICER, user_id="another-officer")
    denied = await client.get(f"/api/v1/ai/jobs/{created.json()['id']}")

    assert denied.status_code == 404
    assert denied.json()["code"] == "job_not_found"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("role", "expected_status"),
    [
        (AppRole.ADMIN, 404),
        (AppRole.COMMUNE_OFFICER, 404),
        (AppRole.VILLAGE_HEAD, 403),
        (AppRole.RESIDENT, 403),
    ],
)
async def test_ai_job_read_permission_matrix(
    app: FastAPI, client: AsyncClient, role: AppRole, expected_status: int
) -> None:
    override_user(app, role)

    response = await client.get(f"/api/v1/ai/jobs/{uuid4()}")

    assert response.status_code == expected_status
    expected_code = "job_not_found" if expected_status == 404 else "permission_denied"
    assert response.json()["code"] == expected_code


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("method", "path", "body"),
    [
        ("GET", "/api/v1/auth/me", None),
        ("GET", "/api/v1/forecasts/muong-pon/latest", None),
        ("POST", "/api/v1/forecasts/muong-pon/refresh", None),
        ("POST", "/api/v1/ai/jobs", {"task": "analyze", "text": "request"}),
        ("GET", f"/api/v1/ai/jobs/{uuid4()}", None),
    ],
)
async def test_protected_endpoints_return_stable_401_envelope_without_bearer(
    app: FastAPI,
    client: AsyncClient,
    method: str,
    path: str,
    body: dict[str, str] | None,
) -> None:
    app.dependency_overrides.pop(get_current_user)

    response = await client.request(method, path, json=body)

    assert response.status_code == 401
    assert response.json() == {
        "detail": "Authentication is required",
        "code": "authentication_required",
    }


@pytest.mark.asyncio
async def test_village_scope_dependency_denies_cross_village_access(
    app: FastAPI, client: AsyncClient
) -> None:
    @app.get("/_test/villages/{village_id}")
    async def village_resource(
        village_id: str,
        _user: CurrentUser = Depends(get_village_scoped_user),
    ) -> dict[str, str]:
        return {"village_id": village_id}

    override_user(app, AppRole.VILLAGE_HEAD, village_id="muong-pon-1")

    own = await client.get("/_test/villages/MUONG-PON-1")
    cross_village = await client.get("/_test/villages/muong-pon-2")
    malformed = await client.get("/_test/villages/muong_pon_1")

    assert own.status_code == 200
    assert cross_village.status_code == 403
    assert cross_village.json()["code"] == "village_scope_forbidden"
    assert malformed.status_code == 422
    assert malformed.json()["code"] == "village_id_invalid"
