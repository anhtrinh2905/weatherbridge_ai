"""Forecast snapshots ingested from Open-Meteo (Story 2.2)."""

from typing import Sequence, Union
from uuid import uuid4

from alembic import op
import sqlalchemy as sa


revision: str = "0002_forecast_snapshots"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "forecast_snapshots",
        sa.Column("id", sa.Uuid(), nullable=False, default=uuid4),
        sa.Column("location_code", sa.String(length=80), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("source", sa.String(length=120), nullable=False),
        sa.Column("days", sa.JSON(), nullable=False),
        sa.Column("fetched_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_forecast_snapshots_location_code", "forecast_snapshots", ["location_code"])
    op.create_index("ix_forecast_snapshots_fetched_at", "forecast_snapshots", ["fetched_at"])


def downgrade() -> None:
    op.drop_index("ix_forecast_snapshots_fetched_at", table_name="forecast_snapshots")
    op.drop_index("ix_forecast_snapshots_location_code", table_name="forecast_snapshots")
    op.drop_table("forecast_snapshots")
