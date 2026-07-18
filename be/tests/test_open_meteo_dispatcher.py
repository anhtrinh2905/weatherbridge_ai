from __future__ import annotations

from typing import Any

import pytest
from pydantic import ValidationError

from ai.forecast.exceptions import OpenMeteoPayloadError
from ai.forecast.models import ForecastRequest
from ai.tools.dispatcher import OpenMeteoToolDispatcher, OpenMeteoToolNotFoundError
from ai.tools.registry import TOOL_REGISTRY, tool_definitions


class ForecastServiceMock:
    async def forecast(self, request: ForecastRequest) -> dict[str, Any]:
        return {
            "tool": "forecast",
            "payload": request.model_dump(),
        }


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
