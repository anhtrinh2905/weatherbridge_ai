from datetime import date, datetime, time
from uuid import UUID, uuid4

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    LargeBinary,
    String,
    Text,
    Time,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column

from database.base import Base
from database.spatial import SpatialValue


class UserProfile(Base):
    __tablename__ = "user_profiles"
    __table_args__ = (Index("ix_user_profiles_keycloak_subject", "keycloak_subject"),)

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    keycloak_subject: Mapped[str] = mapped_column(String(255), unique=True)
    display_name: Mapped[str] = mapped_column(String(255))
    preferred_locale: Mapped[str] = mapped_column(String(35), default="vi")
    status: Mapped[str] = mapped_column(String(20), default="active", index=True)
    synced_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class UserAreaAssignment(Base):
    __tablename__ = "user_area_assignments"
    __table_args__ = (
        UniqueConstraint(
            "profile_id", "role", "geo_location_id", "valid_from", name="uq_user_area_period"
        ),
        CheckConstraint(
            "role IN ('resident','village_head','commune_officer','admin','expert')",
            name="ck_user_area_role",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    profile_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("user_profiles.id", ondelete="CASCADE"), index=True
    )
    role: Mapped[str] = mapped_column(String(30), index=True)
    geo_location_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("geo_locations.id"), index=True
    )
    valid_from: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    valid_to: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Household(Base):
    __tablename__ = "households"
    __table_args__ = (Index("ix_households_code", "code"),)

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    code: Mapped[str] = mapped_column(String(120), unique=True)
    village_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("geo_locations.id"), index=True
    )
    address_ciphertext: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    address_key_version: Mapped[str | None] = mapped_column(String(60), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active", index=True)
    source: Mapped[str] = mapped_column(String(40))
    simulated: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_by_profile_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("user_profiles.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Resident(Base):
    __tablename__ = "residents"
    __table_args__ = (
        CheckConstraint(
            "birth_year IS NULL OR birth_year BETWEEN 1900 AND 2200",
            name="ck_birth_year",
        ),
        Index("ix_residents_user_profile_id", "user_profile_id"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    user_profile_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("user_profiles.id"),
        nullable=True,
        unique=True,
    )
    managed_geo_location_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("geo_locations.id"), index=True
    )
    full_name_ciphertext: Mapped[bytes] = mapped_column(LargeBinary)
    full_name_lookup_hash: Mapped[str] = mapped_column(String(64), index=True)
    full_name_key_version: Mapped[str] = mapped_column(String(60))
    birth_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    verification_status: Mapped[str] = mapped_column(String(30), default="unverified", index=True)
    source: Mapped[str] = mapped_column(String(40))
    simulated: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_by_profile_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("user_profiles.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class HouseholdMembership(Base):
    __tablename__ = "household_memberships"
    __table_args__ = (
        UniqueConstraint(
            "household_id", "resident_id", "valid_from", name="uq_household_member_period"
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    household_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("households.id", ondelete="CASCADE"), index=True
    )
    resident_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("residents.id", ondelete="CASCADE"), index=True
    )
    relationship: Mapped[str] = mapped_column(String(40))
    is_head: Mapped[bool] = mapped_column(Boolean, default=False)
    valid_from: Mapped[date] = mapped_column(Date)
    valid_to: Mapped[date | None] = mapped_column(Date, nullable=True)


class ResidentContact(Base):
    __tablename__ = "resident_contacts"
    __table_args__ = (
        UniqueConstraint("channel", "value_lookup_hash", name="uq_contact_channel_hash"),
        CheckConstraint(
            "channel IN ('sms','zalo','email','web_push','webhook')", name="ck_contact_channel"
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    resident_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("residents.id", ondelete="CASCADE"), index=True
    )
    channel: Mapped[str] = mapped_column(String(20), index=True)
    value_ciphertext: Mapped[bytes] = mapped_column(LargeBinary)
    value_lookup_hash: Mapped[str] = mapped_column(String(64), index=True)
    key_version: Mapped[str] = mapped_column(String(60))
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    delivery_metadata: Mapped[dict[str, object]] = mapped_column(JSON, default=dict)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ResidentLocation(Base):
    __tablename__ = "resident_locations"
    __table_args__ = (
        CheckConstraint(
            "precision_m IS NULL OR precision_m >= 0",
            name="ck_resident_location_precision",
        ),
        Index("ix_resident_locations_location_gist", "location", postgresql_using="gist"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    resident_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("residents.id", ondelete="CASCADE"), index=True
    )
    geo_location_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("geo_locations.id"), index=True
    )
    location_type: Mapped[str] = mapped_column(String(30))
    label_ciphertext: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    label_key_version: Mapped[str | None] = mapped_column(String(60), nullable=True)
    location: Mapped[object] = mapped_column(SpatialValue("POINT", geography=True), nullable=False)
    precision_m: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class AlertSubscription(Base):
    __tablename__ = "alert_subscriptions"
    __table_args__ = (
        UniqueConstraint(
            "resident_id",
            "resident_location_id",
            "hazard_type",
            "channel",
            name="uq_alert_subscription",
        ),
        CheckConstraint("minimum_level BETWEEN 1 AND 5", name="ck_subscription_level"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    resident_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("residents.id", ondelete="CASCADE"), index=True
    )
    resident_location_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("resident_locations.id", ondelete="CASCADE"), nullable=True
    )
    hazard_type: Mapped[str] = mapped_column(String(30), index=True)
    minimum_level: Mapped[int] = mapped_column(Integer, default=1)
    channel: Mapped[str] = mapped_column(String(20))
    quiet_hours_start: Mapped[time | None] = mapped_column(Time, nullable=True)
    quiet_hours_end: Mapped[time | None] = mapped_column(Time, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ResidentLivelihood(Base):
    __tablename__ = "resident_livelihoods"
    __table_args__ = (
        CheckConstraint(
            "livelihood_type IN ('farmer','livestock','forestry','other')",
            name="ck_livelihood_type",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    resident_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("residents.id", ondelete="CASCADE"), index=True
    )
    livelihood_type: Mapped[str] = mapped_column(String(30), index=True)
    details: Mapped[dict[str, object]] = mapped_column(JSON, default=dict)
    schema_version: Mapped[int] = mapped_column(Integer, default=1)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class SupportNeed(Base):
    __tablename__ = "support_needs"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    resident_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("residents.id", ondelete="CASCADE"), index=True
    )
    need_type: Mapped[str] = mapped_column(String(50), index=True)
    details: Mapped[dict[str, object]] = mapped_column(JSON, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ConsentRecord(Base):
    __tablename__ = "consent_records"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    resident_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("residents.id", ondelete="CASCADE"), index=True
    )
    purpose: Mapped[str] = mapped_column(String(80), index=True)
    policy_version: Mapped[str] = mapped_column(String(40))
    granted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    withdrawn_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    recorded_by_profile_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("user_profiles.id"), nullable=True
    )


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True
    )
    actor_profile_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("user_profiles.id"), nullable=True, index=True
    )
    action: Mapped[str] = mapped_column(String(80), index=True)
    entity_type: Mapped[str] = mapped_column(String(80), index=True)
    entity_id: Mapped[str] = mapped_column(String(255), index=True)
    geo_location_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("geo_locations.id"), nullable=True, index=True
    )
    before_values: Mapped[dict[str, object] | None] = mapped_column(JSON, nullable=True)
    after_values: Mapped[dict[str, object] | None] = mapped_column(JSON, nullable=True)
    request_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ip_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class HazardModelVersion(Base):
    __tablename__ = "hazard_model_versions"
    __table_args__ = (UniqueConstraint("hazard_type", "checksum", name="uq_hazard_model_checksum"),)

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    hazard_type: Mapped[str] = mapped_column(String(30), index=True)
    calibration_version: Mapped[str] = mapped_column(String(120))
    feature_stack_version: Mapped[str] = mapped_column(String(120))
    checksum: Mapped[str] = mapped_column(String(64))
    provenance: Mapped[dict[str, object]] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(20), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class HazardRun(Base):
    __tablename__ = "hazard_runs"
    __table_args__ = (
        UniqueConstraint(
            "hazard_type", "model_version_id", "issued_at", name="uq_hazard_run_issue"
        ),
        CheckConstraint(
            "hazard_type IN ('flash_flood','landslide','fog')", name="ck_hazard_run_type"
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    hazard_type: Mapped[str] = mapped_column(String(30), index=True)
    model_version_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("hazard_model_versions.id")
    )
    input_ingestion_run_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("ingestion_runs.id"), nullable=True
    )
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    valid_from: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    valid_to: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(20), index=True)
    quality_flags: Mapped[dict[str, object]] = mapped_column(JSON, default=dict)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class HazardLayer(Base):
    __tablename__ = "hazard_layers"
    __table_args__ = (
        UniqueConstraint("run_id", "hazard_type", "forecast_day", name="uq_hazard_layer_run"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    run_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("hazard_runs.id", ondelete="CASCADE"), index=True
    )
    hazard_type: Mapped[str] = mapped_column(String(30), index=True)
    forecast_day: Mapped[date] = mapped_column(Date, index=True)
    is_current: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    cog_object_key: Mapped[str] = mapped_column(Text)
    png_object_key: Mapped[str] = mapped_column(Text)
    bbox: Mapped[dict[str, object]] = mapped_column(JSON)
    crs: Mapped[str] = mapped_column(String(30), default="EPSG:32648")
    resolution_m: Mapped[float] = mapped_column(Float)
    level_bins: Mapped[list[object]] = mapped_column(JSON)
    legend: Mapped[dict[str, object]] = mapped_column(JSON)
    confidence: Mapped[float] = mapped_column(Float)
    contribution_summary: Mapped[dict[str, object]] = mapped_column(JSON)
    checksum: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


Index(
    "uq_hazard_layer_current",
    HazardLayer.hazard_type,
    HazardLayer.forecast_day,
    unique=True,
    postgresql_where=HazardLayer.is_current.is_(True),
    sqlite_where=HazardLayer.is_current.is_(True),
)


class HazardZone(Base):
    __tablename__ = "hazard_zones"
    __table_args__ = (
        CheckConstraint("risk_level BETWEEN 1 AND 5", name="ck_hazard_zone_level"),
        Index("ix_hazard_zones_geometry_gist", "geometry", postgresql_using="gist"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    hazard_layer_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("hazard_layers.id", ondelete="CASCADE"), index=True
    )
    risk_level: Mapped[int] = mapped_column(Integer, index=True)
    score_min: Mapped[float] = mapped_column(Float)
    score_max: Mapped[float] = mapped_column(Float)
    confidence: Mapped[float] = mapped_column(Float)
    geometry: Mapped[object] = mapped_column(SpatialValue("MULTIPOLYGON"), nullable=False)


class ThresholdConfig(Base):
    __tablename__ = "threshold_configs"
    __table_args__ = (
        CheckConstraint("minimum_alert_level BETWEEN 1 AND 5", name="ck_threshold_min"),
        CheckConstraint("go_now_level BETWEEN 1 AND 5", name="ck_threshold_go_now"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    geo_location_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("geo_locations.id"), nullable=True, index=True
    )
    hazard_type: Mapped[str] = mapped_column(String(30), index=True)
    minimum_alert_level: Mapped[int] = mapped_column(Integer)
    go_now_level: Mapped[int] = mapped_column(Integer)
    effective_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    effective_to: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by_profile_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("user_profiles.id")
    )
    reason: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class AlertPolicy(Base):
    __tablename__ = "alert_policies"
    __table_args__ = (
        CheckConstraint("publication_mode IN ('approval','auto')", name="ck_publication_mode"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    geo_location_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("geo_locations.id"), nullable=True, index=True
    )
    hazard_type: Mapped[str] = mapped_column(String(30), index=True)
    publication_mode: Mapped[str] = mapped_column(String(20), default="approval")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by_profile_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("user_profiles.id")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Alert(Base):
    __tablename__ = "alerts"
    __table_args__ = (
        CheckConstraint("level BETWEEN 1 AND 5", name="ck_alert_level"),
        CheckConstraint("tier IN ('prepare','go_now')", name="ck_alert_tier"),
        CheckConstraint("length(trim(what_happened)) > 0", name="ck_alert_what"),
        CheckConstraint("length(trim(danger_description)) > 0", name="ck_alert_danger"),
        CheckConstraint("length(trim(action_instruction)) > 0", name="ck_alert_action"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    source: Mapped[str] = mapped_column(String(20), index=True)
    status: Mapped[str] = mapped_column(String(30), index=True)
    hazard_type: Mapped[str | None] = mapped_column(String(30), nullable=True, index=True)
    hazard_layer_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("hazard_layers.id"), nullable=True
    )
    level: Mapped[int] = mapped_column(Integer)
    tier: Mapped[str] = mapped_column(String(20), index=True)
    confidence: Mapped[float] = mapped_column(Float)
    canonical_locale: Mapped[str] = mapped_column(String(35), default="vi")
    what_happened: Mapped[str] = mapped_column(Text)
    danger_description: Mapped[str] = mapped_column(Text)
    action_instruction: Mapped[str] = mapped_column(Text)
    deadline_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    idempotency_key: Mapped[str | None] = mapped_column(String(160), nullable=True, unique=True)
    created_by_profile_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("user_profiles.id"), nullable=True
    )
    approved_by_profile_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("user_profiles.id"), nullable=True
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancellation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class AlertTarget(Base):
    __tablename__ = "alert_targets"
    __table_args__ = (Index("ix_alert_targets_geometry_gist", "geometry", postgresql_using="gist"),)

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    alert_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("alerts.id", ondelete="CASCADE"), index=True
    )
    target_type: Mapped[str] = mapped_column(String(30), index=True)
    geo_location_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("geo_locations.id"), nullable=True, index=True
    )
    household_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("households.id"), nullable=True
    )
    resident_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("residents.id"), nullable=True
    )
    geometry: Mapped[object | None] = mapped_column(SpatialValue("MULTIPOLYGON"), nullable=True)
    reason: Mapped[str] = mapped_column(Text)


