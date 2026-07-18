---
title: "PRD — WeatherBridge AI: Heatmap & cảnh báo thiên tai theo bản cho xã Mường Pồn"
status: final
created: 2026-07-18
updated: 2026-07-18
scope: MVP (VAIC 2026)
---

# PRD — WeatherBridge AI

> **Định vị:** Bản đồ **mức độ nguy hiểm (heatmap)** phân giải theo địa hình 30m cho xã Mường
> Pồn (Điện Biên), 3–7 ngày tới, cho **lũ quét & sạt lở**; khi vượt ngưỡng thì sinh **bản tin
> hành động 2 mức** dễ hiểu. Tầng con người (last-mile relay, TTS, phân quyền) là **định hướng
> tương lai**, ở MVP chỉ trình diễn dạng mô phỏng.

*Nguồn nền: `docs/brainstorming/.../brainstorm-intent.md` + nghiên cứu phiên 2026-07-17/18.
Chi tiết kỹ thuật: `docs/prd-addendum.md`. PRD này đã cắt về lõi sau reviewer pass 2026-07-18.*

**Chú thích trạng thái FR:** ✅ **Core** (giao nộp, chạy thật) · 🔶 **Mock** (demo dữ liệu giả
lập) · 🗓 **Roadmap** (định hướng sau, chưa làm).

---

## 1. Tóm tắt điều hành

Bản tin thời tiết cấp tỉnh tới muộn, chung chung, đầy số liệu — người dân miền núi (đặc biệt
người mù chữ, dân tộc thiểu số) không kịp/không biết cách hành động (lũ quét Mường Pồn 25/7/2024:
nhiều người chết, ~175 tỷ đồng). WeatherBridge AI thu hẹp về **một xã**, tạo **heatmap nguy hiểm
phân giải theo địa hình 30m** cho 3–7 ngày tới, và biến ngưỡng vượt thành **bản tin hành động
2 mức** ("chuẩn bị / đi ngay"). Điểm cốt lõi kỹ thuật: độ phân giải trong xã đến từ **địa hình**,
mô hình **giải thích được, lệch về an toàn**, LLM chỉ dịch số thành câu chữ.

## 2. Mục tiêu & Phi mục tiêu

**Mục tiêu (đo được)**
- **G1.** Xuất heatmap **lũ quét + sạt lở** cho **≥3 bản**, tầm nhìn **3–7 ngày**, phân giải ≤100m.
  *Đạt khi:* có bản đồ 5 cấp cho ≥3 bản × 2 loại × ≥3 ngày.
- **G2.** Mỗi cảnh báo là **quyết định nhị phân trước hạn chót** ("làm X trước Y giờ").
  *Đạt khi:* 100% cảnh báo có đủ 4 phần (mục 5, FR7).
- **G3.** Mô hình **giải thích được & tái lập**. *Đạt khi:* cùng input → cùng output; có bảng
  đóng góp đặc trưng.
- **G4.** **Kiểm định mô hình.** *Đạt khi:* **(chính)** **kiểm tra không gian** trên dấu vết
  sự kiện **25/7/2024** (số hóa từ Sentinel-2): các bản bị ảnh hưởng rơi vào **top phân vị nguy
  hiểm** của heatmap, báo recall@τ kèm FPR. **(stretch, nếu còn thời gian)** ROC-AUC trên
  inventory vùng Tây Bắc (held-out) target **≥0,75**. *Lưu ý:* recall một-sự-kiện là small-n →
  đọc kèm FPR, không tuyên bố như thành tích tuyệt đối. Cách tính: `docs/prd-addendum.md §8`.
- **G5.** Chạy hoàn toàn bằng **dữ liệu công khai**, **không PII thật**.

**Phi mục tiêu (MVP)**
- Toàn tỉnh/đa tỉnh; Cell Broadcast; suy đoán tự động hộ dễ tổn thương; nhóm du lịch/buôn bán.
- Training/GPU inference trong tiến trình API.
- **Vận hành thật** loa bản / TTS tiếng dân tộc / con người relay (chỉ mô phỏng ở MVP).
- Rét hại/sương muối & mưa lớn dạng lớp riêng (→ Roadmap; cần trigger nhiệt riêng, xem addendum).

## 3. Người dùng & Hành trình

