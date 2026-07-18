from pydantic import BaseModel


class ForecastLocation(BaseModel):
    code: str
    name: str
    latitude: float
    longitude: float


# MVP scope is the single commune of Mường Pồn (PRD). Adding a province later
# means adding locations here — the ingest pipeline does not change.
LOCATIONS: dict[str, ForecastLocation] = {
    "muong-pon": ForecastLocation(
        code="muong-pon",
        name="Xã Mường Pồn, Điện Biên",
        latitude=21.59,
        longitude=103.03,
    ),
}
