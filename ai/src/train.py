from config import Config, load_config


def train(config: Config | None = None) -> dict[str, str | int]:
    config = config or load_config()
    return {
        "status": "scaffold_only",
        "model": config.model,
        "data": config.data,
        "epochs": config.epochs,
    }
