import { ArrowRight } from "lucide-react";
import { Button } from "../../../shared/ui/Button";

export function FinalCta({ onLogin, onRegister, disabled }: { onLogin: () => void; onRegister: () => void; disabled: boolean }) {
  return (
    <section className="landing-section landing-section--cta relative z-10">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
        <div className="landing-section__meta"><span>08 / THỬ NGAY</span><i /></div>
        <div className="landing-cta">
          <div>
            <p className="section-kicker">Xem nó. Thử nó. Tin nó.</p>
            <h2>Lùa gia súc, che mạ trước 18 giờ.</h2>
            <p>Đăng nhập để theo dõi kịch bản sương muối Tủa Chùa, nghe bản tin hành động và bấm “Tôi đã làm”.</p>
          </div>
          <div className="landing-cta__actions">
            <Button onClick={onRegister} disabled={disabled}>
              Tạo tài khoản <ArrowRight size={16} />
            </Button>
            <Button variant="secondary" onClick={onLogin} disabled={disabled}>
              Đăng nhập
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
