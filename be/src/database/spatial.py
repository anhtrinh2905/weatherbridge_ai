from typing import Any

from geoalchemy2 import Geography, Geometry
from geoalchemy2.elements import WKTElement
from sqlalchemy import JSON
from sqlalchemy.engine import Dialect
from sqlalchemy.types import TypeDecorator, TypeEngine


class SpatialValue(TypeDecorator[Any]):
    """PostGIS in production, GeoJSON-compatible JSON in SQLite tests."""

    impl = JSON
    cache_ok = True

    def __init__(
        self,
        geometry_type: str,
        srid: int = 4326,
        *,
        geography: bool = False,
    ) -> None:
        super().__init__()
        self.geometry_type = geometry_type
        self.srid = srid
        self.geography = geography

    def load_dialect_impl(self, dialect: Dialect) -> TypeEngine[Any]:
        if dialect.name == "postgresql":
            spatial_type: TypeEngine[Any]
            if self.geography:
                spatial_type = Geography(
                    geometry_type=self.geometry_type,
                    srid=self.srid,
                    spatial_index=False,
                )
            else:
                spatial_type = Geometry(
                    geometry_type=self.geometry_type,
                    srid=self.srid,
                    spatial_index=False,
                )
            return dialect.type_descriptor(spatial_type)
        return dialect.type_descriptor(JSON())


def point_value(dialect_name: str, longitude: float, latitude: float) -> Any:
    if dialect_name == "postgresql":
        return WKTElement(f"POINT({longitude} {latitude})", srid=4326)
    return {"type": "Point", "coordinates": [longitude, latitude]}
