# ADR 0003: Keep online AI in be and offline ML in ai

## Decision

Online provider/retrieval/observability adapters live in `be/src/ai` and product
use cases live in `be/src/services`. The top-level `ai/` directory contains only
dataset, training, pretraining, evaluation, and registry code.

## Reason

The API and worker need stable online contracts, while training dependencies and
GPU workloads need independent environments. `ai/` therefore has no HTTP API or
production service image.
