from ai.contracts import InferenceRequest, InferenceResponse
from ai.forecast.service import OpenMeteoService
from ai.observability.langfuse import LangfuseTracer
from ai.providers.litellm import LiteLLMClient
from ai.providers.mock import MockInferenceProvider
from ai.tools.dispatcher import OpenMeteoToolDispatcher
from core.config import Settings


class AiInferenceService:
    def __init__(
        self,
        settings: Settings,
        open_meteo_service: OpenMeteoService | None = None,
    ) -> None:
        self.settings = settings
        self.tracer = LangfuseTracer(settings)
        self.open_meteo_service = open_meteo_service or OpenMeteoService(settings)
        self.provider = (
            LiteLLMClient(settings) if settings.litellm_enabled else MockInferenceProvider()
        )

    async def infer(self, request: InferenceRequest) -> InferenceResponse:
        if request.task == "open_meteo_tool":
            return await self._run_open_meteo_tool(request)

        with self.tracer.generation(request.task, self.settings.litellm_model) as generation:
            response = await self.provider.infer(request)
            if generation is not None:
                generation.update(input=request.model_dump(), output=response.model_dump())
            return response

    async def _run_open_meteo_tool(self, request: InferenceRequest) -> InferenceResponse:
        if request.tool_call is None:
            raise ValueError("tool_call is required when task is open_meteo_tool")

        dispatcher = OpenMeteoToolDispatcher(self.open_meteo_service)
        output = await dispatcher.dispatch(request.tool_call.tool, request.tool_call.arguments)
        return InferenceResponse(
            output=output,
            model_name="open-meteo-tools",
            model_version="1",
            confidence=1.0,
            metadata={
                "provider": "tool-dispatcher",
                "task": request.task,
                "tool": request.tool_call.tool,
            },
        )

    def flush(self) -> None:
        self.tracer.flush()
