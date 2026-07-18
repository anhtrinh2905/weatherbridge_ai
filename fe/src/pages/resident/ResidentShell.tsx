import { LogOut } from "lucide-react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks";
import { Logo } from "../../shared/ui/Logo";

/**
 * Deliberately NOT DashboardLayout (docs/design/ui-ux-role-spec.md §6b): resident's primary
 * audience is older/low-literacy users on mobile. No sidebar, no feature menu — just the alert
 * and 1 link to more detail. Only a logout affordance in the header, nothing else.
 */
export function ResidentShell() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-canvas text-fg">
      <header className="flex items-center justify-between border-b border-border-soft px-4 py-3">
        <Logo />
        <button
          type="button"
          onClick={async () => {
            await logout();
            navigate("/");
          }}
          aria-label="Đăng xuất"
          className="grid h-11 w-11 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg"
        >
          <LogOut size={18} />
        </button>
      </header>
      <main className="mx-auto max-w-md px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
