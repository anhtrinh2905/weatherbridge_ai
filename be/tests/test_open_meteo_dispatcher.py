from __future__ import annotations

from typing import Any

import pytest
from pydantic import ValidationError

from ai.forecast.exceptions import OpenMeteoPayloadError
from ai.forecast.models import (
    ElevationRequest,
    EnsembleRequest,
    FloodRequest,
    ForecastRequest,
    GeocodingRequest,
    HistoricalForecastRequest,
    HistoricalWeatherRequest,
    PreviousRunRequest,
)
from ai.tools.dispatcher import OpenMeteoToolDispatcher, OpenMeteoToolNotFoundError
from ai.tools.registry import TOOL_REGISTRY, tool_definitions


class ForecastServiceMock:
    async def forecast(self, request: ForecastRequest) -> dict[str, Any]:
        return {
            "tool": "forecast",
            "payload": request.model_dump(),
        }


class ComprehensiveToolServiceMock:
    async def forecast(self, request: ForecastRequest) -> dict[str, Any]:
        return {"tool": "forecast", "payload": request.model_dump()}

    async def elevation(self, request: ElevationRequest) -> dict[str, Any]:
        return {"tool": "elevation", "payload": request.model_dump()}

    async def geocoding(self, request: GeocodingRequest) -> dict[str, Any]:
        return {"tool": "geocoding", "payload": request.model_dump()}

    async def ensemble(self, request: EnsembleRequest) -> dict[str, Any]:
        return {"tool": "ensemble", "payload": request.model_dump()}

    async def historical_weather(self, request: HistoricalWeatherRequest) -> dict[str, Any]:
        return {"tool": "historical_weather", "payload": request.model_dump()}

    async def previous_runs(self, request: PreviousRunRequest) -> dict[str, Any]:
        return {"tool": "previous_runs", "payload": request.model_dump()}

    async def historical_forecast(self, request: HistoricalForecastRequest) -> dict[str, Any]:
        return {"tool": "historical_forecast", "payload": request.model_dump()}

    async def flood(self, request: FloodRequest) -> dict[str, Any]:
        return {"tool": "flood", "payload": request.model_dump()}


class FailingForecastService:
    async def forecast(self, request: ForecastRequest) -> dict[str, Any]:
        raise ValueError("forecast failed")


@pytest.mark.asyncio
async def test_dispatcher_invokes_registered_tool_handler() -> None:
    dispatcher = OpenMeteoToolDispatcher(ForecastServiceMock())
    output = await dispatcher.dispatch(
        "forecast",
        {
            "latitude": 21.0,
            "longitude": 103.0,
            "daily": ["precipitation_sum"],
            "forecast_days": 3,
        },
    )

    assert output["tool"] == "forecast"
    assert output["payload"]["latitude"] == 21.0
    assert output["payload"]["longitude"] == 103.0


@pytest.mark.asyncio
async def test_dispatcher_raises_for_unknown_tool() -> None:
    dispatcher = OpenMeteoToolDispatcher(ForecastServiceMock())
    with pytest.raises(OpenMeteoToolNotFoundError):
        await dispatcher.dispatch("missing_tool", {})


@pytest.mark.asyncio
async def test_dispatcher_rejects_invalid_arguments() -> None:
    dispatcher = OpenMeteoToolDispatcher(ForecastServiceMock())
    with pytest.raises(ValidationError):
        await dispatcher.dispatch("forecast", {"longitude": 103.0})


@pytest.mark.asyncio
async def test_dispatcher_rejects_non_dict_arguments() -> None:
    dispatcher = OpenMeteoToolDispatcher(ForecastServiceMock())
    with pytest.raises(OpenMeteoPayloadError, match="tool_arguments must be an object"):
        await dispatcher.dispatch("forecast", [])


@pytest.mark.asyncio
async def test_dispatcher_wraps_handler_errors_in_payload_error() -> None:
    dispatcher = OpenMeteoToolDispatcher(FailingForecastService())
    with pytest.raises(OpenMeteoPayloadError, match="forecast failed"):
        await dispatcher.dispatch("forecast", {"latitude": 21.0, "longitude": 103.0})


def test_tool_definitions_expose_all_registered_tools() -> None:
    definitions = tool_definitions()
    expected_tool_names = set(TOOL_REGISTRY.keys())
    registered_tool_names = {definition["function"]["name"] for definition in definitions}

    assert expected_tool_names == registered_tool_names
    assert len(definitions) == len(TOOL_REGISTRY)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    (
        "tool_name",
        "arguments",
    ),
    [
        ("forecast", {"latitude": 21.0, "longitude": 103.0}),
        ("elevation", {"latitude": [21.0], "longitude": [105.0]}),
        ("geocoding", {"name": "Hanoi"}),
        (
            "ensemble",
            {
                "latitude": 21.0,
                "longitude": 103.0,
                "models": ["icon_seamless"],
                "hourly": ["temperature_2m"],
            },
        ),
        (
            "historical_weather",
            {
                "latitude": 21.0,
                "longitude": 103.0,
                "start_date": "2025-01-01",
                "end_date": "2025-01-03",
            },
        ),
        (
            "previous_runs",
            {
                "latitude": 21.0,
                "longitude": 103.0,
                "hourly": ["temperature_2m_previous_day1"],
            },
        ),
        (
            "historical_forecast",
            {
                "latitude": 21.0,
                "longitude": 103.0,
                "start_date": "2025-01-01",
                "end_date": "2025-01-03",
            },
        ),
        ("flood", {"latitude": 21.0, "longitude": 103.0}),
    ],
)
async def test_dispatcher_accepts_all_registered_tools(
    tool_name: str, arguments: dict[str, Any]
) -> None:
    dispatcher = OpenMeteoToolDispatcher(ComprehensiveToolServiceMock())
    output = await dispatcher.dispatch(tool_name, arguments)

    assert output["tool"] == tool_name
