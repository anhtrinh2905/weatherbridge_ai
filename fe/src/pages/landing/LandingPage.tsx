import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks";
import { DifferentiatorGrid } from "./components/DifferentiatorGrid";
import { DnaSection } from "./components/DnaSection";
import { FinalCta } from "./components/FinalCta";
import { FoundationBand } from "./components/FoundationBand";
import { HeroSection } from "./components/HeroSection";
import { ProblemSection } from "./components/ProblemSection";
import { RoleViews } from "./components/RoleViews";
import { ScenarioTabs } from "./components/ScenarioTabs";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";

type AuthTransition = "login" | "register";

const authFields = {
  login: ["Địa chỉ email", "Mật khẩu"],
  register: ["Địa chỉ email", "Mật khẩu", "Xác nhận mật khẩu", "Tên", "Họ"],
};

function AuthHandoff({ mode }: { mode: AuthTransition }) {
  const registering = mode === "register";

  return (
    <div className={`auth-handoff auth-handoff--${mode}`} role="status" aria-label={registering ? "Đang mở trang tạo tài khoản" : "Đang mở trang đăng nhập"}>
      <div className="auth-handoff__grid" aria-hidden="true" />
      <div className="auth-handoff__shell">
        <section className="auth-handoff__brand">
          <div className="auth-handoff__wordmark">
            <img src="/weather-bridge-mark.svg" alt="" />
            <span>Weather Bridge AI</span>
          </div>
          <div className="auth-handoff__brand-copy">
            <p>ĐỊNH DANH AN TOÀN / CẢNH BÁO TÁC ĐỘNG</p>
            <h2>Biến dự báo thành<br />hành động đúng hạn.</h2>
          </div>
        </section>

        <section className="auth-handoff__form">
          <div className="auth-handoff__form-inner">
            <h2>{registering ? "Tạo tài khoản" : "Đăng nhập tài khoản"}</h2>
            <div className="auth-handoff__fields">
              {authFields[mode].map((field) => (
                <div key={field} className="auth-handoff__field">
                  <span>{field}{registering ? " *" : ""}</span>
                  <i />
                </div>
              ))}
            </div>
            {!registering && <p className="auth-handoff__forgot">Quên mật khẩu?</p>}
            <div className="auth-handoff__submit">{registering ? "Tạo tài khoản" : "Tiếp tục"}</div>
            <p className="auth-handoff__switch">
              {registering ? (
                <span className="auth-handoff__switch-action">Quay lại đăng nhập</span>
              ) : (
                <>
                  <span>Chưa có tài khoản Weather Bridge AI?</span>
                  <span className="auth-handoff__switch-action">Tạo tài khoản</span>
                </>
              )}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [authTransition, setAuthTransition] = useState<AuthTransition | null>(null);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const goToLogin = () => {
    setMenuOpen(false);
    navigate("/login");
  };

  const beginAuth = async (mode: AuthTransition) => {
    if (authTransition) return;
    setMenuOpen(false);
    setAuthTransition(mode);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reducedMotion) await new Promise<void>((resolve) => window.setTimeout(resolve, 520));

    try {
      await (mode === "login" ? login() : register());
    } catch {
      setAuthTransition(null);
    }
  };

  const disabled = Boolean(authTransition);

  return (
    <main
      className={`site-shell min-h-screen overflow-hidden bg-canvas text-fg${authTransition ? ` site-shell--auth-${authTransition}` : ""}`}
      aria-busy={disabled}
    >
      <div className="site-grid" aria-hidden="true" />
      <div className="site-orb site-orb--cyan" aria-hidden="true" />
      <div className="site-orb site-orb--violet" aria-hidden="true" />
      {authTransition && <AuthHandoff mode={authTransition} />}

      <SiteHeader
        menuOpen={menuOpen}
        onToggleMenu={() => setMenuOpen((value) => !value)}
        onLogin={goToLogin}
        onRegister={() => void beginAuth("register")}
        disabled={disabled}
      />

      <HeroSection onRegister={() => void beginAuth("register")} disabled={disabled} />
      <ProblemSection />
      <DnaSection />
      <DifferentiatorGrid />
      <ScenarioTabs />
      <RoleViews />
      <FoundationBand />
      <FinalCta onLogin={goToLogin} onRegister={() => void beginAuth("register")} disabled={disabled} />
      <SiteFooter />
    </main>
  );
}
