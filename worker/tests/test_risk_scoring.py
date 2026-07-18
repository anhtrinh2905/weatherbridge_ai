from modules.forecasts.locations import LOCATIONS

from forecast_ingest import enrich_days
from risk_scoring import (
    bias_correct_hourly,
    daily_max_exceedance,
    id_exceedance_series,
    risk_level,
    trigger_level,
)


def test_id_exceedance_series_fires_on_burst_not_dry() -> None:
    dry = id_exceedance_series([0.0] * 6, alpha=4.85)
    burst = id_exceedance_series([0.0, 5.0, 5.0, 5.0, 0.0, 0.0], alpha=4.85)
    assert max(dry) == 0.0
    assert max(burst) > 1.0


def test_trigger_and_risk_level_boundaries() -> None:
    assert trigger_level(0.3) == 0
    assert trigger_level(1.6) == 3
    assert trigger_level(2.5) == 4
    # risk = normalised_trigger(ratio) * terrain_factor, binned on RISK_BOUNDS
    assert risk_level(0.0, 0.6) == 0
    assert risk_level(1.6, 0.6) > risk_level(0.5, 0.6)


def test_daily_max_exceedance_groups_by_date() -> None:
    # Day 1 is dry and precedes the rain; trailing windows look backward, so it
    # scores ~0 while day 2 (the burst) scores high.
    day1 = [(f"2024-07-24T{h:02d}:00", 0.0) for h in range(24)]
    day2 = [(f"2024-07-25T{h:02d}:00", 6.0 if 0 <= h < 3 else 0.0) for h in range(24)]
    times = [t for t, _ in day1 + day2]
    precip = [v for _, v in day1 + day2]
    per_day = daily_max_exceedance(times, precip, alpha=4.85)
    assert per_day["2024-07-25"] > 1.0
    assert per_day["2024-07-24"] == 0.0


def test_bias_correct_returns_none_when_disabled() -> None:
    hourly = {"time": ["2024-07-25T00:00"], "precipitation": [5.0]}
    assert bias_correct_hourly(hourly, model_path=None) is None
    assert bias_correct_hourly(hourly, model_path="/no/such/model.joblib") is None


def test_enrich_days_adds_risk_fields() -> None:
    data = {
        "daily": {"time": ["2024-07-25"], "precipitation_sum": [30.0]},
        "hourly": {
            "time": [f"2024-07-25T{h:02d}:00" for h in range(6)],
            "precipitation": [0.0, 6.0, 6.0, 6.0, 0.0, 0.0],
        },
    }
    days = [{"date": "2024-07-25", "rainfall_mm": 30.0, "peak_intensity_mm_h": 6.0}]
    enriched = enrich_days(days, data, LOCATIONS["muong-pon"], model_path=None)
    day = enriched[0]
    assert day["id_exceedance"] > 0
    assert 0 <= day["trigger_level"] <= 4
    assert 0 <= day["risk_level"] <= 4
    assert day["bias_corrected"] is False
    # model disabled → corrected mirrors raw daily rainfall
    assert day["corrected_rainfall_mm"] == 30.0
