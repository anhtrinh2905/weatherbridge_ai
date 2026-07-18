"""Open-Meteo request models, errors, and adapters for weather tool calls."""

from .exceptions import (
    OpenMeteoError,
    OpenMeteoHTTPError,
    OpenMeteoPayloadError,
    OpenMeteoTransportError,
)
from .models import (
    BaseOpenMeteoWeatherRequest,
    ElevationRequest,
    EnsembleRequest,
    FloodRequest,
    ForecastRequest,
    GeocodingRequest,
    HistoricalForecastRequest,
    HistoricalWeatherRequest,
    PreviousRunRequest,
)
from .service import OpenMeteoService

__all__ = [
    "BaseOpenMeteoWeatherRequest",
    "EnsembleRequest",
    "ElevationRequest",
    "FloodRequest",
    "ForecastRequest",
    "GeocodingRequest",
    "HistoricalForecastRequest",
    "HistoricalWeatherRequest",
    "OpenMeteoError",
    "OpenMeteoHTTPError",
    "OpenMeteoPayloadError",
    "OpenMeteoService",
    "OpenMeteoTransportError",
    "PreviousRunRequest",
]
