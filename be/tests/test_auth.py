import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_identity_config_is_public(client: AsyncClient) -> None:
    response = await client.get("/api/v1/auth/config")
    assert response.status_code == 200
    assert response.json()["realm"] == "vai-code"
    assert response.json()["client_id"] == "vai-code-fe"


@pytest.mark.asyncio
async def test_current_user_comes_from_identity_dependency(client: AsyncClient) -> None:
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 200
    assert response.json()["id"] == "test-user"
    assert response.json()["email_verified"] is True
