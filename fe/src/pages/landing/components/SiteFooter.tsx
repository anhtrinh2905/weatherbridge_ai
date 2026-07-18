import { coverageLocations, roleViews } from "../landing.data";
import { useTranslation } from "../../../shared/i18n/I18nProvider";
import { Logo } from "../../../shared/ui/Logo";

export function SiteFooter() {
  const { t } = useTranslation();

  const systemLinks = [
    { href: "#why", label: t("landing.nav.problem") },
    { href: "#scenarios", label: t("landing.footer.scenariosLink") },
    { href: "#roles", label: t("landing.footer.rolesLink") },
  ];

  return (
    <footer className="site-footer relative z-10 px-5 py-14 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="footer-grid">
          <div className="footer-col">
            <Logo />
            <p className="mt-4 max-w-xs text-base leading-7 text-muted">{t("landing.footer.tagline")}</p>
          </div>
          <div className="footer-col">
            <h3>{t("landing.footer.systemHeading")}</h3>
            <ul>
              {systemLinks.map(({ href, label }) => (
                <li key={href}><a href={href}>{label}</a></li>
              ))}
            </ul>
          </div>
          <div className="footer-col">
            <h3>{t("landing.footer.coverageHeading")}</h3>
            <ul>
              {coverageLocations.map(({ name }) => <li key={name}>{name}</li>)}
            </ul>
          </div>
          <div className="footer-col">
            <h3>{t("landing.footer.rolesHeading")}</h3>
            <ul>
              {roleViews.map(({ nameKey }) => <li key={nameKey}>{t(nameKey)}</li>)}
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>{t("landing.footer.copyright", { year: new Date().getFullYear() })}</span>
          <span>{t("landing.footer.tagline2")}</span>
        </div>
      </div>
    </footer>
  );
}
