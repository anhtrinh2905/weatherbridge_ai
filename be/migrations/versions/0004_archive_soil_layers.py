"""Add the native ERA5-Land soil-moisture depth bands."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004_archive_soil_layers"
down_revision: str | None = "0003_hazard_research_archive"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "weather_observation_hourly",
        sa.Column("soil_moisture_0_to_7cm", sa.Float(), nullable=True),
    )
    op.add_column(
        "weather_observation_hourly",
        sa.Column("soil_moisture_7_to_28cm", sa.Float(), nullable=True),
    )
    op.add_column(
        "weather_observation_hourly",
        sa.Column("soil_moisture_28_to_100cm", sa.Float(), nullable=True),
    )
    op.add_column(
        "weather_observation_hourly",
        sa.Column("soil_moisture_100_to_255cm", sa.Float(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("weather_observation_hourly", "soil_moisture_100_to_255cm")
    op.drop_column("weather_observation_hourly", "soil_moisture_28_to_100cm")
    op.drop_column("weather_observation_hourly", "soil_moisture_7_to_28cm")
    op.drop_column("weather_observation_hourly", "soil_moisture_0_to_7cm")
