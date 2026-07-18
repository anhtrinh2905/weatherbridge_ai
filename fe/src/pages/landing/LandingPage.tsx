import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DifferentiatorGrid } from "./components/DifferentiatorGrid";
import { HeroSection } from "./components/HeroSection";
import { ProblemSection } from "./components/ProblemSection";
import { RoleViews } from "./components/RoleViews";
import { ScenarioTabs } from "./components/ScenarioTabs";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const goToLogin = () => {
    setMenuOpen(false);
    navigate("/login");
  };

  return (
    <main
      className="site-shell min-h-screen overflow-hidden bg-canvas text-fg"
    >
      <div className="site-grid" aria-hidden="true" />
      <div className="site-orb site-orb--cyan" aria-hidden="true" />
      <div className="site-orb site-orb--violet" aria-hidden="true" />

      <SiteHeader
        menuOpen={menuOpen}
        onToggleMenu={() => setMenuOpen((value) => !value)}
        onRegister={goToLogin}
        disabled={false}
      />

      <HeroSection onRegister={goToLogin} disabled={false} />
      <ProblemSection />
      <DifferentiatorGrid />
      <ScenarioTabs />
      <RoleViews />
      <SiteFooter />
    </main>
  );
}
