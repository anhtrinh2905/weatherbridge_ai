from pydantic import BaseModel, Field


class TranslationRequest(BaseModel):
    texts: list[str] = Field(min_length=1)
    target_language: str
    source_language: str = "vi"


class TranslationResponse(BaseModel):
    translations: list[str]
    target_language: str
    source_language: str
    model_name: str = "google-translate-nmt-v2"
