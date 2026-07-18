import { LogOut } from "lucide-react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks";
import { Logo } from "../../shared/ui/Logo";

/**
 * Deliberately NOT DashboardLayout (docs/design/ui-ux-role-spec.md §6b): resident's primary
 * audience is older/low-literacy users on mobile. No sidebar — alert dominates the viewport.
 * Wide on desktop so the 4-part bulletin + map fill the screen instead of a narrow phone column.
 */
export function ResidentShell() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-canvas text-fg">
      <header className="sticky top-0 z-20 border-b border-border-soft bg-canvas/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
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
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1400px] px-0 pb-10 pt-0 sm:px-6 sm:pt-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
