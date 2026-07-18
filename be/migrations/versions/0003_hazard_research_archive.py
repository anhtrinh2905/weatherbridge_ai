"""Normalized disaster inventory and historical weather research archive."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003_hazard_research_archive"
down_revision: str | None = "0002_forecast_snapshots"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "geo_locations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("code", sa.String(120), nullable=False),
        sa.Column("canonical_name", sa.String(255), nullable=False),
        sa.Column("parent_id", sa.Uuid(), nullable=True),
        sa.Column("location_type", sa.String(40), nullable=False),
        sa.Column("historical_admin_name", sa.String(255), nullable=True),
        sa.Column("current_admin_name", sa.String(255), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("impact_geometry", sa.JSON(), nullable=True),
        sa.Column("uncertainty_m", sa.Integer(), nullable=True),
        sa.Column("coordinate_source", sa.String(120), nullable=True),
        sa.Column("source_url", sa.Text(), nullable=True),
        sa.Column("coordinate_confidence", sa.String(20), nullable=False),
        sa.Column("is_sampling_location", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("valid_from", sa.Date(), nullable=True),
        sa.Column("valid_to", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "(latitude IS NULL AND longitude IS NULL) OR "
            "(latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)",
            name="ck_geo_locations_coordinates",
        ),
        sa.ForeignKeyConstraint(["parent_id"], ["geo_locations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index("ix_geo_locations_code", "geo_locations", ["code"])
    op.create_index("ix_geo_locations_parent_id", "geo_locations", ["parent_id"])
    op.create_index("ix_geo_locations_location_type", "geo_locations", ["location_type"])
    op.create_index(
        "ix_geo_locations_coordinate_confidence", "geo_locations", ["coordinate_confidence"]
    )
    op.create_index(
        "ix_geo_locations_is_sampling_location", "geo_locations", ["is_sampling_location"]
    )

    op.create_table(
        "disaster_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("code", sa.String(120), nullable=False),
        sa.Column("hazard_type", sa.String(40), nullable=False),
        sa.Column("started_at_utc", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at_utc", sa.DateTime(timezone=True), nullable=True),
        sa.Column("local_date", sa.Date(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("verification_status", sa.String(30), nullable=False),
        sa.Column("severity", sa.String(30), nullable=True),
        sa.Column("source_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index("ix_disaster_events_code", "disaster_events", ["code"])
    op.create_index("ix_disaster_events_hazard_type", "disaster_events", ["hazard_type"])
    op.create_index("ix_disaster_events_started_at_utc", "disaster_events", ["started_at_utc"])
    op.create_index("ix_disaster_events_local_date", "disaster_events", ["local_date"])
    op.create_index(
        "ix_disaster_events_verification_status", "disaster_events", ["verification_status"]
    )

    op.create_table(
        "disaster_event_locations",
        sa.Column("event_id", sa.Uuid(), nullable=False),
        sa.Column("location_id", sa.Uuid(), nullable=False),
        sa.Column("impact_role", sa.String(40), nullable=False),
        sa.Column("fatalities", sa.Integer(), nullable=True),
        sa.Column("missing_people", sa.Integer(), nullable=True),
        sa.Column("injured_people", sa.Integer(), nullable=True),
        sa.Column("damaged_houses", sa.Integer(), nullable=True),
        sa.Column("confidence", sa.String(20), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["event_id"], ["disaster_events.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["location_id"], ["geo_locations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("event_id", "location_id"),
    )

    op.create_table(
        "disaster_event_sources",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("event_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("publisher", sa.String(255), nullable=True),
        sa.Column("accessed_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["event_id"], ["disaster_events.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("event_id", "url", name="uq_disaster_event_source_url"),
    )
    op.create_index("ix_disaster_event_sources_event_id", "disaster_event_sources", ["event_id"])

    op.create_table(
        "data_sources",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("provider", sa.String(120), nullable=False),
        sa.Column("dataset", sa.String(120), nullable=False),
        sa.Column("model", sa.String(120), nullable=False, server_default=""),
        sa.Column("license", sa.String(120), nullable=False),
        sa.Column("source_url", sa.Text(), nullable=False),
        sa.Column("available_from", sa.Date(), nullable=True),
        sa.Column("retrieved_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider", "dataset", "model", name="uq_data_sources_identity"),
    )

    op.create_table(
        "ingestion_runs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("source_id", sa.Uuid(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("parameters", sa.JSON(), nullable=False),
        sa.Column("row_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("raw_response_hash", sa.String(64), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["source_id"], ["data_sources.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ingestion_runs_status", "ingestion_runs", ["status"])

    weather_columns = [
        sa.Column("temperature_2m_c", sa.Float(), nullable=True),
        sa.Column("relative_humidity_2m_pct", sa.Float(), nullable=True),
        sa.Column("dew_point_2m_c", sa.Float(), nullable=True),
        sa.Column("precipitation_mm", sa.Float(), nullable=True),
        sa.Column("rain_mm", sa.Float(), nullable=True),
        sa.Column("showers_mm", sa.Float(), nullable=True),
        sa.Column("surface_pressure_hpa", sa.Float(), nullable=True),
        sa.Column("cloud_cover_pct", sa.Float(), nullable=True),
        sa.Column("cape_j_kg", sa.Float(), nullable=True),
        sa.Column("wind_speed_10m_kmh", sa.Float(), nullable=True),
        sa.Column("wind_gusts_10m_kmh", sa.Float(), nullable=True),
        sa.Column("soil_moisture_0_to_1cm", sa.Float(), nullable=True),
        sa.Column("soil_moisture_1_to_3cm", sa.Float(), nullable=True),
        sa.Column("soil_moisture_3_to_9cm", sa.Float(), nullable=True),
        sa.Column("soil_moisture_9_to_27cm", sa.Float(), nullable=True),
        sa.Column("soil_moisture_27_to_81cm", sa.Float(), nullable=True),
    ]

    op.create_table(
        "forecast_hourly",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("source_id", sa.Uuid(), nullable=False),
        sa.Column("location_id", sa.Uuid(), nullable=False),
        sa.Column("ingestion_run_id", sa.Uuid(), nullable=False),
        sa.Column("product", sa.String(40), nullable=False),
        sa.Column("model", sa.String(120), nullable=False, server_default=""),
        sa.Column("requested_latitude", sa.Float(), nullable=False),
        sa.Column("requested_longitude", sa.Float(), nullable=False),
        sa.Column("grid_latitude", sa.Float(), nullable=False),
        sa.Column("grid_longitude", sa.Float(), nullable=False),
        sa.Column("issue_time_utc", sa.DateTime(timezone=True), nullable=True),
        sa.Column("issue_time_estimated", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("valid_time_utc", sa.DateTime(timezone=True), nullable=False),
        sa.Column("lead_hours", sa.Integer(), nullable=False),
        *weather_columns[:6],
        sa.Column("precipitation_probability_pct", sa.Float(), nullable=True),
        *weather_columns[6:],
        sa.Column("quality_flags", sa.JSON(), nullable=False),
        sa.Column("retrieved_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["ingestion_run_id"], ["ingestion_runs.id"]),
        sa.ForeignKeyConstraint(["location_id"], ["geo_locations.id"]),
        sa.ForeignKeyConstraint(["source_id"], ["data_sources.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "source_id",
            "location_id",
            "product",
            "model",
            "valid_time_utc",
            "lead_hours",
            name="uq_forecast_hourly_identity",
        ),
    )
    op.create_index("ix_forecast_hourly_location_id", "forecast_hourly", ["location_id"])
    op.create_index("ix_forecast_hourly_valid_time_utc", "forecast_hourly", ["valid_time_utc"])
    op.create_index("ix_forecast_hourly_lead_hours", "forecast_hourly", ["lead_hours"])

    observation_weather_columns = [column.copy() for column in weather_columns]
    op.create_table(
        "weather_observation_hourly",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("source_id", sa.Uuid(), nullable=False),
        sa.Column("location_id", sa.Uuid(), nullable=False),
        sa.Column("ingestion_run_id", sa.Uuid(), nullable=False),
        sa.Column("model", sa.String(120), nullable=False, server_default=""),
        sa.Column("requested_latitude", sa.Float(), nullable=False),
        sa.Column("requested_longitude", sa.Float(), nullable=False),
        sa.Column("grid_latitude", sa.Float(), nullable=False),
        sa.Column("grid_longitude", sa.Float(), nullable=False),
        sa.Column("valid_time_utc", sa.DateTime(timezone=True), nullable=False),
        *observation_weather_columns,
        sa.Column("quality_flags", sa.JSON(), nullable=False),
        sa.Column("retrieved_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["ingestion_run_id"], ["ingestion_runs.id"]),
        sa.ForeignKeyConstraint(["location_id"], ["geo_locations.id"]),
        sa.ForeignKeyConstraint(["source_id"], ["data_sources.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "source_id", "location_id", "model", "valid_time_utc", name="uq_observation_identity"
        ),
    )
    op.create_index(
        "ix_weather_observation_hourly_location_id",
        "weather_observation_hourly",
        ["location_id"],
    )
    op.create_index(
        "ix_weather_observation_hourly_valid_time_utc",
        "weather_observation_hourly",
        ["valid_time_utc"],
    )

    op.create_table(
        "event_features",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("event_id", sa.Uuid(), nullable=False),
        sa.Column("location_id", sa.Uuid(), nullable=False),
        sa.Column("source_id", sa.Uuid(), nullable=False),
        sa.Column("model", sa.String(120), nullable=False, server_default=""),
        sa.Column("lead_hours", sa.Integer(), nullable=False),
        sa.Column("rain_1h_max_mm", sa.Float(), nullable=True),
        sa.Column("rain_3h_mm", sa.Float(), nullable=True),
        sa.Column("rain_6h_mm", sa.Float(), nullable=True),
        sa.Column("rain_24h_mm", sa.Float(), nullable=True),
        sa.Column("rain_72h_mm", sa.Float(), nullable=True),
        sa.Column("antecedent_7d_mm", sa.Float(), nullable=True),
        sa.Column("feature_values", sa.JSON(), nullable=False),
        sa.Column("computed_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["event_id"], ["disaster_events.id"]),
        sa.ForeignKeyConstraint(["location_id"], ["geo_locations.id"]),
        sa.ForeignKeyConstraint(["source_id"], ["data_sources.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "event_id",
            "location_id",
            "source_id",
            "model",
            "lead_hours",
            name="uq_event_feature_identity",
        ),
    )


def downgrade() -> None:
    op.drop_table("event_features")
    op.drop_index(
        "ix_weather_observation_hourly_valid_time_utc", table_name="weather_observation_hourly"
    )
    op.drop_index(
        "ix_weather_observation_hourly_location_id", table_name="weather_observation_hourly"
    )
    op.drop_table("weather_observation_hourly")
    op.drop_index("ix_forecast_hourly_lead_hours", table_name="forecast_hourly")
    op.drop_index("ix_forecast_hourly_valid_time_utc", table_name="forecast_hourly")
    op.drop_index("ix_forecast_hourly_location_id", table_name="forecast_hourly")
    op.drop_table("forecast_hourly")
    op.drop_index("ix_ingestion_runs_status", table_name="ingestion_runs")
    op.drop_table("ingestion_runs")
    op.drop_table("data_sources")
    op.drop_index("ix_disaster_event_sources_event_id", table_name="disaster_event_sources")
    op.drop_table("disaster_event_sources")
    op.drop_table("disaster_event_locations")
    op.drop_index("ix_disaster_events_verification_status", table_name="disaster_events")
    op.drop_index("ix_disaster_events_local_date", table_name="disaster_events")
    op.drop_index("ix_disaster_events_started_at_utc", table_name="disaster_events")
    op.drop_index("ix_disaster_events_hazard_type", table_name="disaster_events")
    op.drop_index("ix_disaster_events_code", table_name="disaster_events")
    op.drop_table("disaster_events")
    op.drop_index("ix_geo_locations_is_sampling_location", table_name="geo_locations")
    op.drop_index("ix_geo_locations_coordinate_confidence", table_name="geo_locations")
    op.drop_index("ix_geo_locations_location_type", table_name="geo_locations")
    op.drop_index("ix_geo_locations_parent_id", table_name="geo_locations")
    op.drop_index("ix_geo_locations_code", table_name="geo_locations")
    op.drop_table("geo_locations")
