import { ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { LEVEL_META } from "../data";
import type { HazardLevel } from "../types";

/** Mandatory non-replacement disclaimer — must appear on every hazard surface (NFR1). */
export function Disclaimer() {
  return (
    <p className="flex items-start gap-2 rounded-xl border border-border-soft bg-surface-2 px-3 py-2 text-xs leading-5 text-muted">
      <ShieldAlert size={14} className="mt-0.5 shrink-0 text-accent" />
      <span>
        Đây là công cụ hỗ trợ, <strong className="text-fg">không thay thế</strong> cảnh báo chính thức của KTTV/PCTT.
        Địa hình và hộ dân trong bản demo là <strong className="text-fg">mô phỏng</strong>; lượng mưa lấy từ Open-Meteo khi khả dụng.
      </span>
    </p>
  );
}

export function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div>
      <div className="flex items-center justify-between font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
        <span>Độ tin cậy</span>
        <span className="text-fg">{pct}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function LevelLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      {(Object.values(LEVEL_META)).map((meta) => (
        <span key={meta.level} className="flex items-center gap-1.5 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted">
          <span className="size-3 rounded-[3px]" style={{ background: meta.color }} />
          {meta.level}. {meta.label}
        </span>
      ))}
    </div>
  );
}

export function LevelChip({ level }: { level: HazardLevel }) {
  const meta = LEVEL_META[level];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ background: `${meta.color}22`, color: meta.color }}
    >
      <span className="size-2 rounded-full" style={{ background: meta.color }} />
      Cấp {level} · {meta.label}
    </span>
  );
}

/** Live "by when" countdown from a deadline expressed in hours (FR7). */
export function Countdown({ hours }: { hours: number }) {
  const [deadline] = useState(() => Date.now() + hours * 3600_000);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const remaining = Math.max(0, deadline - now);
  const h = Math.floor(remaining / 3600_000);
  const m = Math.floor((remaining % 3600_000) / 60_000);
  const s = Math.floor((remaining % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <span className="font-mono text-lg font-bold tabular-nums text-fg-strong">
      {pad(h)}:{pad(m)}:{pad(s)}
    </span>
  );
}
