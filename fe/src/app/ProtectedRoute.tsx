import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../features/auth/hooks";
import { Spinner } from "../shared/ui/Spinner";

export function ProtectedRoute() {
  const location = useLocation();
  const { authenticated, initialized } = useAuth();

  if (!initialized) {
    return <div className="grid min-h-screen place-items-center bg-slate-950"><Spinner label="Checking your session" /></div>;
  }

  if (!authenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}
