# Serving

The default serving path is:

```text
be service -> worker -> be/src/ai provider -> LiteLLM or model server
```

LiteLLM is an optional OpenAI-compatible gateway. Langfuse is an optional
observability backend. A self-hosted GPU model, if required later, becomes an
independent `model-server` deploy unit; it does not turn `ai/` into a second
FastAPI application.
