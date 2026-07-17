from typing import Protocol

from pydantic import BaseModel, Field


class RetrievedDocument(BaseModel):
    id: str
    text: str
    score: float = Field(ge=0)
    metadata: dict[str, str] = Field(default_factory=dict)


class Retriever(Protocol):
    async def search(self, query: str, limit: int = 5) -> list[RetrievedDocument]: ...
