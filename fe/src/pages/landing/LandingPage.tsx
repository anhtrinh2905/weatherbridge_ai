import { ArrowRight, BrainCircuit, Check, GitBranch, LockKeyhole, Menu, PlayCircle, X } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks";
import { Button } from "../../shared/ui/Button";
import { Logo } from "../../shared/ui/Logo";
import { SignalPanel } from "../../shared/ui/SignalPanel";

type AuthTransition = "login" | "register";

const authFields = {
  login: ["Địa chỉ email", "Mật khẩu"],
  register: ["Địa chỉ email", "Mật khẩu", "Xác nhận mật khẩu", "Tên", "Họ"],
};

const highlights = [
  {
    icon: BrainCircuit,
    index: "01",
    title: "Dự báo theo bản và độ cao",
    text: "Theo dõi 5 điểm từ Mường Lay đến Tủa Chùa, hiệu chỉnh nhiệt độ theo độ cao để cảnh báo sát từng bản hơn.",
  },
  {
    icon: LockKeyhole,
    index: "02",
    title: "Dịch dự báo thành hành động",
    text: "Rule quyết mức và hạn chót; AI viết bản tin 4 phần: chuyện gì, nguy hiểm cỡ nào, làm gì, trước khi nào.",
  },
  {
    icon: GitBranch,
    index: "03",
    title: "Đến được hộ cuối cùng",
    text: "Web push, giọng đọc Mông/Thái và danh sách đến nhắc giúp trưởng bản khép vòng với hộ yếu thế.",
  },
];

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

  return (
    <main
      className={`site-shell min-h-screen overflow-hidden bg-canvas text-fg${authTransition ? ` site-shell--auth-${authTransition}` : ""}`}
      aria-busy={Boolean(authTransition)}
    >
      <div className="site-grid" aria-hidden="true" />
      <div className="site-orb site-orb--cyan" aria-hidden="true" />
      <div className="site-orb site-orb--violet" aria-hidden="true" />
      {authTransition && <AuthHandoff mode={authTransition} />}

      <header className="site-header relative z-10 mx-auto mt-4 flex max-w-7xl items-center justify-between px-5 py-4 sm:mt-6 sm:px-8 lg:px-12">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex" aria-label="Điều hướng chính">
          <a href="#why" className="site-nav-link">Bài toán</a>
          <a href="#principles" className="site-nav-link">Cách hoạt động</a>
          <button type="button" className="site-nav-link" onClick={goToLogin}>Đăng nhập</button>
          <Button className="min-h-10 px-4" onClick={() => void beginAuth("register")} disabled={Boolean(authTransition)}>
            Bắt đầu <ArrowRight size={15} />
          </Button>
        </nav>
        <Button
          variant="ghost"
          className="min-h-10 px-3 md:hidden"
          aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen((value) => !value)}
        >
          {menuOpen ? <X /> : <Menu />}
        </Button>
      </header>

      {menuOpen && (
        <nav id="mobile-navigation" className="relative z-20 mx-5 grid gap-1 rounded-2xl border border-border bg-surface/95 p-2 shadow-2xl backdrop-blur md:hidden" aria-label="Điều hướng di động">
          <a href="#why" className="mobile-nav-link" onClick={() => setMenuOpen(false)}>Bài toán</a>
          <a href="#principles" className="mobile-nav-link" onClick={() => setMenuOpen(false)}>Cách hoạt động</a>
          <button type="button" className="mobile-nav-link" onClick={goToLogin}>Đăng nhập</button>
          <button type="button" className="mobile-nav-link mobile-nav-link--accent" onClick={() => void beginAuth("register")}>Bắt đầu</button>
        </nav>
      )}

      <section className="relative z-10 mx-auto grid max-w-7xl gap-14 px-5 pb-24 pt-16 sm:px-8 md:pt-24 lg:grid-cols-[1fr_0.9fr] lg:px-12 lg:pb-32">
        <div className="relative self-center">
          <p className="eyebrow"><span className="eyebrow__dot" /> Cảnh báo thời tiết tác động / Điện Biên</p>
          <h1 className="mt-7 max-w-3xl text-5xl font-semibold leading-[0.97] tracking-[-0.07em] text-fg-strong sm:text-7xl lg:text-[5.85rem]">
            Không đẩy con số. Đẩy hành động đúng hạn.
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-muted sm:text-xl">
            Weather Bridge AI tổng hợp dự báo đa nguồn, hiệu chỉnh theo độ cao từng bản và biến sương muối, rét hại, mưa lớn thành chỉ dẫn rõ ràng: làm gì, trước khi nào.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button className="w-full sm:w-auto" onClick={() => void beginAuth("register")} disabled={Boolean(authTransition)}>
              Tạo tài khoản <ArrowRight size={16} />
            </Button>
            <Link to="/demo" className="w-full sm:w-auto"><Button variant="secondary" className="w-full sm:w-auto"><PlayCircle size={16} /> Xem demo</Button></Link>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 font-mono text-sm text-muted-2">
            <span className="flex items-center gap-2"><Check size={15} className="text-accent" /> 5 điểm dự báo</span>
            <span className="flex items-center gap-2"><Check size={15} className="text-accent" /> Bản tin 4 phần</span>
            <span className="flex items-center gap-2"><Check size={15} className="text-accent" /> Giọng đọc Mông / Thái</span>
          </div>
        </div>

        <div className="hero-visual relative self-center">
          <div className="hero-visual__index"><span>01</span> / 03</div>
          <SignalPanel />
          <div className="hero-note">
            <span className="hero-note__line" />
            <div>
              <p className="signal-label">Cảnh báo tác động</p>
              <p className="mt-1 text-sm font-medium text-fg-strong">Làm gì · trước khi nào</p>
            </div>
          </div>
        </div>
      </section>

      <section id="why" className="landing-section landing-section--surface relative z-10">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="landing-section__meta"><span>02 / BÀI TOÁN ĐIỆN BIÊN</span><i /></div>
          <div className="landing-section__head">
            <div className="max-w-2xl">
              <p className="section-kicker">Cảnh báo hiện tại còn quá xa người dân</p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.04em] text-fg-strong sm:text-5xl">Bản tin cấp tỉnh chưa trả lời: nhà tôi phải làm gì?</h2>
            </div>
            <p className="max-w-md leading-7 text-muted">Địa hình chia cắt, trạm đo thưa và chênh lệch độ cao lớn khiến cảnh báo chung khó dùng tại Tủa Chùa, Pha Đin hay Mường Nhé. Người già và đồng bào dân tộc còn gặp rào cản chữ viết.</p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {highlights.map(({ icon: Icon, index, title, text }) => (
              <article key={title} className="feature-card">
                <div className="flex items-start justify-between gap-4">
                  <div className="feature-card__icon"><Icon size={20} /></div>
                  <span className="font-mono text-xs text-muted-2">{index}</span>
                </div>
                <h3 className="mt-7 text-lg font-semibold text-fg-strong">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="principles" className="landing-section relative z-10">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="landing-section__meta"><span>03 / CHUỖI CẢNH BÁO KHÉP KÍN</span><i /></div>
          <div className="grid gap-12 lg:grid-cols-[0.72fr_1.28fr]">
            <div>
              <p className="section-kicker">Từ dữ liệu đến người chịu trách nhiệm</p>
              <h2 className="mt-4 max-w-md text-3xl font-semibold leading-tight tracking-[-0.04em] text-fg-strong sm:text-5xl">Cảnh báo chỉ có giá trị khi dẫn đến hành động.</h2>
            </div>
            <div className="principles-panel">
              {[
                "Đối chiếu Open-Meteo và OpenWeatherMap, rồi hiệu chỉnh dự báo theo độ cao từng bản.",
                "Rule quyết mức và hạn chót; AI chỉ viết chỉ dẫn 4 phần, validator kiểm lại mọi con số.",
                "Web push, giọng đọc Mông/Thái, danh sách đến nhắc và nhật ký trách nhiệm khép vòng cảnh báo.",
              ].map((item, index) => (
                <div key={item} className="principle-row">
                  <span className="font-mono text-sm text-accent">0{index + 1}</span>
                  <p className="max-w-xl text-lg leading-8 text-fg">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section landing-section--cta relative z-10">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
          <div className="landing-section__meta"><span>04 / KỊCH BẢN TỦA CHÙA</span><i /></div>
          <div className="landing-cta">
            <div>
              <p className="section-kicker">Thử chuỗi cảnh báo sương muối</p>
              <h2>Lùa gia súc, che mạ trước 18 giờ.</h2>
              <p>Đăng nhập để theo dõi cảnh báo Tủa Chùa, nghe bản tin hành động và xác nhận “Tôi đã làm”.</p>
            </div>
            <div className="landing-cta__actions">
              <Button onClick={() => void beginAuth("register")} disabled={Boolean(authTransition)}>
                Tạo tài khoản <ArrowRight size={16} />
              </Button>
              <Button variant="secondary" onClick={goToLogin} disabled={Boolean(authTransition)}>
                Đăng nhập
              </Button>
              <Link to="/demo"><Button variant="secondary" className="w-full"><PlayCircle size={16} /> Xem demo</Button></Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="site-footer relative z-10 px-5 py-8 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-muted-2 sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <span>Không đẩy con số · Đẩy hành động: làm gì, trước khi nào</span>
        </div>
      </footer>
    </main>
  );
}
