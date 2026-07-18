from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Weather Bridge AI"
    app_env: str = "development"
    database_url: str = "postgresql+asyncpg://vai:vai@localhost:5432/weather_bridge"
    redis_url: str = "redis://localhost:6379/0"
    keycloak_url: str = "http://localhost:8080"
    keycloak_internal_url: str | None = None
    keycloak_realm: str = "weather-bridge"
    keycloak_client_id: str = "weather-bridge-fe"
    keycloak_issuer: str | None = None
    keycloak_audience: str | None = None
    keycloak_jwks_cache_seconds: int = Field(default=300, ge=30, le=3600)
    litellm_enabled: bool = False
    litellm_base_url: str = "http://localhost:4000"
    litellm_api_key: str | None = None
    litellm_model: str = "mock-model"
    open_meteo_api_key: str | None = None
    open_meteo_timeout_seconds: int = Field(default=15, ge=1, le=120)
    open_meteo_retry_attempts: int = Field(default=3, ge=1, le=5)
    open_meteo_forecast_url: str = "https://api.open-meteo.com/v1/forecast"
    open_meteo_elevation_url: str = "https://api.open-meteo.com/v1/elevation"
    open_meteo_geocoding_url: str = "https://geocoding-api.open-meteo.com/v1/search"
    open_meteo_ensemble_url: str = "https://ensemble-api.open-meteo.com/v1/ensemble"
    open_meteo_historical_weather_url: str = "https://archive-api.open-meteo.com/v1/archive"
    open_meteo_previous_runs_url: str = "https://previous-runs-api.open-meteo.com/v1/forecast"
    open_meteo_historical_forecast_url: str = (
        "https://historical-forecast-api.open-meteo.com/v1/forecast"
    )
    open_meteo_flood_url: str = "https://flood-api.open-meteo.com/v1/flood"
    langfuse_enabled: bool = False
    langfuse_public_key: str | None = None
    langfuse_secret_key: str | None = None
    langfuse_host: str = "https://cloud.langfuse.com"
    langfuse_environment: str = "development"
    cors_origins: str = "http://localhost:5173"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() in {"production", "prod"}

    @property
    def resolved_keycloak_issuer(self) -> str:
        return (
            self.keycloak_issuer or f"{self.keycloak_url.rstrip('/')}/realms/{self.keycloak_realm}"
        )

    @property
    def resolved_keycloak_discovery_base(self) -> str:
        return (self.keycloak_internal_url or self.keycloak_url).rstrip("/")


@lru_cache
def get_settings() -> Settings:
    return Settings()
