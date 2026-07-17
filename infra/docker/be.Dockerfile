FROM python:3.14-slim AS runtime

COPY --from=ghcr.io/astral-sh/uv:0.11.28 /uv /uvx /bin/

WORKDIR /app
COPY be/pyproject.toml /app/be/pyproject.toml
RUN uv lock --project /app/be && uv sync --project /app/be --no-dev

COPY be/src /app/be/src
COPY be/migrations /app/be/migrations
COPY be/alembic.ini /app/be/alembic.ini

ENV PYTHONPATH=/app/be/src
ENV PYTHONUNBUFFERED=1
EXPOSE 8000
CMD ["uv", "run", "--project", "/app/be", "--no-dev", "uvicorn", "--app-dir", "/app/be/src", "main:app", "--host", "0.0.0.0", "--port", "8000"]
