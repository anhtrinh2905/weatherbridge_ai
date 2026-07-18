---
title: "UI/UX Spec — 4 vai RBAC (WeatherBridge AI MVP)"
status: draft
created: 2026-07-18
derives_from:
  - docs/prd.md
  - docs/architecture/architecture-weatherbridge-2026-07-18/ARCHITECTURE-SPINE.md
  - docs/architecture/architecture-weatherbridge-2026-07-18/SOLUTION-DESIGN.md
  - design/opendesign/README.md (token nguồn)
---

# UI/UX Spec — 4 vai RBAC

> Tài liệu này **không đặt quyết định kiến trúc mới**. Mọi màn hình/hành động bên dưới bám theo
> `ARCHITECTURE-SPINE.md` (AD-1..AD-11) và PRD (`docs/prd.md`). Khi mâu thuẫn, spine thắng. Chỗ
> nào vượt phạm vi 6 bảng hiện có (`hazard_run`, `hazard_layer`, `alert`, `village`,
> `resident_sim`, `threshold_config`) được đánh dấu rõ ở §7 — **không âm thầm giả định đã có**.

## 0. Nguyên tắc thiết kế xuyên suốt (bám AD-8, AD-9, AD-11)

1. **Phân quyền ở tầng service, UI chỉ phản ánh** (AD-8) — FE không tự ẩn/hiện dữ liệu bằng
   `if (role === ...)` như một lớp bảo mật; API đã scope theo `village_id`/vai trước khi trả JSON.
   UI ẩn menu/nút không có quyền là để **đỡ nhầm lẫn cho người dùng**, không phải để bảo mật.
2. **Không có màn hình nào tự suy `tier` từ `level`** (AD-9) — mọi nơi hiển thị "chuẩn bị"/"đi
   ngay" phải đọc thẳng field `tier` đã tính sẵn từ API.
3. **Disclaimer bắt buộc trên mọi bề mặt hazard/alert** (AD-11): *"Công cụ hỗ trợ, không thay
   cảnh báo chính thức của cơ quan KTTV/PCTT."* — 1 component `<SafetyDisclaimer />` dùng chung,
   không viết lại chuỗi này ở nơi khác.
4. **Độ tin cậy (confidence) luôn hiển thị cạnh cấp độ/cảnh báo** (AD-11) — không có màn hình nào
   chỉ hiện màu/cấp mà thiếu badge độ tin cậy.
5. **Trạng thái dữ liệu cũ phải "fail loud"** — không có layer `current` hợp lệ → hiện banner
   "dữ liệu cũ lúc HH:MM" hoặc "chưa có dữ liệu", không âm thầm hiện bản đồ trắng/im lặng.
6. **Token thị giác dùng lại Open Design** (`design/opendesign/artifacts/tokens.css`): nền
   `#0B0E14`/panel `#121821`/raised `#1A2230`, accent hổ phách `#F2A93B` cho thao tác chính,
   teal `#3DD6A4` cho trạng thái tích cực/an toàn — **không** tạo hệ màu UI thứ hai. Thang màu 5
   cấp hazard (§1.2) là màu **domain riêng** (theo QĐ 18/2021), tách biệt với palette UI chrome.

## 1. Thành phần dùng chung (shared components)

### 1.1 `<SafetyDisclaimer />`
Banner cố định, không đóng được vĩnh viễn (có thể thu gọn nhưng luôn còn 1 dòng), render trên
mọi trang có heatmap hoặc alert. Không đổi nội dung theo vai.

### 1.2 Thang màu 5 cấp + 2 mức (nguồn chân lý: `hazard_layer.level_bins` từ API, KHÔNG hardcode ở FE)

