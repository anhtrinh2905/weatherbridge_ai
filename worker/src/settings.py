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
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
