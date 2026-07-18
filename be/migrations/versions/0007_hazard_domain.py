"""Add versioned hazard runs, raster manifests, zones, and thresholds."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from geoalchemy2 import Geometry

revision: str = "0007_hazard_domain"
down_revision: str | None = "0006_resident_registry"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "hazard_model_versions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("hazard_type", sa.String(30), nullable=False),
        sa.Column("calibration_version", sa.String(120), nullable=False),
        sa.Column("feature_stack_version", sa.String(120), nullable=False),
        sa.Column("checksum", sa.String(64), nullable=False),
        sa.Column("provenance", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("hazard_type", "checksum", name="uq_hazard_model_checksum"),
    )
    op.create_index(
        "ix_hazard_model_versions_hazard_type", "hazard_model_versions", ["hazard_type"]
    )
    op.create_index("ix_hazard_model_versions_status", "hazard_model_versions", ["status"])

    op.create_table(
        "hazard_runs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("hazard_type", sa.String(30), nullable=False),
        sa.Column("model_version_id", sa.Uuid(), nullable=False),
        sa.Column("input_ingestion_run_id", sa.Uuid(), nullable=True),
        sa.Column("issued_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("valid_from", sa.DateTime(timezone=True), nullable=False),
        sa.Column("valid_to", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("quality_flags", sa.JSON(), nullable=False),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "hazard_type IN ('flash_flood','landslide','fog')", name="ck_hazard_run_type"
        ),
        sa.ForeignKeyConstraint(["input_ingestion_run_id"], ["ingestion_runs.id"]),
        sa.ForeignKeyConstraint(["model_version_id"], ["hazard_model_versions.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "hazard_type", "model_version_id", "issued_at", name="uq_hazard_run_issue"
        ),
    )
    op.create_index("ix_hazard_runs_hazard_type", "hazard_runs", ["hazard_type"])
    op.create_index("ix_hazard_runs_issued_at", "hazard_runs", ["issued_at"])
    op.create_index("ix_hazard_runs_status", "hazard_runs", ["status"])

    op.create_table(
        "hazard_layers",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("run_id", sa.Uuid(), nullable=False),
        sa.Column("hazard_type", sa.String(30), nullable=False),
        sa.Column("forecast_day", sa.Date(), nullable=False),
        sa.Column("is_current", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("cog_object_key", sa.Text(), nullable=False),
        sa.Column("png_object_key", sa.Text(), nullable=False),
        sa.Column("bbox", sa.JSON(), nullable=False),
        sa.Column("crs", sa.String(30), nullable=False, server_default="EPSG:32648"),
        sa.Column("resolution_m", sa.Float(), nullable=False),
        sa.Column("level_bins", sa.JSON(), nullable=False),
        sa.Column("legend", sa.JSON(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("contribution_summary", sa.JSON(), nullable=False),
        sa.Column("checksum", sa.String(64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["run_id"], ["hazard_runs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("run_id", "hazard_type", "forecast_day", name="uq_hazard_layer_run"),
    )
    op.create_index("ix_hazard_layers_run_id", "hazard_layers", ["run_id"])
    op.create_index("ix_hazard_layers_hazard_type", "hazard_layers", ["hazard_type"])
    op.create_index("ix_hazard_layers_forecast_day", "hazard_layers", ["forecast_day"])
    op.create_index("ix_hazard_layers_is_current", "hazard_layers", ["is_current"])
    op.create_index(
        "uq_hazard_layer_current",
        "hazard_layers",
        ["hazard_type", "forecast_day"],
        unique=True,
        postgresql_where=sa.text("is_current"),
    )

    op.create_table(
        "hazard_zones",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("hazard_layer_id", sa.Uuid(), nullable=False),
        sa.Column("risk_level", sa.Integer(), nullable=False),
        sa.Column("score_min", sa.Float(), nullable=False),
        sa.Column("score_max", sa.Float(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column(
            "geometry", Geometry("MULTIPOLYGON", srid=4326, spatial_index=False), nullable=False
        ),
        sa.CheckConstraint("risk_level BETWEEN 1 AND 5", name="ck_hazard_zone_level"),
        sa.ForeignKeyConstraint(["hazard_layer_id"], ["hazard_layers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_hazard_zones_hazard_layer_id", "hazard_zones", ["hazard_layer_id"])
    op.create_index("ix_hazard_zones_risk_level", "hazard_zones", ["risk_level"])
    op.create_index(
        "ix_hazard_zones_geometry_gist",
        "hazard_zones",
        ["geometry"],
        postgresql_using="gist",
    )

    op.create_table(
        "threshold_configs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("geo_location_id", sa.Uuid(), nullable=True),
        sa.Column("hazard_type", sa.String(30), nullable=False),
        sa.Column("minimum_alert_level", sa.Integer(), nullable=False),
        sa.Column("go_now_level", sa.Integer(), nullable=False),
        sa.Column("effective_from", sa.DateTime(timezone=True), nullable=False),
        sa.Column("effective_to", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by_profile_id", sa.Uuid(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("minimum_alert_level BETWEEN 1 AND 5", name="ck_threshold_min"),
        sa.CheckConstraint("go_now_level BETWEEN 1 AND 5", name="ck_threshold_go_now"),
        sa.ForeignKeyConstraint(["created_by_profile_id"], ["user_profiles.id"]),
        sa.ForeignKeyConstraint(["geo_location_id"], ["geo_locations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_threshold_configs_geo_location_id", "threshold_configs", ["geo_location_id"]
    )
    op.create_index("ix_threshold_configs_hazard_type", "threshold_configs", ["hazard_type"])
    op.create_index("ix_threshold_configs_effective_from", "threshold_configs", ["effective_from"])


def downgrade() -> None:
    op.drop_table("threshold_configs")
    op.drop_index("ix_hazard_zones_geometry_gist", table_name="hazard_zones")
    op.drop_table("hazard_zones")
    op.drop_table("hazard_layers")
    op.drop_table("hazard_runs")
    op.drop_table("hazard_model_versions")
