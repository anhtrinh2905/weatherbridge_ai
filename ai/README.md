# AI offline

This folder is only for work that happens before deployment:

- data preparation;
- training and fine-tuning;
- optional pretraining;
- offline evaluation;
- experiment runs and model records.

Online AI is implemented in `be/src/ai` and `be/src/services`. LiteLLM and
Langfuse are backend dependencies/backing services. This folder has no API,
worker, Docker image, or production port.

## Simple layout

```text
ai/
├── src/
│   ├── main.py
│   ├── config.py
│   ├── data.py
│   ├── train.py
│   ├── pretrain.py
│   ├── evaluate.py
│   └── registry.py
├── data/
│   ├── raw/
│   ├── processed/
│   └── manifests/
├── runs/
├── notebooks/
├── tests/
├── config.yaml
└── pyproject.toml
```

The maximum useful depth is three levels. Add a new file before adding a new
folder. Move to a deeper structure only when a real training pipeline requires
it.

## Commands

```bash
PYTHONPATH=ai/src uv run --project ai python ai/src/main.py prepare
PYTHONPATH=ai/src uv run --project ai python ai/src/main.py train
PYTHONPATH=ai/src uv run --project ai python ai/src/main.py pretrain
PYTHONPATH=ai/src uv run --project ai python ai/src/main.py evaluate
```
