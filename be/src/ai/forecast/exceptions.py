class OpenMeteoError(Exception):
    """Base error for Open-Meteo tool calls."""

    def __init__(self, operation: str, reason: str, status_code: int | None = None) -> None:
        super().__init__(reason)
        self.operation = operation
        self.reason = reason
        self.status_code = status_code


class OpenMeteoTransportError(OpenMeteoError):
    """Transport-level failures from httpx are wrapped in this type."""


class OpenMeteoHTTPError(OpenMeteoError):
    """HTTP-level failures from the Open-Meteo APIs are wrapped in this type."""


class OpenMeteoPayloadError(OpenMeteoError):
    """Invalid JSON payload or malformed API response."""
