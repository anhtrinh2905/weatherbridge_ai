from __future__ import annotations

import hashlib

from redis.asyncio import Redis

from ai.translation.gemini_service import GeminiTranslateService
from ai.translation.models import TranslationRequest, TranslationResponse

_CACHE_TTL_SECONDS = 60 * 60 * 24 * 30  # 30 days — content-hash keyed, never goes stale
_CACHE_PREFIX = "translate"


def _cache_key(text: str, source_language: str, target_language: str) -> str:
    digest = hashlib.sha256(text.encode("utf-8")).hexdigest()[:32]
    return f"{_CACHE_PREFIX}:{source_language}:{target_language}:{digest}"


class TranslationCacheService:
    """Live translation for dynamic content (e.g. alert bulletins), backed by a Redis cache
    keyed on content hash. Unlike the static UI-string locale files (generated offline via
    scripts/generate_hmong_locale.py), this path exists for text that isn't known ahead of
    time — the same underlying provider (GeminiTranslateService) is reused for both.
    """

    def __init__(self, redis: Redis, provider: GeminiTranslateService) -> None:
        self.redis = redis
        self.provider = provider

    async def translate(self, request: TranslationRequest) -> TranslationResponse:
        keys = [
            _cache_key(text, request.source_language, request.target_language)
            for text in request.texts
        ]
        cached = await self.redis.mget(keys)

        missing_indices = [i for i, value in enumerate(cached) if value is None]
        translations: list[str] = list(cached)

        if missing_indices:
            missing_texts = [request.texts[i] for i in missing_indices]
            response = await self.provider.translate(
                TranslationRequest(
                    texts=missing_texts,
                    target_language=request.target_language,
                    source_language=request.source_language,
                )
            )
            pipeline = self.redis.pipeline()
            for index, translated in zip(missing_indices, response.translations, strict=True):
                translations[index] = translated
                pipeline.set(keys[index], translated, ex=_CACHE_TTL_SECONDS)
            await pipeline.execute()

        return TranslationResponse(
            translations=translations,
            target_language=request.target_language,
            source_language=request.source_language,
            model_name=self.provider.settings.vertex_gemini_model,
        )
