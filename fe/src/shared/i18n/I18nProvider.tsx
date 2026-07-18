import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import hmnLocale from "./locales/hmn.json";
import hmnMeta from "./locales/hmn.meta.json";
import viLocale from "./locales/vi.json";

export type Locale = "vi" | "hmn" | "th";

const STORAGE_KEY = "wba:locale";

/**
 * Thái Điện Biên (Tai Dam) has no viable text machine-translation (see docs/architecture
 * language strategy) — its UI locale intentionally falls back to the Vietnamese strings
 * rather than mistranslating or using Thailand's unrelated "Thai" language.
 */
const LOCALES: Record<Locale, Record<string, string>> = {
  vi: viLocale,
  hmn: hmnLocale,
  th: viLocale,
};

// Hmong is a low-resource language for machine translation — always flag it as unreviewed
// machine output (see docs/architecture language strategy), not only while hmn.json is a raw
// placeholder copy of vi.json.
export const HMONG_LOCALE_STATUS: "placeholder" | "machine-translated" = hmnMeta.status as
  | "placeholder"
  | "machine-translated";

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function readStoredLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "vi" || stored === "hmn" || stored === "th" ? stored : "vi";
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match,
  );
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const template = LOCALES[locale][key] ?? LOCALES.vi[key] ?? key;
      return interpolate(template, params);
    },
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useTranslation must be used within I18nProvider");
  return ctx;
}