| Cấp | Màu (theo QĐ 18/2021/QĐ-TTg) | Dùng cho |
|---|---|---|
| 1 | Xanh nhạt `#A7D8F0` | Cán bộ/Admin (bản đồ 5 cấp) |
| 2 | Vàng nhạt `#FFF3A0` | Cán bộ/Admin |
| 3 | Cam `#FFA94D` | Cán bộ/Admin |
| 4 | Đỏ `#E03131` | Cán bộ/Admin |
| 5 | Tím `#862E9C` | Cán bộ/Admin |
| — | **Vàng** (`prepare`) | Người dân/Trưởng bản (view 2 mức) |
| — | **Đỏ + rung/âm** (`go_now`) | Người dân/Trưởng bản (view 2 mức) |

`be` sở hữu mapping bin→màu (AD-4) — FE chỉ đọc `legend` field trong response `hazard_layer`
manifest, không tự tính lại ngưỡng màu.

### 1.3 `<HazardMap />` (MapLibre GL JS, dùng chung cho vai admin/officer/village_head/resident, khác quyền lớp)
- Nhận `manifest` (per-type + `current` pointer) → tải **web PNG qua signed URL** (không bao giờ
  raw grid, AD-4), overlay lên nền OSM/MapLibre style tối giản.
- Toggle lớp: `flash_flood` | `landslide` | **"dominant hazard"** (overlay dẫn xuất phía FE = max
  theo ô giữa 2 lớp hiện tại — tính client-side, không lưu server, đúng AD-4).
- **Time slider** theo `forecast_day` (≥3 mốc ngày, FR3) — đổi ngày → gọi lại manifest cho ngày đó.
- **Click ô** → gọi `GET /api/v1/hazard-layers/:layer_id/cell?x&y` (AD-2), mở panel đóng góp đặc
  trưng (feature-contribution breakdown) — chỉ hiện đủ chi tiết ở vai `admin`/`commune_officer`;
  vai `resident`/`village_head` click ô chỉ thấy cấp độ + confidence, không thấy breakdown kỹ
  thuật (tránh quá tải thông tin không dùng được — vẫn cùng 1 component, khác prop `detailLevel`).
- Ranh xã Mường Pồn + ranh từng bản (từ `village.polygon_utm48n`) luôn vẽ overlay tĩnh.

### 1.4 `<AlertCard alert tier="prepare|go_now" />`
- Đúng 4 phần bắt buộc theo AD-9: **(1) chuyện gì — (2) nguy hiểm cỡ nào — (3) làm gì — (4) trước
  khi nào** (đếm ngược tới `deadline_utc`).
- **Hành động hiển thị trước số** (action-first) — dòng chữ to, ≤2 dòng, đọc được không cuộn ở màn
  360px (kế thừa quy tắc cũ, vẫn hợp lệ với AD-9 "view dân icon+màu+câu").
- `tier=go_now` → viền đỏ + rung nếu thiết bị hỗ trợ (mô phỏng Amber-Alert nhẹ; **không** có
  "Âm thanh đỏ" thật, vì FR13 là Roadmap).
- Kéo xuống mở **lớp bằng chứng**: số liệu nguồn (mm mưa, `level`, `confidence`, thời điểm
  `hazard_run.forecast_issued`) — không xoá số, chỉ giấu dưới progressive disclosure.

### 1.5 `<DataFreshnessBadge />`
Đọc `hazard_layer.is_current` + thời điểm tạo run. 3 trạng thái: `fresh` (teal), `stale` (vàng,
kèm "dữ liệu cũ lúc HH:MM"), `unavailable` (đỏ, "chưa có dữ liệu cho ngày này").

---

## 2. Bảng phân quyền tổng quan

