import { Link } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks";
import { useTranslation } from "../../shared/i18n/I18nProvider";
import { AuthLayout } from "../../shared/ui/AuthLayout";
import { Button } from "../../shared/ui/Button";

export function ResetPasswordPage() {
  const { recoverPassword } = useAuth();
  const { t } = useTranslation();
  return (
    <AuthLayout
      eyebrow={t("forgotPassword.eyebrow")}
      title={t("resetPassword.title")}
      description={t("resetPassword.description")}
    >
      <div className="space-y-5">
        <Button className="w-full" onClick={() => void recoverPassword()}>
          {t("resetPassword.cta")}
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
