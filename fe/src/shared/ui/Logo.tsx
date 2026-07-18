import { Link } from "react-router-dom";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="group inline-flex items-center gap-3" aria-label="Trang chủ Weather Bridge AI">
      <img
        src="/weather-bridge-mark.svg"
        alt=""
        className="size-9 shrink-0 transition duration-200 group-hover:-translate-y-0.5"
      />
      {!compact && (
        <span className="text-sm font-bold tracking-[0.04em] text-fg-strong">
          Weather Bridge <span className="text-accent">AI</span>
        </span>
      )}
    </Link>
  );
}
