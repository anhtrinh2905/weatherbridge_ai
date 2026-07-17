from statistics import mean


def evaluate(scores: list[float] | None = None) -> dict[str, float]:
    values = scores or []
    return {"count": float(len(values)), "mean": mean(values) if values else 0.0}
