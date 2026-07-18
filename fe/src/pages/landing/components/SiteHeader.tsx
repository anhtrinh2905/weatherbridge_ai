import { ArrowRight, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "../../../shared/i18n/I18nProvider";
import { LanguageSwitcher } from "../../../shared/ui/LanguageSwitcher";
import { Button } from "../../../shared/ui/Button";
import { Logo } from "../../../shared/ui/Logo";

export function SiteHeader({
  menuOpen,
  onToggleMenu,
  onRegister,
  disabled,
}: {
  menuOpen: boolean;
  onToggleMenu: () => void;
  onRegister: () => void;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const firstMobileLinkRef = useRef<HTMLAnchorElement>(null);

  const navLinks = [
    { href: "#why", label: t("landing.nav.problem") },
    { href: "#scenarios", label: t("landing.nav.scenarios") },
    { href: "#roles", label: t("landing.nav.roles") },
  ];

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        setScrolled(window.scrollY > 24);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    firstMobileLinkRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onToggleMenu();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen, onToggleMenu]);

  return (
    <>
      <header
        className={`site-header relative z-50 mx-auto mt-4 flex max-w-7xl items-center justify-between px-5 py-4 sm:mt-6 sm:px-8 lg:px-12${scrolled ? " site-header--scrolled" : ""}`}
      >
        <Logo />
        <nav className="hidden items-center gap-8 md:flex" aria-label={t("landing.nav.mainAriaLabel")}>
          {navLinks.map(({ href, label }) => (
            <a key={href} href={href} className="site-nav-link">{label}</a>
          ))}
          <LanguageSwitcher />
          <Button className="min-h-10 px-4" onClick={onRegister} disabled={disabled}>
            {t("common.login")} <ArrowRight size={15} />
          </Button>
        </nav>
        <div className="flex items-center gap-1 md:hidden">
          <LanguageSwitcher />
          <Button
            variant="ghost"
            className="min-h-10 px-3"
            aria-label={menuOpen ? t("landing.nav.menuCloseAriaLabel") : t("landing.nav.menuOpenAriaLabel")}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={onToggleMenu}
          >
            {menuOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </header>

      {menuOpen && (
        <div className="mobile-drawer md:hidden" role="dialog" aria-modal="true" aria-label={t("landing.nav.mobileAriaLabel")}>
          <nav id="mobile-navigation" className="mobile-drawer__nav">
            {navLinks.map(({ href, label }, i) => (
              <a
                key={href}
                ref={i === 0 ? firstMobileLinkRef : undefined}
                href={href}
                className="mobile-drawer__link"
                style={{ animationDelay: `${i * 40}ms` }}
                onClick={onToggleMenu}
              >
                {label}
              </a>
            ))}
          </nav>
          <Button className="mobile-drawer__cta" onClick={onRegister} disabled={disabled}>
            {t("common.login")} <ArrowRight size={16} />
          </Button>
        </div>
      )}
    </>
  );
}
