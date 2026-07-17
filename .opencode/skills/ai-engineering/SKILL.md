---
name: ai-engineering
description: Use when adding online AI services in be/src/ai or offline training and evaluation in ai.
---

# AI engineering

Put online inference, retrieval, LiteLLM, and Langfuse adapters in `be/src/ai`.
Keep `ai/` offline-only for training and pretraining. Start with a provider-neutral contract. Separate online inference from training.
Track dataset version, model version, prompt version, retrieval configuration,
latency, cost, safety, and license provenance. Use deterministic fixtures in
tests and never commit real sensitive data or weights.
