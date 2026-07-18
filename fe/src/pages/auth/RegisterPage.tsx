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
    <AuthLayout eyebrow="Tạo tài khoản" title="Bắt đầu với danh tính an toàn" description="Đăng ký tài khoản Weather Bridge AI qua Keycloak. Hệ thống cũng xử lý xác minh email và các phương thức đăng nhập sau này.">
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-border bg-surface-2 p-4"><MailCheck size={18} className="text-accent" /><p className="mt-4 text-sm font-semibold text-fg-strong">Email đã xác minh</p><p className="mt-1 text-xs leading-5 text-muted">Bạn cần xác nhận quyền sở hữu email khi đăng ký.</p></div><div className="rounded-2xl border border-border bg-surface-2 p-4"><ShieldCheck size={18} className="text-positive" /><p className="mt-4 text-sm font-semibold text-fg-strong">Khôi phục an toàn</p><p className="mt-1 text-xs leading-5 text-muted">Mật khẩu không đi qua ứng dụng Weather Bridge AI.</p></div></div>
        <Button className="w-full" onClick={() => void register()}>Tiếp tục đăng ký <ArrowRight size={16} /></Button>
        <p className="text-center text-sm text-muted">Đã có tài khoản? <Link to="/login" className="font-semibold text-accent hover:text-accent-hover">Đăng nhập</Link></p>
      </div>
    </AuthLayout>
  );
}