| | **admin** | **commune_officer** (Cán bộ PCTT) | **village_head** (Trưởng bản) | **resident** (Người dân) |
|---|---|---|---|---|
| Xem heatmap 5 cấp toàn xã | ✅ | ✅ | Chỉ bản mình (khoanh vùng, không xem bản khác) | Chỉ khu vực mình (view 2 mức, không thấy 5 cấp thô) |
| Lọc theo loại thiên tai / lớp gộp | ✅ | ✅ | ✅ (trong bản mình) | Không cần (đã là view đơn giản) |
| Cell-inspect / đóng góp đặc trưng | ✅ (đầy đủ) | ✅ (đầy đủ) | ❌ | ❌ |
| Cấu hình `threshold_config` | ✅ (toàn quyền) | 🔶 chỉ nếu được cấp (FR9) | ❌ | ❌ |
| Xem trạng thái pipeline (`hazard_run`) + kiểm định backtest | ✅ | ❌ | ❌ | ❌ |
| Quản lý user & vai (Keycloak) | ✅ | ❌ | ❌ | ❌ |
| Xem danh sách hộ (`resident_sim`) | ✅ (toàn xã) | ✅ (toàn xã) | ✅ (chỉ bản mình) | ❌ |
| Triage (exposure × priority) | ✅ | ✅ (toàn xã, FR18) | ✅ (bản mình, FR18) | ❌ |
| Xác nhận "đã đến nhắc" hộ | ❌ | 👁 chỉ xem | ✅ | ❌ |
| Tự xác nhận an toàn/cần giúp | ❌ | 👁 chỉ xem | 👁 chỉ xem (bản mình) | ✅ (chính mình) |
| Xuất báo cáo/nhật ký (FR19) | ✅ | ✅ | 🔶 xuất riêng bản mình | ❌ |

`✅` = có quyền thao tác · `👁` = chỉ đọc, không sửa · `🔶` = có điều kiện/giới hạn · `❌` = không truy cập (API 403, không chỉ ẩn UI).

---

## 2b. Điều hướng sidebar theo vai

**Áp dụng cho 3 vai kiểu dashboard (admin/commune_officer/village_head) — sidebar trái cố định,
đúng mục nào hiện mục đó theo `RoleRoute`** (§7b) — không có route nào bị ẩn kiểu "có nhưng giấu",
route không thuộc vai thì **không tồn tại trong sidebar của vai đó**, không phải xám/khoá.

**Vai `resident` KHÔNG dùng layout sidebar này** — lý do: đối tượng chính gồm người lớn tuổi, đọc
chữ hạn chế, ưu tiên mobile (AD-9, AD-11 "action-first", thẻ ≤2 dòng đọc được ở 360px không cuộn).
Một sidebar liệt kê "tính năng" sẽ biến trang thành danh sách chức năng phải đọc — ngược nguyên
tắc gốc. Điều hướng resident ở §6b riêng (tối giản, không phải sidebar).

### Sidebar — `admin`
| Icon (lucide-react) | Nhãn | Route | Ghi chú |
|---|---|---|---|
| `Map` | Bản đồ nguy hiểm | `/admin/heatmap` | Mặc định sau login |
| `LayoutDashboard` | Tổng quan | `/admin/overview` | |
| `Activity` | Pipeline & vận hành | `/admin/pipeline` | Badge đỏ nếu có `hazard_run` `failed` |
| `SlidersHorizontal` | Ngưỡng cảnh báo | `/admin/thresholds` | |
| `FlaskConical` | Kiểm định mô hình | `/admin/calibration` | |
| `Users` | Người dùng & phân quyền | `/admin/users` | |

### Sidebar — `commune_officer` (Cán bộ PCTT)
| Icon | Nhãn | Route | Ghi chú |
|---|---|---|---|
| `Map` | Bản đồ nguy hiểm | `/officer/heatmap` | Mặc định sau login |
| `ListOrdered` | Ưu tiên theo bản | `/officer/triage` | Sắp theo điểm triage giảm dần |
| `History` | Lịch sử cảnh báo | `/officer/alerts` | Có nút xuất báo cáo (FR19) |
| `SlidersHorizontal` | Ngưỡng cảnh báo | `/officer/thresholds` | **Chỉ hiện trong sidebar nếu API xác nhận đã được admin cấp quyền** — gọi 1 lần lúc load layout (`GET /api/v1/me/permissions` hoặc field trong `/me`), không hardcode hiện rồi chặn sau |

