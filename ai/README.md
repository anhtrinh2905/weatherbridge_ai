# AI offline

This folder is only for work that happens before deployment:

- data preparation;
- training and fine-tuning;
- optional pretraining;
- offline evaluation;
- experiment runs and model records.

Online AI is implemented in `be/src/ai` and `be/src/services`. LiteLLM and
Langfuse are backend dependencies/backing services. This folder has no API,
worker, Docker image, or production port.

## Simple layout

```text
ai/
├── src/
│   ├── main.py
│   ├── config.py
│   ├── data.py
│   ├── train.py
│   ├── pretrain.py
│   ├── evaluate.py
│   └── registry.py
├── data/
│   ├── raw/
│   ├── processed/
│   └── manifests/
├── runs/
├── notebooks/
├── tests/
├── config.yaml
└── pyproject.toml
```

The maximum useful depth is three levels. Add a new file before adding a new
folder. Move to a deeper structure only when a real training pipeline requires
it.

## Commands

```bash
PYTHONPATH=ai/src uv run --project ai python ai/src/main.py prepare
PYTHONPATH=ai/src uv run --project ai python ai/src/main.py train
PYTHONPATH=ai/src uv run --project ai python ai/src/main.py pretrain
PYTHONPATH=ai/src uv run --project ai python ai/src/main.py evaluate
```

## Landslide-susceptibility PoC (M1)

Replaces the deterministic frontend heuristic (`fe/src/features/demo`) with a
trained model for the *static terrain* part of the risk raster. The rainfall
intensity–duration (I–D) trigger stays a separate factor, combined with
susceptibility at serving time, so the "Địa hình / Kích hoạt mưa" split in the
UI stays meaningful.

Pipeline (`ai/src`):

- `terrain.py` — DEM → conditioning factors (slope, aspect, curvature, TWI,
  roughness, elevation). Pure NumPy; the feature order in `FEATURE_NAMES` is
  the contract shared by training and serving.
- `data.py` — `prepare` reads a reviewed manifest, loads the DEM (Copernicus
  GLO-30 via rasterio; `.npy` for tests), samples inventoried landslides as
  positives + stable cells as pseudo-negatives, and writes a feature table.
  `spatial_split` holds out whole blocks to curb spatial-autocorrelation
  leakage.
- `train.py` — fits a `GradientBoostingClassifier`, saves a `joblib` artifact +
  a `ModelRecord`, and reports feature importances.
- `evaluate.py` — `evaluate_predictions` reports ROC-AUC (discrimination) and
  Brier score (calibration → the "Độ tin cậy" readout).

Data is not committed. To run on real data: copy
`data/manifests/muong_pon_landslide.example.yaml` to a non-`.example` name,
download the GLO-30 tile it references into `data/raw/`, digitise the
inventory (COOLR VN subset + the 25/07/2024 Mường Pồn event), then run
`prepare` → `train` → `evaluate`. Record every source in
`docs/compliance/oss-register.yaml` first.

### M2-terrain status (2026-07-18)

The DEM and the geographic-label pipeline are in place; the training run is
gated on a real landslide inventory.

- **DEM — done.** `scripts/fetch_dem.py` pulls the Copernicus GLO-30 window for
  the Mường Pồn AOI from the AWS Open Data mirror (`copernicus-dem-30m`, no API
  key), merging the tiles it spans. Output: `data/raw/muong_pon_glo30.tif`
  (900×900 px, EPSG:4326; git-ignored).

  ```bash
  PYTHONPATH=ai/src uv run --project ai python ai/scripts/fetch_dem.py
  ```

- **Labels — pipeline ready, inventory pending.** Manifests now accept
  geographic points via `labels_lonlat: [{lat, lon}]`; `data.lonlat_to_rowcol`
  converts them to DEM pixels using the raster's own georeferencing (no
  hand-computed indices). `scripts/geocode_labels.py` attempts OSM geocoding of
  the affected hamlets, but **OSM does not cover them** (only the commune
  centroid resolves), and NASA COOLR's data.nasa.gov endpoint is retired. So
  `data/manifests/muong_pon_landslide.yaml` ships with an empty inventory and
  `prepare` returns `awaiting_labels` until real points are added — digitised
  scarps from the district report / satellite imagery, or the VIGMR/SFLP
  inventory via data request.

- **To finish training:** add `labels_lonlat` points to the manifest, then
  `prepare` → `train` → `evaluate`.

Extra dependencies: `numpy`, `scikit-learn`, `joblib` (pipeline + model),
`rasterio` (GeoTIFF I/O, imported lazily).

## Rainfall bias-correction (M2 — Mường Pồn)

The *rainfall trigger* side of the risk raster. `bias_correction.py` learns to
correct the raw GFS precipitation forecast toward the ERA5/ERA5-Land
observation, so the intensity–duration trigger is fed a de-biased rainfall
series. This is orthogonal to the terrain susceptibility model above and is
combined with it at serving time.

