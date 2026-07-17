import { ArrowRight, KeyRound, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks";
import { AuthLayout } from "../../shared/ui/AuthLayout";
import { Button } from "../../shared/ui/Button";

export function LoginPage() {
  const navigate = useNavigate();
  const { authenticated, login } = useAuth();

  useEffect(() => {
    if (authenticated) navigate("/workspace", { replace: true });
  }, [authenticated, navigate]);

  return (
    <AuthLayout eyebrow="Sign in" title="Enter your workspace" description="Your credentials stay with Keycloak. VAI Code only receives the verified identity it needs to protect your product data.">
      <div className="space-y-5">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-start gap-4"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-cyan-300/10 text-cyan-300"><KeyRound size={19} /></div><div><p className="font-semibold text-white">Secure identity handoff</p><p className="mt-1 text-sm leading-6 text-slate-400">Continue to the VAI Code sign-in screen. Password, MFA, email verification, and recovery are managed by Keycloak.</p></div></div>
        </div>
        <Button className="w-full" onClick={() => void login()}>Continue to sign in <ArrowRight size={16} /></Button>
        <p className="flex items-center justify-center gap-2 text-xs text-slate-500"><ShieldCheck size={14} className="text-emerald-300" /> OIDC Authorization Code + PKCE</p>
        <p className="text-center text-sm text-slate-500">New to VAI Code? <Link to="/register" className="font-semibold text-cyan-300 hover:text-cyan-200">Create an account</Link></p>
      </div>
    </AuthLayout>
  );
}
