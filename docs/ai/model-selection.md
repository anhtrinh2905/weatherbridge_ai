# Model selection

Evaluate models against the actual product task, not only benchmark scores.
Record:

- quality and structured-output validity;
- latency at the expected concurrency;
- input/output cost and provider limits;
- privacy, retention, and data residency;
- license and commercial usage terms;
- fallback and outage behavior;
- context window and tool/function support.

Start with a deterministic mock provider, then route through LiteLLM so model
selection does not leak into FastAPI route code.
