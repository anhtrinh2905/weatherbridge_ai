from __future__ import annotations

import pytest
from ai.translation.models import TranslationRequest, TranslationResponse
from core.config import Settings
from services.translation_service import TranslationCacheService


class FakePipeline:
    def __init__(self, store: dict[str, str]) -> None:
        self._store = store
        self._writes: list[tuple[str, str]] = []

    def set(self, key: str, value: str, ex: int) -> None:  # noqa: ARG002 - ttl unused in fake
        self._writes.append((key, value))

    async def execute(self) -> None:
        for key, value in self._writes:
            self._store[key] = value


class FakeRedis:
    """Minimal in-memory stand-in for redis.asyncio.Redis — just mget + pipeline().set()."""

    def __init__(self) -> None:
        self.store: dict[str, str] = {}

    async def mget(self, keys: list[str]) -> list[str | None]:
        return [self.store.get(key) for key in keys]

    def pipeline(self) -> FakePipeline:
        return FakePipeline(self.store)


class FakeProvider:
    def __init__(self) -> None:
        self.settings = Settings(vertex_gemini_model="gemini-2.5-flash")
        self.calls: list[list[str]] = []

    async def translate(self, request: TranslationRequest) -> TranslationResponse:
        self.calls.append(list(request.texts))
        return TranslationResponse(
            translations=[f"[{request.target_language}] {text}" for text in request.texts],
            target_language=request.target_language,
            source_language=request.source_language,
        )


@pytest.mark.asyncio
async def test_translate_calls_provider_on_cache_miss() -> None:
    redis = FakeRedis()
    provider = FakeProvider()
    service = TranslationCacheService(redis, provider)  # type: ignore[arg-type]

    response = await service.translate(
        TranslationRequest(texts=["Đăng xuất", "Hôm nay"], target_language="hmn")
    )

    assert response.translations == ["[hmn] Đăng xuất", "[hmn] Hôm nay"]
    assert provider.calls == [["Đăng xuất", "Hôm nay"]]


@pytest.mark.asyncio
async def test_translate_reuses_cache_on_second_call() -> None:
    redis = FakeRedis()
    provider = FakeProvider()
    service = TranslationCacheService(redis, provider)  # type: ignore[arg-type]

    request = TranslationRequest(texts=["Đăng xuất"], target_language="hmn")
    await service.translate(request)
    response = await service.translate(request)

    assert response.translations == ["[hmn] Đăng xuất"]
    assert len(provider.calls) == 1  # second call was a pure cache hit


@pytest.mark.asyncio
async def test_translate_only_fetches_missing_entries() -> None:
    redis = FakeRedis()
    provider = FakeProvider()
    service = TranslationCacheService(redis, provider)  # type: ignore[arg-type]

    await service.translate(TranslationRequest(texts=["a"], target_language="hmn"))
    response = await service.translate(TranslationRequest(texts=["a", "b"], target_language="hmn"))

    assert response.translations == ["[hmn] a", "[hmn] b"]
    assert provider.calls == [["a"], ["b"]]


@pytest.mark.asyncio
async def test_translate_keys_cache_by_language_pair_and_content() -> None:
    redis = FakeRedis()
    provider = FakeProvider()
    service = TranslationCacheService(redis, provider)  # type: ignore[arg-type]

    await service.translate(
        TranslationRequest(texts=["a"], target_language="hmn", source_language="vi")
    )
    await service.translate(
        TranslationRequest(texts=["a"], target_language="th", source_language="vi")
    )

    # Different target language must not reuse the "hmn" cache entry for the same text.
    assert provider.calls == [["a"], ["a"]]
