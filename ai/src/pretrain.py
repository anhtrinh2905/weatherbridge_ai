from config import Config, load_config


def pretrain(config: Config | None = None) -> dict[str, str]:
    config = config or load_config()
    return {
        "status": "requires_approved_compute_and_data",
        "model": config.model,
        "data": config.data,
    }
