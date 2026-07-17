import { LogOut, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/hooks";
import { Button } from "../shared/ui/Button";
import { Logo } from "../shared/ui/Logo";

export function WorkspacePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  return (
    <main className="min-h-screen bg-canvas text-fg">
      <header className="border-b border-border-soft"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5"><Logo /><Button variant="ghost" className="min-h-10 px-3" onClick={async () => { await logout(); navigate("/"); }}><LogOut size={16} /> Đăng xuất</Button></div></header>
      <section className="mx-auto max-w-6xl px-5 py-16"><p className="font-mono text-xs font-bold uppercase tracking-[0.24em] text-accent">Trung tâm cảnh báo</p><h1 className="mt-4 text-4xl font-semibold tracking-tight text-fg-strong">Xin chào, {user?.displayName ?? "bạn"}.</h1><div className="mt-10 rounded-3xl border border-border bg-surface-2 p-8"><Sparkles className="text-accent" /><h2 className="mt-6 text-xl font-semibold text-fg-strong">Chuỗi cảnh báo đầu tiên bắt đầu tại đây.</h2><p className="mt-3 max-w-xl leading-7 text-muted">Theo dõi dự báo theo bản, chuyển rủi ro thành chỉ dẫn đúng hạn và xác nhận hành động đã đến được từng hộ dân.</p></div></section>
    </main>
  );
}
