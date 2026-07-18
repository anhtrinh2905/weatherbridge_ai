"""Activate the reviewed locale workflow for alert content."""

from collections.abc import Sequence
from datetime import UTC, datetime

import sqlalchemy as sa
from alembic import op


revision: str = "0012_alert_localization_workflow"
down_revision: str | None = "0011_web_push_contact_lifecycle"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("locales", sa.Column("native_name", sa.String(120), nullable=True))
    op.add_column(
        "locales", sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.false())
    )
    op.add_column(
        "locales", sa.Column("tts_enabled", sa.Boolean(), nullable=False, server_default=sa.false())
    )
    op.add_column("locales", sa.Column("fallback_locale_code", sa.String(35), nullable=True))
    op.create_index("ix_locales_is_active", "locales", ["is_active"])

    op.add_column("content_translations", sa.Column("review_note", sa.Text(), nullable=True))
    op.add_column("content_translations", sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True))

    now = datetime.now(UTC)
    locales = sa.table(
        "locales",
        sa.column("code", sa.String()),
        sa.column("display_name", sa.String()),
        sa.column("status", sa.String()),
        sa.column("native_review_required", sa.Boolean()),
        sa.column("created_at", sa.DateTime(timezone=True)),
        sa.column("native_name", sa.String()),
        sa.column("is_active", sa.Boolean()),
        sa.column("tts_enabled", sa.Boolean()),
        sa.column("fallback_locale_code", sa.String()),
    )
    op.execute(
        sa.text(
            "UPDATE locales SET native_name = :native_name, is_active = true, "
            "tts_enabled = false, fallback_locale_code = NULL WHERE code = 'vi'"
        ).bindparams(native_name="Tiếng Việt")
    )
    op.bulk_insert(
        locales,
        [
            {
                "code": "hmn-x-dienbien",
                "display_name": "Tiếng Mông (chờ kiểm định)",
                "native_name": "Hmong",
                "status": "draft",
                "native_review_required": True,
                "is_active": False,
                "tts_enabled": False,
                "fallback_locale_code": "vi",
                "created_at": now,
            },
            {
                "code": "tai-x-muongpon",
                "display_name": "Tiếng Thái Mường Pồn (chờ kiểm định)",
                "native_name": "Tai",
                "status": "draft",
                "native_review_required": True,
                "is_active": False,
                "tts_enabled": False,
                "fallback_locale_code": "vi",
                "created_at": now,
            },
        ],
    )


def downgrade() -> None:
    op.drop_column("content_translations", "updated_at")
    op.drop_column("content_translations", "review_note")
    op.drop_index("ix_locales_is_active", table_name="locales")
    op.drop_column("locales", "fallback_locale_code")
    op.drop_column("locales", "tts_enabled")
    op.drop_column("locales", "is_active")
    op.drop_column("locales", "native_name")
