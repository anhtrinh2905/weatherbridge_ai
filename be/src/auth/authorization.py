import re
from collections.abc import Iterable
from enum import StrEnum

from core.errors import AppError


class AppRole(StrEnum):
    ADMIN = "admin"
    COMMUNE_OFFICER = "commune_officer"
    VILLAGE_HEAD = "village_head"
    RESIDENT = "resident"


ROLE_PRIORITY: tuple[AppRole, ...] = (
    AppRole.ADMIN,
    AppRole.COMMUNE_OFFICER,
    AppRole.VILLAGE_HEAD,
    AppRole.RESIDENT,
)

_VILLAGE_ID_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
_MAX_VILLAGE_ID_LENGTH = 80


def resolve_roles(raw_roles: Iterable[str]) -> frozenset[AppRole]:
    known_values = {role.value: role for role in AppRole}
    return frozenset(known_values[role] for role in raw_roles if role in known_values)


def primary_role(roles: Iterable[AppRole]) -> AppRole | None:
    assigned = frozenset(roles)
    return next((role for role in ROLE_PRIORITY if role in assigned), None)


def normalize_village_id(value: object) -> str:
    if not isinstance(value, str):
        raise ValueError("village_id must be a string")
    normalized = value.strip().lower()
    if not normalized or len(normalized) > _MAX_VILLAGE_ID_LENGTH:
        raise ValueError("village_id length is invalid")
    if _VILLAGE_ID_PATTERN.fullmatch(normalized) is None:
        raise ValueError("village_id must be a slug")
    return normalized


def authorize_role(effective_role: AppRole, allowed_roles: frozenset[AppRole]) -> None:
    if effective_role not in allowed_roles:
        raise AppError(403, "You do not have permission for this action", "permission_denied")


def authorize_village_scope(
    effective_role: AppRole,
    assigned_village_id: str | None,
    requested_village_id: object,
) -> str:
    try:
        normalized = normalize_village_id(requested_village_id)
    except ValueError as exc:
        raise AppError(422, "Village identifier is invalid", "village_id_invalid") from exc

    if effective_role in {AppRole.ADMIN, AppRole.COMMUNE_OFFICER}:
        return normalized
    if assigned_village_id != normalized:
        raise AppError(
            403,
            "You do not have permission for this village",
            "village_scope_forbidden",
        )
    return normalized
