import pytest
from httpx import AsyncClient

from api.v1.endpoints.notifications import get_web_push_service


@pytest.fixture(autouse=True)
def reset_web_push_service() -> None:
    get_web_push_service.cache_clear()


@pytest.mark.asyncio
async def test_web_push_config_returns_public_key(client: AsyncClient) -> None:
    response = await client.get("/api/v1/notifications/web-push/config")

    assert response.status_code == 200
    assert response.json()["public_key"]


@pytest.mark.asyncio
async def test_test_notification_without_subscription_is_noop(client: AsyncClient) -> None:
    response = await client.post("/api/v1/notifications/web-push/test", json={})

    assert response.status_code == 200
    assert response.json() == {"attempted": 0, "sent": 0}


@pytest.mark.asyncio
async def test_web_push_subscription_is_stored(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/notifications/web-push/subscriptions",
        json={
            "endpoint": "https://push.example.test/subscription-id",
            "keys": {
                "p256dh": "test-public-key",
                "auth": "test-auth-secret",
            },
        },
    )

    assert response.status_code == 200
    assert response.json()["subscription_count"] >= 1