### Sidebar — `village_head` (Trưởng bản)
| Icon | Nhãn | Route | Ghi chú |
|---|---|---|---|
| `Map` | Bản đồ bản tôi | `/village-head/map` | Mặc định sau login |
| `LayoutDashboard` | Tổng quan bản tôi | `/village-head/overview` | |
| `Users` | Danh sách hộ dân | `/village-head/residents` | Badge số hộ ưu tiên chưa xác nhận |

**Footer sidebar chung cả 3 vai trên**: tên user + vai (đọc từ `user.displayName` /
`user.roles`), nút đăng xuất. Không hiện `village_id`/thông tin nội bộ khác ở footer để tránh
rối — chi tiết đó nằm trong nội dung trang, không phải chrome điều hướng.

---

## 3. Vai ADMIN

**Mục tiêu chính**: vận hành hệ thống, đảm bảo pipeline chạy đúng, kiểm định mô hình, cấu hình
ngưỡng khi kiến trúc/khoa học thay đổi.

### 3.1 Kiến trúc thông tin (IA)
```
/admin
  /overview        — tổng quan hệ thống
  /pipeline         — trạng thái hazard_run, lịch sử run
  /thresholds        — cấu hình threshold_config theo loại × bản
  /calibration        — phiên bản calibration/feature-stack đang ghim + kiểm định backtest
  /users              — quản lý user & vai (Keycloak)
  /heatmap            — xem toàn bộ (giống officer, không giới hạn)
```

### 3.2 Màn hình chi tiết

**`/admin/overview`** — dashboard tổng: số bản đang có cảnh báo hiệu lực (theo `tier`), thời điểm
`hazard_layer` current gần nhất mỗi loại, cảnh báo pipeline lỗi (job `failed`), link nhanh tới
`/pipeline` nếu có sự cố.

**`/admin/pipeline`** — bảng `hazard_run`: `run_id`, `forecast_issued`, `status`
(`queued→running→succeeded|failed`), `feature_stack_version`, `calibration_version`, thời gian
chạy. Click 1 run → xem log lỗi nếu `failed` (đúng AD-7 "fail closed" — nếu artifact ghim bị
thiếu, run phải fail rõ ràng, không chạy với dữ liệu sai). **Không có nút "sửa lại kết quả"** —
run là bất biến, chỉ có thể trigger 1 run mới.

**`/admin/thresholds`** — bảng `threshold_config` theo `village_id × hazard_type`: các ngưỡng
vận hành + **`level_to_tier_cut`** (cấp nào bắt đầu tính là `go_now`). Sửa ở đây **không đụng vào
calibration khoa học** (AD-7 tách rõ 2 khái niệm) — UI phải ghi chú "đây là ngưỡng vận hành, không
phải trọng số mô hình" ngay trên form để cán bộ/admin không nhầm là đang "sửa khoa học". Có audit
trail (ai sửa, lúc nào) hiển thị dạng lịch sử bên cạnh mỗi field.

**`/admin/calibration`** — hiển thị `calibration_version`/`feature_stack_version` đang **ghim**
(pinned, chỉ đọc — sửa calibration là publish artifact mới từ `ai/`, không phải form web, đúng
AD-1/AD-7). Kèm báo cáo backtest 25/7/2024 (AD-10): `recall@τ` + FPR, ghi rõ nhãn banner **"Đánh
giá nội bộ — không phải chứng nhận hiệu năng"** (đúng NFR/AD-10, tránh phô trương số liệu small-n
như thành tích).

**`/admin/users`** — CRUD user + gán 1 trong 4 vai Keycloak, gán `village_id` cho `village_head`
(mỗi trưởng bản chỉ gán đúng 1 bản). Không tự làm auth ở đây — chỉ là UI quản trị gọi Keycloak Admin API.

---

## 4. Vai Cán bộ PCTT xã (`commune_officer`)

