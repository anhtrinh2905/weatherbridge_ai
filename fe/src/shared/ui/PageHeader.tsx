import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        {eyebrow && <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-accent">{eyebrow}</p>}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-fg-strong">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-border bg-surface-2 p-5 ${className ?? ""}`}>{children}</div>;
}
