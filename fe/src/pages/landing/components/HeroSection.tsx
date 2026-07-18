import { ArrowRight, Check } from "lucide-react";
import { useEffect, useRef } from "react";
import { heroMetrics, heroPillars } from "../landing.data";
import { useTranslation } from "../../../shared/i18n/I18nProvider";
import { Button } from "../../../shared/ui/Button";
import { SignalPanel } from "../../../shared/ui/SignalPanel";

export function HeroSection({ onRegister, disabled }: { onRegister: () => void; disabled: boolean }) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const reducedMotion = typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      video.pause();
      return;
    }
    // jsdom's play() returns undefined rather than a Promise; only chain .catch() when it's real.
    video.play()?.catch(() => {
      // Autoplay can be blocked by the browser; the static gradient behind the video covers this case.
    });
  }, []);

  return (
    <section className="hero-section relative z-10">
      <div className="hero-video" aria-hidden="true">
        <video
          ref={videoRef}
          className="hero-video__el"
          muted
          loop
          playsInline
          preload="metadata"
          poster="/hero-poster.jpg"
        >
          <source src="/hero-bg.mp4" type="video/mp4" />
        </video>
        <div className="hero-video__overlay" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 pb-24 pt-16 sm:px-8 md:pt-24 lg:px-12 lg:pb-32">
        <div className="grid gap-14 lg:grid-cols-[1fr_0.9fr]">
          <div className="relative self-center">
            <p className="eyebrow"><span className="eyebrow__dot" /> {t("landing.hero.eyebrow")}</p>
            <h1 className="mt-7 max-w-2xl text-4xl font-semibold leading-[1.02] tracking-[-0.06em] text-fg-strong [text-shadow:0_2px_24px_rgba(0,0,0,0.45)] sm:text-6xl lg:text-[4.25rem]">
              {t("landing.hero.headline")}
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-fg [text-shadow:0_2px_18px_rgba(0,0,0,0.75)] sm:text-xl">
              {t("landing.hero.description")}
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button className="w-full sm:w-auto" onClick={onRegister} disabled={disabled}>
                {t("common.login")} <ArrowRight size={16} />
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 font-mono text-sm text-fg [text-shadow:0_2px_14px_rgba(0,0,0,0.8)]">
              <span className="flex items-center gap-2"><Check size={15} className="text-accent" /> {t("landing.hero.feature1")}</span>
              <span className="flex items-center gap-2"><Check size={15} className="text-accent" /> {t("landing.hero.feature2")}</span>
              <span className="flex items-center gap-2"><Check size={15} className="text-accent" /> {t("landing.hero.feature3")}</span>
            </div>
          </div>

          <div className="hero-visual relative self-center">
            <div className="hero-visual__index"><span>01</span> / 05</div>
            <SignalPanel />
          </div>
        </div>

        <div className="pillar-row mt-20">
          {heroPillars.map(({ index, titleKey, textKey }) => (
            <div key={index} className="pillar-row__item">
              <span className="pillar-row__index">{index}</span>
              <h2 className="mt-4 text-xl font-semibold text-fg-strong">{t(titleKey)}</h2>
              <p className="mt-2 text-base leading-6 text-muted">{t(textKey)}</p>
            </div>
          ))}
        </div>

        <div className="metric-strip mt-12">
          {heroMetrics.map(({ value, labelKey }) => (
            <div key={labelKey} className="metric-strip__item">
              <p className="metric-strip__value">{value}</p>
              <p className="metric-strip__label">{t(labelKey)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
