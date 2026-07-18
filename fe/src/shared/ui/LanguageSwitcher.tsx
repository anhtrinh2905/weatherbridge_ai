import { Languages } from "lucide-react";
import { useState } from "react";
import { useTranslation, type Locale } from "../i18n/I18nProvider";
import { cn } from "../lib/cn";

// Each language's name is shown in its own script (endonym), not translated per current
// locale — same convention every language picker uses.
const OPTIONS: { locale: Locale; label: string; hint?: string }[] = [
  { locale: "vi", label: "Tiếng Việt" },
  { locale: "hmn", label: "Hmoob", hint: "Dịch máy — chưa qua người Hmông kiểm tra" },
  { locale: "th", label: "ไทย / Tiếng Thái", hint: "Chưa có bản dịch — hiện tiếng Việt" },
];

export function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation();
  const [open, setOpen] = useState(false);
  const current = OPTIONS.find((o) => o.locale === locale) ?? OPTIONS[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Chọn ngôn ngữ"
        className="grid h-11 w-11 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg"
      >
        <Languages size={18} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <ul
            role="listbox"
            aria-label="Ngôn ngữ"
            className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-border-strong bg-surface-2 py-1 shadow-lg"
          >
            {OPTIONS.map((option) => (
              <li key={option.locale}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option.locale === locale}
                  onClick={() => {
                    setLocale(option.locale);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm",
                    option.locale === locale ? "bg-accent/12 text-accent" : "text-fg hover:bg-surface-3",
                  )}
                >
                  <span className="font-medium">{option.label}</span>
                  {option.hint && <span className="text-xs text-muted-2">{option.hint}</span>}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <span className="sr-only">{current.label}</span>
    </div>
  );
}
