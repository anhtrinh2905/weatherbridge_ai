import { differentiators } from "../landing.data";
import { Reveal } from "./Reveal";

export function DifferentiatorGrid() {
  return (
    <section className="landing-section relative z-10">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="landing-section__meta"><span>04 / VÌ SAO KHÁC BIỆT</span><i /></div>
        <p className="section-kicker">Sáu điều tạo nên khác biệt</p>
        <h2 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight tracking-[-0.045em] text-fg-strong sm:text-6xl">Không phải công nghệ để trình diễn, mà để dùng thật.</h2>
        <div className="differentiator-grid mt-12">
          {differentiators.map(({ icon: Icon, title, text }, i) => (
            <Reveal key={title} delayMs={(i % 3) * 90}>
              <article className="tech-card differentiator-card h-full">
                <div className="tech-card__icon"><Icon size={20} /></div>
                <h3 className="mt-6 text-lg font-semibold text-fg-strong">{title}</h3>
                <p className="mt-3 text-base leading-7 text-muted">{text}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
