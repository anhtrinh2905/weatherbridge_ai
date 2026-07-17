import { ArrowUpRight, Check } from "lucide-react";

const milestones = [
  { label: "Product surface", status: "Ready", tone: "ready" },
  { label: "API contract", status: "Ready", tone: "ready" },
  { label: "AI evaluation", status: "In review", tone: "review" },
];

export function SignalPanel({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`signal-panel${compact ? " signal-panel--compact" : ""}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="signal-panel__dot" />
          <span className="signal-label">VAI / SIGNAL BOARD</span>
        </div>
        <span className="signal-live">LIVE</span>
      </div>

      <div className="mt-8 grid grid-cols-[1fr_auto] items-end gap-6">
        <div>
          <p className="signal-label">Release readiness</p>
          <p className="mt-2 text-6xl font-semibold tracking-[-0.09em] text-white">
            84<span className="text-2xl text-cyan-300">%</span>
          </p>
          <p className="mt-2 text-xs text-emerald-300">+12% from the last check</p>
        </div>
        <div className="signal-ring" role="img" aria-label="Release readiness is on track">
          <span>ON<br />TRACK</span>
        </div>
      </div>

      <div className="mt-9 grid gap-2">
        {milestones.map(({ label, status, tone }) => (
          <div key={label} className="signal-row">
            <span className={`signal-row__status signal-row__status--${tone}`}>
              {tone === "ready" ? <Check size={11} strokeWidth={3} /> : null}
            </span>
            <span className="text-sm text-slate-300">{label}</span>
            <span className="ml-auto text-[0.68rem] uppercase tracking-[0.16em] text-slate-500">{status}</span>
          </div>
        ))}
      </div>

      {!compact && (
        <div className="signal-panel__footer mt-4 flex items-center justify-between gap-4">
          <div>
            <p className="signal-label">Next checkpoint</p>
            <p className="mt-1 text-sm font-medium text-white">Validate the smallest useful loop</p>
          </div>
          <ArrowUpRight size={18} className="shrink-0 text-cyan-300" />
        </div>
      )}
    </div>
  );
}
