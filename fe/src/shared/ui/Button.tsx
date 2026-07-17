import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", isLoading, children, disabled, ...props },
  ref,
) {
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-300/15 hover:bg-cyan-200",
    secondary: "border border-white/15 bg-white/8 text-white hover:bg-white/14",
    ghost: "text-slate-300 hover:bg-white/8 hover:text-white",
    danger: "bg-rose-500 text-white hover:bg-rose-400",
  };

  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    >
      {isLoading ? "Working..." : children}
    </button>
  );
});
