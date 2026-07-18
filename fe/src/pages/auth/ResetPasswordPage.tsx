import { Link } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks";
import { AuthLayout } from "../../shared/ui/AuthLayout";
import { Button } from "../../shared/ui/Button";

export function ResetPasswordPage() {
  const { recoverPassword } = useAuth();
  return (
    <AuthLayout eyebrow="Khôi phục tài khoản" title="Đặt mật khẩu mới" description="Mật khẩu được cập nhật trong quy trình bảo mật của Keycloak, sau đó bạn sẽ trở lại Weather Bridge AI.">
      <div className="space-y-5"><Button className="w-full" onClick={() => void recoverPassword()}>Tiếp tục đặt lại mật khẩu</Button><p className="text-center text-sm text-muted"><Link to="/login" className="font-semibold text-accent hover:text-accent-hover">Quay lại đăng nhập</Link></p></div>
    </AuthLayout>
  );
}
