import { LogOut } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/hooks";
import { ROLE_LABELS } from "../shared/domain/labels";
import type { Role } from "../shared/domain/types";
import { cn } from "../shared/lib/cn";
import { Logo } from "../shared/ui/Logo";
import type { ComponentType } from "react";

export interface SidebarItem {
  to: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  end?: boolean;
  badge?: number;
}

/**
 * Shared chrome for the 3 dashboard-style roles (admin/commune_officer/village_head) per
 * docs/design/ui-ux-role-spec.md §2b. `resident` intentionally does NOT use this layout — see
 * pages/resident/ResidentShell.tsx for the minimal, sidebar-free navigation for that role.
 */
export function DashboardLayout({ role, items }: { role: Role; items: SidebarItem[] }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-canvas text-fg">
      <aside className="flex w-64 shrink-0 flex-col border-r border-border-soft bg-surface">
        <div className="px-5 py-6">
          <Logo />
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex min-h-11 items-center justify-between gap-2 rounded-xl px-3 text-sm font-medium transition",
                  isActive ? "bg-accent/15 text-accent" : "text-muted hover:bg-surface-2 hover:text-fg",
                )
              }
            >
              <span className="flex items-center gap-2.5">
                <item.icon size={17} />
                {item.label}
              </span>
              {item.badge ? (
                <span className="rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold text-white">{item.badge}</span>
              ) : null}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-border-soft px-4 py-4">
          <p className="truncate text-sm font-medium text-fg-strong">{user?.displayName}</p>
          <p className="text-xs text-muted">{ROLE_LABELS[role]}</p>
          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate("/");
            }}
            className="mt-3 flex min-h-9 w-full items-center gap-2 rounded-lg px-2 text-xs font-medium text-muted hover:bg-surface-2 hover:text-fg"
          >
            <LogOut size={14} /> Đăng xuất
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