**Mục tiêu chính**: nhìn toàn cảnh rủi ro cả xã, hiểu **vì sao** mô hình cho ra cấp độ đó (đóng góp
đặc trưng), quyết định nên chủ động cảnh báo/điều phối bản nào.

### 4.1 IA
```
/officer
  /heatmap        — bản đồ 5 cấp toàn xã (màn hình chính)
  /triage          — danh sách bản theo điểm ưu tiên
  /alerts           — lịch sử cảnh báo đã phát, xuất báo cáo
  /thresholds        — CHỈ hiện nếu được admin cấp quyền (FR9)
```

### 4.2 Màn hình chi tiết

**`/officer/heatmap`** (màn hình mặc định khi đăng nhập) — `<HazardMap />` full-screen, toggle
loại (lũ quét/sạt lở/gộp), time slider 3–7 ngày, ranh giới từng bản overlay. Click 1 bản → popup
tóm tắt (cấp cao nhất trong bản, số ô ở cấp 4-5, `tier` hiện hành nếu đã có alert). Click 1 ô →
panel đóng góp đặc trưng (bên phải, dạng thanh ngang: % đóng góp của độ dốc, HAND, khoảng cách
đường, trigger mưa...) — đây là chỗ cán bộ "tin tưởng" mô hình (G3), không phải hộp đen.

**`/officer/triage`** — bảng các bản, sắp xếp giảm dần theo **điểm triage = Phơi nhiễm × Ưu tiên**
(FR18), cột: bản, cấp hazard cao nhất, số hộ ưu tiên hỗ trợ trong bản, `tier` hiện hành, nút
"Xem chi tiết bản" (điều hướng sang view giống `village_head` nhưng đọc-toàn-xã).

**`/officer/alerts`** — lịch sử `alert` (bản, loại, cấp, tier, deadline, đã released lúc nào),
lọc theo bản/loại/khoảng ngày, nút xuất báo cáo (FR19, dữ liệu mô phỏng — ghi rõ trong footer
export "dữ liệu dân cư trong báo cáo là dữ liệu mô phỏng, không phải PII thật", đúng AD-8).

**`/officer/thresholds`** — **chỉ render nếu API trả quyền** (không tự kiểm tra role ở FE là đủ,
BE phải 403 nếu chưa được admin cấp — đúng AD-8 "scoped ở tầng service"). Giao diện giống
`/admin/thresholds` nhưng phạm vi hẹp hơn tuỳ cấu hình.

---

## 5. Vai Trưởng thôn/bản (`village_head`)

**Mục tiêu chính**: biết ai trong bản mình đang nguy hiểm/an toàn, đi nhắc đúng người, có bằng
chứng đã làm.

### 5.1 IA
```
/village-head
  /overview        — tóm tắt bản mình: cấp hazard hiện tại, tier, số hộ cần chú ý
  /residents         — danh sách hộ trong bản (resident_sim), trạng thái, xác nhận đã nhắc
  /map                — mini heatmap chỉ vùng bản mình
```

### 5.2 Màn hình chi tiết

**`/village-head/overview`** — thẻ lớn: bản của tôi = [tên bản], cấp hazard cao nhất hiện tại,
`<AlertCard />` nếu có alert hiệu lực, `<DataFreshnessBadge />`. Số liệu tóm tắt: X/Y hộ đã xác
nhận an toàn, Z hộ ưu tiên hỗ trợ chưa xác nhận.