**UJ-1 — Người dân.** *Vàng, 52 tuổi, trồng lúa nương bản Mường Pồn 1, đọc chữ hạn chế.* Nhận
thẻ cảnh báo màu + icon + câu hành động: "Nguy cơ lũ quét cao — **rời khu ven suối trước 20h**";
xem số liệu bên dưới nếu muốn. *(MVP: web; TTS/loa = mô phỏng.)*

**UJ-2 — Cán bộ phòng chống thiên tai xã.** Mở **heatmap toàn xã 3–7 ngày**, 5 cấp (mục tiêu
khớp QĐ 18/2021 — cần hiệu chỉnh, xem addendum), lọc theo loại; xem đóng góp đặc trưng để tin
tưởng; ra quyết định cảnh báo bản nào.

**UJ-3 — Trưởng bản.** ✅ Xem danh sách **dân trong bản mình** (dữ liệu mô phỏng) + tình trạng
nguy hiểm/xác nhận; xác nhận "đã đến nhắc". *(RBAC thật, data giả lập.)*

**UJ-4 — Admin (đội phát triển).** ✅ Quản lý người dùng & phân quyền, cấu hình bảng ngưỡng,
vận hành/kiểm định mô hình, xem toàn bộ.

## 4. Phạm vi

- **Địa bàn:** xã **Mường Pồn** (~21,5°N 103,1°E). [ASSUMPTION: bbox xấp xỉ tới khi có shapefile]
- **Loại thiên tai Core:** **lũ quét, sạt lở**. (Rét/sương muối, mưa lớn → Roadmap.)
- **Mức mô hình MVP:** **A (heuristic/AHP + ngưỡng I–D hiệu chỉnh)**. B/C (ML) → Roadmap khi có
  inventory vùng.
- **Bề mặt:** web responsive, **phân quyền 4 vai** (admin/cán bộ/trưởng bản/dân). App, đa kênh → sau.
- **Dữ liệu:** chỉ công khai; **không PII thật** — hồ sơ dân/hộ dùng **dữ liệu giả lập**.

## 5. Yêu cầu chức năng (FR)

### Nhóm A — Mô hình & Heatmap ("Chung") — ✅ Core
- **FR1 ✅** Tạo **heatmap lưới** cho toàn xã, phân giải ≤100m, cho **lũ quét** và **sạt lở**
  riêng lớp. *AC:* mỗi lớp là raster 5 cấp phủ ranh giới xã.
- **FR2 ✅** Điểm nguy hiểm mỗi ô = *nhạy cảm địa hình (tĩnh)* × *trigger mưa theo-loại*; quy
  5 cấp. *AC:* hàm xác định, tái lập; **lũ quét dùng trigger mưa-lưu-vực, sạt lở dùng I–D**
  (không dùng chung — xem addendum).
- **FR3 ✅** Heatmap cập nhật theo **dự báo mưa 3–7 ngày** (nguồn **forecast**: Open-Meteo/GFS/
  IFS — **không** dùng ERA5 làm forecast); có **trục thời gian** theo ngày. *AC:* đổi ngày →
  đổi bản đồ; có ≥3 mốc ngày.
- **FR4 ✅** Chiếu 5 cấp xuống **2 mức** cho dân: "chuẩn bị" / "đi ngay". *AC:* mọi ô có 1 trong 2 nhãn.
- **FR5 ✅** **Kiểm định backtest** sự kiện 25/7/2024. *AC:* báo cáo AUC/recall; **rõ ràng ghi
  đây là đánh giá nội bộ; không lên slide như thành tích nếu nhãn chưa thật.**

### Nhóm B — Cảnh báo & bản tin hành động — ✅ Core
- **FR6 ✅** Khi bản vượt ngưỡng → sinh **cảnh báo**. *AC:* có sự kiện cảnh báo gắn bản + loại + cấp.
- **FR7 ✅** Cảnh báo **4 phần**: chuyện gì / nguy hiểm cỡ nào / làm gì / **trước khi nào (đếm
  ngược)**. *AC:* thiếu 1 phần = không hợp lệ.
- **FR8 ✅** Giao diện dân **phân lớp**: thẻ màu + icon + câu hành động trên; số liệu (mm mưa,
  cấp, độ tin cậy) dưới. *AC:* hành động hiển thị trước số.
