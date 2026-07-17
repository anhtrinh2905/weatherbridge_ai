import { Link } from "react-router-dom";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="group inline-flex items-center gap-3" aria-label="VAI Code home">
      <span className="brand-mark grid size-9 place-items-center rounded-xl font-black text-slate-950 transition group-hover:rotate-6">
        <span>V</span>
      </span>
      {!compact && <span className="text-sm font-bold tracking-[0.18em] text-white">VAI CODE</span>}
    </Link>
  );
}
