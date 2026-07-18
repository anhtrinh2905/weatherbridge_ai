from pydantic import BaseModel


class ForecastLocation(BaseModel):
    code: str
    name: str
    latitude: float
    longitude: float
    # Rainfall I–D trigger constants, calibrated offline against the location's
    # historical forecast series (see ai/ rainfall_trigger). ``trigger_alpha``
    # scales the cumulative threshold C(D)=alpha·D^(1-beta); it is calibrated on
    # the RAW forecast series (robust for extreme detection — see ai/README).
    trigger_alpha: float = 5.0
    trigger_beta: float = 0.5
    # Representative terrain susceptibility (0..1) for the commune-level scalar
    # risk. The per-pixel susceptibility raster stays in the frontend; this is a
    # heuristic summary until the trained susceptibility model is available.
    terrain_factor: float = 0.5


# MVP scope is the single commune of Mường Pồn (PRD). Adding a province later
# means adding locations here — the ingest pipeline does not change.
LOCATIONS: dict[str, ForecastLocation] = {
    "muong-pon": ForecastLocation(
        code="muong-pon",
        name="Xã Mường Pồn, Điện Biên",
        latitude=21.59,
        longitude=103.03,
        trigger_alpha=4.85,  # calibrated on raw GFS forecast; 25/07/2024 event → "cao"
        trigger_beta=0.5,
        terrain_factor=0.6,
    ),
}
