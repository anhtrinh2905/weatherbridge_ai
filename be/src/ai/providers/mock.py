from ai.contracts import InferenceRequest, InferenceResponse


class MockInferenceProvider:
    async def infer(self, request: InferenceRequest) -> InferenceResponse:
        words = request.text.split()
        return InferenceResponse(
            output={"summary": request.text[:160], "word_count": len(words), "task": request.task},
            model_name="mock-provider",
            model_version="0.1.0",
            confidence=0.5 if words else 0.0,
            metadata={"provider": "mock"},
        )
