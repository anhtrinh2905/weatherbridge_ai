import { roleViews } from "../landing.data";
import { Reveal } from "./Reveal";

export function RoleViews() {
  return (
    <section id="roles" className="landing-section relative z-10">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="landing-section__meta"><span>06 / VAI TRÒ &amp; GIAO DIỆN</span><i /></div>
        <p className="section-kicker">Ba vai trò, một chuỗi trách nhiệm</p>
        <h2 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight tracking-[-0.045em] text-fg-strong sm:text-6xl">Mỗi vai trò một việc, không chồng chéo.</h2>

        <div className="role-grid mt-12">
          {roleViews.map(({ category, name, description, specs }, i) => (
            <Reveal key={name} delayMs={i * 100}>
              <article className="tech-card role-card h-full">
                <p className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-muted-2">{category}</p>
                <h3 className="mt-3 text-xl font-semibold text-fg-strong">{name}</h3>
                <p className="mt-3 text-base leading-7 text-muted">{description}</p>
                <p className="role-card__specs">{specs.join(" · ")}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
