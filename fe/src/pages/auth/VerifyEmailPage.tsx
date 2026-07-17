import { MailCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { AuthLayout } from "../../shared/ui/AuthLayout";
import { Button } from "../../shared/ui/Button";

export function VerifyEmailPage() {
  return (
    <AuthLayout eyebrow="Email verification" title="Check your inbox" description="Keycloak sent the verification message. Follow the link there, then return to sign in.">
      <div className="space-y-6 text-center"><MailCheck className="mx-auto text-cyan-300" size={46} /><p className="text-sm leading-6 text-slate-400">If you do not see it, check your spam folder or start registration again to request a new message.</p><Link to="/login"><Button className="w-full">Go to sign in</Button></Link></div>
    </AuthLayout>
  );
}
