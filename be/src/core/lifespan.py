from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from database.session import engine
from fastapi import FastAPI

from core.config import Settings
from core.logging import configure_logging


@asynccontextmanager
async def lifespan(app: FastAPI, settings: Settings) -> AsyncIterator[None]:
    configure_logging()
    app.state.settings = settings
    yield
    await engine.dispose()
