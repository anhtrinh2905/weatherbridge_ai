import { ArrowUpRight, ShieldCheck, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "../i18n/I18nProvider";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Logo } from "./Logo";
import { SignalPanel } from "./SignalPanel";

interface AuthLayoutProps {
  children: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
}

export function AuthLayout({ children, eyebrow, title, description }: AuthLayoutProps) {
  const { t } = useTranslation();
  return (
    <main className="auth-shell min-h-screen bg-canvas text-fg lg:grid lg:grid-cols-[0.95fr_1.05fr]">
      <section className="auth-rail relative hidden overflow-hidden p-8 lg:flex lg:flex-col xl:p-12">
        <div className="auth-rail__beam" aria-hidden="true" />
        <div className="relative z-10 flex items-center justify-between gap-4">
          <Logo />
          <span className="signal-label text-muted-2">{t("authLayout.idBadge")}</span>
        </div>

        <div className="relative z-10 my-auto max-w-xl py-16">
          <p className="section-kicker">{t("authLayout.kicker")}</p>
          <h2 className="mt-5 max-w-lg text-5xl font-semibold leading-[1.02] tracking-[-0.06em] text-fg-strong xl:text-6xl">
            {t("authLayout.headline")}
          </h2>
          <p className="mt-6 max-w-md text-base leading-7 text-fg">{t("authLayout.description")}</p>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-fg">
            <span className="flex items-center gap-2"><Sparkles size={16} className="text-accent" /> {t("authLayout.feature1")}</span>
            <span className="flex items-center gap-2"><ShieldCheck size={16} className="text-positive" /> {t("authLayout.feature2")}</span>
          </div>
          <div className="mt-10 max-w-md">
            <SignalPanel compact />
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between gap-4 border-t border-border-soft pt-5 font-mono text-xs text-muted-2">
          <span>Weather Bridge AI / Điện Biên</span>
          <span className="flex items-center gap-2"><span className="signal-panel__dot" /> {t("authLayout.systemReady")}</span>
        </div>
      </section>

      <section className="auth-content relative flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-16 lg:py-8 xl:px-24">
        <div className="auth-content__glow" aria-hidden="true" />
        <div className="relative z-10 flex items-center justify-between lg:justify-end">
          <div className="lg:hidden"><Logo /></div>
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted transition hover:text-fg">
              {t("common.backToHome")} <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
        <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
          <div className="auth-card">
            <p className="section-kicker">{eyebrow}</p>
            <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.04em] text-fg-strong sm:text-4xl">{title}</h1>
            <p className="mt-3 leading-7 text-muted">{description}</p>
            <div className="auth-rule" />
            {children}
          </div>
        </div>
      </section>
    </main>
  );
}
