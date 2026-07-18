import { Navigate } from "react-router-dom";
import { useAuth } from "../features/auth/hooks";
import { homeRouteFor } from "../features/auth/roles";
import { Spinner } from "../shared/ui/Spinner";

/**
 * Keycloak's redirectUri after login always points here (see AuthProvider.login in
 * features/auth/keycloak.tsx). This page does nothing visible — it resolves the user's
 * highest-priority role and forwards to that role's home screen (docs/design/ui-ux-role-spec.md
 * §7b). A user with no recognized role lands on /forbidden instead of any dashboard.
 */
export function RoleHomeRedirect() {
  const { user, initialized } = useAuth();

  if (!initialized) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas">
        <Spinner label="Đang xác định vai trò tài khoản" />
      </div>
    );
  }

  const target = homeRouteFor(user?.roles ?? []);
  return <Navigate to={target} replace />;
}