- Input: the paired `training_samples.csv` (forecast columns joined to observed
  columns per location/valid-time), Mường Pồn commune subset only, under
  `ai/data/raw/muong_pon/` (git-ignored, never committed).
- Features: `FORECAST_FEATURES` — forecast variables + cyclic season/hour terms.
  The target is fit in `log1p` space (hourly precip is zero-inflated and
  right-skewed; on raw mm a squared loss chases the dry-hour mean and raises
  MAE). Model: `HistGradientBoostingRegressor`, which handles the many missing
  forecast fields natively.
- Split: `temporal_split` holds out the latest 20% by valid-time — a forward
  hold-out, since correction is deployed on future forecasts.
- Metrics: `evaluate_bias_correction` reports MAE, RMSE and mean bias for raw
  vs corrected, plus an MAE skill score.

Run it:

```bash
PYTHONPATH=ai/src uv run --project ai python ai/src/main.py bias-correct
```

Latest Mường Pồn hold-out (45,045 rows): MAE 0.274 → 0.225 (+18%), RMSE
0.819 → 0.641 (+22%), bias ≈ 0. Artifact + `ModelRecord` land in `ai/runs/`.

## Rainfall I–D trigger (M2 — Mường Pồn)

`rainfall_trigger.py` turns a rainfall series into a graduated **5-level**
warning (the UI's "raster nguy cơ 5 cấp") by comparing the storm to an
empirical intensity–duration threshold. It is the *trigger* factor, combined
with terrain susceptibility at serving time.

End-to-end pipeline (`main.py rainfall-trigger`), on real Open-Meteo data:

```
training_samples.csv (GFS forecast + ERA5 obs, Mường Pồn)
  → load_location_series   one hourly series per valid-time (min-lead forecast)
  → bias-correction model  raw GFS → de-biased forecast
  → id_exceedance          cum rainfall over 3/6/12/24 h vs C(D)=α·D^(1−β)
  → trigger_levels         5 levels (không / thấp / trung bình / cao / rất cao)
```

Design decisions (grounded in the data, honest about limits):

- **Group B features only** — cumulative windows (1/3/6/12/24 h) and antecedent
  totals (3/7/15 d). Soil moisture (Group C) is deliberately excluded: it is
  absent from the GFS forecast product (only ERA5 observations carry it), so
  using it would create train/serve skew.
- **Calibrate, don't learn.** With one verified local event we tune, not train:
  `calibrate_alpha` scales the threshold so the 25/07/2024 event lands at the
  "cao" level. Calibration runs on the *same* series the trigger operates on —
  the bias-corrected forecast is damped relative to ERA5, so a threshold tuned
  on observations under-fires on it.
- **Rainfall is necessary, not sufficient.** The event sits at the ~98th
  rainfall percentile in every series, so a threshold that catches it also
  fires on other heavy rain (levels: ~1.5 % "cao", ~0.3 % "rất cao"). That
  residual is expected — terrain susceptibility is what narrows a rainfall
  trigger down to actual risk.

Run it (needs the bias-correction artifact from `bias-correct` first):

```bash
PYTHONPATH=ai/src uv run --project ai python ai/src/main.py rainfall-trigger
```

Latest Mường Pồn run: the 25/07/2024 event fires at level 3 ("cao") on the
bias-corrected forecast, detected = True.

## Composite risk = terrain × trigger (M2 — Mường Pồn)

`risk.py` combines the two factors into the risk raster (`main.py risk`):

```
DEM (real GLO-30)  → susceptibility_index   per-pixel 0..1 (spatial, static)
rainfall series    → id_exceedance          per-location ratio (temporal)
                     composite_risk = susceptibility × trigger_strength
                     risk_levels            5 levels
```

- **Susceptibility** is a physically-motivated *heuristic* today (slope / TWI /
  roughness). `susceptibility_index(dem, model=...)` accepts a fitted
  classifier, so the trained `GradientBoostingClassifier` drops in behind the
  same interface once an inventory exists (M2-terrain) — no downstream change.
- **AND semantics.** Risk is the product, so it is high only where susceptible
  terrain and an active trigger coincide. Same terrain, 25/07/2024 event vs a
  dry hour:

  | Risk level | Event (trigger 1.6) | Dry (trigger 0.19) |
  |------------|--------------------:|-------------------:|
  | cao + rất cao | 33.1 % of area | 0 % |
  | trung bình | 43.9 % | 0 % |
  | không / thấp | 23 % | 100 % |

  The terrain "lights up" only under the trigger — the empirical basis for the
  two-factor design.

```bash
PYTHONPATH=ai/src uv run --project ai python ai/src/main.py risk
```
