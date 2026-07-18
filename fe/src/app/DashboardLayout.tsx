import { LogOut } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/hooks";
import { useTranslation } from "../shared/i18n/I18nProvider";
import { useLocalizedLabels } from "../shared/i18n/useLocalizedLabels";
import type { Role } from "../shared/domain/types";
import { cn } from "../shared/lib/cn";
import { LanguageSwitcher } from "../shared/ui/LanguageSwitcher";
import { Logo } from "../shared/ui/Logo";
import type { ComponentType } from "react";

export interface SidebarItem {
  to: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  end?: boolean;
  badge?: number;
}

/** A titled group of sidebar links. Omit `title` for an ungrouped (flat) block. */
export interface SidebarSection {
  title?: string;
  items: SidebarItem[];
}

function initialsOf(name: string | undefined): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/**
 * Shared chrome for role dashboards. Resident uses the same shell with only two primary
 * destinations so alerts stay first while the area map remains one click away.
 *
 * Pass `sections` for grouped navigation (with section headers) or `items` for a flat list.
 */
export function DashboardLayout({
  role,
  items,
  sections,
}: {
  role: Role;
  items?: SidebarItem[];
  sections?: SidebarSection[];
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const labels = useLocalizedLabels();

  const groups: SidebarSection[] = sections ?? (items ? [{ items }] : []);

  return (
    <div className="flex h-screen overflow-hidden bg-canvas text-fg">
      <aside className="flex w-64 shrink-0 flex-col border-r border-border-soft bg-surface">
        <div className="flex items-center justify-between px-5 py-6">
          <Logo compact />
          <LanguageSwitcher />
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
          {groups.map((group, groupIndex) => (
            <div key={group.title ?? `group-${groupIndex}`} className="space-y-1">
              {group.title ? (
                <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-2">
                  {group.title}
                </p>
              ) : null}
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      "relative flex min-h-10 items-center justify-between gap-2 rounded-lg pl-3 pr-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-accent/12 text-accent before:absolute before:left-0 before:top-1/2 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-accent"
                        : "text-muted hover:bg-surface-2 hover:text-fg",
                    )
                  }
                >
                  <span className="flex items-center gap-3">
                    <item.icon size={18} />
                    {item.label}
                  </span>
                  {item.badge ? (
                    <span className="min-w-5 rounded-full bg-danger px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
                      {item.badge}
                    </span>
                  ) : null}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="border-t border-border-soft p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-3 text-xs font-semibold text-fg-strong">
              {initialsOf(user?.displayName)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-fg-strong">{user?.displayName}</p>
              <p className="text-xs text-muted">{labels.role[role]}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate("/");
            }}
            className="mt-3 flex min-h-9 w-full items-center gap-2 rounded-lg px-2 text-xs font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <LogOut size={14} /> {t("common.logout")}
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
