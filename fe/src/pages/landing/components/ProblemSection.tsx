import { problemPoints } from "../landing.data";
import { Reveal } from "./Reveal";

export function ProblemSection() {
  return (
    <section id="why" className="landing-section landing-section--surface relative z-10">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="landing-section__meta"><span>02 / BÀI TOÁN ĐIỆN BIÊN</span><i /></div>
        <div className="landing-section__head">
          <div className="max-w-2xl">
            <p className="section-kicker">Cảnh báo hiện tại còn quá xa người dân</p>
            <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-[-0.045em] text-fg-strong sm:text-6xl">Bản tin cấp tỉnh chưa trả lời: nhà tôi phải làm gì?</h2>
          </div>
          <p className="max-w-md leading-7 text-muted">Địa hình chia cắt, trạm đo thưa và chênh lệch độ cao lớn khiến cảnh báo chung khó dùng tại Tủa Chùa, Pha Đin hay Mường Nhé.</p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {problemPoints.map(({ icon: Icon, title, text }, i) => (
            <Reveal key={title} delayMs={i * 90}>
              <article className="tech-card h-full">
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