- **FR9 ✅** **Bảng ngưỡng cấu hình** theo loại thiên tai; cán bộ có quyền chỉnh. *AC:* ngưỡng
  đọc từ cấu hình, không hardcode; ghi nguồn/căn cứ.

### Nhóm C — Cá nhân hoá theo nghề — 🔶 Mock (dữ liệu giả lập)
- **FR10 🔶** Hồ sơ dân (**giả lập**: tên/tuổi/nghề/vị trí/ưu tiên) → nguy hiểm = ô tại vị trí họ.
- **FR11 🔶** Khuyến nghị theo **ma trận Nghề × Loại × Cấp → (hành động + hạn chót)**; LLM điền
  câu chữ (không tính điểm). *AC:* mỗi tổ hợp có 1 khuyến nghị mẫu.
- **FR12 🗓** Gợi ý **điểm an toàn gần nhất** ("chạy đi đâu"). *(Cần lớp điểm sơ tán + định
  tuyến — Roadmap.)*

### Nhóm D — Đa kênh & Last-mile relay — 🗓 Roadmap (mô phỏng ở MVP)
- **FR13 🗓** Đa kênh: web + **loa/TTS Mông–Thái** + SMS; cảnh báo đỏ âm thanh Amber-Alert.
  *(TTS ngôn ngữ dân tộc & loa bản chưa nối thật được → mô phỏng có kịch bản; sai nghĩa TTS =
  rủi ro tính mạng, cần kiểm định người bản ngữ trước khi thật.)*
- **FR14 🗓** Sổ hộ dễ tổn thương (đổi cách gọi trung tính: **"hộ ưu tiên hỗ trợ"**).
- **FR15a 🗓** Nút xác nhận "đã đến nhắc". **FR15b 🗓** Nhật ký trách nhiệm tự động.
  **FR15c 🗓** Escalation khi quá hạn chưa xác nhận. *(tách atomic từ FR15 cũ)*
- **FR16 🗓** Dân tự xác nhận trạng thái ("an toàn" / "cần giúp").

### Nhóm E — Phân quyền theo vai (RBAC) — ✅ Core (cơ chế thật, dữ liệu dân mô phỏng)
- **FR17 ✅** **4 vai** với quyền tách biệt: **admin, cán bộ xã, trưởng thôn/bản, người dân**.
  *AC:* mỗi vai chỉ truy cập được phạm vi dữ liệu/hành động của mình; token **không** ở localStorage.
  - **admin:** quản lý user + phân quyền, cấu hình ngưỡng, vận hành/kiểm định mô hình, xem tất cả.
  - **cán bộ xã:** heatmap toàn xã, mọi bản, báo cáo, chỉnh ngưỡng (nếu được cấp).
  - **trưởng thôn/bản:** chỉ **dân trong bản mình** (mô phỏng) + tình trạng + xác nhận đã nhắc.
  - **người dân:** chỉ cảnh báo/khuyến nghị của mình + tự xác nhận trạng thái.
- **FR18 ✅** Dashboard cán bộ/trưởng bản: danh sách + tình trạng, **triage = Phơi nhiễm × Ưu tiên**
  (dữ liệu dân mô phỏng). *AC:* sắp xếp theo điểm triage giảm dần.
- **FR19 🔶** Xuất báo cáo/nhật ký cảnh báo (ai nhận, lúc nào) — dữ liệu mô phỏng.

## 6. Yêu cầu phi chức năng (NFR) — có ngưỡng đo

- **NFR1 — An toàn:** lệch về **giảm bỏ sót**; *đo:* recall vùng nguy hiểm ưu tiên hơn precision;
  luôn hiện **độ tin cậy**. **Disclaimer bắt buộc:** "công cụ hỗ trợ, **không thay** cảnh báo
  chính thức của cơ quan KTTV/PCTT".
- **NFR2 — Vùng lõm sóng:** 🗓 nội dung cốt lõi tới được không cần smartphone (Roadmap; MVP web).
- **NFR3 — Người yếu thế:** icon + màu + câu ngắn; TTS Mông/Thái = Roadmap, phải kiểm định bản ngữ.
- **NFR4 — Kịp thời:** heatmap refresh khi có dự báo mới; *đo:* độ trễ pipeline ≤ [ASSUMPTION: 15’].
- **NFR5 — Kiến trúc:** **không** train/GPU trong API; tách offline (train/backtest) khỏi online
  (serving); tác vụ refresh/dispatch thuộc `worker/` (theo AGENTS.md).