**`/village-head/residents`** — bảng `resident_sim` **lọc cứng theo `village_id` của trưởng bản
đăng nhập** (service-layer scoping, AD-8) — không có cách nào ở UI để xem bản khác (không phải
ẩn nút, mà API không trả dữ liệu bản khác). Cột: tên (mô phỏng), nghề, `priority` ("hộ ưu tiên hỗ
trợ" — **không** dùng chữ "dễ tổn thương", đúng convention của spine), trạng thái an toàn hiện
tại (xem §7), nút **"Đánh dấu đã đến nhắc"**. Mặc định sắp theo điểm triage giảm dần (hộ ưu tiên
cao lên đầu, giống FR18 nhưng ở cấp hộ trong 1 bản).

**`/village-head/map`** — `<HazardMap />` nhưng khoanh crop/zoom cố định vào polygon bản mình,
không cho pan ra ngoài ranh xã; không có panel đóng góp đặc trưng (đúng bảng phân quyền §2).

---

## 6. Vai Người dân (`resident`)

**Mục tiêu chính**: biết ngay mình có nguy hiểm không, phải làm gì, trước khi nào — không cần đọc
số liệu khí tượng.

### 6.1 IA
```
/                (trang chính sau đăng nhập/định danh hộ mô phỏng)
  — thẻ cảnh báo lớn (nếu có alert hiệu lực cho bản của hộ)
  — bản đồ khu vực (view rút gọn)
  — nút tự xác nhận trạng thái
/details          — lớp bằng chứng đầy đủ (progressive disclosure)
```

### 6.2 Màn hình chi tiết

**Trang chính** — Ưu tiên tuyệt đối: nếu có `alert` hiệu lực cho bản của resident, `<AlertCard />`
chiếm phần lớn màn hình (icon + màu + câu hành động + đếm ngược), **phía trên `<HazardMap />`**.
Nếu không có alert hiệu lực → trạng thái "An toàn" (teal) + vẫn hiện heatmap khu vực dạng thu nhỏ.
`<SafetyDisclaimer />` cố định trên cùng.

`<HazardMap />` ở màn resident: mặc định zoom vào bản của hộ, chỉ hiện lớp **2 mức** (không phải
5 cấp thô — đúng AD-9 "view dân icon+màu+câu"), không có toggle loại/time-slider phức tạp (chỉ có
nút "xem 3 ngày tới" đơn giản dạng tab, không phải slider kỹ thuật).

**Nút tự xác nhận** — 2 lựa chọn rõ ràng: **"Tôi an toàn"** / **"Tôi cần giúp đỡ"**. Bấm xong đổi
trạng thái ngay trên UI + hiện "Đã ghi nhận lúc HH:MM". Trạng thái này cần hiển thị lại được ở
`village-head/residents` và `officer/triage` (yêu cầu của bạn) — xem ghi chú schema ở §7.

**`/details`** — lớp bằng chứng: số liệu mưa dự báo, cấp độ gốc trước khi rút về 2 mức, độ tin
cậy, thời điểm cập nhật, nguồn dữ liệu (Open-Meteo, attribution CC BY 4.0). Đây là nơi giữ đúng
yêu cầu "kèm evidence" mà **không** làm rối màn hình chính.

### 6b. Điều hướng resident — không phải sidebar

Chỉ 2 điểm chạm điều hướng, cả 2 đặt ngay trên màn hình chính, không giấu trong menu:

- **1 link/nút cuối trang chính**: "Xem số liệu chi tiết" → `/details` (progressive disclosure,
  không phải menu item ngang hàng với trang chính).
  - `ArrowLeft` quay lại trang chính từ `/details`.
- **Không có** mục "Cài đặt", "Lịch sử", "Hồ sơ"... ở MVP — mỗi mục thêm là một quyết định phải
  đọc thêm chữ, ngược đối tượng chính (người lớn tuổi, ít chữ, theo UJ-1 trong PRD). Nếu sau này
  cần thêm (vd. đổi ngôn ngữ khi có TTS Mông/Thái thật — Roadmap), ưu tiên **icon đơn + không
  chữ** thay vì mở rộng thành sidebar.

---

## 7. ⚠️ Khoảng trống schema cần quyết định trước khi code

PRD đánh dấu 2 tính năng bạn yêu cầu là 🗓 **Roadmap/mô phỏng ở MVP** (Nhóm D, FR15a/FR16), và
6 bảng hiện có trong spine (`ARCHITECTURE-SPINE.md` §Core-entity ERD) **không có** bảng xác nhận/
trạng thái an toàn nào. Thiết kế UI ở §5–6 giả định 2 field sau **cần bổ sung** (đề xuất, chưa
phải AD đã chốt — cần admin/kiến trúc xác nhận trước khi implement):

| Đề xuất | Vị trí | Vì sao đủ nhẹ để không phá vỡ spine |
|---|---|---|
| `resident_sim.safety_status` (enum `unknown\|safe\|need_help`) + `safety_status_updated_at` | Thêm cột vào bảng **có sẵn** `resident_sim` | `be` đã là writer duy nhất của `resident_sim` (AD-6) — thêm cột không đổi ai ghi, không đụng AD-4/AD-9 (không phải hazard raster/alert) |
| `resident_sim.visited_by_head_at` (nullable timestamp) | Thêm cột vào **cùng bảng** `resident_sim` | Trưởng bản "đã đến nhắc" chỉ là timestamp đơn, không cần bảng nhật ký/escalation đầy đủ (FR15b/c vẫn giữ nguyên Roadmap) |

Nếu admin/đội kiến trúc **không** đồng ý bổ sung, 2 nút "Đánh dấu đã đến nhắc" / "Tôi an
toàn/cần giúp" ở §5–6 phải hạ xuống thành **mô phỏng client-side** (state cục bộ, mất khi tải lại
trang, có nhãn "DIỄN TẬP" rõ ràng) — đúng tinh thần FR7 (kịch bản diễn tập) của PRD cũ, để không
tuyên bố tính năng đang hoạt động thật khi chưa có backing thật.

