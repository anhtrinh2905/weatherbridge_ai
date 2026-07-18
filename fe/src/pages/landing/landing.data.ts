import {
  AlertTriangle,
  ClipboardList,
  Database,
  FileWarning,
  GitBranch,
  Mountain,
  Radio,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

export type Metric = {
  value: string;
  label: string;
};

export type Pillar = {
  index: string;
  title: string;
  text: string;
};

export type ProblemPoint = {
  icon: LucideIcon;
  title: string;
  text: string;
};

export type DnaChapter = {
  index: string;
  icon: LucideIcon;
  kicker: string;
  title: string;
  metric: string;
  metricLabel: string;
  proofPoints: string[];
};

export type Differentiator = {
  icon: LucideIcon;
  title: string;
  text: string;
};

export type ScenarioTab = {
  id: string;
  label: string;
  elevation: string;
  hazard: string;
  description: string;
  temperature?: string;
  confidence?: string;
};

export type RoleView = {
  category: string;
  name: string;
  description: string;
  specs: string[];
};

export const heroMetrics: Metric[] = [
  { value: "5", label: "Địa điểm dự báo, 250–1.800m độ cao" },
  { value: "±300m", label: "Chênh cao đủ để hiệu chỉnh riêng theo bản" },
  { value: "15/30′", label: "Mốc leo thang tới trưởng bản, cán bộ xã" },
];

export const heroPillars: Pillar[] = [
  {
    index: "01",
    title: "Thu thập & hiệu chỉnh",
    text: "5 địa điểm dự báo, hiệu chỉnh theo độ cao từng bản.",
  },
  {
    index: "02",
    title: "Ra quyết định",
    text: "Ngưỡng cố định quyết Mức; AI chỉ viết bản tin 4 phần.",
  },
  {
    index: "03",
    title: "Phân phối & xác nhận",
    text: "Web push tức thời; thiếu xác nhận sẽ leo thang đúng mốc.",
  },
];

export const problemPoints: ProblemPoint[] = [
  {
    icon: Mountain,
    title: "Một cảnh báo cho cả vùng chênh 1.500m độ cao",
    text: "Trạm đo thưa, cảnh báo cấp tỉnh không phản ánh nổi chênh lệch nhiệt độ giữa Mường Lay (~250m) và Mường Nhé (~1.800m).",
  },
  {
    icon: FileWarning,
    title: "Bản tin có con số, không có việc phải làm",
    text: "Nhiệt độ, lượng mưa là dữ liệu thô; người dân cần biết làm gì và trước mấy giờ, không phải một con số.",
  },
  {
    icon: Users,
    title: "Hộ yếu thế dễ bị bỏ sót",
    text: "Một thông báo đẩy không đảm bảo người già, neo đơn, không điện thoại nhận được và hành động kịp.",
  },
];

export const dnaChapters: DnaChapter[] = [
  {
    index: "01",
    icon: Database,
    kicker: "Thu thập & hiệu chỉnh",
    title: "Hai nguồn dữ liệu, một schema, không có điểm mù",
    metric: "5",
    metricLabel: "địa điểm dự báo",
    proofPoints: [
      "Open-Meteo là nguồn chính, OpenWeatherMap dự phòng; chuẩn hóa về một schema nội bộ, cache có TTL.",
      "Hiệu chỉnh tuyến tính theo độ cao cho từng bản dựa trên địa điểm dự báo gần nhất.",
      "Nguồn lỗi → dùng cache còn hạn, gắn nhãn “dữ liệu cũ lúc HH:MM”, không hiển thị trắng.",
    ],
  },
  {
    index: "02",
    icon: ShieldCheck,
    kicker: "Ra quyết định & viết bản tin",
    title: "Rule quyết mức, AI chỉ viết chữ",
    metric: "2",
    metricLabel: "mức cảnh báo",
    proofPoints: [
      "Ngưỡng tĩnh theo loại thiên tai và bản quyết định Mức: Chuẩn bị (vàng/cam) hoặc Đi ngay (đỏ).",
      "AI chỉ soạn Bản tin 4 phần bằng ngôn ngữ dễ hiểu; validator kiểm lại mọi con số trước khi gửi.",
      "Mức Đi ngay kích hoạt Âm thanh đỏ và Tầng con người, không chờ người dùng tự mở app.",
    ],
  },
  {
    index: "03",
    icon: Radio,
    kicker: "Phân phối & xác nhận",
    title: "Không dừng lại ở một thông báo đã gửi",
    metric: "15/30′",
    metricLabel: "mốc leo thang",
    proofPoints: [
      "Web push là kênh bắt buộc, tức thời; Zalo OA/SMS là kênh best-effort, không chặn luồng chính.",
      "Mức Đi ngay sinh Danh sách đến nhắc cho hộ trong Sổ hộ dễ tổn thương.",
      "Thiếu xác nhận trước mốc quy định sẽ leo thang Hộ → Trưởng bản → Cán bộ xã, ghi vào Nhật ký trách nhiệm.",
    ],
  },
];

export const differentiators: Differentiator[] = [
  {
    icon: Mountain,
    title: "Cảnh báo theo bản, không theo tỉnh",
    text: "Hai bản cùng một địa điểm dự báo nhưng lệch ≥300m độ cao vẫn ra nhiệt độ hiệu chỉnh khác nhau.",
  },
  {
    icon: AlertTriangle,
    title: "Ngưỡng công khai, không hộp đen",
    text: "Bảng ngưỡng theo loại thiên tai và bản là dữ liệu tĩnh, xem được — không phải mô hình tự học ẩn.",
  },
  {
    icon: GitBranch,
    title: "Leo thang có mốc rõ ràng",
    text: "15 phút, 30 phút, và hạn chót trừ 60 phút — không phụ thuộc việc ai đó nhớ để gọi lại.",
  },
  {
    icon: Users,
    title: "Sổ hộ dễ tổn thương",
    text: "Trưởng bản khai báo một lần các hộ già yếu, neo đơn, không điện thoại — hệ thống không tự suy đoán.",
  },
  {
    icon: ClipboardList,
    title: "Nhật ký trách nhiệm bất biến",
    text: "Ai được cảnh báo, ai đã xác nhận, khi nào leo thang — ghi tự động, xuất được báo cáo.",
  },
  {
    icon: Radio,
    title: "Web push là kênh bắt buộc",
    text: "Tức thời, không cần cài thêm ứng dụng; Zalo OA/SMS chỉ là lớp best-effort phía sau.",
  },
];

export const scenarioTabs: ScenarioTab[] = [
  {
    id: "dien-bien-phu",
    label: "TP. Điện Biên Phủ",
    elevation: "~490m",
    hazard: "Mưa lớn / ngập",
    description: "Địa điểm nền, độ cao thấp nhất trong 5 điểm — dùng làm mốc so sánh khi hiệu chỉnh các bản khác.",
  },
  {
    id: "muong-lay",
    label: "Mường Lay",
    elevation: "~250m",
    hazard: "Lũ ven sông Đà / ngập",
    description: "Ven sông Đà, độ cao thấp nhất trong 5 điểm — rủi ro ngập khi mưa lớn thượng nguồn.",
  },
  {
    id: "pha-din",
    label: "Đèo Pha Đin / Tuần Giáo",
    elevation: "~1.500m",
    hazard: "Sương mù đèo",
    description: "Cảnh báo tầm nhìn thấp cho tài xế tuyến Hà Nội – Điện Biên qua đèo.",
  },
  {
    id: "tua-chua",
    label: "Tủa Chùa",
    elevation: "~1.400m",
    hazard: "Sương muối / rét hại",
    description: "Kịch bản mẫu: nhiệt độ hiệu chỉnh xuống 2°C lúc 03:00, kích hoạt Mức Đi ngay.",
    temperature: "2°C",
    confidence: "Dự kiến 03:00 · độ tin cậy cao",
  },
  {
    id: "muong-nhe",
    label: "Mường Nhé",
    elevation: "600–1.800m",
    hazard: "Lũ quét / sạt lở",
    description: "Dải độ cao rộng nhất trong 5 điểm; địa bàn đề xuất cho pilot 6 tháng.",
  },
];

export const roleViews: RoleView[] = [
  {
    category: "VAI TRÒ 01",
    name: "Người dân",
    description: "Xem thẻ cảnh báo, nghe bản tin 4 phần, bấm “Tôi đã làm” để khép vòng xác nhận.",
    specs: ["Web push tức thời", "Bản tin 4 phần", "Xác nhận 1 chạm"],
  },
  {
    category: "VAI TRÒ 02",
    name: "Trưởng bản",
    description: "Quản Sổ hộ dễ tổn thương của bản mình, nhận Danh sách đến nhắc khi Mức Đi ngay được phát.",
    specs: ["Sổ hộ dễ tổn thương", "Danh sách đến nhắc", "Xác nhận “Đã đến nhắc”"],
  },
  {
    category: "VAI TRÒ 03",
    name: "Cán bộ xã",
    description: "Duyệt phát lệnh cảnh báo sơ tán Mức Đi ngay, nhận leo thang, xem Nhật ký trách nhiệm toàn xã.",
    specs: ["Duyệt lệnh sơ tán", "Nhận leo thang", "Nhật ký trách nhiệm toàn xã"],
  },
];

export const foundationStack = ["Open-Meteo", "OpenWeatherMap", "Keycloak", "Web Push (W3C)"];

export const coverageLocations = [
  { name: "TP. Điện Biên Phủ", elevation: "~490m" },
  { name: "Mường Lay", elevation: "~250m" },
  { name: "Đèo Pha Đin / Tuần Giáo", elevation: "~1.500m" },
  { name: "Tủa Chùa", elevation: "~1.400m" },
  { name: "Mường Nhé", elevation: "600–1.800m" },
];
