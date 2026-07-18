"""Import the synthetic Muong Pon household sample into the operational schema.

Run after Alembic migrations:
    uv run --project be python scripts/import_simulated_residents.py

The import is idempotent by household code and always writes simulated records.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
import unicodedata
from datetime import UTC, date, datetime
from pathlib import Path
from uuid import uuid4

from sqlalchemy import select

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "be" / "src"))

from core.config import get_settings  # noqa: E402
from core.pii import PiiProtector  # noqa: E402
from database.domain_models import (  # noqa: E402
    Household,
    HouseholdMembership,
    Resident,
    ResidentLivelihood,
    ResidentLocation,
    SupportNeed,
)
from database.models import GeoLocation  # noqa: E402
from database.session import async_session_factory  # noqa: E402
from database.spatial import point_value  # noqa: E402

DEFAULT_INPUT = ROOT / "data" / "samples" / "households_muong_pon_sample.json"
OCCUPATION_MAP = {
    "nong_dan": "farmer",
    "chan_nuoi": "livestock",
}
SUPPORT_NEED_MAP = {
    "khong_dien_thoai": "no_phone",
    "sat_vung_nguy_co": "near_hazard_zone",
    "mu_chu": "low_literacy",
    "gia_neo_don": "elderly_alone",
}


def _slug(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).casefold().replace("đ", "d")
    ascii_value = "".join(char for char in normalized if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]+", "-", ascii_value).strip("-")


async def import_households(input_path: Path, limit: int | None) -> tuple[int, int]:
    raw_payload = await asyncio.to_thread(input_path.read_text, encoding="utf-8")
    payload = json.loads(raw_payload)
    rows = payload.get("households", [])
    if limit is not None:
        rows = rows[:limit]

    settings = get_settings()
    if settings.pii_mode != "simulated":
        raise RuntimeError("Synthetic imports require PII_MODE=simulated")
    protector = PiiProtector(settings)
    now = datetime.now(UTC)
    created = 0
    skipped = 0

    async with async_session_factory() as session, session.begin():
        dialect_name = session.bind.dialect.name if session.bind is not None else "postgresql"
        village_rows = (
            await session.scalars(select(GeoLocation).where(GeoLocation.code.like("village-%")))
        ).all()
        villages = {row.code: row for row in village_rows}
        if not villages:
            raise RuntimeError("Village registry is empty; run Alembic upgrade head first")

        existing_codes = set(
            await session.scalars(
                select(Household.code).where(
                    Household.code.in_([str(row["household_id"]) for row in rows])
                )
            )
        )

        for row in rows:
            household_code = str(row["household_id"])
            if household_code in existing_codes:
                skipped += 1
                continue

            village_code = f"village-{_slug(str(row['village_name_demo']))}"
            village = villages.get(village_code)
            if village is None:
                raise RuntimeError(f"No registry village matches {row['village_name_demo']!r}")

            full_name = str(row["full_name"])
            protected_name = protector.protect(full_name, context="resident.full_name")
            verified_on = date.fromisoformat(str(row["verified_at"]))
            household_id = uuid4()
            resident_id = uuid4()

            session.add(
                Household(
                    id=household_id,
                    code=household_code,
                    village_id=village.id,
                    status="active",
                    source="synthetic_demo_import",
                    simulated=True,
                    created_at=now,
                    updated_at=now,
                )
            )
            session.add(
                Resident(
                    id=resident_id,
                    managed_geo_location_id=village.id,
                    full_name_ciphertext=protected_name.ciphertext,
                    full_name_lookup_hash=protector.lookup_hash(full_name),
                    full_name_key_version=protected_name.key_version,
                    birth_year=max(1900, date.today().year - int(row["age"])),
                    verification_status="verified_demo",
                    source="synthetic_demo_import",
                    simulated=True,
                    created_at=now,
                    updated_at=now,
                )
            )
            await session.flush()
            session.add(
                HouseholdMembership(
                    household_id=household_id,
                    resident_id=resident_id,
                    relationship="head",
                    is_head=True,
                    valid_from=verified_on,
                )
            )

            location = row["location"]
            session.add(
                ResidentLocation(
                    resident_id=resident_id,
                    geo_location_id=village.id,
                    location_type="home",
                    location=point_value(
                        dialect_name,
                        float(location["lon"]),
                        float(location["lat"]),
                    ),
                    precision_m=90,
                    is_active=True,
                    created_at=now,
                )
            )

            occupation = str(row.get("occupation", "other"))
            session.add(
                ResidentLivelihood(
                    resident_id=resident_id,
                    livelihood_type=OCCUPATION_MAP.get(occupation, "other"),
                    details={
                        "source_occupation": occupation,
                        "ethnic_group_demo": row.get("ethnic_group_demo"),
                    },
                    schema_version=1,
                    is_primary=True,
                    created_at=now,
                )
            )

            for reason in row.get("vulnerability_reason", []):
                reason_code = str(reason)
                session.add(
                    SupportNeed(
                        resident_id=resident_id,
                        need_type=SUPPORT_NEED_MAP.get(reason_code, "other"),
                        details={"source_reason": reason_code, "simulated": True},
                        is_active=True,
                        created_at=now,
                    )
                )

            existing_codes.add(household_code)
            created += 1

    return created, skipped


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()
    created, skipped = asyncio.run(import_households(args.input, args.limit))
    print(f"Synthetic import complete: created={created}, skipped={skipped}")


if __name__ == "__main__":
    main()
