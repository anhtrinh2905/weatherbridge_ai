import { Check, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { dnaChapters, coverageLocations } from "../landing.data";
import { SignalPanel } from "../../../shared/ui/SignalPanel";

function CoveragePanel() {
  return (
    <div className="signal-panel signal-panel--compact">
      <div className="flex items-center justify-between gap-4">
        <span className="signal-label">5 địa điểm dự báo</span>
        <span className="signal-live">CACHE CÓ TTL</span>
      </div>
      <div className="mt-6 grid gap-2">
        {coverageLocations.map(({ name, elevation }) => (
          <div key={name} className="signal-row">
            <span className="text-sm text-fg">{name}</span>
            <span className="ml-auto font-mono text-[0.68rem] uppercase tracking-[0.16em] text-muted">{elevation}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DecisionPanel() {
  const steps = [
    { label: "Ngưỡng cố định quyết Mức", tone: "ready" },
    { label: "AI chỉ viết Bản tin 4 phần", tone: "ready" },
    { label: "Validator kiểm lại mọi con số", tone: "review" },
  ];

  return (
    <div className="signal-panel signal-panel--compact">
      <div className="flex items-center justify-between gap-4">
        <span className="signal-label">Rule → AI → Validator</span>
        <span className="signal-live">KHÔNG HỘP ĐEN</span>
      </div>
      <div className="mt-6 grid gap-2">
        {steps.map(({ label, tone }) => (
          <div key={label} className="signal-row">
            <span className={`signal-row__status signal-row__status--${tone}`}>
              {tone === "ready" ? <Check size={11} strokeWidth={3} /> : null}
            </span>
            <span className="text-sm text-fg">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DnaVisual({ index }: { index: string }) {
  if (index === "01") return <CoveragePanel />;
  if (index === "02") return <DecisionPanel />;
  return <SignalPanel compact />;
}

export function DnaSection() {
  const [active, setActive] = useState(0);
  const chapterRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const idx = Number((entry.target as HTMLElement).dataset.chapterIndex);
          if (!Number.isNaN(idx)) setActive(idx);
        });
      },
      { rootMargin: "-35% 0px -45% 0px", threshold: 0 },
    );
    chapterRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section id="how" className="landing-section landing-section--surface relative z-10">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="landing-section__meta"><span>03 / CÁCH HOẠT ĐỘNG</span><i /></div>
        <p className="section-kicker">Từ dữ liệu đến người chịu trách nhiệm</p>
        <h2 className="mt-4 max-w-xl text-4xl font-semibold leading-tight tracking-[-0.045em] text-fg-strong sm:text-6xl">Cảnh báo chỉ có giá trị khi dẫn đến hành động.</h2>

        <div className="dna-grid mt-14">
          <div className="dna-grid__sticky">
            <div className="dna-grid__sticky-inner" key={active}>
              <DnaVisual index={dnaChapters[active].index} />
            </div>
          </div>

          <div className="dna-grid__chapters">
            {dnaChapters.map(({ index, icon: Icon, kicker, title, metric, metricLabel, proofPoints }, i) => (
              <div
                key={index}
                ref={(el) => { chapterRefs.current[i] = el; }}
                data-chapter-index={i}
                className={`dna-chapter${active === i ? " dna-chapter--active" : ""}`}
              >
                <div className="dna-chapter__index"><Icon size={16} /> {index} / {kicker}</div>
                <p className="dna-chapter__metric">{metric}<span>{metricLabel}</span></p>
                <h3 className="mt-3 text-2xl font-semibold leading-tight tracking-[-0.03em] text-fg-strong sm:text-3xl">{title}</h3>
                <ul className="dna-chapter__list">
                  {proofPoints.map((point) => (
                    <li key={point}>
                      <Check size={16} strokeWidth={2.5} />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                <div className="dna-chapter__mobile-visual">
                  <DnaVisual index={index} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="trust-badge mt-14">
          <ShieldCheck size={22} />
          <p className="text-base leading-7 text-fg">
            <strong className="text-fg-strong">Ngưỡng công khai, không hộp đen.</strong> Rule quyết Mức và Hạn chót; AI chỉ viết chữ. Validator kiểm lại mọi con số trước khi một bản tin được gửi đi.
          </p>
        </div>
      </div>
    </section>
  );
}
