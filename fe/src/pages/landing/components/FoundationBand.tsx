import { foundationStack } from "../landing.data";

export function FoundationBand() {
  return (
    <section className="compliance-band relative z-10">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-12">
        <div className="landing-section__meta"><span>07 / DỮ LIỆU &amp; CÔNG NGHỆ NỀN</span><i /></div>
        <p className="section-kicker">Xây trên nền công khai, không phải thuật toán bí mật</p>
        <div className="partner-row mt-8">
          {foundationStack.map((name) => (
            <span key={name}>{name}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
