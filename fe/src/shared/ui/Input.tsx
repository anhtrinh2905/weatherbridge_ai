import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../lib/cn";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        "min-h-12 w-full rounded-xl border border-white/12 bg-slate-950/60 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-300/10",
        className,
      )}
      {...props}
    />
  );
});
