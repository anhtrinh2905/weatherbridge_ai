"""One-off offline job: translate the resident UI's Vietnamese string catalog into Hmong
(hmn) and write the result as a static locale file.

Static UI chrome (menu labels, buttons) is a small, finite catalog, so it is translated once
here and shipped as a committed JSON file — not re-translated on every request. See
docs/architecture (language strategy) for why Hmong uses machine translation while Thái Điện
Biên does not.

Uses GeminiTranslateService (Gemini 2.5 Flash via Vertex AI, GOOGLE_TRANSLATE_CREDENTIALS_PATH)
by default. GoogleTranslateService (Cloud Translation NMT) and OpenAITranslateService
(gpt-4o-mini) are available as alternatives — swap the provider below to switch.

Usage (from repo root):
    uv run --project be python scripts/generate_hmong_locale.py
"""

import asyncio
import json
import sys
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "be" / "src"))

from ai.translation.gemini_service import GeminiTranslateService  # noqa: E402
from ai.translation.models import TranslationRequest  # noqa: E402
from core.config import get_settings  # noqa: E402

LOCALE_DIR = Path(__file__).resolve().parents[1] / "fe" / "src" / "shared" / "i18n" / "locales"
SOURCE_PATH = LOCALE_DIR / "vi.json"
TARGET_PATH = LOCALE_DIR / "hmn.json"
TARGET_LANGUAGE = "hmn"
BATCH_SIZE = 40


async def main() -> None:
    settings = get_settings()
    source: dict[str, str] = json.loads(SOURCE_PATH.read_text(encoding="utf-8"))
    keys = list(source.keys())
    texts = list(source.values())

    translated: dict[str, str] = {}
    async with httpx.AsyncClient(timeout=180) as client:
        service = GeminiTranslateService(settings, client=client)
        for start in range(0, len(keys), BATCH_SIZE):
            batch_keys = keys[start : start + BATCH_SIZE]
            batch_texts = texts[start : start + BATCH_SIZE]
            response = await service.translate(
                TranslationRequest(texts=batch_texts, target_language=TARGET_LANGUAGE, source_language="vi")
            )
            translated.update(zip(batch_keys, response.translations, strict=True))
            print(f"  translated {len(translated)}/{len(keys)}")

    TARGET_PATH.write_text(
        json.dumps(translated, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(translated)} machine-translated strings to {TARGET_PATH}")


if __name__ == "__main__":
    asyncio.run(main())
