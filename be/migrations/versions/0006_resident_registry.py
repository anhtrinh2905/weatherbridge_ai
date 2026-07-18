"""Add application profiles, scoped resident registry, consent, and audit."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from geoalchemy2 import Geography

revision: str = "0006_resident_registry"
down_revision: str | None = "0005_postgis_identity_geography"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "user_profiles",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("keycloak_subject", sa.String(255), nullable=False),
        sa.Column("display_name", sa.String(255), nullable=False),
        sa.Column("preferred_locale", sa.String(35), nullable=False, server_default="vi"),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("synced_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("keycloak_subject"),
    )
    op.create_index("ix_user_profiles_keycloak_subject", "user_profiles", ["keycloak_subject"])
    op.create_index("ix_user_profiles_status", "user_profiles", ["status"])

    op.create_table(
        "user_area_assignments",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("profile_id", sa.Uuid(), nullable=False),
        sa.Column("role", sa.String(30), nullable=False),
        sa.Column("geo_location_id", sa.Uuid(), nullable=False),
        sa.Column("valid_from", sa.DateTime(timezone=True), nullable=False),
        sa.Column("valid_to", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "role IN ('resident','village_head','commune_officer','admin','expert')",
            name="ck_user_area_role",
        ),
        sa.ForeignKeyConstraint(["geo_location_id"], ["geo_locations.id"]),
        sa.ForeignKeyConstraint(["profile_id"], ["user_profiles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "profile_id", "role", "geo_location_id", "valid_from", name="uq_user_area_period"
        ),
    )
    op.create_index("ix_user_area_assignments_profile_id", "user_area_assignments", ["profile_id"])
    op.create_index("ix_user_area_assignments_role", "user_area_assignments", ["role"])
    op.create_index(
        "ix_user_area_assignments_geo_location_id", "user_area_assignments", ["geo_location_id"]
    )

    op.create_table(
        "households",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("code", sa.String(120), nullable=False),
        sa.Column("village_id", sa.Uuid(), nullable=False),
        sa.Column("address_ciphertext", sa.LargeBinary(), nullable=True),
        sa.Column("address_key_version", sa.String(60), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("source", sa.String(40), nullable=False),
        sa.Column("simulated", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_by_profile_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["created_by_profile_id"], ["user_profiles.id"]),
        sa.ForeignKeyConstraint(["village_id"], ["geo_locations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index("ix_households_code", "households", ["code"])
    op.create_index("ix_households_village_id", "households", ["village_id"])
    op.create_index("ix_households_status", "households", ["status"])
    op.create_index("ix_households_simulated", "households", ["simulated"])

    op.create_table(
        "residents",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_profile_id", sa.Uuid(), nullable=True),
        sa.Column("managed_geo_location_id", sa.Uuid(), nullable=False),
        sa.Column("full_name_ciphertext", sa.LargeBinary(), nullable=False),
        sa.Column("full_name_lookup_hash", sa.String(64), nullable=False),
        sa.Column("full_name_key_version", sa.String(60), nullable=False),
        sa.Column("birth_year", sa.Integer(), nullable=True),
        sa.Column(
            "verification_status", sa.String(30), nullable=False, server_default="unverified"
        ),
        sa.Column("source", sa.String(40), nullable=False),
        sa.Column("simulated", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_by_profile_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "birth_year IS NULL OR birth_year BETWEEN 1900 AND 2200", name="ck_birth_year"
        ),
        sa.ForeignKeyConstraint(["created_by_profile_id"], ["user_profiles.id"]),
        sa.ForeignKeyConstraint(["managed_geo_location_id"], ["geo_locations.id"]),
        sa.ForeignKeyConstraint(["user_profile_id"], ["user_profiles.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_profile_id"),
    )
    op.create_index("ix_residents_user_profile_id", "residents", ["user_profile_id"])
    op.create_index(
        "ix_residents_managed_geo_location_id", "residents", ["managed_geo_location_id"]
    )
    op.create_index("ix_residents_full_name_lookup_hash", "residents", ["full_name_lookup_hash"])
    op.create_index("ix_residents_verification_status", "residents", ["verification_status"])
    op.create_index("ix_residents_simulated", "residents", ["simulated"])

    op.create_table(
        "household_memberships",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("household_id", sa.Uuid(), nullable=False),
        sa.Column("resident_id", sa.Uuid(), nullable=False),
        sa.Column("relationship", sa.String(40), nullable=False),
        sa.Column("is_head", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("valid_from", sa.Date(), nullable=False),
        sa.Column("valid_to", sa.Date(), nullable=True),
        sa.ForeignKeyConstraint(["household_id"], ["households.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["resident_id"], ["residents.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "household_id", "resident_id", "valid_from", name="uq_household_member_period"
        ),
    )
    op.create_index(
        "ix_household_memberships_household_id", "household_memberships", ["household_id"]
    )
    op.create_index(
        "ix_household_memberships_resident_id", "household_memberships", ["resident_id"]
    )

    op.create_table(
        "resident_contacts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("resident_id", sa.Uuid(), nullable=False),
        sa.Column("channel", sa.String(20), nullable=False),
        sa.Column("value_ciphertext", sa.LargeBinary(), nullable=False),
        sa.Column("value_lookup_hash", sa.String(64), nullable=False),
        sa.Column("key_version", sa.String(60), nullable=False),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "channel IN ('sms','zalo','email','web_push','webhook')", name="ck_contact_channel"
        ),
        sa.ForeignKeyConstraint(["resident_id"], ["residents.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("channel", "value_lookup_hash", name="uq_contact_channel_hash"),
    )
    op.create_index("ix_resident_contacts_resident_id", "resident_contacts", ["resident_id"])
    op.create_index("ix_resident_contacts_channel", "resident_contacts", ["channel"])
    op.create_index(
        "ix_resident_contacts_value_lookup_hash", "resident_contacts", ["value_lookup_hash"]
    )
    op.create_index("ix_resident_contacts_is_active", "resident_contacts", ["is_active"])

    op.create_table(
        "resident_locations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("resident_id", sa.Uuid(), nullable=False),
        sa.Column("geo_location_id", sa.Uuid(), nullable=False),
        sa.Column("location_type", sa.String(30), nullable=False),
        sa.Column("label_ciphertext", sa.LargeBinary(), nullable=True),
        sa.Column("label_key_version", sa.String(60), nullable=True),
        sa.Column("location", Geography("POINT", srid=4326, spatial_index=False), nullable=False),
        sa.Column("precision_m", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "precision_m IS NULL OR precision_m >= 0", name="ck_resident_location_precision"
        ),
        sa.ForeignKeyConstraint(["geo_location_id"], ["geo_locations.id"]),
        sa.ForeignKeyConstraint(["resident_id"], ["residents.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_resident_locations_resident_id", "resident_locations", ["resident_id"])
    op.create_index(
        "ix_resident_locations_geo_location_id", "resident_locations", ["geo_location_id"]
    )
    op.create_index("ix_resident_locations_is_active", "resident_locations", ["is_active"])
    op.create_index(
        "ix_resident_locations_location_gist",
        "resident_locations",
        ["location"],
        postgresql_using="gist",
    )

    op.create_table(
        "resident_livelihoods",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("resident_id", sa.Uuid(), nullable=False),
        sa.Column("livelihood_type", sa.String(30), nullable=False),
        sa.Column("details", sa.JSON(), nullable=False),
        sa.Column("schema_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "livelihood_type IN ('farmer','livestock','forestry','other')",
            name="ck_livelihood_type",
        ),
        sa.ForeignKeyConstraint(["resident_id"], ["residents.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_resident_livelihoods_resident_id", "resident_livelihoods", ["resident_id"])
    op.create_index(
        "ix_resident_livelihoods_livelihood_type", "resident_livelihoods", ["livelihood_type"]
    )

    op.create_table(
        "support_needs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("resident_id", sa.Uuid(), nullable=False),
        sa.Column("need_type", sa.String(50), nullable=False),
        sa.Column("details", sa.JSON(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["resident_id"], ["residents.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_support_needs_resident_id", "support_needs", ["resident_id"])
    op.create_index("ix_support_needs_need_type", "support_needs", ["need_type"])
    op.create_index("ix_support_needs_is_active", "support_needs", ["is_active"])

    op.create_table(
        "consent_records",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("resident_id", sa.Uuid(), nullable=False),
        sa.Column("purpose", sa.String(80), nullable=False),
        sa.Column("policy_version", sa.String(40), nullable=False),
        sa.Column("granted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("withdrawn_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("recorded_by_profile_id", sa.Uuid(), nullable=True),
        sa.ForeignKeyConstraint(["recorded_by_profile_id"], ["user_profiles.id"]),
        sa.ForeignKeyConstraint(["resident_id"], ["residents.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_consent_records_resident_id", "consent_records", ["resident_id"])
    op.create_index("ix_consent_records_purpose", "consent_records", ["purpose"])

    op.create_table(
        "alert_subscriptions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("resident_id", sa.Uuid(), nullable=False),
        sa.Column("resident_location_id", sa.Uuid(), nullable=True),
        sa.Column("hazard_type", sa.String(30), nullable=False),
        sa.Column("minimum_level", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("channel", sa.String(20), nullable=False),
        sa.Column("quiet_hours_start", sa.Time(), nullable=True),
        sa.Column("quiet_hours_end", sa.Time(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("minimum_level BETWEEN 1 AND 5", name="ck_subscription_level"),
        sa.ForeignKeyConstraint(
            ["resident_location_id"], ["resident_locations.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["resident_id"], ["residents.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "resident_id",
            "resident_location_id",
            "hazard_type",
            "channel",
            name="uq_alert_subscription",
        ),
    )
    op.create_index("ix_alert_subscriptions_resident_id", "alert_subscriptions", ["resident_id"])
    op.create_index("ix_alert_subscriptions_hazard_type", "alert_subscriptions", ["hazard_type"])
    op.create_index("ix_alert_subscriptions_is_active", "alert_subscriptions", ["is_active"])

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("actor_profile_id", sa.Uuid(), nullable=True),
        sa.Column("action", sa.String(80), nullable=False),
        sa.Column("entity_type", sa.String(80), nullable=False),
        sa.Column("entity_id", sa.String(255), nullable=False),
        sa.Column("geo_location_id", sa.Uuid(), nullable=True),
        sa.Column("before_values", sa.JSON(), nullable=True),
        sa.Column("after_values", sa.JSON(), nullable=True),
        sa.Column("request_id", sa.String(100), nullable=True),
        sa.Column("ip_hash", sa.String(64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["actor_profile_id"], ["user_profiles.id"]),
        sa.ForeignKeyConstraint(["geo_location_id"], ["geo_locations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    for column in (
        "actor_profile_id",
        "action",
        "entity_type",
        "entity_id",
        "geo_location_id",
        "created_at",
    ):
        op.create_index(f"ix_audit_logs_{column}", "audit_logs", [column])


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("alert_subscriptions")
    op.drop_table("consent_records")
    op.drop_table("support_needs")
    op.drop_table("resident_livelihoods")
    op.drop_index("ix_resident_locations_location_gist", table_name="resident_locations")
    op.drop_table("resident_locations")
    op.drop_table("resident_contacts")
    op.drop_table("household_memberships")
    op.drop_table("residents")
    op.drop_table("households")
    op.drop_table("user_area_assignments")
    op.drop_table("user_profiles")
