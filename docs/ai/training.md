# Training

Training is an offline process under `ai/`.

1. Approve dataset provenance and license.
2. Freeze a dataset manifest and deterministic split.
3. Record configuration, seed, code revision, and dependency lockfile.
4. Track metrics and artifacts in the selected registry.
5. Produce a model card and failure analysis.
6. Promote only after evaluation and privacy gates pass.

Do not place Torch, Transformers, or training data in the API image by default.
