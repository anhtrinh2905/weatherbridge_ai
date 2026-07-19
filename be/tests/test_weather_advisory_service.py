from __future__ import annotations

import json

import httpx
import pytest

from ai.advisory.models import WeatherActionRequest
from ai.advisory.openai_service import OpenAIAdvisoryService
from ai.forecast.service import OpenMeteoService
from core.config import Settings
from services.weather_advisory_service import WeatherAdvisoryService

_FORECAST_JSON = {
    "current": {
        "temperature_2m": 24.1,
        "precipitation": 3.2,
        "weather_code": 63,
        "wind_speed_10m": 12.0,
    },
    "daily": {
        "time": ["2026-07-19", "2026-07-20"],
        "weather_code": [65, 3],
        "temperature_2m_max": [27.0, 29.0],
        "temperature_2m_min": [21.0, 22.0],
        "precipitation_sum": [48.0, 5.0],
        "precipitation_probability_max": [90, 40],
        "wind_speed_10m_max": [20.0, 14.0],
    },
}

_ACTION_JSON = {
    "weather_summary": "Mưa to hôm nay, giảm dần ngày mai.",
    "risk_note": "Nguy cơ lũ quét và sạt lở do mưa lớn.",
    "summary": "Chuẩn bị sẵn sàng di dời.",
    "steps": ["Theo dõi mực nước suối.", "Chuẩn bị túi đồ khẩn cấp."],
}


def _routing_handler(request: httpx.Request) -> httpx.Response:
    if request.url.host == "api.openai.com":
        user = json.loads(request.content)["messages"][1]["content"]
        # The formatted forecast context must reach the model.
        assert "mưa to" in user  # WMO code 65 label
        assert "48.0mm" in user
        return httpx.Response(
            200, json={"choices": [{"message": {"content": json.dumps(_ACTION_JSON)}}]}
        )
    # Any other host is the Open-Meteo forecast call.
    assert "latitude=21.6" in str(request.url) or request.url.params.get("latitude")
    return httpx.Response(200, json=_FORECAST_JSON)


@pytest.mark.asyncio
async def test_recommend_fetches_forecast_and_returns_plan() -> None:
    settings = Settings(openai_api_key="sk-test", openai_model="gpt-4o-mini")
    client = httpx.AsyncClient(transport=httpx.MockTransport(_routing_handler))
    try:
        service = WeatherAdvisoryService(
            OpenMeteoService(settings, client=client),
            OpenAIAdvisoryService(settings, client=client),
        )
        plan = await service.recommend(
            WeatherActionRequest(latitude=21.6, longitude=103.02, location_label="Mường Pồn 1")
        )
    finally:
        await client.aclose()

    assert plan.risk_level == "warning"  # precip 48mm / code 65
    assert plan.weather_summary == "Mưa to hôm nay, giảm dần ngày mai."
    assert plan.risk_note.startswith("Nguy cơ lũ quét")
    assert plan.steps == ["Theo dõi mực nước suối.", "Chuẩn bị túi đồ khẩn cấp."]
    assert plan.forecast_source == "open-meteo"
    assert plan.model_name == "gpt-4o-mini"


_CALM_FORECAST_JSON = {
    "current": {"temperature_2m": 25.0, "precipitation": 0.0, "weather_code": 1},
    "daily": {
        "time": ["2026-07-19", "2026-07-20", "2026-07-21"],
        "weather_code": [1, 2, 0],
        "temperature_2m_max": [30.0, 31.0, 29.0],
        "temperature_2m_min": [22.0, 23.0, 21.0],
        "precipitation_sum": [0.0, 1.2, 0.0],
        "precipitation_probability_max": [10, 20, 5],
        "wind_speed_10m_max": [10.0, 12.0, 9.0],
    },
}


@pytest.mark.asyncio
async def test_recommend_returns_calm_plan_without_llm_when_weather_normal() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.host == "api.openai.com":
            raise AssertionError("LLM must not be called for normal weather")
        return httpx.Response(200, json=_CALM_FORECAST_JSON)

    settings = Settings(openai_api_key="sk-test")
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    try:
        service = WeatherAdvisoryService(
            OpenMeteoService(settings, client=client),
            OpenAIAdvisoryService(settings, client=client),
        )
        plan = await service.recommend(
            WeatherActionRequest(latitude=21.6, longitude=103.02)
        )
    finally:
        await client.aclose()

    assert plan.risk_level == "normal"
    assert plan.steps == []
    assert plan.model_name == "rule-based"
    assert "bình thường" in plan.risk_note


def test_format_context_labels_weather_codes() -> None:
    context = WeatherAdvisoryService._format_context(_FORECAST_JSON)
    assert "Hiện tại:" in context
    assert "mưa vừa" in context  # current weather_code 63
    assert "2026-07-19" in context
    assert "khả năng mưa 90%" in context
