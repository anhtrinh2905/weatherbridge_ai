from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://vai:vai@localhost:5432/weather_bridge"
    redis_url: str = "redis://localhost:6379/0"
    open_meteo_base_url: str = "https://api.open-meteo.com/v1/forecast"
    open_meteo_historical_weather_url: str = "https://archive-api.open-meteo.com/v1/archive"
    open_meteo_previous_runs_url: str = "https://previous-runs-api.open-meteo.com/v1/forecast"
    open_meteo_historical_forecast_url: str = (
        "https://historical-forecast-api.open-meteo.com/v1/forecast"
    )
    open_meteo_timeout_seconds: int = 60
    open_meteo_retry_attempts: int = 3
    notification_delivery_mode: str = "disabled"
    pii_mode: str = "simulated"
    pii_encryption_key: str | None = None
    pii_hash_key: str | None = None
    pii_key_version: str = "v1"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @model_validator(mode="after")
    def validate_sensitive_configuration(self) -> "Settings":
        if self.pii_mode not in {"simulated", "live"}:
            raise ValueError("PII_MODE must be either simulated or live")
        if self.pii_mode == "live" and (
            not self.pii_encryption_key or not self.pii_hash_key
        ):
            raise ValueError("PII live mode requires encryption and hash keys")
        if self.notification_delivery_mode not in {"disabled", "simulate"}:
            raise ValueError(
                "NOTIFICATION_DELIVERY_MODE must be disabled or simulate until "
                "a provider is configured"
            )
        return self
