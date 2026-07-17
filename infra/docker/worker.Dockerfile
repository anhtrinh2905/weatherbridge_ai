FROM python:3.14-slim AS runtime

COPY --from=ghcr.io/astral-sh/uv:0.11.28 /uv /uvx /bin/

WORKDIR /app
COPY worker/pyproject.toml /app/worker/pyproject.toml
RUN uv lock --project /app/worker && uv sync --project /app/worker --no-dev

COPY be/src /app/be/src
COPY worker/src /app/worker/src

ENV PYTHONPATH=/app/worker/src:/app/be/src
ENV PYTHONUNBUFFERED=1
CMD ["uv", "run", "--project", "/app/worker", "--no-dev", "python", "/app/worker/src/main.py"]
