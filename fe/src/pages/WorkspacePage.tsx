import { LogOut, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/hooks";
import { Button } from "../shared/ui/Button";
import { Logo } from "../shared/ui/Logo";

export function WorkspacePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/8"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5"><Logo /><Button variant="ghost" className="min-h-10 px-3" onClick={async () => { await logout(); navigate("/"); }}><LogOut size={16} /> Sign out</Button></div></header>
      <section className="mx-auto max-w-6xl px-5 py-16"><p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">Workspace</p><h1 className="mt-4 text-4xl font-semibold tracking-tight">Welcome, {user?.displayName ?? "builder"}.</h1><div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-8"><Sparkles className="text-cyan-300" /><h2 className="mt-6 text-xl font-semibold">The first useful loop starts here.</h2><p className="mt-3 max-w-xl leading-7 text-slate-400">This protected surface is ready for the first product module. The AI job boundary, generated API client, and deployment contracts can grow behind it.</p></div></section>
    </main>
  );
}
