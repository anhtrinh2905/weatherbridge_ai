export function Spinner({ label = "Đang tải" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted" role="status">
      <span className="size-4 animate-spin rounded-full border-2 border-border border-t-accent" />
      {label}
    </span>
  );
}
