import { ArrowUpRight, ShieldCheck, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { SignalPanel } from "./SignalPanel";

interface AuthLayoutProps {
  children: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
}

export function AuthLayout({ children, eyebrow, title, description }: AuthLayoutProps) {
  return (
    <main className="auth-shell min-h-screen bg-slate-950 text-white lg:grid lg:grid-cols-[0.95fr_1.05fr]">
      <section className="auth-rail relative hidden overflow-hidden p-8 lg:flex lg:flex-col xl:p-12">
        <div className="auth-rail__beam" aria-hidden="true" />
        <div className="relative z-10 flex items-center justify-between gap-4">
          <Logo />
          <span className="signal-label text-slate-500">IDENTITY / 01</span>
        </div>

        <div className="relative z-10 my-auto max-w-xl py-16">
          <p className="section-kicker">Build with intent</p>
          <h2 className="mt-5 max-w-lg text-5xl font-semibold leading-[1.02] tracking-[-0.06em] text-white xl:text-6xl">
            Turn a bold idea into a working advantage.
          </h2>
          <p className="mt-6 max-w-md text-base leading-7 text-slate-300">
            A focused workspace for teams who prototype quickly, validate honestly, and ship something people can use.
          </p>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-300">
            <span className="flex items-center gap-2"><Sparkles size={16} className="text-cyan-300" /> AI-ready from commit one</span>
            <span className="flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-300" /> Provenance by default</span>
          </div>
          <div className="mt-10 max-w-md">
            <SignalPanel compact />
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between gap-4 border-t border-white/10 pt-5 text-xs text-slate-500">
          <span>VAI Code / Hackathon foundation</span>
          <span className="flex items-center gap-2"><span className="signal-panel__dot" /> Systems ready</span>
        </div>
      </section>

      <section className="auth-content relative flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-16 lg:py-8 xl:px-24">
        <div className="auth-content__glow" aria-hidden="true" />
        <div className="relative z-10 flex items-center justify-between lg:justify-end">
          <div className="lg:hidden"><Logo /></div>
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-slate-400 transition hover:text-white">
            Back to home <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
          <div className="auth-card">
            <p className="section-kicker">{eyebrow}</p>
            <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.04em] text-white sm:text-4xl">{title}</h1>
            <p className="mt-3 leading-7 text-slate-400">{description}</p>
            <div className="auth-rule" />
            {children}
          </div>
        </div>
      </section>
    </main>
  );
}