---

## 7b. Điều hướng sau đăng nhập theo vai (post-login role routing)

**Đúng, mỗi lần login xong phải tự động đưa user tới đúng UI của vai — nhưng đây là 2 lớp riêng,
không được gộp làm 1:**

1. **`ProtectedRoute` (đã có, `fe/src/app/ProtectedRoute.tsx`)** — chỉ trả lời "đã đăng nhập chưa
   (`authenticated`)". Giữ nguyên, không sửa.
2. **`RoleRoute` (chưa có, cần thêm)** — trả lời "vai này có được vào route này không". Đây là lớp
   UX (đỡ nhầm lẫn), **không phải lớp bảo mật** — bảo mật thật nằm ở BE service-layer scoping
   (AD-8). Nếu `RoleRoute` bị bypass bằng cách nào đó, API vẫn phải 403.

### Luồng cụ thể
```
Keycloak redirect → /workspace (callback chung hiện có)
  → đọc user.roles từ AuthContext (đã map sẵn từ claims.realm_access.roles)
  → resolveHomeRoute(roles):
       'admin'            → /admin/heatmap
       'commune_officer'  → /officer/heatmap
       'village_head'     → /village-head/map
       'resident'         → /resident  (trang chính resident, §6)
  → <Navigate to={homeRoute} replace />
```

**Thứ tự ưu tiên nếu 1 user có nhiều role** (hiếm nhưng phải định nghĩa rõ, không để random):
`admin > commune_officer > village_head > resident` — theo đúng chiều "quyền rộng hơn thắng" khớp
bảng phân quyền §2. Trong MVP, `/admin/users` chỉ nên gán **đúng 1 vai/user** để tránh tình huống
này, nhưng code điều hướng vẫn phải xử lý được trường hợp nhiều vai (không throw lỗi).

**User không có vai nào khớp 4 vai trên** (vd. role Keycloak mặc định `offline_access`) → điều
hướng tới trang lỗi "Tài khoản chưa được cấp vai truy cập — liên hệ admin", **không** mặc định
rơi vào bất kỳ UI vai nào (tránh 1 user không rõ quyền vô tình thấy `/officer/heatmap`).

**Chặn điều hướng chéo vai bằng tay** (vd. `resident` gõ thẳng URL `/admin/overview`) —
`RoleRoute` kiểm tra `user.roles` trước khi render `<Outlet />`, không khớp thì `<Navigate to="/forbidden" />` (trang 403 phía FE, tách biệt với 403 thật từ API). Ví dụ implementation:

