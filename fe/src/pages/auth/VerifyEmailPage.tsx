import { MailCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { AuthLayout } from "../../shared/ui/AuthLayout";
import { Button } from "../../shared/ui/Button";

export function VerifyEmailPage() {
  return (
    <AuthLayout eyebrow="Xác minh email" title="Kiểm tra hộp thư" description="Keycloak đã gửi email xác minh. Mở liên kết trong email rồi quay lại đăng nhập.">
      <div className="space-y-6 text-center"><MailCheck className="mx-auto text-accent" size={46} /><p className="text-sm leading-6 text-muted">Nếu chưa thấy email, hãy kiểm tra thư rác hoặc đăng ký lại để yêu cầu một liên kết mới.</p><Link to="/login"><Button className="w-full">Đi tới đăng nhập</Button></Link></div>
    </AuthLayout>
  );
}
