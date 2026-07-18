from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any, TypeVar

from pydantic import BaseModel

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
from ai.forecast.service import OpenMeteoService

ToolArgs = TypeVar("ToolArgs", bound=BaseModel)
ToolArguments = type[BaseModel]
ToolHandler = Callable[[OpenMeteoService, ToolArgs], Awaitable[dict[str, Any]]]


@dataclass(frozen=True)
class ToolSpec[ToolArgs: BaseModel]:
    name: str
    description: str
    arguments: type[ToolArgs]
    handler: ToolHandler[ToolArgs]


def _forecast_tool(
    service: OpenMeteoService, args: ForecastRequest
) -> Awaitable[dict[str, Any]]:
    return service.forecast(args)


def _elevation_tool(
    service: OpenMeteoService, args: ElevationRequest
) -> Awaitable[dict[str, Any]]:
    return service.elevation(args)


def _geocoding_tool(
    service: OpenMeteoService, args: GeocodingRequest
) -> Awaitable[dict[str, Any]]:
    return service.geocoding(args)


def _ensemble_tool(
    service: OpenMeteoService, args: EnsembleRequest
) -> Awaitable[dict[str, Any]]:
    return service.ensemble(args)


def _historical_weather_tool(
    service: OpenMeteoService, args: HistoricalWeatherRequest
) -> Awaitable[dict[str, Any]]:
    return service.historical_weather(args)


def _previous_runs_tool(
    service: OpenMeteoService, args: PreviousRunRequest
) -> Awaitable[dict[str, Any]]:
    return service.previous_runs(args)


def _historical_forecast_tool(
    service: OpenMeteoService, args: HistoricalForecastRequest
) -> Awaitable[dict[str, Any]]:
    return service.historical_forecast(args)


def _flood_tool(service: OpenMeteoService, args: FloodRequest) -> Awaitable[dict[str, Any]]:
    return service.flood(args)


TOOL_REGISTRY: dict[str, ToolSpec[Any]] = {
    "forecast": ToolSpec(
        name="forecast",
        description="Fetch latest deterministic forecast by location and weather variables.",
        arguments=ForecastRequest,
        handler=_forecast_tool,
    ),
    "elevation": ToolSpec(
        name="elevation",
        description="Get terrain elevation for one or more coordinates.",
        arguments=ElevationRequest,
        handler=_elevation_tool,
    ),
    "geocoding": ToolSpec(
        name="geocoding",
        description="Search places by text query using Open-Meteo geocoding.",
        arguments=GeocodingRequest,
        handler=_geocoding_tool,
    ),
    "ensemble": ToolSpec(
        name="ensemble",
        description="Get member-level ensemble weather for selected ensemble models.",
        arguments=EnsembleRequest,
        handler=_ensemble_tool,
    ),
    "historical_weather": ToolSpec(
        name="historical_weather",
        description="Read archived observed/reanalysis weather variables for a time range.",
        arguments=HistoricalWeatherRequest,
        handler=_historical_weather_tool,
    ),
    "previous_runs": ToolSpec(
        name="previous_runs",
        description="Read forecast lead-time offsets from previous model runs.",
        arguments=PreviousRunRequest,
        handler=_previous_runs_tool,
    ),
    "historical_forecast": ToolSpec(
        name="historical_forecast",
        description="Read archived operational forecast outputs for a historical time range.",
        arguments=HistoricalForecastRequest,
        handler=_historical_forecast_tool,
    ),
    "flood": ToolSpec(
        name="flood",
        description="Fetch river-discharge forecasts for the largest represented river nearby.",
        arguments=FloodRequest,
        handler=_flood_tool,
    ),
}


def tool_definitions() -> list[dict[str, Any]]:
    return [
        {
            "type": "function",
            "function": {
                "name": spec.name,
                "description": spec.description,
                "parameters": spec.arguments.model_json_schema(),
                "strict": True,
            },
        }
        for spec in TOOL_REGISTRY.values()
    ]
