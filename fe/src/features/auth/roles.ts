import type { Role } from "../../shared/domain/types";

const KNOWN_ROLES: Role[] = ["admin", "commune_officer", "village_head", "resident"];

// admin > commune_officer > village_head > resident (broader scope wins), see
// docs/design/ui-ux-role-spec.md §7b
const ROLE_PRIORITY: Role[] = ["admin", "commune_officer", "village_head", "resident"];

const ROLE_HOME: Record<Role, string> = {
  admin: "/admin/heatmap",
  commune_officer: "/officer/heatmap",
  village_head: "/village-head/map",
  resident: "/resident",
};

export function resolveRoles(rawRoles: string[]): Role[] {
  return KNOWN_ROLES.filter((r) => rawRoles.includes(r));
}

export function primaryRole(rawRoles: string[]): Role | null {
  const known = resolveRoles(rawRoles);
  for (const role of ROLE_PRIORITY) {
    if (known.includes(role)) return role;
  }
  return null;
}

export function homeRouteFor(rawRoles: string[]): string {
  const role = primaryRole(rawRoles);
  return role ? ROLE_HOME[role] : "/forbidden";
}
