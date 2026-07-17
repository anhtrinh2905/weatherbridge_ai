# Evaluation

Every model/provider candidate should have:

- task-specific quality metrics;
- schema validity and refusal/error behavior;
- retrieval precision/recall when retrieval is used;
- latency, throughput, and cost measurements;
- safety and privacy checks;
- a small deterministic regression set in Git.

Evaluation reports must reference the exact model, prompt, dataset, and runtime
configuration that produced them.
