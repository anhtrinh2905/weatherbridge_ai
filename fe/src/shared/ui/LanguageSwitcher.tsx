import { Languages } from "lucide-react";
import { useState } from "react";
import { useLocales } from "../../features/operations/hooks";
import { useTranslation, type Locale } from "../i18n/I18nProvider";
import { cn } from "../lib/cn";

const STATIC_OPTIONS: { locale: Locale; label: string; hint?: string }[] = [
  { locale: "vi", label: "Tiếng Việt" },
  { locale: "hmn-x-dienbien", label: "Hmong", hint: "Bản dịch máy, chờ người bản ngữ duyệt" },
  { locale: "tai-x-muongpon", label: "Tai Dam", hint: "Fallback tiếng Việt + icon" },
];

function isSupportedLocale(code: string): code is Locale {
  return code === "vi" || code === "hmn-x-dienbien" || code === "tai-x-muongpon";
}

export function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation();
  const [open, setOpen] = useState(false);
  const { data: locales = [] } = useLocales(false);

  const apiOptions = new Map<Locale, { locale: Locale; label: string; hint?: string }>();
  for (const item of locales) {
    if (!isSupportedLocale(item.code)) continue;
    apiOptions.set(item.code, {
      locale: item.code,
      label: item.native_name || item.display_name,
      hint: item.requires_native_review ? "Cần người bản địa duyệt" : undefined,
    });
  }
  const options = STATIC_OPTIONS.map((option) => apiOptions.get(option.locale) ?? option);
  const current = options.find((o) => o.locale === locale) ?? options[0];

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
            {options.map((option) => (
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
