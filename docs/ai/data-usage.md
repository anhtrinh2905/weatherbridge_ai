# Hướng dẫn sử dụng dữ liệu nghiên cứu

## Tổng quan

Dữ liệu forecast + observation của 7 xã lấy mẫu tỉnh Điện Biên, phục vụ
training mô hình dự báo lũ quét và sạt lở đất.

Kho dữ liệu gồm:

| Bảng | Số dòng | Kích thước |
|---|---|---|
| `forecast_hourly` | 1.576.512 | 638 MB |
| `weather_observation_hourly` | 326.592 | 113 MB |
| `geo_locations` | 23 (7 sampling) | 5 KB |
| `disaster_events` | 3 | 1 KB |

## 1. Load CSV với Pandas

Tất cả file nằm trong `data/processed/training/`:

```python
import pandas as pd

locations = pd.read_csv("data/processed/training/locations.csv")
events = pd.read_csv("data/processed/training/disaster_events.csv")
forecast = pd.read_csv("data/processed/training/forecast_hourly.csv")
observations = pd.read_csv("data/processed/training/weather_observation_hourly.csv")
samples = pd.read_csv("data/processed/training/training_samples.csv")
```

### Cột quan trọng trong `forecast_hourly`

| Cột | Ý nghĩa |
|---|---|
| `valid_time_utc` | Thời điểm dự báo (hourly) |
| `lead_hours` | Độ dài lead time (giờ) |
| `issue_time_utc` | Thời điểm phát hành forecast run |
| `product` | `historical_forecast` hoặc `previous_runs` |
| `precipitation_mm` | Lượng mưa dự báo |
| `cape_j_kg` | CAPE — năng lượng đối lưu |
| `soil_moisture_*` | Độ ẩm đất 5 lớp (ERA5-Land) |
| `quality_flags` | JSON: danh sách flag nếu có vấn đề |

### Cột quan trọng trong `weather_observation_hourly`

Giống forecast_hourly nhưng là số liệu tái phân tích ERA5/ERA5-Land (xem như
ground truth). Có thêm 4 lớp soil moisture (`soil_moisture_0_to_7cm` đến
`soil_moisture_100_to_255cm`) theo phân giải ERA5-Land chuẩn.

### Cột quan trọng trong `training_samples.csv`

File này là join giữa forecast và observation theo `(location_id, valid_time_utc)`.
Mỗi dòng = 1 forecast row ghép với observation cùng thời điểm. Tiền tố `forecast_*`
= features, `observed_*` = targets, `soil_moisture_*` = observation-only.

```python
samples = pd.read_csv("data/processed/training/training_samples.csv")
features = [c for c in samples.columns if c.startswith("forecast_")]
targets  = [c for c in samples.columns if c.startswith("observed_")]

X = samples[features]
y = samples[targets]
```

## 2. Chiến lược split

### Temporal split (khuyến nghị)

Chia theo thời gian — train trên 2021–2023, validation 2024, test 2025:

```python
samples["valid_time_utc"] = pd.to_datetime(samples["valid_time_utc"])
train = samples[samples["valid_time_utc"] < "2024-01-01"]
val   = samples[(samples["valid_time_utc"] >= "2024-01-01") & (samples["valid_time_utc"] < "2025-01-01")]
test  = samples[samples["valid_time_utc"] >= "2025-01-01"]
```

### Spatial split

Giữ một xã làm test để đánh giá generalization:

```python
test_locations = ["commune-muong-pon"]  # Mường Pồn — backtest-only
train = samples[~samples["location_code"].isin(test_locations)]
test  = samples[samples["location_code"].isin(test_locations)]
```

### Event-group split

Không để các dòng cùng một sự kiện lũ tràn sang cả train và test:

```python
event_times = set(events["started_at_utc"])
```

## 3. Feature engineering gợi ý

### Accumulated precipitation

Tạo features mưa tích lũy từ forecast:

```python
samples["rain_6h"] = (
    samples.groupby("location_code")["forecast_precipitation_mm"]
    .rolling(6, min_periods=1).sum().reset_index(0, drop=True)
)
samples["rain_24h"] = (
    samples.groupby("location_code")["forecast_precipitation_mm"]
    .rolling(24, min_periods=1).sum().reset_index(0, drop=True)
)
```

### Soil moisture delta

```python
samples["soil_delta_shallow"] = (
    samples["soil_moisture_0_to_7cm"]
    - samples.groupby("location_code")["soil_moisture_0_to_7cm"].shift(24)
)
```

### Lead time bins

```python
samples["lead_bin"] = pd.cut(samples["lead_hours"], [0, 24, 72, 168, 336], labels=["0-1d", "1-3d", "3-7d", "7-14d"])
```

## 4. Truy vấn trực tiếp PostgreSQL

Kết nối qua SQLAlchemy:

```python
from sqlalchemy import create_engine, text

engine = create_engine("postgresql+asyncpg://user:pass@localhost:5432/weatherbridge")
```

Truy vấn coverage:

```sql
SELECT l.code, l.canonical_name,
       COUNT(f.id) AS forecast_rows,
       MIN(f.valid_time_utc) AS forecast_from,
       MAX(f.valid_time_utc) AS forecast_to
FROM geo_locations l
LEFT JOIN forecast_hourly f ON f.location_id = l.id
WHERE l.is_sampling_location = TRUE
GROUP BY l.code, l.canonical_name;
```

Truy vấn sự kiện + feature:

```sql
SELECT e.code, e.hazard_type, e.local_date,
       fl.impact_role, fl.fatalities,
       gl.canonical_name AS location_name
FROM disaster_events e
JOIN disaster_event_locations fl ON fl.event_id = e.id
JOIN geo_locations gl ON gl.id = fl.location_id;
```

## 5. Lưu ý

- **Không dùng synthetic coordinates**: 16 bản unresolved (confidence `C`) không
  có tọa độ — filter bằng `coordinate_confidence != 'unresolved'`.
- **best_match**: Observation dùng model `best_match` — Open-Meteo tự chọn ERA5
  mưa + ERA5-Land ẩm đất. Không ép `era5_land` vì thiếu precipitation.
- **quality_flags**: Cột JSON liệt kê vấn đề (missing variable, grid snap,
  unsupported). Không chuyển NULL về 0.
- **lead_hours**: product=`historical_forecast` dùng cho training;
  product=`previous_runs` mới đúng để đánh giá forecast skill.
- **CSV không commit**: File trong `data/processed/` được gitignore. Tái tạo
  bằng `make training-csv`.
