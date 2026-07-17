from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.v1.router import router as v1_router
from core.config import Settings, get_settings
from core.errors import AppError
from core.lifespan import lifespan


def create_app(settings: Settings | None = None) -> FastAPI:
    resolved_settings = settings or get_settings()

    @asynccontextmanager
    async def app_lifespan(app: FastAPI) -> AsyncIterator[None]:
        async with lifespan(app, resolved_settings):
            yield

    app = FastAPI(
        title=resolved_settings.app_name,
        version="0.1.0",
        description="VAI Code production-oriented API",
        lifespan=app_lifespan,
        docs_url="/docs" if not resolved_settings.is_production else None,
        redoc_url="/redoc" if not resolved_settings.is_production else None,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=resolved_settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
    )

    @app.exception_handler(AppError)
    async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code, content={"detail": exc.detail, "code": exc.code}
        )

    app.include_router(v1_router, prefix="/api/v1")
    return app


app = create_app()
