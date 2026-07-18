import httpx
import pytest
from httpx import ASGITransport, AsyncClient

from api.deps import get_current_user
from auth.keycloak import CurrentUser
from core.config import get_settings
from main import create_app
from modules.geocode import service as geocode_service
from modules.geocode.schemas import ReverseGeocodeRequest
from modules.geocode.service import GeocodeService


@pytest.fixture(autouse=True)
def clear_geocode_cache() -> None:
    geocode_service._CACHE.clear()


async def test_reverse_geocode_returns_display_name() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert "nominatim" in str(request.url)
        assert request.headers.get("User-Agent")
        return httpx.Response(
            200,
            json={"display_name": "Mường Pồn, Điện Biên, Việt Nam"},
        )

    settings = get_settings()
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http_client:
        result = await GeocodeService(settings, client=http_client).reverse(
            ReverseGeocodeRequest(latitude=21.59, longitude=103.03)
        )
    assert result.displayName.startswith("Mường Pồn")
    assert result.source == "nominatim"


async def test_reverse_geocode_endpoint(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_reverse(self, request: ReverseGeocodeRequest):  # noqa: ANN001
        from modules.geocode.schemas import ReverseGeocodeResponse

        return ReverseGeocodeResponse(
            displayName="Test Address",
            latitude=request.latitude,
            longitude=request.longitude,
        )

    monkeypatch.setattr(GeocodeService, "reverse", fake_reverse)

    app = create_app(get_settings())
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id="u1",
        email="u@example.com",
        display_name="U",
        username="u",
        email_verified=True,
        roles=frozenset({"commune_officer"}),
        claims={"sub": "u1"},
    )
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/geocode/reverse",
            json={"latitude": 21.59, "longitude": 103.03},
        )
    assert response.status_code == 200
    assert response.json()["displayName"] == "Test Address"
