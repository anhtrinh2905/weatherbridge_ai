import { KeyRound } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks";
import { AuthLayout } from "../../shared/ui/AuthLayout";
import { Button } from "../../shared/ui/Button";

export function ForgotPasswordPage() {
  const { recoverPassword } = useAuth();
  return (
    <AuthLayout eyebrow="Khôi phục tài khoản" title="Lấy lại quyền truy cập" description="Keycloak sẽ hướng dẫn quy trình đặt lại mật khẩu an toàn rồi đưa bạn trở lại Weather Bridge AI.">
      <div className="space-y-5"><div className="rounded-2xl border border-border bg-surface-2 p-5"><KeyRound className="text-accent" /><p className="mt-4 text-sm leading-6 text-muted">Mã đặt lại, thời hạn và email khôi phục đều được xử lý ngoài ứng dụng để bảo vệ tài khoản của bạn.</p></div><Button className="w-full" onClick={() => void recoverPassword()}>Mở quy trình khôi phục</Button><p className="text-center text-sm text-muted"><Link to="/login" className="font-semibold text-accent hover:text-accent-hover">Quay lại đăng nhập</Link></p></div>
    </AuthLayout>
  );
}
