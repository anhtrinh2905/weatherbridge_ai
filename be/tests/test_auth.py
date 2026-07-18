import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_identity_config_is_public(client: AsyncClient) -> None:
    response = await client.get("/api/v1/auth/config")
    assert response.status_code == 200
    assert response.json()["realm"] == "weather-bridge"
    assert response.json()["client_id"] == "weather-bridge-fe"


@pytest.mark.asyncio
async def test_current_user_comes_from_identity_dependency(client: AsyncClient) -> None:
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 200
    assert response.json()["id"] == "test-user"
    assert response.json()["email_verified"] is True
    assert response.json()["effective_role"] == "admin"
    assert response.json()["village_id"] is None


@pytest.mark.asyncio
async def test_openapi_exposes_bearer_authentication(client: AsyncClient) -> None:
    response = await client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert schema["components"]["securitySchemes"]["KeycloakBearer"] == {
        "type": "http",
        "description": "Keycloak access token using the Bearer scheme",
        "scheme": "bearer",
    }
    assert schema["paths"]["/api/v1/auth/me"]["get"]["security"] == [
        {"KeycloakBearer": []}
    ]
    assert "security" not in schema["paths"]["/api/v1/auth/config"]["get"]
