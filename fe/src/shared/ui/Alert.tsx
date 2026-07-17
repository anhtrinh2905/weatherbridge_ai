import { cn } from "../lib/cn";
import type { ReactNode } from "react";

export function Alert({ children, variant = "error" }: { children: ReactNode; variant?: "error" | "info" | "success" }) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        variant === "error" && "border-rose-400/25 bg-rose-400/10 text-rose-100",
        variant === "info" && "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
        variant === "success" && "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
      )}
    >
      {children}
    </div>
  );
}
