import { ArrowRight, KeyRound, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "../../features/auth/demoAccounts";
import { ROLE_LABELS } from "../../shared/domain/labels";
import { AuthLayout } from "../../shared/ui/AuthLayout";
import { Button } from "../../shared/ui/Button";

export function LoginPage() {
  const navigate = useNavigate();
  const { authenticated, login } = useAuth();
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    if (authenticated) navigate("/workspace", { replace: true });
  }, [authenticated, navigate]);

  const handleLogin = async (loginHint?: string) => {
    setPending(loginHint ?? "default");
    try {
      await login(loginHint);
    } catch {
      setPending(null);
    }
  };

  return (
    <AuthLayout
      eyebrow="Đăng nhập"
      title="Vào trung tâm cảnh báo"
      description="Weather Bridge AI giao toàn bộ định danh cho Keycloak. Bạn sẽ được chuyển tới trang đăng nhập chính thức, bảo vệ bằng Authorization Code + PKCE."
    >
      <div className="space-y-5">
        <Button variant="primary" className="w-full" onClick={() => void handleLogin()}>
          Đăng nhập qua Keycloak <ArrowRight size={16} />
        </Button>

        <div className="rounded-2xl border border-border bg-surface-2 p-5">
          <div className="flex items-start gap-4">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
              <KeyRound size={19} />
            </div>
            <div>
              <p className="font-semibold text-fg-strong">Định danh an toàn</p>
              <p className="mt-1 text-sm leading-6 text-muted">
                Mật khẩu, xác minh email và khôi phục tài khoản đều do Keycloak quản lý. Weather Bridge AI không lưu trữ thông tin đăng nhập.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Tài khoản demo</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            Bấm 1 thẻ để mở Keycloak với tên đăng nhập đã điền sẵn, rồi nhập mật khẩu demo bên dưới. Mọi luồng đều đi qua PKCE — không có đường tắt.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.username}
                type="button"
                disabled={pending !== null}
                onClick={() => void handleLogin(account.username)}
                className="flex min-h-16 flex-col items-start justify-center gap-0.5 rounded-xl border border-border-strong bg-surface-2 px-3 py-2 text-left transition hover:border-accent hover:bg-accent/10 disabled:opacity-50"
              >
                <span className="text-sm font-semibold text-fg-strong">
                  {pending === account.username ? "Đang chuyển tới Keycloak..." : ROLE_LABELS[account.role]}
                </span>
                <span className="flex items-center gap-1 truncate text-[11px] text-muted-2">
                  <UserRound size={11} /> {account.username}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-3 rounded-lg bg-surface-2/80 px-3 py-2 text-center font-mono text-xs text-muted">
            Mật khẩu demo chung: <span className="font-semibold text-fg-strong">{DEMO_PASSWORD}</span>
          </p>
        </div>

        <p className="flex items-center justify-center gap-2 font-mono text-xs text-muted-2">
          <ShieldCheck size={14} className="text-positive" /> OIDC Authorization Code + PKCE
        </p>
        <p className="text-center text-sm text-muted">
          Chưa có tài khoản?{" "}
          <Link to="/register" className="font-semibold text-accent hover:text-accent-hover">
            Tạo tài khoản
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