```tsx
// fe/src/app/RoleRoute.tsx
export function RoleRoute({ allow }: { allow: Role[] }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const hasAccess = user.roles.some((r) => allow.includes(r as Role));
  if (!hasAccess) return <Navigate to="/forbidden" replace />;
  return <Outlet />;
}

// router: mỗi nhóm route của 1 vai bọc trong RoleRoute tương ứng
<Route element={<ProtectedRoute />}>
  <Route element={<RoleRoute allow={['admin']} />}>
    <Route path="/admin/*" element={<AdminLayout />} />
  </Route>
  <Route element={<RoleRoute allow={['commune_officer']} />}>
    <Route path="/officer/*" element={<OfficerLayout />} />
  </Route>
  <Route element={<RoleRoute allow={['village_head']} />}>
    <Route path="/village-head/*" element={<VillageHeadLayout />} />
  </Route>
  <Route element={<RoleRoute allow={['resident']} />}>
    <Route path="/" element={<ResidentHome />} />
  </Route>
</Route>
```

---

## 8. Trạng thái/edge case bắt buộc (áp dụng mọi vai có `<HazardMap />` hoặc `<AlertCard />`)

| Tình huống | Yêu cầu hiển thị |
|---|---|
| Không có `hazard_layer.current` cho ngày đang chọn | `<DataFreshnessBadge status="unavailable">`, ẩn bản đồ, không hiện bản đồ trắng im lặng |
| Layer current cũ hơn ngưỡng dự kiến | `<DataFreshnessBadge status="stale">` kèm giờ cập nhật gần nhất |
| Forecast API (Open-Meteo) lỗi → `hazard_run` failed | Admin thấy chi tiết lỗi ở `/admin/pipeline`; các vai khác chỉ thấy badge "stale/unavailable", không lộ chi tiết lỗi kỹ thuật |
| Chưa có `alert` hiệu lực cho bản/hộ | Trạng thái "An toàn" (teal), **vẫn hiện** `<SafetyDisclaimer />` |
| Người dùng không có quyền (403 từ BE) | Trang lỗi quyền truy cập rõ ràng, không hiện trang trắng/crash |
| `calibration`/`feature_stack` bị thiếu provenance (AD-7 fail-closed) | `/admin/pipeline` hiện run ở trạng thái `failed` kèm lý do "thiếu artifact ghim" — không có cấp độ nào được hiển thị cho vai khác trong lúc này |

---

## 9. Truy vết Capability → Screen → Endpoint (mở rộng bảng của spine cho phần UI)

| Vai | Screen | Endpoint chính (theo AD-4/AD-2/AD-6) |
|---|---|---|
| admin | `/admin/pipeline` | `GET /api/v1/hazard-runs` |
| admin | `/admin/thresholds`, officer (nếu cấp quyền) | `GET/PUT /api/v1/threshold-configs` |
| admin | `/admin/calibration` | `GET /api/v1/calibration/current`, `GET /api/v1/backtest/2024-07-25` |
| admin | `/admin/users` | Keycloak Admin API (qua BE proxy hoặc trực tiếp, theo `auth-keycloak.md`) |
| officer, admin, village_head, resident | `<HazardMap />` | `GET /api/v1/hazard-layers?type&day` (manifest), signed URL object storage |
| officer, admin | cell-inspect panel | `GET /api/v1/hazard-layers/:layer_id/cell?x&y` |
| officer, admin, village_head | `/*/triage`, `/*/residents` | `GET /api/v1/villages/:id/residents` (scoped theo AD-8) |
| village_head | nút "đã đến nhắc" | `PATCH /api/v1/residents/:id` *(cần bổ sung field, xem §7)* |
| resident | nút tự xác nhận | `PATCH /api/v1/residents/me` *(cần bổ sung field, xem §7)* |
| officer, admin | `/officer/alerts`, export | `GET /api/v1/alerts?village_id&from&to` |