- **NFR6 — Bảo mật & riêng tư:** **không** `localStorage` cho token; **cấm PII thật** trong repo/
  demo; phân quyền theo vai.
- **NFR7 — Minh bạch:** điểm nguy hiểm **xác định, giải thích được**; LLM ngoài đường tính an toàn.

## 7. Dữ liệu & Mô hình (tóm tắt — chi tiết ở addendum)

- **Địa hình:** SRTM 30m v3 (public domain) → slope/aspect/HAND/TWI/SPI/flow.
- **Mưa dự báo (3–7 ngày):** **Open-Meteo / GFS / IFS**. **Mưa lịch sử (backtest):** ERA5/GPM
  IMERG. *(ERA5 là reanalysis — KHÔNG dùng làm forecast.)*
- **Trigger theo-loại:** **sạt lở** = ngưỡng I–D (Guzzetti, hiệu chỉnh địa phương); **lũ quét**
  = mưa tích hợp theo lưu vực (kiểu FFG). *(Không dùng chung một đường cong.)*
- **Nhãn/kiểm định:** COOLR/GLC + HMA Catalog + số hóa ảnh + báo cáo PCTT (lưu ý sai số vị trí
  COOLR ≫30m). Sự kiện 2024 = **backtest, không train**.
- **Mô hình MVP = mức A**; ML (B/C) → Roadmap. Provenance bắt buộc trước khi dùng.

## 8. Quyền riêng tư & Tuân thủ

- Hồ sơ dân/hộ ưu tiên = **dữ liệu cá nhân** → **Nghị định 13/2023**: cần cơ sở đồng thuận; **MVP
  chỉ dùng dữ liệu giả lập**, không thu thập/không lưu PII thật.
- Đổi thuật ngữ "dễ tổn thương" → **"hộ ưu tiên hỗ trợ"** (tránh kỳ thị).
- Không đưa dữ liệu nhạy cảm/khóa mô hình/`.env` vào Git; ghi hoạt động AI-assisted trung thực.

## 9. Chỉ số thành công & Phản chỉ số

| Chỉ số thành công | Phản chỉ số |
|---|---|
| Kiểm tra không gian 2024: bản ảnh hưởng ∈ top phân vị (chính); AUC vùng ≥0,75 (stretch) | Tỉ lệ báo động giả (FPR) ở vùng an toàn |
| % cảnh báo đủ 4 phần | Số cảnh báo trùng/nhiễu mỗi bản/ngày (fatigue) |
| Heatmap phủ ≥3 bản × 2 loại × 3–7 ngày | Độ trễ pipeline dự báo→heatmap |

*\*target chốt sau khi có inventory thật.*

## 10. Rủi ro & Giả định

- **R1.** Ngưỡng Guzzetti **toàn cầu hay báo thừa** → cần α,β **địa phương** (đã thấy ở demo).
- **R2.** Inventory một-xã quá ít → dùng cho **kiểm định**, không train; ML để Roadmap.
- **R3.** Weather ~9–25km → **độ phân giải trong xã từ địa hình**; **không** quảng bá "cá nhân
  hoá tới hộ" ở phần thời tiết.
- **R4.** Nhãn backtest hiện là **bootstrap** → chưa lên slide như thành tích cho tới khi có nhãn thật.
- **A1.** Có dự báo mưa forecast API ổn định cho tọa độ Mường Pồn. **A2.** Có ranh giới xã.

## 11. Câu hỏi mở

- Q1 ranh giới/tên xã hiện hành · Q2 QĐ 18/2021 máy-đọc-được · Q4 TTS Mông/Thái nguồn nào (Roadmap)
- Q5 ai duyệt bảng ngưỡng · Q6 inventory sạt/lũ thật cho backtest lấy ở đâu.

## 12. Đối chiếu yêu cầu bài thi (VAIC 2026)

| Yêu cầu | Đáp ứng |
|---|---|
| Forecast 3–7 ngày ≥3 địa điểm | FR3 cho ≥3 bản |
| Cảnh báo theo ngưỡng | FR6, FR9 |
| Giao diện đơn giản | FR4, FR8 |
| Tài liệu kiến trúc + deck | `docs/architecture/`, deck brainstorm |
