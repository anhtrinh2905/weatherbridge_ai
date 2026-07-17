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
    primary: "bg-accent text-[#1A1206] shadow-lg shadow-accent/20 hover:bg-accent-hover",
    secondary: "border border-border-strong bg-surface-2 text-fg hover:bg-surface-3",
    ghost: "text-muted hover:bg-surface hover:text-fg",
    danger: "bg-danger text-white hover:bg-danger/90",
  };

  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    >
      {isLoading ? "Đang xử lý..." : children}
    </button>
  );
});
