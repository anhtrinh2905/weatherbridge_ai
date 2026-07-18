"""Train the landslide-susceptibility classifier.

Gradient-boosted trees on the terrain conditioning factors: strong on tabular
geospatial features, CPU-only, and explainable via feature importances that
feed the UI's "Địa hình / Kích hoạt mưa" breakdown. The rainfall I–D trigger
stays outside this model and is combined at serving time, so this stage learns
only the *static* susceptibility surface.

Training is offline only. Serving loads the saved artifact for inference — no
fitting happens in the API request path (see ``AGENTS.md``).
"""

from __future__ import annotations

import json

import joblib
import numpy as np
from sklearn.ensemble import GradientBoostingClassifier

from config import Config, load_config
from data import PROCESSED_DIR, ROOT, spatial_split
from evaluate import evaluate_predictions
from registry import ModelRecord
from terrain import FEATURE_NAMES

RUNS_DIR = ROOT / "runs"


def fit_model(X: np.ndarray, y: np.ndarray, config: Config) -> GradientBoostingClassifier:
    model = GradientBoostingClassifier(
        n_estimators=config.n_estimators,
        max_depth=config.max_depth,
        learning_rate=config.learning_rate,
        random_state=config.seed,
    )
    model.fit(X, y)
    return model


def _load_processed() -> tuple[np.ndarray, np.ndarray, np.ndarray] | None:
    if not PROCESSED_DIR.exists():
        return None
    artifacts = sorted(PROCESSED_DIR.glob("*.npz"))
    if not artifacts:
        return None
    data = np.load(artifacts[0])
    return data["X"], data["y"], data["coords"]


def train(config: Config | None = None) -> dict[str, object]:
    config = config or load_config()
    loaded = _load_processed()
    if loaded is None:
        return {
            "status": "awaiting_data",
            "next": "run `prepare` after adding a manifest + DEM under ai/data",
        }

    X, y, coords = loaded
    val_mask = spatial_split(coords, seed=config.seed)
    # Guard degenerate splits from tiny inventories: fall back to train-on-all.
    if val_mask.all() or (~val_mask).all() or y[~val_mask].sum() == 0:
        val_mask = np.zeros(len(y), dtype=bool)

    model = fit_model(X[~val_mask], y[~val_mask], config)

    if val_mask.any():
        metrics = evaluate_predictions(y[val_mask], model.predict_proba(X[val_mask])[:, 1])
    else:
        metrics = evaluate_predictions(y, model.predict_proba(X)[:, 1])

    RUNS_DIR.mkdir(parents=True, exist_ok=True)
    artifact = RUNS_DIR / f"{config.experiment}_susceptibility.joblib"
    joblib.dump({"model": model, "features": list(FEATURE_NAMES)}, artifact)

    importances = dict(
        sorted(
            zip(FEATURE_NAMES, model.feature_importances_.tolist(), strict=True),
            key=lambda kv: kv[1],
            reverse=True,
        )
    )
    record = ModelRecord(
        name=f"{config.experiment}-susceptibility",
        version="0.1.0-poc",
        data=config.data,
        license="training-code Apache-2.0; see data manifests for dataset licences",
        artifact=str(artifact.relative_to(ROOT)),
        report=json.dumps({"metrics": metrics, "importances": importances}),
    )
    (RUNS_DIR / f"{config.experiment}_record.json").write_text(
        record.model_dump_json(indent=2), encoding="utf-8"
    )

    return {
        "status": "trained",
        "model": "GradientBoostingClassifier",
        "train_samples": int((~val_mask).sum()) if val_mask.any() else int(y.size),
        "val_samples": int(val_mask.sum()),
        "metrics": metrics,
        "importances": importances,
        "artifact": str(artifact.relative_to(ROOT)),
    }
