import { coverageLocations, roleViews } from "../landing.data";
import { Logo } from "../../../shared/ui/Logo";

const systemLinks = [
  { href: "#why", label: "Bài toán" },
  { href: "#how", label: "Cách hoạt động" },
  { href: "#scenarios", label: "Kịch bản theo địa điểm" },
  { href: "#roles", label: "Vai trò & giao diện" },
];

export function SiteFooter() {
  return (
    <footer className="site-footer relative z-10 px-5 py-14 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="footer-grid">
          <div className="footer-col">
            <Logo />
            <p className="mt-4 max-w-xs text-base leading-7 text-muted">Không đẩy con số · Đẩy hành động: làm gì, trước khi nào.</p>
          </div>
          <div className="footer-col">
            <h3>Hệ thống</h3>
            <ul>
              {systemLinks.map(({ href, label }) => (
                <li key={href}><a href={href}>{label}</a></li>
              ))}
            </ul>
          </div>
          <div className="footer-col">
            <h3>Vùng phủ</h3>
            <ul>
              {coverageLocations.map(({ name }) => <li key={name}>{name}</li>)}
            </ul>
          </div>
          <div className="footer-col">
            <h3>Vai trò</h3>
            <ul>
              {roleViews.map(({ name }) => <li key={name}>{name}</li>)}
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Weather Bridge AI · Điện Biên</span>
          <span>Cảnh báo tác động, không chỉ số liệu</span>
        </div>
      </div>
    </footer>
  );
}
