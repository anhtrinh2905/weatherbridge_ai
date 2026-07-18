"""Add reviewed localization, TTS assets, and retention policy metadata."""

from collections.abc import Sequence
from datetime import UTC, datetime

import sqlalchemy as sa
from alembic import op

revision: str = "0010_localization_retention"
down_revision: str | None = "0009_evacuation_domain"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "locales",
        sa.Column("code", sa.String(35), nullable=False),
        sa.Column("display_name", sa.String(120), nullable=False),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("native_review_required", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("code"),
    )
    op.create_index("ix_locales_status", "locales", ["status"])
    op.bulk_insert(
        sa.table(
            "locales",
            sa.column("code", sa.String()),
            sa.column("display_name", sa.String()),
            sa.column("status", sa.String()),
            sa.column("native_review_required", sa.Boolean()),
            sa.column("created_at", sa.DateTime(timezone=True)),
        ),
        [
            {
                "code": "vi",
                "display_name": "Tiếng Việt",
                "status": "published",
                "native_review_required": False,
                "created_at": datetime.now(UTC),
            }
        ],
    )

    op.create_table(
        "media_assets",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("asset_type", sa.String(30), nullable=False),
        sa.Column("locale", sa.String(35), nullable=False),
        sa.Column("voice", sa.String(120), nullable=True),
        sa.Column("object_key", sa.Text(), nullable=False),
        sa.Column("checksum", sa.String(64), nullable=False),
        sa.Column("review_status", sa.String(30), nullable=False),
        sa.Column("generated_from_hash", sa.String(64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["locale"], ["locales.code"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_media_assets_asset_type", "media_assets", ["asset_type"])
    op.create_index("ix_media_assets_review_status", "media_assets", ["review_status"])

    op.add_column("alert_contents", sa.Column("media_asset_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        "fk_alert_contents_media_asset_id",
        "alert_contents",
        "media_assets",
        ["media_asset_id"],
        ["id"],
    )

    op.create_table(
        "content_translations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("source_kind", sa.String(40), nullable=False),
        sa.Column("source_id", sa.Uuid(), nullable=False),
        sa.Column("locale", sa.String(35), nullable=False),
        sa.Column("content", sa.JSON(), nullable=False),
        sa.Column("translation_status", sa.String(30), nullable=False),
        sa.Column("translation_method", sa.String(30), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("reviewed_by_profile_id", sa.Uuid(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["locale"], ["locales.code"]),
        sa.ForeignKeyConstraint(["reviewed_by_profile_id"], ["user_profiles.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "source_kind", "source_id", "locale", "version", name="uq_content_translation"
        ),
    )
    op.create_index("ix_content_translations_source_kind", "content_translations", ["source_kind"])
    op.create_index("ix_content_translations_source_id", "content_translations", ["source_id"])
    op.create_index("ix_content_translations_locale", "content_translations", ["locale"])
    op.create_index(
        "ix_content_translations_translation_status",
        "content_translations",
        ["translation_status"],
    )

    op.create_table(
        "retention_policies",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("entity_type", sa.String(80), nullable=False),
        sa.Column("retention_days", sa.Integer(), nullable=True),
        sa.Column("action", sa.String(30), nullable=False),
        sa.Column("legal_basis", sa.Text(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("approved_by", sa.String(255), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("entity_type"),
    )


def downgrade() -> None:
    op.drop_table("retention_policies")
    op.drop_table("content_translations")
    op.drop_constraint("fk_alert_contents_media_asset_id", "alert_contents", type_="foreignkey")
    op.drop_column("alert_contents", "media_asset_id")
    op.drop_table("media_assets")
    op.drop_table("locales")
