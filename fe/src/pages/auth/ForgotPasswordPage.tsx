import { KeyRound } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks";
import { AuthLayout } from "../../shared/ui/AuthLayout";
import { Button } from "../../shared/ui/Button";

export function ForgotPasswordPage() {
  const { recoverPassword } = useAuth();
  return (
    <AuthLayout eyebrow="Account recovery" title="Recover your account" description="Keycloak will guide you through the secure reset flow and return you to the product afterward.">
      <div className="space-y-5"><div className="rounded-2xl border border-white/10 bg-white/5 p-5"><KeyRound className="text-cyan-300" /><p className="mt-4 text-sm leading-6 text-slate-400">Use the hosted recovery flow so reset tokens, expiration, and email delivery never pass through the application.</p></div><Button className="w-full" onClick={() => void recoverPassword()}>Open recovery flow</Button><p className="text-center text-sm text-slate-500"><Link to="/login" className="font-semibold text-cyan-300 hover:text-cyan-200">Back to sign in</Link></p></div>
    </AuthLayout>
  );
}
