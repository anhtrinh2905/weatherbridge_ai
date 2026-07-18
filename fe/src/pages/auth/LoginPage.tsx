import { ArrowRight, Radar, ShieldCheck, UserRound, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks";
import { DEMO_ACCOUNTS } from "../../features/auth/demoAccounts";
import { useTranslation } from "../../shared/i18n/I18nProvider";
import { useLocalizedLabels } from "../../shared/i18n/useLocalizedLabels";
import { Button } from "../../shared/ui/Button";
import { LanguageSwitcher } from "../../shared/ui/LanguageSwitcher";
import { Logo } from "../../shared/ui/Logo";
import type { Role } from "../../shared/domain/types";

const ROLE_ICON: Record<Role, typeof ShieldCheck> = {
  admin: ShieldCheck,
  commune_officer: Radar,
  village_head: Users,
  resident: UserRound,
};

/**
 * Deliberately its own centered layout, not <AuthLayout /> — that component's left marketing
 * rail (landing-style hero copy + SignalPanel) is meant to sell real accounts on /register; on
 * /login the point is picking a demo role fast, so a second copy of the landing pitch was dead
 * weight, not a focal point. Real Keycloak login/registration still exist below the role picker.
 */
export function LoginPage() {
  const navigate = useNavigate();
  const { authenticated, login, loginAsDemo } = useAuth();
  const { t } = useTranslation();
  const labels = useLocalizedLabels();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (authenticated) navigate("/workspace", { replace: true });
  }, [authenticated, navigate]);

  const handleDemoClick = async (username: string) => {
    setError(false);
    setPending(username);
    try {
      await loginAsDemo(username);
    } catch {
      setError(true);
      setPending(null);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-4 py-10 text-fg">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <Link to="/" className="text-sm text-muted transition hover:text-fg">
              {t("common.backToHome")}
            </Link>
          </div>
        </div>

        <div className="mt-10 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-fg-strong">{t("auth.heading")}</h1>
          <p className="mt-2 text-lg font-semibold text-fg">{t("auth.subtitle")}</p>
          <p className="mt-2 text-sm leading-6 text-muted">{t("auth.instructions")}</p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {DEMO_ACCOUNTS.map((account) => {
            const Icon = ROLE_ICON[account.role];
            const isPending = pending === account.username;
            return (
              <button
                key={account.username}
                type="button"
                disabled={pending !== null}
                onClick={() => void handleDemoClick(account.username)}
                className="flex min-h-[4.5rem] w-full min-w-0 items-center gap-3 rounded-2xl border border-border-strong bg-surface-2 px-4 py-3 text-left transition hover:border-accent hover:bg-accent/10 disabled:opacity-50"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
                  <Icon size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-fg-strong">
                    {isPending ? t("auth.loggingIn") : labels.role[account.role]}
                  </span>
                  <span className="block truncate text-xs text-muted-2">{account.username}</span>
                </span>
              </button>
            );
          })}
        </div>
        {error && <p className="mt-3 text-center text-xs text-danger">{t("auth.loginFailed")}</p>}

        <div className="mt-8 flex items-center gap-3 text-xs text-muted-2" aria-hidden="true">
          <div className="h-px flex-1 bg-border-soft" />
          {t("auth.or")}
          <div className="h-px flex-1 bg-border-soft" />
        </div>

        <Button variant="secondary" className="mt-6 w-full" onClick={() => void login()}>
          {t("auth.loginOtherAccount")} <ArrowRight size={16} />
        </Button>
        <p className="mt-4 text-center text-xs leading-5 text-muted-2">{t("auth.demoNote")}</p>
      </div>
    </main>
  );
}
