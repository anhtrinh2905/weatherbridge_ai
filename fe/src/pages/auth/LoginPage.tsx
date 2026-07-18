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
    <AuthLayout eyebrow="Đăng nhập" title="Vào trung tâm cảnh báo" description="Thông tin đăng nhập được Keycloak bảo vệ. Weather Bridge AI chỉ nhận danh tính đã xác thực để cấp đúng quyền truy cập.">
      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-surface-2 p-5">
          <div className="flex items-start gap-4"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent"><KeyRound size={19} /></div><div><p className="font-semibold text-fg-strong">Chuyển giao định danh an toàn</p><p className="mt-1 text-sm leading-6 text-muted">Tiếp tục tới màn hình đăng nhập Weather Bridge AI. Mật khẩu, xác minh email và khôi phục tài khoản đều do Keycloak quản lý.</p></div></div>
        </div>
        <Button className="w-full" onClick={() => void login()}>Tiếp tục đăng nhập <ArrowRight size={16} /></Button>
        <p className="flex items-center justify-center gap-2 font-mono text-xs text-muted-2"><ShieldCheck size={14} className="text-positive" /> OIDC Authorization Code + PKCE</p>
        <p className="text-center text-sm text-muted">Chưa có tài khoản? <Link to="/register" className="font-semibold text-accent hover:text-accent-hover">Tạo tài khoản</Link></p>
      </div>
    </AuthLayout>
  );
}
