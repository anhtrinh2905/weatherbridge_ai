import { cn } from "../lib/cn";
import type { ReactNode } from "react";

export function Alert({ children, variant = "error" }: { children: ReactNode; variant?: "error" | "info" | "success" }) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        variant === "error" && "border-danger/25 bg-danger/10 text-danger",
        variant === "info" && "border-accent/25 bg-accent/10 text-accent",
        variant === "success" && "border-positive/25 bg-positive/10 text-positive",
      )}
    >
      {children}
    </div>
  );
}
