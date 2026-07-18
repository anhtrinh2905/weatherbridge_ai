from __future__ import annotations

from typing import Any

from pydantic import BaseModel

from ai.forecast import OpenMeteoService
from ai.forecast.exceptions import OpenMeteoPayloadError
from ai.tools.registry import TOOL_REGISTRY, ToolSpec


class OpenMeteoToolNotFoundError(LookupError):
    pass


class OpenMeteoToolDispatcher:
    """Validate and invoke a small, bounded set of Open-Meteo tool calls."""

    def __init__(self, service: OpenMeteoService):
        self.service = service

    def definitions(self) -> list[dict[str, Any]]:
        from ai.tools.registry import tool_definitions

        return tool_definitions()

    async def dispatch(
        self, tool_name: str, tool_arguments: dict[str, Any] | None
    ) -> dict[str, Any]:
        spec = TOOL_REGISTRY.get(tool_name)
        if spec is None:
            raise OpenMeteoToolNotFoundError(f"Unknown Open-Meteo tool: {tool_name}")

        arguments = self._normalize_arguments(tool_arguments)
        args_model = spec.arguments.model_validate(arguments)
        return await self._invoke(spec, args_model)

    async def _invoke(self, spec: ToolSpec, args_model: BaseModel) -> dict[str, Any]:
        try:
            return await spec.handler(self.service, args_model)
        except ValueError as exc:
            raise OpenMeteoPayloadError(spec.name, str(exc)) from exc

    @staticmethod
    def _normalize_arguments(tool_arguments: dict[str, Any] | None) -> dict[str, Any]:
        if tool_arguments is None:
            return {}
        if not isinstance(tool_arguments, dict):
            raise OpenMeteoPayloadError("tool_dispatch", "tool_arguments must be an object")
        return tool_arguments
