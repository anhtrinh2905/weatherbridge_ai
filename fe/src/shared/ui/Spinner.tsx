export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-slate-300" role="status">
      <span className="size-4 animate-spin rounded-full border-2 border-white/20 border-t-cyan-300" />
      {label}
    </span>
  );
}
