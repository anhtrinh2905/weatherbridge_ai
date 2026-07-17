import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "./Input";
import { Button } from "./Button";
import { cn } from "../lib/cn";
import type { InputHTMLAttributes } from "react";

export function PasswordInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className={cn("pr-12", className)} />
      <Button
        type="button"
        variant="ghost"
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-1 top-1 min-h-10 px-3 text-slate-400"
        onClick={() => setVisible((value) => !value)}
      >
        {visible ? <EyeOff size={17} /> : <Eye size={17} />}
      </Button>
    </div>
  );
}
