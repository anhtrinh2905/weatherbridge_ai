from pydantic import BaseModel, Field


class ReverseGeocodeRequest(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class ReverseGeocodeResponse(BaseModel):
    displayName: str
    latitude: float
    longitude: float
    source: str = "nominatim"
