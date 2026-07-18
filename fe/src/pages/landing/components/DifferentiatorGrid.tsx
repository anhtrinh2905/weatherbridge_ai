import { differentiators } from "../landing.data";
import { useTranslation } from "../../../shared/i18n/I18nProvider";
import { Reveal } from "./Reveal";

export function DifferentiatorGrid() {
  const { t } = useTranslation();
  return (
    <section className="landing-section relative z-10">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="landing-section__meta"><span>{t("landing.section.differentiator.meta")}</span><i /></div>
        <p className="section-kicker">{t("landing.differentiator.kicker")}</p>
        <h2 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight tracking-[-0.045em] text-fg-strong sm:text-6xl">
          {t("landing.differentiator.headline")}
        </h2>
        <div className="differentiator-grid mt-12">
          {differentiators.map(({ icon: Icon, titleKey, textKey }, i) => (
            <Reveal key={titleKey} delayMs={(i % 3) * 90}>
              <article className="tech-card differentiator-card h-full">
                <div className="tech-card__icon"><Icon size={20} /></div>
                <h3 className="mt-6 text-lg font-semibold text-fg-strong">{t(titleKey)}</h3>
                <p className="mt-3 text-base leading-7 text-muted">{t(textKey)}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
