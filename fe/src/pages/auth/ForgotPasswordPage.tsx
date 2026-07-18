import { KeyRound } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks";
import { useTranslation } from "../../shared/i18n/I18nProvider";
import { AuthLayout } from "../../shared/ui/AuthLayout";
import { Button } from "../../shared/ui/Button";

export function ForgotPasswordPage() {
  const { recoverPassword } = useAuth();
  const { t } = useTranslation();
  return (
    <AuthLayout
      eyebrow={t("forgotPassword.eyebrow")}
      title={t("forgotPassword.title")}
      description={t("forgotPassword.description")}
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-surface-2 p-5">
          <KeyRound className="text-accent" />
          <p className="mt-4 text-sm leading-6 text-muted">{t("forgotPassword.body")}</p>
        </div>
        <Button className="w-full" onClick={() => void recoverPassword()}>
          {t("forgotPassword.cta")}
        </Button>
        <p className="text-center text-sm text-muted">
          <Link to="/login" className="font-semibold text-accent hover:text-accent-hover">
            {t("common.backToLogin")}
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
