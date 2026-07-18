"""Add actionable alerts, recipient snapshots, and notification outbox."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from geoalchemy2 import Geometry

revision: str = "0008_alert_delivery"
down_revision: str | None = "0007_hazard_domain"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "alert_policies",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("geo_location_id", sa.Uuid(), nullable=True),
        sa.Column("hazard_type", sa.String(30), nullable=False),
        sa.Column("publication_mode", sa.String(20), nullable=False, server_default="approval"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_by_profile_id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("publication_mode IN ('approval','auto')", name="ck_publication_mode"),
        sa.ForeignKeyConstraint(["created_by_profile_id"], ["user_profiles.id"]),
        sa.ForeignKeyConstraint(["geo_location_id"], ["geo_locations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_alert_policies_geo_location_id", "alert_policies", ["geo_location_id"])
    op.create_index("ix_alert_policies_hazard_type", "alert_policies", ["hazard_type"])

    op.create_table(
        "alerts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("source", sa.String(20), nullable=False),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("hazard_type", sa.String(30), nullable=True),
        sa.Column("hazard_layer_id", sa.Uuid(), nullable=True),
        sa.Column("level", sa.Integer(), nullable=False),
        sa.Column("tier", sa.String(20), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("canonical_locale", sa.String(35), nullable=False, server_default="vi"),
        sa.Column("what_happened", sa.Text(), nullable=False),
        sa.Column("danger_description", sa.Text(), nullable=False),
        sa.Column("action_instruction", sa.Text(), nullable=False),
        sa.Column("deadline_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("idempotency_key", sa.String(160), nullable=True),
        sa.Column("created_by_profile_id", sa.Uuid(), nullable=True),
        sa.Column("approved_by_profile_id", sa.Uuid(), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancellation_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("level BETWEEN 1 AND 5", name="ck_alert_level"),
        sa.CheckConstraint("tier IN ('prepare','go_now')", name="ck_alert_tier"),
        sa.CheckConstraint("length(trim(what_happened)) > 0", name="ck_alert_what"),
        sa.CheckConstraint("length(trim(danger_description)) > 0", name="ck_alert_danger"),
        sa.CheckConstraint("length(trim(action_instruction)) > 0", name="ck_alert_action"),
        sa.ForeignKeyConstraint(["approved_by_profile_id"], ["user_profiles.id"]),
        sa.ForeignKeyConstraint(["created_by_profile_id"], ["user_profiles.id"]),
        sa.ForeignKeyConstraint(["hazard_layer_id"], ["hazard_layers.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("idempotency_key"),
    )
    for column in ("source", "status", "hazard_type", "tier", "expires_at"):
        op.create_index(f"ix_alerts_{column}", "alerts", [column])

    op.create_table(
        "alert_targets",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("alert_id", sa.Uuid(), nullable=False),
        sa.Column("target_type", sa.String(30), nullable=False),
        sa.Column("geo_location_id", sa.Uuid(), nullable=True),
        sa.Column("household_id", sa.Uuid(), nullable=True),
        sa.Column("resident_id", sa.Uuid(), nullable=True),
        sa.Column(
            "geometry", Geometry("MULTIPOLYGON", srid=4326, spatial_index=False), nullable=True
        ),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["alert_id"], ["alerts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["geo_location_id"], ["geo_locations.id"]),
        sa.ForeignKeyConstraint(["household_id"], ["households.id"]),
        sa.ForeignKeyConstraint(["resident_id"], ["residents.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_alert_targets_alert_id", "alert_targets", ["alert_id"])
    op.create_index("ix_alert_targets_target_type", "alert_targets", ["target_type"])
    op.create_index("ix_alert_targets_geo_location_id", "alert_targets", ["geo_location_id"])
    op.create_index(
        "ix_alert_targets_geometry_gist",
        "alert_targets",
        ["geometry"],
        postgresql_using="gist",
    )

    op.create_table(
        "advisory_rules",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("hazard_type", sa.String(30), nullable=False),
        sa.Column("tier", sa.String(20), nullable=False),
        sa.Column("livelihood_type", sa.String(30), nullable=True),
        sa.Column("support_need_type", sa.String(50), nullable=True),
        sa.Column("locale", sa.String(35), nullable=False, server_default="vi"),
        sa.Column("action_template", sa.Text(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_advisory_rules_hazard_type", "advisory_rules", ["hazard_type"])
    op.create_index("ix_advisory_rules_tier", "advisory_rules", ["tier"])
    op.create_index("ix_advisory_rules_is_active", "advisory_rules", ["is_active"])

    op.create_table(
        "alert_contents",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("alert_id", sa.Uuid(), nullable=False),
        sa.Column("locale", sa.String(35), nullable=False),
        sa.Column("livelihood_type", sa.String(30), nullable=True),
        sa.Column("what_happened", sa.Text(), nullable=False),
        sa.Column("danger_description", sa.Text(), nullable=False),
        sa.Column("action_instruction", sa.Text(), nullable=False),
        sa.Column("deadline_instruction", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["alert_id"], ["alerts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "alert_id", "locale", "livelihood_type", name="uq_alert_content_variant"
        ),
    )
    op.create_index("ix_alert_contents_alert_id", "alert_contents", ["alert_id"])
    op.create_index("ix_alert_contents_locale", "alert_contents", ["locale"])

    op.create_table(
        "alert_recipients",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("alert_id", sa.Uuid(), nullable=False),
        sa.Column("resident_id", sa.Uuid(), nullable=False),
        sa.Column("matched_location_id", sa.Uuid(), nullable=True),
        sa.Column("content_id", sa.Uuid(), nullable=False),
        sa.Column("preferred_locale", sa.String(35), nullable=False),
        sa.Column(
            "acknowledgement_status", sa.String(30), nullable=False, server_default="unacknowledged"
        ),
        sa.Column("acknowledged_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["alert_id"], ["alerts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["content_id"], ["alert_contents.id"]),
        sa.ForeignKeyConstraint(["matched_location_id"], ["resident_locations.id"]),
        sa.ForeignKeyConstraint(["resident_id"], ["residents.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("alert_id", "resident_id", name="uq_alert_recipient"),
    )
    op.create_index("ix_alert_recipients_alert_id", "alert_recipients", ["alert_id"])
    op.create_index("ix_alert_recipients_resident_id", "alert_recipients", ["resident_id"])

    op.create_table(
        "notification_outbox",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("alert_recipient_id", sa.Uuid(), nullable=False),
        sa.Column("resident_contact_id", sa.Uuid(), nullable=False),
        sa.Column("channel", sa.String(20), nullable=False),
        sa.Column("status", sa.String(30), nullable=False, server_default="pending"),
        sa.Column("idempotency_key", sa.String(160), nullable=False),
        sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("next_attempt_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("locked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_error_code", sa.String(80), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["alert_recipient_id"], ["alert_recipients.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["resident_contact_id"], ["resident_contacts.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("idempotency_key"),
    )
    for column in (
        "alert_recipient_id",
        "resident_contact_id",
        "channel",
        "status",
        "next_attempt_at",
    ):
        op.create_index(f"ix_notification_outbox_{column}", "notification_outbox", [column])

    op.create_table(
        "notification_attempts",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("outbox_id", sa.Uuid(), nullable=False),
        sa.Column("provider", sa.String(60), nullable=False),
        sa.Column("provider_message_id", sa.String(255), nullable=True),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("response_status_code", sa.Integer(), nullable=True),
        sa.Column("response_metadata", sa.JSON(), nullable=False),
        sa.Column("attempted_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["outbox_id"], ["notification_outbox.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_notification_attempts_outbox_id", "notification_attempts", ["outbox_id"])
    op.create_index("ix_notification_attempts_status", "notification_attempts", ["status"])
    op.create_index(
        "ix_notification_attempts_attempted_at", "notification_attempts", ["attempted_at"]
    )


def downgrade() -> None:
    op.drop_table("notification_attempts")
    op.drop_table("notification_outbox")
    op.drop_table("alert_recipients")
    op.drop_table("alert_contents")
    op.drop_table("advisory_rules")
    op.drop_index("ix_alert_targets_geometry_gist", table_name="alert_targets")
    op.drop_table("alert_targets")
    op.drop_table("alerts")
    op.drop_table("alert_policies")
