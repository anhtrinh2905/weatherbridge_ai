import { ArrowRight, MailCheck, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks";
import { AuthLayout } from "../../shared/ui/AuthLayout";
import { Button } from "../../shared/ui/Button";

export function RegisterPage() {
  const navigate = useNavigate();
  const { authenticated, register } = useAuth();

  useEffect(() => {
    if (authenticated) navigate("/workspace", { replace: true });
  }, [authenticated, navigate]);

  return (
    <AuthLayout eyebrow="Create account" title="Start with a clean identity" description="Create your VAI Code account through Keycloak. The same flow handles email verification and future sign-in providers.">
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-white/10 bg-white/5 p-4"><MailCheck size={18} className="text-cyan-300" /><p className="mt-4 text-sm font-semibold text-white">Verified email</p><p className="mt-1 text-xs leading-5 text-slate-500">Registration asks you to confirm ownership.</p></div><div className="rounded-2xl border border-white/10 bg-white/5 p-4"><ShieldCheck size={18} className="text-emerald-300" /><p className="mt-4 text-sm font-semibold text-white">Secure recovery</p><p className="mt-1 text-xs leading-5 text-slate-500">Password recovery stays outside the app.</p></div></div>
        <Button className="w-full" onClick={() => void register()}>Continue to registration <ArrowRight size={16} /></Button>
        <p className="text-center text-sm text-slate-500">Already have an account? <Link to="/login" className="font-semibold text-cyan-300 hover:text-cyan-200">Sign in</Link></p>
      </div>
    </AuthLayout>
  );
}
