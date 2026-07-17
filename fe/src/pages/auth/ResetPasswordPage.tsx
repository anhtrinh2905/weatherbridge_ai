import { Link } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks";
import { AuthLayout } from "../../shared/ui/AuthLayout";
import { Button } from "../../shared/ui/Button";

export function ResetPasswordPage() {
  const { recoverPassword } = useAuth();
  return (
    <AuthLayout eyebrow="Account recovery" title="Set a new password" description="Password updates are completed in the Keycloak recovery flow, then you return to VAI Code.">
      <div className="space-y-5"><Button className="w-full" onClick={() => void recoverPassword()}>Continue to password reset</Button><p className="text-center text-sm text-slate-500"><Link to="/login" className="font-semibold text-cyan-300 hover:text-cyan-200">Back to sign in</Link></p></div>
    </AuthLayout>
  );
}
