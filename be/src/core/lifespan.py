from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from core.config import Settings
from core.logging import configure_logging
from database.session import engine


@asynccontextmanager
async def lifespan(app: FastAPI, settings: Settings) -> AsyncIterator[None]:
    configure_logging()
    app.state.settings = settings
    yield
    await engine.dispose()
