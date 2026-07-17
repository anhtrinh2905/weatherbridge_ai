# AI architecture

Online AI and offline ML are separate by design.

## Online path

`be/src/ai/` owns contracts, provider adapters, retrieval, and Langfuse
instrumentation. `be/src/services/` owns product use cases. `worker/` executes
long-running requests without blocking HTTP.

## Offline path

`ai/` owns datasets, training, pretraining, evaluation, and manifests. It has no
HTTP server and is never copied into the API image.
