import { roleViews } from "../landing.data";
import { useTranslation } from "../../../shared/i18n/I18nProvider";
import { Reveal } from "./Reveal";

export function RoleViews() {
  const { t } = useTranslation();
  return (
    <section id="roles" className="landing-section relative z-10">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="landing-section__meta"><span>{t("landing.section.role.meta")}</span><i /></div>
        <p className="section-kicker">{t("landing.role.kicker")}</p>
        <h2 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight tracking-[-0.045em] text-fg-strong sm:text-6xl">
          {t("landing.role.headline")}
        </h2>

        <div className="role-grid mt-12">
          {roleViews.map(({ categoryKey, nameKey, descriptionKey, specKeys }, i) => (
            <Reveal key={nameKey} delayMs={i * 100}>
              <article className="tech-card role-card h-full">
                <p className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-muted-2">{t(categoryKey)}</p>
                <h3 className="mt-3 text-xl font-semibold text-fg-strong">{t(nameKey)}</h3>
                <p className="mt-3 text-base leading-7 text-muted">{t(descriptionKey)}</p>
                <p className="role-card__specs">{specKeys.map((key) => t(key)).join(" · ")}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
