import { ArrowRight, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "../../../shared/ui/Button";
import { Logo } from "../../../shared/ui/Logo";

const navLinks = [
  { href: "#why", label: "Bài toán" },
  { href: "#scenarios", label: "Kịch bản" },
  { href: "#roles", label: "Vai trò" },
];

export function SiteHeader({
  menuOpen,
  onToggleMenu,
  onRegister,
  disabled,
}: {
  menuOpen: boolean;
  onToggleMenu: () => void;
  onRegister: () => void;
  disabled: boolean;
}) {
  const [scrolled, setScrolled] = useState(false);
  const firstMobileLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        setScrolled(window.scrollY > 24);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    firstMobileLinkRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onToggleMenu();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen, onToggleMenu]);

  return (
    <>
      <header
        className={`site-header relative z-50 mx-auto mt-4 flex max-w-7xl items-center justify-between px-5 py-4 sm:mt-6 sm:px-8 lg:px-12${scrolled ? " site-header--scrolled" : ""}`}
      >
        <Logo />
        <nav className="hidden items-center gap-8 md:flex" aria-label="Điều hướng chính">
          {navLinks.map(({ href, label }) => (
            <a key={href} href={href} className="site-nav-link">{label}</a>
          ))}
          <Button className="min-h-10 px-4" onClick={onRegister} disabled={disabled}>
            Đăng nhập <ArrowRight size={15} />
          </Button>
        </nav>
        <Button
          variant="ghost"
          className="min-h-10 px-3 md:hidden"
          aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={onToggleMenu}
        >
          {menuOpen ? <X /> : <Menu />}
        </Button>
      </header>

      {menuOpen && (
        <div className="mobile-drawer md:hidden" role="dialog" aria-modal="true" aria-label="Điều hướng di động">
          <nav id="mobile-navigation" className="mobile-drawer__nav">
            {navLinks.map(({ href, label }, i) => (
              <a
                key={href}
                ref={i === 0 ? firstMobileLinkRef : undefined}
                href={href}
                className="mobile-drawer__link"
                style={{ animationDelay: `${i * 40}ms` }}
                onClick={onToggleMenu}
              >
                {label}
              </a>
            ))}
          </nav>
          <Button className="mobile-drawer__cta" onClick={onRegister} disabled={disabled}>
            Đăng nhập <ArrowRight size={16} />
          </Button>
        </div>
      )}
    </>
  );
}
