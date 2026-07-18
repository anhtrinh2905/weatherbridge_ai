import numpy as np
import pytest

from config import Config
from data import LabelPoint, sample_dataset, spatial_split, split
from evaluate import evaluate, evaluate_predictions
from pretrain import pretrain
from terrain import FEATURE_NAMES, feature_stack, terrain_features
from train import fit_model


def _synthetic_dem(size: int = 48, seed: int = 0) -> np.ndarray:
    """A tilted plane + a diagonal ridge — enough structure for slope/TWI."""
    rng = np.random.default_rng(seed)
    ys, xs = np.mgrid[0:size, 0:size]
    ridge = 40.0 * np.exp(-((xs - ys) ** 2) / (2 * 6.0**2))
    return 800.0 + 0.5 * xs + ridge + rng.normal(0, 0.5, size=(size, size))


def test_terrain_features_shapes_and_keys() -> None:
    dem = _synthetic_dem()
    features = terrain_features(dem, cellsize=30.0)
    assert set(features) == set(FEATURE_NAMES)
    for name in FEATURE_NAMES:
        assert features[name].shape == dem.shape
        assert np.isfinite(features[name]).all()
    assert (features["slope"] >= 0).all()
    assert feature_stack(dem, 30.0).shape == (*dem.shape, len(FEATURE_NAMES))


def test_terrain_features_rejects_non_2d() -> None:
    with pytest.raises(ValueError):
        terrain_features(np.zeros((4, 4, 4)), cellsize=30.0)


def test_sample_dataset_builds_balanced_labels() -> None:
    dem = _synthetic_dem()
    labels = [LabelPoint(row=10, col=12), LabelPoint(row=30, col=28)]
    ds = sample_dataset(dem, 30.0, labels, negative_ratio=2.0, seed=1)
    assert ds["X"].shape == (len(labels) * 3, len(FEATURE_NAMES))
    assert ds["y"].sum() == len(labels)
    assert set(np.unique(ds["y"]).tolist()) == {0, 1}


def test_sample_dataset_rejects_out_of_bounds_label() -> None:
    dem = _synthetic_dem(size=16)
    with pytest.raises(ValueError):
        sample_dataset(dem, 30.0, [LabelPoint(row=99, col=1)])


def test_spatial_split_holds_out_blocks() -> None:
    coords = np.array([[r, c] for r in range(40) for c in range(40)])
    mask = spatial_split(coords, block_size=8, val_ratio=0.25, seed=3)
    assert mask.any() and not mask.all()


def test_fit_model_learns_separable_signal() -> None:
    dem = _synthetic_dem()
    # Positives on the steep ridge diagonal, negatives on the flat plane.
    labels = [LabelPoint(row=i, col=i) for i in range(6, 42, 3)]
    ds = sample_dataset(dem, 30.0, labels, negative_ratio=3.0, seed=2)
    model = fit_model(ds["X"], ds["y"], Config(n_estimators=50))
    metrics = evaluate_predictions(ds["y"], model.predict_proba(ds["X"])[:, 1])
    assert metrics["auc"] > 0.8


def test_generic_helpers_retained() -> None:
    assert split(["a", "b", "c", "d"], 0.5) == (["a", "b"], ["c", "d"])
    assert evaluate([0.25, 0.75])["mean"] == 0.5
    assert pretrain()["status"].startswith("requires_")
