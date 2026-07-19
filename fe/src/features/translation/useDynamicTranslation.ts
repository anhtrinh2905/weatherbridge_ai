import { useQuery } from "@tanstack/react-query";
import { translateTexts } from "./api";
import { useTranslation, type Locale } from "../../shared/i18n/I18nProvider";

// Thái Điện Biên (Tai Dam) has no viable machine translation (see docs/architecture language
// strategy) — "th" intentionally stays out of this set so dynamic content falls back to the
// Vietnamese source text there too, same as the static UI catalog.
const LIVE_TRANSLATABLE_LOCALES: Partial<Record<Locale, string>> = {
  "hmn-x-dienbien": "hmn",
};

/**
 * Live-translates a batch of dynamic strings (alert bulletins, etc.) via the backend's
 * Redis-cached endpoint. Falls back to the original (Vietnamese) text while a translation is
 * in flight or unavailable, and skips the network call entirely for locales that don't need it.
 */
export function useDynamicTranslation(texts: string[]): { texts: string[]; isTranslating: boolean } {
  const { locale } = useTranslation();
  const targetLanguage = LIVE_TRANSLATABLE_LOCALES[locale];
  const shouldTranslate = Boolean(targetLanguage) && texts.length > 0;

  const query = useQuery({
    queryKey: ["dynamic-translation", locale, texts],
    queryFn: () => translateTexts(texts, targetLanguage!),
    enabled: shouldTranslate,
    staleTime: Infinity,
  });

  if (!shouldTranslate) return { texts, isTranslating: false };
  if (query.data) return { texts: query.data.translations, isTranslating: false };
  return { texts, isTranslating: query.isFetching };
}
