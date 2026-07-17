from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any

from core.config import Settings


class LangfuseTracer:
    def __init__(self, settings: Settings) -> None:
        self.client = None
        if (
            settings.langfuse_enabled
            and settings.langfuse_public_key
            and settings.langfuse_secret_key
        ):
            from langfuse import Langfuse

            self.client = Langfuse(
                public_key=settings.langfuse_public_key,
                secret_key=settings.langfuse_secret_key,
                host=settings.langfuse_host,
                environment=settings.langfuse_environment,
            )

    @contextmanager
    def generation(self, name: str, model: str) -> Iterator[Any]:
        if self.client is None:
            yield None
            return
        with self.client.start_as_current_observation(
            name=name, as_type="generation", model=model
        ) as generation:
            yield generation

    def flush(self) -> None:
        if self.client is not None:
            self.client.flush()
