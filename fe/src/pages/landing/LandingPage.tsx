import { ArrowRight, BrainCircuit, Check, GitBranch, LockKeyhole, Menu, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../shared/ui/Button";
import { Logo } from "../../shared/ui/Logo";
import { SignalPanel } from "../../shared/ui/SignalPanel";

const highlights = [
  {
    icon: BrainCircuit,
    index: "01",
    title: "AI-native foundation",
    text: "Keep inference, retrieval, evaluation, and product behavior traceable from day one.",
  },
  {
    icon: LockKeyhole,
    index: "02",
    title: "Secure by default",
    text: "Let Keycloak own identity while your product keeps a clean, verifiable boundary.",
  },
  {
    icon: GitBranch,
    index: "03",
    title: "Ship with clarity",
    text: "A production-shaped workspace that stays understandable when the prototype grows.",
  },
];

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className="site-shell min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="site-grid" aria-hidden="true" />
      <div className="site-orb site-orb--cyan" aria-hidden="true" />
      <div className="site-orb site-orb--violet" aria-hidden="true" />

      <header className="site-header relative z-10 mx-auto mt-4 flex max-w-7xl items-center justify-between px-5 py-4 sm:mt-6 sm:px-8 lg:px-12">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary navigation">
          <a href="#why" className="site-nav-link">Why VAI</a>
          <a href="#principles" className="site-nav-link">Principles</a>
          <Link to="/login" className="site-nav-link">Sign in</Link>
          <Link to="/register">
            <Button className="min-h-10 px-4">Get started <ArrowRight size={15} /></Button>
          </Link>
        </nav>
        <Button
          variant="ghost"
          className="min-h-10 px-3 md:hidden"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen((value) => !value)}
        >
          {menuOpen ? <X /> : <Menu />}
        </Button>
      </header>

      {menuOpen && (
        <nav id="mobile-navigation" className="relative z-20 mx-5 grid gap-1 rounded-2xl border border-white/10 bg-[#0b1b20]/95 p-2 shadow-2xl backdrop-blur md:hidden" aria-label="Mobile navigation">
          <a href="#why" className="mobile-nav-link" onClick={() => setMenuOpen(false)}>Why VAI</a>
          <a href="#principles" className="mobile-nav-link" onClick={() => setMenuOpen(false)}>Principles</a>
          <Link to="/login" className="mobile-nav-link">Sign in</Link>
          <Link to="/register" className="mobile-nav-link mobile-nav-link--accent">Get started</Link>
        </nav>
      )}

      <section className="relative z-10 mx-auto grid max-w-7xl gap-14 px-5 pb-24 pt-16 sm:px-8 md:pt-24 lg:grid-cols-[1fr_0.9fr] lg:px-12 lg:pb-32">
        <div className="relative self-center">
          <p className="eyebrow"><span className="eyebrow__dot" /> Production-shaped hackathon base</p>
          <h1 className="mt-7 max-w-3xl text-5xl font-semibold leading-[0.97] tracking-[-0.07em] text-white sm:text-7xl lg:text-[5.85rem]">
            Build the thing people remember.
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-slate-400 sm:text-xl">
            VAI Code gives your team a clean starting line for ambitious ideas: a fast product surface, a secure backend, and an AI boundary that can evolve without taking the app down.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link to="/register"><Button className="w-full sm:w-auto">Start building <ArrowRight size={16} /></Button></Link>
            <a href="#why"><Button variant="secondary" className="w-full sm:w-auto">See the foundation</Button></a>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-500">
            <span className="flex items-center gap-2"><Check size={15} className="text-cyan-300" /> FastAPI</span>
            <span className="flex items-center gap-2"><Check size={15} className="text-cyan-300" /> React + Vite</span>
            <span className="flex items-center gap-2"><Check size={15} className="text-cyan-300" /> Docker-ready</span>
          </div>
        </div>

        <div className="hero-visual relative self-center">
          <div className="hero-visual__index"><span>01</span> / 03</div>
          <SignalPanel />
          <div className="hero-note">
            <span className="hero-note__line" />
            <div>
              <p className="signal-label">The first useful loop</p>
              <p className="mt-1 text-sm font-medium text-white">Make progress visible.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="why" className="section-band relative z-10">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="max-w-2xl">
            <p className="section-kicker">A sharper starting point</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">Less glue code. More time for the idea.</h2>
            <p className="mt-5 max-w-xl leading-7 text-slate-400">The foundation is opinionated where it should be and open where your product needs room to become itself.</p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {highlights.map(({ icon: Icon, index, title, text }) => (
              <article key={title} className="feature-card">
                <div className="flex items-start justify-between gap-4">
                  <div className="feature-card__icon"><Icon size={20} /></div>
                  <span className="font-mono text-xs text-slate-600">{index}</span>
                </div>
                <h3 className="mt-7 text-lg font-semibold text-white">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-400">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="principles" className="relative z-10 mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-12 lg:py-28">
        <div>
          <p className="section-kicker">Working principles</p>
          <h2 className="mt-4 max-w-md text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">Ship honestly. Learn quickly.</h2>
        </div>
        <div className="grid gap-0">
          {[
            "A small vertical slice beats a perfect architecture diagram.",
            "Every model has a version, an evaluation, and a clear limitation.",
            "Open-source reuse is recorded, attributed, and reviewed before release.",
          ].map((item, index) => (
            <div key={item} className="principle-row">
              <span className="font-mono text-sm text-cyan-300">0{index + 1}</span>
              <p className="max-w-xl text-lg leading-8 text-slate-300">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/8 px-5 py-8 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <Logo compact />
          <span>Built for the first useful release.</span>
        </div>
      </footer>
    </main>
  );
}
