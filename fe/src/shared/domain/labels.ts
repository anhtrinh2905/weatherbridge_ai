import type { HazardType, Occupation, Role, Tier, VulnerabilityReason } from "./types";

// 5-level scale colors follow QD 18/2021/QD-TTg (see docs/architecture/.../risk-rules-spec.md
// and docs/design/ui-ux-role-spec.md §1.2). This is a domain palette, kept separate from the
// UI chrome tokens in shared/styles/globals.css (see AD-4: be owns bin->color mapping; this is
// the FE mirror of that legend for the mock data layer).
export const HAZARD_LEVEL_COLORS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "#A7D8F0",
  2: "#FFF3A0",
  3: "#FFA94D",
  4: "#E03131",
  5: "#862E9C",
};

export const HAZARD_LEVEL_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "Cấp 1 — Thấp",
  2: "Cấp 2 — Trung bình",
  3: "Cấp 3 — Cao",
  4: "Cấp 4 — Rất cao",
  5: "Cấp 5 — Thảm hoạ",
};

export const TIER_COLORS: Record<Tier, string> = {
  prepare: "#FFF3A0",
  go_now: "#E03131",
};

export const TIER_LABELS: Record<Tier, string> = {
  prepare: "CHUẨN BỊ",
  go_now: "ĐI NGAY",
};

export const HAZARD_TYPE_LABELS: Record<HazardType, string> = {
  flash_flood: "Lũ quét",
  landslide: "Sạt lở",
};

export const OCCUPATION_LABELS: Record<Occupation, string> = {
  nong_dan: "Nông dân",
  chan_nuoi: "Chăn nuôi",
  tai_xe: "Tài xế",
  giao_vien: "Giáo viên",
  khong_co: "Không có nghề cố định",
};

export const VULNERABILITY_LABELS: Record<VulnerabilityReason, string> = {
  gia_neo_don: "Già neo đơn",
  khong_dien_thoai: "Không có điện thoại",
  mu_chu: "Mù chữ",
  sat_vung_nguy_co: "Sát vùng nguy cơ",
};

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  commune_officer: "Cán bộ PCTT xã",
  village_head: "Trưởng bản",
  resident: "Người dân",
};

export const SAFETY_DISCLAIMER =
  "Công cụ hỗ trợ, không thay cảnh báo chính thức của cơ quan KTTV/PCTT.";
