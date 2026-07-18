import { ArrowRight, Copy, KeyRound, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "../../features/auth/demoAccounts";
import { ROLE_LABELS } from "../../shared/domain/labels";
import { AuthLayout } from "../../shared/ui/AuthLayout";
import { Button } from "../../shared/ui/Button";
import { cn } from "../../shared/lib/cn";

export function LoginPage() {
  const navigate = useNavigate();
  const { authenticated, login } = useAuth();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (authenticated) navigate("/workspace", { replace: true });
  }, [authenticated, navigate]);

  return (
    <AuthLayout eyebrow="Đăng nhập" title="Vào trung tâm cảnh báo" description="Thông tin đăng nhập được Keycloak bảo vệ. Weather Bridge AI chỉ nhận danh tính đã xác thực để cấp đúng quyền truy cập.">
      <div className="space-y-5">
        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Bản demo — chọn nhanh 1 trong 4 vai</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            Bấm 1 thẻ để chuyển sang Keycloak với tài khoản đã điền sẵn, chỉ cần nhập mật khẩu dùng
            chung bên dưới (đây vẫn là luồng OIDC PKCE thật, không phải lối tắt bỏ qua đăng nhập).
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.username}
                type="button"
                onClick={() => void login(account.username)}
                className="flex min-h-16 flex-col items-start justify-center gap-0.5 rounded-xl border border-border-strong bg-surface-2 px-3 py-2 text-left transition hover:border-accent hover:bg-accent/10"
              >
                <span className="text-sm font-semibold text-fg-strong">{ROLE_LABELS[account.role]}</span>
                <span className="truncate text-[11px] text-muted-2">{account.username}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(DEMO_PASSWORD);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="mt-3 flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border border-border-strong bg-surface px-3 font-mono text-xs text-muted hover:text-fg"
          >
            <Copy size={13} /> Mật khẩu chung: {DEMO_PASSWORD} {copied && <span className="text-positive">(đã sao chép)</span>}
          </button>
        </div>

        <div className="rounded-2xl border border-border bg-surface-2 p-5">
          <div className="flex items-start gap-4"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent"><KeyRound size={19} /></div><div><p className="font-semibold text-fg-strong">Chuyển giao định danh an toàn</p><p className="mt-1 text-sm leading-6 text-muted">Tiếp tục tới màn hình đăng nhập Weather Bridge AI. Mật khẩu, xác minh email và khôi phục tài khoản đều do Keycloak quản lý.</p></div></div>
        </div>
        <Button
          variant="secondary"
          className={cn("w-full")}
          onClick={() => void login()}
        >
          Đăng nhập tài khoản khác <ArrowRight size={16} />
        </Button>
        <p className="flex items-center justify-center gap-2 font-mono text-xs text-muted-2"><ShieldCheck size={14} className="text-positive" /> OIDC Authorization Code + PKCE</p>
        <p className="text-center text-sm text-muted">Chưa có tài khoản? <Link to="/register" className="font-semibold text-accent hover:text-accent-hover">Tạo tài khoản</Link></p>
      </div>
    </AuthLayout>
  );
}
