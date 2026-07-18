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
    web_push_subject: str = "mailto:dev@weatherbridge.local"
    web_push_vapid_private_key: str | None = None
    web_push_vapid_public_key: str | None = None
    sms_provider: str = "disabled"
    sms_twilio_account_sid: str | None = None
    sms_twilio_auth_token: str | None = None
    sms_twilio_from: str | None = None
    sms_twilio_messaging_service_sid: str | None = None
    zalo_provider: str = "disabled"
    zalo_oa_access_token: str | None = None
    zalo_oa_api_base_url: str = "https://openapi.zalo.me"
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
        if self.notification_delivery_mode not in {
            "disabled",
            "simulate",
            "web_push",
            "configured",
        }:
            raise ValueError(
                "NOTIFICATION_DELIVERY_MODE must be disabled, simulate, web_push, or configured"
            )
        if self.notification_delivery_mode == "web_push" and (
            not self.web_push_vapid_private_key or not self.web_push_vapid_public_key
        ):
            raise ValueError("Web Push delivery requires both persistent VAPID keys")
        if self.sms_provider not in {"disabled", "twilio"}:
            raise ValueError("SMS_PROVIDER must be disabled or twilio")
        if self.sms_provider == "twilio" and (
            not self.sms_twilio_account_sid
            or not self.sms_twilio_auth_token
            or not (self.sms_twilio_from or self.sms_twilio_messaging_service_sid)
        ):
            raise ValueError(
                "Twilio SMS requires account SID, auth token, and a sender or messaging service"
            )
        if self.zalo_provider not in {"disabled", "oa"}:
            raise ValueError("ZALO_PROVIDER must be disabled or oa")
        if self.zalo_provider == "oa" and not self.zalo_oa_access_token:
            raise ValueError("Zalo OA delivery requires an OA access token")
        if not self.zalo_oa_api_base_url.startswith(("https://", "http://")):
            raise ValueError("ZALO_OA_API_BASE_URL must be an HTTP(S) URL")
        if self.notification_delivery_mode == "configured" and not any(
            (
                self.sms_provider == "twilio",
                self.zalo_provider == "oa",
                bool(self.web_push_vapid_private_key and self.web_push_vapid_public_key),
            )
        ):
            raise ValueError("Configured delivery requires at least one configured provider")
        return self
