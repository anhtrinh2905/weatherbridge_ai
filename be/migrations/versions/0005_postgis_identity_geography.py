"""Enable PostGIS and extend the canonical geography registry."""

from collections.abc import Sequence
from datetime import UTC, datetime
from uuid import NAMESPACE_URL, uuid5

import sqlalchemy as sa
from alembic import op
from geoalchemy2 import Geography, Geometry

revision: str = "0005_postgis_identity_geography"
down_revision: str | None = "0004_archive_soil_layers"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


VILLAGES = (
    ("muong-pon-1", "Mường Pồn 1", 21.590, 103.025),
    ("muong-pon-2", "Mường Pồn 2", 21.595, 103.040),
    ("linh", "Lĩnh", 21.580, 103.015),
    ("tin-toc", "Tin Tốc", 21.605, 103.050),
    ("huoi-chan-1", "Huổi Chan 1", 21.615, 103.010),
    ("huoi-chan-2", "Huổi Chan 2", 21.620, 103.005),
    ("pung-giat-1", "Púng Giắt 1", 21.570, 103.060),
    ("pung-giat-2", "Púng Giắt 2", 21.565, 103.070),
    ("dinh-deo", "Đỉnh Đèo", 21.630, 103.020),
)


def _registry_id(code: str):
    return uuid5(NAMESPACE_URL, f"weatherbridge:geo:{code}")


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.add_column(
        "geo_locations",
        sa.Column("boundary", Geometry("MULTIPOLYGON", srid=4326, spatial_index=False)),
    )
    op.add_column(
        "geo_locations",
        sa.Column("centroid", Geography("POINT", srid=4326, spatial_index=False)),
    )
    op.add_column("geo_locations", sa.Column("admin_level", sa.Integer(), nullable=True))
    op.add_column(
        "geo_locations",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.create_index("ix_geo_locations_admin_level", "geo_locations", ["admin_level"])
    op.create_index("ix_geo_locations_is_active", "geo_locations", ["is_active"])
    op.create_index(
        "ix_geo_locations_boundary_gist", "geo_locations", ["boundary"], postgresql_using="gist"
    )
    op.create_index(
        "ix_geo_locations_centroid_gist", "geo_locations", ["centroid"], postgresql_using="gist"
    )

    bind = op.get_bind()
    now = datetime.now(UTC)
    bind.execute(
        sa.text(
            """
            INSERT INTO geo_locations (
                id, code, canonical_name, location_type, latitude, longitude,
                uncertainty_m, coordinate_source, coordinate_confidence,
                is_sampling_location, created_at, centroid, admin_level, is_active
            ) VALUES (
                :id, :code, :name, 'commune', :lat, :lon, 15000,
                'OpenStreetMap relation 19571212; registry-v1', 'C', true, :created_at,
                ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography, 3, true
            )
            ON CONFLICT (code) DO UPDATE SET
                canonical_name = EXCLUDED.canonical_name,
                centroid = EXCLUDED.centroid,
                admin_level = EXCLUDED.admin_level,
                is_active = true
            """
        ),
        {
            "id": _registry_id("commune-muong-pon"),
            "code": "commune-muong-pon",
            "name": "Xã Mường Pồn",
            "lat": 21.59,
            "lon": 103.03,
            "created_at": now,
        },
    )
    commune_id = bind.scalar(
        sa.text("SELECT id FROM geo_locations WHERE code = 'commune-muong-pon'")
    )
    for short_code, name, latitude, longitude in VILLAGES:
        code = f"village-{short_code}"
        bind.execute(
            sa.text(
                """
                INSERT INTO geo_locations (
                    id, code, canonical_name, parent_id, location_type, latitude, longitude,
                    uncertainty_m, coordinate_source, coordinate_confidence,
                    is_sampling_location, created_at, centroid, admin_level, is_active
                ) VALUES (
                    :id, :code, :name, :parent_id, 'village', :lat, :lon, 800,
                    'Synthetic demo centroid; registry-v1', 'exercise_only', false, :created_at,
                    ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography, 4, true
                )
                ON CONFLICT (code) DO UPDATE SET
                    canonical_name = EXCLUDED.canonical_name,
                    parent_id = EXCLUDED.parent_id,
                    latitude = COALESCE(geo_locations.latitude, EXCLUDED.latitude),
                    longitude = COALESCE(geo_locations.longitude, EXCLUDED.longitude),
                    centroid = EXCLUDED.centroid,
                    admin_level = EXCLUDED.admin_level,
                    is_active = true
                """
            ),
            {
                "id": _registry_id(code),
                "code": code,
                "name": f"Bản {name}",
                "parent_id": commune_id,
                "lat": latitude,
                "lon": longitude,
                "created_at": now,
            },
        )


def downgrade() -> None:
    op.drop_index("ix_geo_locations_centroid_gist", table_name="geo_locations")
    op.drop_index("ix_geo_locations_boundary_gist", table_name="geo_locations")
    op.drop_index("ix_geo_locations_is_active", table_name="geo_locations")
    op.drop_index("ix_geo_locations_admin_level", table_name="geo_locations")
    op.drop_column("geo_locations", "is_active")
    op.drop_column("geo_locations", "admin_level")
    op.drop_column("geo_locations", "centroid")
    op.drop_column("geo_locations", "boundary")
    # Do not drop PostGIS: other schemas or extensions may already depend on it.
