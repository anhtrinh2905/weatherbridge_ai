import os
from collections.abc import AsyncIterator
from pathlib import Path

os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./test_weather_bridge.db")
os.environ.setdefault("REDIS_URL", "redis://localhost:6399/0")
os.environ.setdefault("KEYCLOAK_URL", "http://localhost:8080")
os.environ.setdefault("KEYCLOAK_REALM", "weather-bridge")
os.environ.setdefault("KEYCLOAK_CLIENT_ID", "weather-bridge-fe")
os.environ.setdefault("CORS_ORIGINS", "http://testserver")

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from api.deps import get_current_user, get_job_queue
from auth.keycloak import CurrentUser
from core.config import get_settings
from database import Base
from database.session import get_db
from main import create_app

TEST_DB = Path(__file__).parent / "test_weather_bridge.db"
test_engine = create_async_engine(
    f"sqlite+aiosqlite:///{TEST_DB}", connect_args={"check_same_thread": False}
)
test_session_factory = async_sessionmaker(test_engine, expire_on_commit=False, class_=AsyncSession)


class FakeJobQueue:
    """In-memory queue stub so endpoint tests never need a live Redis."""

    def __init__(self) -> None:
        self.enqueued: list[object] = []

    async def enqueue(self, job_id: object) -> None:
        self.enqueued.append(job_id)

    async def close(self) -> None:
        pass


@pytest.fixture
async def db_session() -> AsyncIterator[AsyncSession]:
    async with test_session_factory() as session:
        yield session


def _make_user(roles: frozenset[str]) -> CurrentUser:
    return CurrentUser(
        id="test-user",
        email="test@example.com",
        display_name="Test User",
        username="test-user",
        email_verified=True,
        roles=roles,
        claims={"sub": "test-user"},
    )


async def _make_client(roles: frozenset[str]) -> AsyncIterator[AsyncClient]:
    async with test_engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)
        await connection.run_sync(Base.metadata.create_all)

    app = create_app(get_settings())

    async def override_db() -> AsyncIterator[AsyncSession]:
        async with test_session_factory() as session:
            yield session

    async def override_job_queue() -> AsyncIterator[FakeJobQueue]:
        yield FakeJobQueue()

    async def override_current_user() -> CurrentUser:
        return _make_user(roles)

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = override_current_user
    app.dependency_overrides[get_job_queue] = override_job_queue
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver"
    ) as http_client:
        yield http_client
    app.dependency_overrides.clear()


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    async for http_client in _make_client(frozenset({"user"})):
        yield http_client


@pytest.fixture
async def admin_client() -> AsyncIterator[AsyncClient]:
    async for http_client in _make_client(frozenset({"admin"})):
        yield http_client
