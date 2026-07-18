from pydantic import BaseModel, Field


class SpeechSynthesisRequest(BaseModel):
    text: str = Field(min_length=1, max_length=1200)
    language: str = "hmn"


class SpeechSynthesisResult(BaseModel):
    audio: bytes
    media_type: str = "audio/wav"
    model_name: str

