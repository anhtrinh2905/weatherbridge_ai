import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../features/auth/hooks";
import { resolveRoles } from "../features/auth/roles";
import type { Role } from "../shared/domain/types";

/**
 * UX-layer guard only (see docs/design/ui-ux-role-spec.md §7b, AD-8): decides which nav/screens
 * a role sees so users don't wander into UI that isn't theirs. Real authorization is enforced by
 * the backend at the service layer, scoped by role + village_id — this component prevents
 * confusion, it is not the security boundary. If it were bypassed, the API must still 403.
 */
export function RoleRoute({ allow }: { allow: Role[] }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const roles = resolveRoles(user.roles);
  const hasAccess = roles.some((r) => allow.includes(r));
  if (!hasAccess) return <Navigate to="/forbidden" replace />;
  return <Outlet />;
}
