import { MailCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "../../shared/i18n/I18nProvider";
import { AuthLayout } from "../../shared/ui/AuthLayout";
import { Button } from "../../shared/ui/Button";

export function VerifyEmailPage() {
  const { t } = useTranslation();
  return (
    <AuthLayout
      eyebrow={t("verifyEmail.eyebrow")}
      title={t("verifyEmail.title")}
      description={t("verifyEmail.description")}
    >
      <div className="space-y-6 text-center">
        <MailCheck className="mx-auto text-accent" size={46} />
        <p className="text-sm leading-6 text-muted">{t("verifyEmail.body")}</p>
        <Link to="/login">
          <Button className="w-full">{t("verifyEmail.cta")}</Button>
        </Link>
      </div>
    </AuthLayout>
  );
}
