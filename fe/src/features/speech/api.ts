import { apiClient } from "../../shared/lib/api-client";

export function synthesizeMmsSpeech(text: string, language = "hmn") {
  return apiClient.postBlob("/speech/mms", { text, language });
}

