"""Offline evaluation metrics for the susceptibility classifier.

Susceptibility is a probabilistic ranking problem, so discrimination
(ROC-AUC) and calibration (Brier score) matter more than raw accuracy. These
map directly onto the UI: AUC backs the map's ability to separate risk, and
Brier backs the "Độ tin cậy" confidence readout.
"""

from __future__ import annotations

import numpy as np
from sklearn.metrics import brier_score_loss, roc_auc_score


def evaluate_predictions(y_true: np.ndarray, y_prob: np.ndarray) -> dict[str, float]:
    """Discrimination + calibration metrics for probability predictions."""
    y_true = np.asarray(y_true)
    y_prob = np.asarray(y_prob, dtype=float)
    n = int(y_true.size)
    positives = int(y_true.sum())
    # AUC is undefined without both classes present in the hold-out.
    both_classes = 0 < positives < n
    return {
        "count": float(n),
        "positive_rate": positives / n if n else 0.0,
        "auc": float(roc_auc_score(y_true, y_prob)) if both_classes else float("nan"),
        "brier": float(brier_score_loss(y_true, y_prob)) if n else float("nan"),
    }


def evaluate(scores: list[float] | None = None) -> dict[str, float]:
    """Summarise a list of scores (retained for the CLI smoke command)."""
    values = np.asarray(scores or [], dtype=float)
    return {
        "count": float(values.size),
        "mean": float(values.mean()) if values.size else 0.0,
    }
