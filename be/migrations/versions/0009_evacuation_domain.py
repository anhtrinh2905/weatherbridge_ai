"""Add shelters, evacuation orders, assignments, routes, and safety events."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from geoalchemy2 import Geography, Geometry

revision: str = "0009_evacuation_domain"
down_revision: str | None = "0008_alert_delivery"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "shelters",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("code", sa.String(120), nullable=False),
        sa.Column("geo_location_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("location", Geography("POINT", srid=4326, spatial_index=False), nullable=False),
        sa.Column("capacity", sa.Integer(), nullable=True),
        sa.Column("contact_ciphertext", sa.LargeBinary(), nullable=True),
        sa.Column("contact_key_version", sa.String(60), nullable=True),
        sa.Column("accessibility", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("simulated", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["geo_location_id"], ["geo_locations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index("ix_shelters_code", "shelters", ["code"])
    op.create_index("ix_shelters_geo_location_id", "shelters", ["geo_location_id"])
    op.create_index("ix_shelters_status", "shelters", ["status"])
    op.create_index("ix_shelters_location_gist", "shelters", ["location"], postgresql_using="gist")

    op.create_table(
        "evacuation_orders",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("alert_id", sa.Uuid(), nullable=False),
        sa.Column("geo_location_id", sa.Uuid(), nullable=False),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("issued_by_profile_id", sa.Uuid(), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("instructions", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["alert_id"], ["alerts.id"]),
        sa.ForeignKeyConstraint(["geo_location_id"], ["geo_locations.id"]),
        sa.ForeignKeyConstraint(["issued_by_profile_id"], ["user_profiles.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("alert_id"),
    )
    op.create_index(
        "ix_evacuation_orders_geo_location_id", "evacuation_orders", ["geo_location_id"]
    )
    op.create_index("ix_evacuation_orders_status", "evacuation_orders", ["status"])

    op.create_table(
        "evacuation_zones",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("evacuation_order_id", sa.Uuid(), nullable=False),
        sa.Column("priority", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column(
            "geometry", Geometry("MULTIPOLYGON", srid=4326, spatial_index=False), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["evacuation_order_id"], ["evacuation_orders.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_evacuation_zones_evacuation_order_id", "evacuation_zones", ["evacuation_order_id"]
    )
    op.create_index(
        "ix_evacuation_zones_geometry_gist",
        "evacuation_zones",
        ["geometry"],
        postgresql_using="gist",
    )

    op.create_table(
        "evacuation_assignments",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("evacuation_order_id", sa.Uuid(), nullable=False),
        sa.Column("household_id", sa.Uuid(), nullable=True),
        sa.Column("resident_id", sa.Uuid(), nullable=True),
        sa.Column("shelter_id", sa.Uuid(), nullable=False),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "household_id IS NOT NULL OR resident_id IS NOT NULL", name="ck_evacuation_assignee"
        ),
        sa.ForeignKeyConstraint(
            ["evacuation_order_id"], ["evacuation_orders.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["household_id"], ["households.id"]),
        sa.ForeignKeyConstraint(["resident_id"], ["residents.id"]),
        sa.ForeignKeyConstraint(["shelter_id"], ["shelters.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_evacuation_assignments_evacuation_order_id",
        "evacuation_assignments",
        ["evacuation_order_id"],
    )
    op.create_index("ix_evacuation_assignments_status", "evacuation_assignments", ["status"])

    op.create_table(
        "resident_safety_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("resident_id", sa.Uuid(), nullable=False),
        sa.Column("evacuation_order_id", sa.Uuid(), nullable=True),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("recorded_by_profile_id", sa.Uuid(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["evacuation_order_id"], ["evacuation_orders.id"]),
        sa.ForeignKeyConstraint(["recorded_by_profile_id"], ["user_profiles.id"]),
        sa.ForeignKeyConstraint(["resident_id"], ["residents.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_resident_safety_events_resident_id", "resident_safety_events", ["resident_id"]
    )
    op.create_index(
        "ix_resident_safety_events_evacuation_order_id",
        "resident_safety_events",
        ["evacuation_order_id"],
    )
    op.create_index("ix_resident_safety_events_status", "resident_safety_events", ["status"])
    op.create_index(
        "ix_resident_safety_events_occurred_at", "resident_safety_events", ["occurred_at"]
    )

    op.create_table(
        "evacuation_routes",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("evacuation_order_id", sa.Uuid(), nullable=False),
        sa.Column("from_zone_id", sa.Uuid(), nullable=True),
        sa.Column("shelter_id", sa.Uuid(), nullable=False),
        sa.Column("path", Geometry("LINESTRING", srid=4326, spatial_index=False), nullable=False),
        sa.Column("distance_m", sa.Float(), nullable=False),
        sa.Column("estimated_minutes", sa.Integer(), nullable=False),
        sa.Column("hazard_run_id", sa.Uuid(), nullable=True),
        sa.Column("algorithm_version", sa.String(120), nullable=False),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["evacuation_order_id"], ["evacuation_orders.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["from_zone_id"], ["evacuation_zones.id"]),
        sa.ForeignKeyConstraint(["hazard_run_id"], ["hazard_runs.id"]),
        sa.ForeignKeyConstraint(["shelter_id"], ["shelters.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_evacuation_routes_evacuation_order_id", "evacuation_routes", ["evacuation_order_id"]
    )
    op.create_index("ix_evacuation_routes_status", "evacuation_routes", ["status"])
    op.create_index(
        "ix_evacuation_routes_path_gist", "evacuation_routes", ["path"], postgresql_using="gist"
    )


def downgrade() -> None:
    op.drop_index("ix_evacuation_routes_path_gist", table_name="evacuation_routes")
    op.drop_table("evacuation_routes")
    op.drop_table("resident_safety_events")
    op.drop_table("evacuation_assignments")
    op.drop_index("ix_evacuation_zones_geometry_gist", table_name="evacuation_zones")
    op.drop_table("evacuation_zones")
    op.drop_table("evacuation_orders")
    op.drop_index("ix_shelters_location_gist", table_name="shelters")
    op.drop_table("shelters")
