import { ShieldAlert, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/hooks";
import { Button } from "../shared/ui/Button";

export function ForbiddenPage() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-6 text-center text-fg">
      <div className="max-w-md">
        <ShieldAlert className="mx-auto text-danger" size={40} />
        <h1 className="mt-4 text-xl font-semibold text-fg-strong">Tài khoản chưa được cấp vai truy cập</h1>
        <p className="mt-3 leading-7 text-muted">
          Tài khoản {user?.displayName ?? ""} chưa được gán vào một trong 4 vai (Admin, Cán bộ PCTT,
          Trưởng bản, Người dân). Liên hệ Admin để được cấp quyền.
        </p>
        <Button
          variant="secondary"
          className="mx-auto mt-6"
          onClick={async () => {
            await logout();
            navigate("/");
          }}
        >
          <LogOut size={16} /> Đăng xuất
        </Button>
      </div>
    </main>
  );
}
