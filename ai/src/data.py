from datetime import UTC, datetime


def prepare() -> dict[str, str]:
    return {
        "status": "not_configured",
        "created_at": datetime.now(UTC).isoformat(),
        "next": "add a reviewed manifest under ai/data/manifests",
    }


def split(items: list[str], ratio: float = 0.8) -> tuple[list[str], list[str]]:
    boundary = int(len(items) * ratio)
    return items[:boundary], items[boundary:]
