from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://vai:vai@localhost:5432/vai_code"
    redis_url: str = "redis://localhost:6379/0"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
