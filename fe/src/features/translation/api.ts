import { apiClient } from "../../shared/lib/api-client";

export interface TranslationResponseBody {
  translations: string[];
  target_language: string;
  source_language: string;
  model_name: string;
}

/**
 * Live translation for dynamic content (alert bulletins, etc.) — NOT the static UI-string
 * catalog in shared/i18n/, which is generated offline. Backend caches by content hash (Redis),
 * so repeat text across residents/sessions only pays the model call once.
 */
export function translateTexts(texts: string[], targetLanguage: string, sourceLanguage = "vi") {
  return apiClient.post<TranslationResponseBody>("/translations", {
    texts,
    target_language: targetLanguage,
    source_language: sourceLanguage,
  });
}
