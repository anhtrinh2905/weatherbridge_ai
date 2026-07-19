from __future__ import annotations

from typing import Any

from ai.advisory.models import RiskLevel, WeatherActionPlan, WeatherActionRequest
from ai.advisory.openai_service import OpenAIAdvisoryService
from ai.forecast.models import ForecastRequest
from ai.forecast.service import OpenMeteoService

# Vietnam is UTC+7; ask Open-Meteo to localise timestamps so "today" lines up with the resident.
_TIMEZONE = "Asia/Ho_Chi_Minh"
_FORECAST_DAYS = 3
_CURRENT_VARS = ["temperature_2m", "precipitation", "weather_code", "wind_speed_10m"]
_DAILY_VARS = [
    "weather_code",
    "temperature_2m_max",
    "temperature_2m_min",
    "precipitation_sum",
    "precipitation_probability_max",
    "wind_speed_10m_max",
]

# Condensed WMO weather-code labels (Vietnamese) for the codes common in this region, so the
# LLM sees words rather than opaque integers. Unknown codes fall through to the raw number.
_WMO_LABELS = {
    0: "trời quang",
    1: "ít mây",
    2: "có mây",
    3: "nhiều mây",
    45: "sương mù",
    48: "sương mù đóng băng",
    51: "mưa phùn nhẹ",
    53: "mưa phùn",
    55: "mưa phùn dày",
    61: "mưa nhỏ",
    63: "mưa vừa",
    65: "mưa to",
    80: "mưa rào nhẹ",
    81: "mưa rào",
    82: "mưa rào rất to",
    95: "dông",
    96: "dông kèm mưa đá",
    99: "dông mạnh kèm mưa đá",
}


def _label(code: Any) -> str:
    try:
        return _WMO_LABELS.get(int(code), f"mã thời tiết {code}")
    except (TypeError, ValueError):
        return "không rõ"


# Heuristic hazard thresholds for this mountainous flash-flood/landslide context. These are
# rule-of-thumb defaults, NOT official KTTV/PCTT criteria — the resident-facing copy says so.
# WMO codes: 65 heavy rain, 82 violent showers, 95 thunderstorm, 96/99 thunderstorm w/ hail.
_DANGER_CODES = {96, 99}
_WARNING_CODES = {65, 82, 95}
_WATCH_CODES = {45, 48, 63, 81}


def _numeric(values: Any) -> list[float]:
    out: list[float] = []
    if isinstance(values, list):
        for v in values:
            try:
                out.append(float(v))
            except (TypeError, ValueError):
                continue
    return out


def _codes(values: Any) -> set[int]:
    out: set[int] = set()
    if isinstance(values, list):
        for v in values:
            try:
                out.add(int(v))
            except (TypeError, ValueError):
                continue
    return out


def _assess_risk(forecast: dict[str, Any]) -> RiskLevel:
    """Classify hazard risk from the forecast using precipitation, wind and weather codes.

    Conservative by design: escalate on the single worst day in the window.
    """
    daily = forecast.get("daily") or {}
    precip = _numeric(daily.get("precipitation_sum"))
    prob = _numeric(daily.get("precipitation_probability_max"))
    wind = _numeric(daily.get("wind_speed_10m_max"))
    codes = _codes(daily.get("weather_code"))

    max_precip = max(precip, default=0.0)
    max_prob = max(prob, default=0.0)
    max_wind = max(wind, default=0.0)

    if max_precip >= 80 or max_wind >= 60 or codes & _DANGER_CODES:
        return "danger"
    if max_precip >= 40 or max_wind >= 40 or codes & _WARNING_CODES:
        return "warning"
    if max_precip >= 15 or max_prob >= 70 or codes & _WATCH_CODES:
        return "watch"
    return "normal"


class WeatherAdvisoryService:
    """Fetches the live forecast for a point and asks the LLM what a resident should do.

    Orchestration only: Open-Meteo for data, OpenAIAdvisoryService for the recommendation. This
    is a support tool, not an official warning — the resident-facing copy must say so.
    """

    def __init__(self, open_meteo: OpenMeteoService, advisory: OpenAIAdvisoryService) -> None:
        self.open_meteo = open_meteo
        self.advisory = advisory

    async def recommend(self, request: WeatherActionRequest) -> WeatherActionPlan:
        forecast = await self.open_meteo.forecast(
            ForecastRequest(
                latitude=request.latitude,
                longitude=request.longitude,
                timezone=_TIMEZONE,
                current=_CURRENT_VARS,
                daily=_DAILY_VARS,
                forecast_days=_FORECAST_DAYS,
            )
        )
        risk_level = _assess_risk(forecast)

        # Normal weather → calm FYI, no LLM call and no action steps (avoids over-alerting).
        if risk_level == "normal":
            return self._normal_plan(forecast)

        context = self._format_context(forecast)
        return await self.advisory.suggest_weather_actions(
            weather_context=context,
            risk_level=risk_level,
            location_label=request.location_label,
            language=request.language,
        )

    def _normal_plan(self, forecast: dict[str, Any]) -> WeatherActionPlan:
        daily = forecast.get("daily") or {}
        tmax = _numeric(daily.get("temperature_2m_max"))
        tmin = _numeric(daily.get("temperature_2m_min"))
        current = forecast.get("current") or {}
        label = _label(current.get("weather_code")) if current else "ổn định"
        if tmin and tmax:
            temp = f", nhiệt độ khoảng {min(tmin):.0f}–{max(tmax):.0f}°C"
        else:
            temp = ""
        return WeatherActionPlan(
            risk_level="normal",
            weather_summary=f"Thời tiết {label}, lượng mưa thấp trong 3 ngày tới{temp}.",
            risk_note="Thời tiết bình thường, chưa ghi nhận nguy cơ thiên tai đáng kể.",
            summary="Không cần hành động đặc biệt — chỉ cần theo dõi dự báo như thường lệ.",
            steps=[],
            model_name="rule-based",
        )

    @staticmethod
    def _format_context(forecast: dict[str, Any]) -> str:
        lines: list[str] = []
        current = forecast.get("current") or {}
        if current:
            lines.append(
                "Hiện tại: {label}, nhiệt độ {temp}°C, mưa {rain}mm, gió {wind}km/h.".format(
                    label=_label(current.get("weather_code")),
                    temp=current.get("temperature_2m", "?"),
                    rain=current.get("precipitation", "?"),
                    wind=current.get("wind_speed_10m", "?"),
                )
            )

        daily = forecast.get("daily") or {}
        days = daily.get("time") or []
        for i, day in enumerate(days):
            lines.append(
                "{day}: {label}, {tmin}–{tmax}°C, tổng mưa {psum}mm, "
                "khả năng mưa {pprob}%, gió tối đa {wind}km/h.".format(
                    day=day,
                    label=_label(_at(daily, "weather_code", i)),
                    tmin=_at(daily, "temperature_2m_min", i),
                    tmax=_at(daily, "temperature_2m_max", i),
                    psum=_at(daily, "precipitation_sum", i),
                    pprob=_at(daily, "precipitation_probability_max", i),
                    wind=_at(daily, "wind_speed_10m_max", i),
                )
            )
        return "\n".join(lines) if lines else "Không có dữ liệu thời tiết."


def _at(daily: dict[str, Any], key: str, index: int) -> Any:
    values = daily.get(key)
    if isinstance(values, list) and index < len(values):
        return values[index]
    return "?"
