"""Persist Web Push contact lifecycle metadata."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0011_web_push_contact_lifecycle"
down_revision: str | None = "0010_localization_retention"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "resident_contacts",
        sa.Column("delivery_metadata", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
    )
    op.add_column(
        "resident_contacts", sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        "resident_contacts", sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("resident_contacts", "revoked_at")
    op.drop_column("resident_contacts", "last_seen_at")
    op.drop_column("resident_contacts", "delivery_metadata")
