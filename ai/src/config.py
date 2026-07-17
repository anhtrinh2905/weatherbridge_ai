from pathlib import Path

import yaml
from pydantic import BaseModel, Field


class Config(BaseModel):
    model: str = "unset"
    data: str = "unset"
    experiment: str = "baseline"
    seed: int = 42
    epochs: int = Field(default=1, ge=1)
    learning_rate: float = Field(default=0.0001, gt=0)


def load_config(path: Path | None = None) -> Config:
    path = path or Path(__file__).resolve().parents[1] / "config.yaml"
    if not path.exists():
        return Config()
    return Config.model_validate(yaml.safe_load(path.read_text(encoding="utf-8")) or {})
