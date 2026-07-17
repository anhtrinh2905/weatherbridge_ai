"""Initial AI job table; identity is owned by Keycloak."""

from typing import Sequence, Union
from uuid import uuid4

from alembic import op
import sqlalchemy as sa


revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ai_jobs",
        sa.Column("id", sa.Uuid(), nullable=False, default=uuid4),
        sa.Column("user_id", sa.String(length=255), nullable=False),
        sa.Column("task", sa.String(length=80), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="queued"),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("result", sa.JSON(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ai_jobs_user_id", "ai_jobs", ["user_id"])
    op.create_index("ix_ai_jobs_status", "ai_jobs", ["status"])


def downgrade() -> None:
    op.drop_index("ix_ai_jobs_status", table_name="ai_jobs")
    op.drop_index("ix_ai_jobs_user_id", table_name="ai_jobs")
    op.drop_table("ai_jobs")