class AdvisoryRule(Base):
    __tablename__ = "advisory_rules"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    hazard_type: Mapped[str] = mapped_column(String(30), index=True)
    tier: Mapped[str] = mapped_column(String(20), index=True)
    livelihood_type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    support_need_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    locale: Mapped[str] = mapped_column(String(35), default="vi")
    action_template: Mapped[str] = mapped_column(Text)
    version: Mapped[int] = mapped_column(Integer, default=1)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class AlertContent(Base):
    __tablename__ = "alert_contents"
    __table_args__ = (
        UniqueConstraint("alert_id", "locale", "livelihood_type", name="uq_alert_content_variant"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    alert_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("alerts.id", ondelete="CASCADE"), index=True
    )
    locale: Mapped[str] = mapped_column(String(35), index=True)
    livelihood_type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    what_happened: Mapped[str] = mapped_column(Text)
    danger_description: Mapped[str] = mapped_column(Text)
    action_instruction: Mapped[str] = mapped_column(Text)
    deadline_instruction: Mapped[str] = mapped_column(Text)
    media_asset_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("media_assets.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class AlertRecipient(Base):
    __tablename__ = "alert_recipients"
    __table_args__ = (UniqueConstraint("alert_id", "resident_id", name="uq_alert_recipient"),)

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    alert_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("alerts.id", ondelete="CASCADE"), index=True
    )
    resident_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("residents.id"), index=True
    )
    matched_location_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("resident_locations.id"), nullable=True
    )
    content_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("alert_contents.id"))
    preferred_locale: Mapped[str] = mapped_column(String(35))
    acknowledgement_status: Mapped[str] = mapped_column(String(30), default="unacknowledged")
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class NotificationOutbox(Base):
    __tablename__ = "notification_outbox"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    alert_recipient_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("alert_recipients.id", ondelete="CASCADE"), index=True
    )
    resident_contact_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("resident_contacts.id"), index=True
    )
    channel: Mapped[str] = mapped_column(String(20), index=True)
    status: Mapped[str] = mapped_column(String(30), default="pending", index=True)
    idempotency_key: Mapped[str] = mapped_column(String(160), unique=True)
    attempt_count: Mapped[int] = mapped_column(Integer, default=0)
    next_attempt_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_error_code: Mapped[str | None] = mapped_column(String(80), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class NotificationAttempt(Base):
    __tablename__ = "notification_attempts"

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True
    )
    outbox_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("notification_outbox.id", ondelete="CASCADE"), index=True
    )
    provider: Mapped[str] = mapped_column(String(60))
    provider_message_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(30), index=True)
    response_status_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    response_metadata: Mapped[dict[str, object]] = mapped_column(JSON, default=dict)
    attempted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class Shelter(Base):
    __tablename__ = "shelters"
    __table_args__ = (
        Index("ix_shelters_code", "code"),
        Index("ix_shelters_location_gist", "location", postgresql_using="gist"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    code: Mapped[str] = mapped_column(String(120), unique=True)
    geo_location_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("geo_locations.id"), index=True
    )
    name: Mapped[str] = mapped_column(String(255))
    location: Mapped[object] = mapped_column(SpatialValue("POINT", geography=True), nullable=False)
    capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    contact_ciphertext: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    contact_key_version: Mapped[str | None] = mapped_column(String(60), nullable=True)
    accessibility: Mapped[dict[str, object]] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(30), index=True)
    simulated: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class EvacuationOrder(Base):
    __tablename__ = "evacuation_orders"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    alert_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("alerts.id"), unique=True)
    geo_location_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("geo_locations.id"), index=True
    )
    status: Mapped[str] = mapped_column(String(30), index=True)
    issued_by_profile_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("user_profiles.id")
    )
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    instructions: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class EvacuationZone(Base):
    __tablename__ = "evacuation_zones"
    __table_args__ = (
        Index("ix_evacuation_zones_geometry_gist", "geometry", postgresql_using="gist"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    evacuation_order_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("evacuation_orders.id", ondelete="CASCADE"), index=True
    )
    priority: Mapped[int] = mapped_column(Integer, default=1)
    reason: Mapped[str] = mapped_column(Text)
    geometry: Mapped[object] = mapped_column(SpatialValue("MULTIPOLYGON"), nullable=False)


class EvacuationAssignment(Base):
    __tablename__ = "evacuation_assignments"
    __table_args__ = (
        CheckConstraint(
            "household_id IS NOT NULL OR resident_id IS NOT NULL", name="ck_evacuation_assignee"
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    evacuation_order_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("evacuation_orders.id", ondelete="CASCADE"), index=True
    )
    household_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("households.id"), nullable=True
    )
    resident_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("residents.id"), nullable=True
    )
    shelter_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("shelters.id"))
    status: Mapped[str] = mapped_column(String(30), index=True)
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ResidentSafetyEvent(Base):
    __tablename__ = "resident_safety_events"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    resident_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("residents.id"), index=True
    )
    evacuation_order_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("evacuation_orders.id"), nullable=True, index=True
    )
    status: Mapped[str] = mapped_column(String(30), index=True)
    recorded_by_profile_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("user_profiles.id")
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class EvacuationRoute(Base):
    __tablename__ = "evacuation_routes"
    __table_args__ = (Index("ix_evacuation_routes_path_gist", "path", postgresql_using="gist"),)

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    evacuation_order_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("evacuation_orders.id", ondelete="CASCADE"), index=True
    )
    from_zone_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("evacuation_zones.id"), nullable=True
    )
    shelter_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("shelters.id"))
    path: Mapped[object] = mapped_column(SpatialValue("LINESTRING"), nullable=False)
    distance_m: Mapped[float] = mapped_column(Float)
    estimated_minutes: Mapped[int] = mapped_column(Integer)
    hazard_run_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("hazard_runs.id"), nullable=True
    )
    algorithm_version: Mapped[str] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(String(30), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Locale(Base):
    __tablename__ = "locales"

    code: Mapped[str] = mapped_column(String(35), primary_key=True)
    display_name: Mapped[str] = mapped_column(String(120))
    native_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    status: Mapped[str] = mapped_column(String(30), index=True)
    native_review_required: Mapped[bool] = mapped_column(Boolean, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    tts_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    fallback_locale_code: Mapped[str | None] = mapped_column(String(35), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class MediaAsset(Base):
    __tablename__ = "media_assets"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    source_content_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("alert_contents.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    asset_type: Mapped[str] = mapped_column(String(30), index=True)
    locale: Mapped[str] = mapped_column(String(35), ForeignKey("locales.code"))
    voice: Mapped[str | None] = mapped_column(String(120), nullable=True)
    provider: Mapped[str | None] = mapped_column(String(60), nullable=True)
    model_version: Mapped[str | None] = mapped_column(String(120), nullable=True)
    object_key: Mapped[str] = mapped_column(Text)
    checksum: Mapped[str] = mapped_column(String(64))
    generation_status: Mapped[str] = mapped_column(String(30), index=True, default="ready")
    review_status: Mapped[str] = mapped_column(String(30), index=True)
    generated_from_hash: Mapped[str] = mapped_column(String(64))
    generation_error_code: Mapped[str | None] = mapped_column(String(80), nullable=True)
    generation_error_message_sanitized: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ContentTranslation(Base):
    __tablename__ = "content_translations"
    __table_args__ = (
        UniqueConstraint(
            "source_kind", "source_id", "locale", "version", name="uq_content_translation"
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    source_kind: Mapped[str] = mapped_column(String(40), index=True)
    source_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), index=True)
    locale: Mapped[str] = mapped_column(String(35), ForeignKey("locales.code"), index=True)
    content: Mapped[dict[str, object]] = mapped_column(JSON)
    translation_status: Mapped[str] = mapped_column(String(30), index=True)
    translation_method: Mapped[str] = mapped_column(String(30))
    version: Mapped[int] = mapped_column(Integer, default=1)
    reviewed_by_profile_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("user_profiles.id"), nullable=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    review_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class RetentionPolicy(Base):
    __tablename__ = "retention_policies"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    entity_type: Mapped[str] = mapped_column(String(80), unique=True)
    retention_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    action: Mapped[str] = mapped_column(String(30))
    legal_basis: Mapped[str] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    approved_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class LocaleReviewerAssignment(Base):
    __tablename__ = "locale_reviewer_assignments"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    profile_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("user_profiles.id", ondelete="CASCADE"), index=True
    )
    locale_code: Mapped[str] = mapped_column(String(35), ForeignKey("locales.code"), index=True)
    status: Mapped[str] = mapped_column(String(30), index=True)  # pending | verified | revoked
    verified_by_profile_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("user_profiles.id"), nullable=True
    )
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    valid_from: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    valid_to: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

