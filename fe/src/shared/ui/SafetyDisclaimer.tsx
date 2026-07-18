import { Info } from "lucide-react";
import { useTranslation } from "../i18n/I18nProvider";

/**
 * Mandatory on every hazard/alert surface (AD-11). One owner for the string — never re-typed
 * elsewhere. Not dismissible (can be visually compact, but always present).
 */
export function SafetyDisclaimer() {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border-strong bg-surface-2 px-3 py-2 text-xs leading-5 text-muted">
      <Info size={14} className="mt-0.5 shrink-0 text-accent" aria-hidden />
      <span>{t("safety.disclaimer")}</span>
    </div>
  );
}
