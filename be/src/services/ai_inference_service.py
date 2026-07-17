from ai.contracts import InferenceRequest, InferenceResponse
from ai.observability.langfuse import LangfuseTracer
from ai.providers.litellm import LiteLLMClient
from ai.providers.mock import MockInferenceProvider
from core.config import Settings


class AiInferenceService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.tracer = LangfuseTracer(settings)
        self.provider = (
            LiteLLMClient(settings) if settings.litellm_enabled else MockInferenceProvider()
        )

    async def infer(self, request: InferenceRequest) -> InferenceResponse:
        with self.tracer.generation(request.task, self.settings.litellm_model) as generation:
            response = await self.provider.infer(request)
            if generation is not None:
                generation.update(input=request.model_dump(), output=response.model_dump())
            return response

    def flush(self) -> None:
        self.tracer.flush()
