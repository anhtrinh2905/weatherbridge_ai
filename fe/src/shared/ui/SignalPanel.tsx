import { ArrowUpRight, Check } from "lucide-react";

const milestones = [
  { label: "Lùa gia súc về chuồng", status: "Trước 18:00", tone: "ready" },
  { label: "Che mạ, phủ bạt", status: "Trước 18:00", tone: "ready" },
  { label: "Bật sưởi an toàn", status: "Trước 20:00", tone: "review" },
];

export function SignalPanel({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`signal-panel${compact ? " signal-panel--compact" : ""}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="signal-panel__dot" />
          <span className="signal-label">TỦA CHÙA / 1.400M</span>
        </div>
        <span className="signal-live">ĐANG THEO DÕI</span>
      </div>

      <div className="mt-8 grid grid-cols-[1fr_auto] items-end gap-6">
        <div>
          <p className="signal-label">Sương muối / rét hại</p>
          <p className="mt-2 text-6xl font-semibold tracking-[-0.09em] text-fg-strong">
            2<sup className="align-super text-2xl text-accent">°</sup><span className="text-5xl">C</span>
          </p>
          <p className="mt-2 text-xs text-positive">Dự kiến 03:00 · độ tin cậy cao</p>
        </div>
        <div className="signal-ring" role="img" aria-label="Mức cảnh báo chuẩn bị">
          <span>CHUẨN<br />BỊ</span>
        </div>
      </div>

      <div className="mt-9 grid gap-2">
        {milestones.map(({ label, status, tone }) => (
          <div key={label} className="signal-row">
            <span className={`signal-row__status signal-row__status--${tone}`}>
              {tone === "ready" ? <Check size={11} strokeWidth={3} /> : null}
            </span>
            <span className="text-sm text-fg">{label}</span>
            <span className="ml-auto font-mono text-[0.68rem] uppercase tracking-[0.16em] text-muted">{status}</span>
          </div>
        ))}
      </div>

      {!compact && (
        <div className="signal-panel__footer mt-4 flex items-center justify-between gap-4">
          <div>
            <p className="signal-label">Bản tin hành động</p>
            <p className="mt-1 text-sm font-medium text-fg-strong">Hoàn thành trước khi rét xuống thấp</p>
          </div>
          <ArrowUpRight size={18} className="shrink-0 text-accent" />
        </div>
      )}
    </div>
  );
}
