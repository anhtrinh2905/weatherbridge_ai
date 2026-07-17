# Đối chiếu input: deck-1page-outline.md ↔ prd.md + addendum.md

*Nguồn: `docs/brainstorming/brainstorm-weather-forecasting-dien-bien-2026-07-17/deck-1page-outline.md` (dàn ý deck 1 trang, 2026-07-17). Đích: `prd.md`, `addendum.md` trong workspace này.*

## 1. Trích xuất nội dung deck outline theo mục

| Mục deck | Nội dung chính | Trạng thái trong PRD/addendum |
|---|---|---|
| §1 Tiêu đề + Tagline | Tên "WeatherBridge AI — Cảnh báo thời tiết & thiên tai cho Điện Biên"; tagline "Không đẩy con số — đẩy hành động: LÀM GÌ, TRƯỚC KHI NÀO."; insight lõi "quyết định nhị phân trước hạn chót — làm X trước Y giờ" | ✅ Tagline nguyên văn (prd.md đầu tài liệu); insight lõi giữ gần nguyên văn ở §1 và §2.1 |
| §2 Vấn đề | Sương mù Pha Đin, lũ quét/sạt lở, sương muối/rét hại; rét 2008 giết gia súc **+ hỏng mạ non**; bản tin muộn, không chi tiết **theo từng bản/mảnh nương**, khó hiểu với người mù chữ/già/DTTS; "chết người mà không được báo trước" | ⚠️ Gần đủ (§1, UJ-2); rơi 2 chi tiết: thiệt hại "hỏng mạ non" của rét 2008, và độ hạt "mảnh nương" |
| §3 Giải pháp | Flow chính Hệ thống→Dân; AI đẩy hành động; giải phẫu cảnh báo 4 phần; progressive disclosure; đa kênh + TTS Mông/Thái **qua loa**; **"âm thanh/màu thay cho thang số"**; tầng con người + nút "đã đến nhắc" + nhật ký trách nhiệm | ⚠️ Cơ chế phủ đủ (FR-5, 10–11, 14–16, 18–22); rơi framing "âm thanh/màu thay cho thang số"; kênh loa bị hạ cấp (xem Gap 1) |
| §4 Nguồn dữ liệu | Open-Meteo, OpenWeatherMap; trạm KTTV Điện Biên; **dữ liệu lịch sử thiên tai & cảnh báo PCTT&TKCN làm nền cho ngưỡng và bản đồ nguy cơ**; bonus "cảm biến sống" | ⚠️ API mở ✅ (FR-1, addendum §3); KTTV + bản đồ nguy cơ dời giai đoạn 2 ✅ (§6.2, §9.1); nhưng vai trò "lịch sử thiên tai làm nền cho Ngưỡng" không được kế thừa (xem Gap 4) |
| §5 Mô hình xử lý | Ngưỡng → sinh bản tin hành động; cá nhân hóa/phân vùng theo bản (vị trí, độ cao, hướng dốc **từng hộ/mảnh nương**); thang 2 mức (mô phỏng cảnh báo cháy rừng) | ✅ FR-3–5, FR-2/8/9, Glossary "Mức"; độ hạt PRD dừng ở Bản/Hộ (xem Gap 3) |
| §6 Kênh phân phối | **Zalo, SMS, loa phát thanh bản** (loại cell broadcast); TTS bản địa; "âm thanh đỏ" (Amber Alert); đếm ngược + vòng xác nhận (Grab) + escalation | ⚠️ Zalo/SMS thành best-effort có `[ASSUMPTION]` ✅ (FR-17, §12); cell broadcast loại ✅ (Non-Goals, addendum §1); âm thanh đỏ/đếm ngược/escalation ✅ (FR-6, 16, 18); loa phát thanh bản → Gap 1 |
| §7 Điểm khác biệt | Ăn tiền ở TẦNG CON NGƯỜI; "không phải wrapper API thời tiết" — hệ thống biến dữ liệu thành hành động có người chịu trách nhiệm chặng cuối | ✅ §1 giữ gần nguyên văn ("Điểm ăn tiền không nằm ở API thời tiết…", "điều chưa wrapper thời tiết nào làm"), §4.6 |
| §8 Lộ trình | MVP cụm A–E (kèm Sổ hộ phương án A); giai đoạn sau cụm F (tự học ngưỡng, pha "trong & sau", lịch mùa vụ/chợ phiên); mở rộng "cảm biến sống" | ✅ §6.1–6.2, §9.1 khớp trọn |

## 2. GAP tìm thấy

### Gap 1 — Kênh "loa phát thanh bản" bị hạ cấp không tuyên bố
Deck §6 liệt kê **loa phát thanh bản** là 1 trong 3 kênh phân phối ngang hàng Zalo/SMS; deck §3 nói TTS "phát bằng giọng nói tiếng Mông/Thái **qua loa**". PRD chỉ còn "TTS phát trong app (**mô phỏng** loa bản)" (§4.5) và addendum §6 dời "loa xã qua file audio" sang giai đoạn 2. Zalo/SMS được hạ cấp tường minh bằng `[ASSUMPTION]` (§12), nhưng loa bản thì bị hạ cấp **im lặng** — không có ASSUMPTION, không có dòng Non-Goal, không ghi vào §6.2. Nếu deck cuối vẫn ghi "loa phát thanh bản" là kênh, deck và PRD sẽ mâu thuẫn trước giám khảo. **Đề xuất:** thêm 1 dòng vào §4.5 hoặc §12 ghi rõ quyết định (loa bản = giai đoạn 2, demo dùng TTS in-app mô phỏng), hoặc sửa deck outline tương ứng.

### Gap 2 — Rơi nguyên tắc thiết kế "âm thanh/màu thay cho thang số"
Deck §3: TTS "**kèm âm thanh/màu thay cho thang số**" — một nguyên tắc UX cho người không đọc được chữ/số (mã hóa mức nguy hiểm bằng giác quan, không bằng con số). PRD có từng mảnh (màu theo Mức ở FR-10, Âm thanh đỏ ở FR-16) nhưng đã đánh rơi **câu framing tổng** này — vốn là voice element mạnh cho tiêu chí "UX AI-Native & Tư duy thiết kế" (15đ, §10). **Đề xuất:** thêm 1 câu nguyên tắc vào mô tả §4.4 hoặc §4.5: "với người không đọc chữ, màu và âm thanh thay cho thang số".

### Gap 3 — Độ hạt "mảnh nương" và thiệt hại "hỏng mạ non" (rét 2008) bị mất
- Deck §2 + §5 nói cá nhân hóa tới "**từng hộ/mảnh nương**"; PRD dừng độ hạt ở Bản/Hộ (Glossary, FR-8/9). Có thể là thu hẹp scope hợp lý cho MVP nhưng không được ghi nhận là quyết định — "mảnh nương" là hình ảnh gây ấn tượng trong pitch.
- Deck §2 ghi rét 2008 "giết gia súc, **hỏng mạ non**"; PRD §1 chỉ giữ "chết hàng loạt gia súc". Chi tiết mạ non nối thẳng tới JTBD nông dân ("đốt lửa cứu mạ") — nên khôi phục trong câu chuyện vấn đề.

### Gap 4 — Vai trò "dữ liệu lịch sử thiên tai làm nền cho Ngưỡng" không được kế thừa
Deck §4 xác định dữ liệu lịch sử thiên tai & cảnh báo của Ban Chỉ huy PCTT&TKCN "**làm nền cho ngưỡng** và bản đồ nguy cơ". PRD dời dữ liệu PCTT&TKCN sang giai đoạn 2 (§6.2) nhưng khi hỏi "Ngưỡng ban đầu lấy từ đâu" (Câu hỏi mở #4) chỉ nêu "chuẩn ngành KTTV Việt Nam" — mất liên kết rằng lịch sử thiên tai địa phương là nguồn nền ngưỡng theo brainstorm. **Đề xuất:** bổ sung vào Câu hỏi mở #4 hoặc §9.1 giai đoạn 2: lịch sử thiên tai PCTT&TKCN là nguồn hiệu chỉnh Ngưỡng theo Bản (cũng chính là đầu vào cho cụm F "tự học chỉnh ngưỡng").

## 3. Xác nhận KHÔNG phải gap (đã kiểm)

- Tagline giữ **nguyên văn**, không bị paraphrase.
- Insight lõi "quyết định nhị phân trước hạn chót / làm X trước Y giờ" giữ gần nguyên văn ở §1 và làm khuôn cho toàn bộ §2.1 JTBD.
- "Không phải wrapper API thời tiết" + "có người chịu trách nhiệm ở chặng cuối" giữ đủ lực ở §1.
- Câu ám ảnh "chết mà không được báo trước" xuất hiện ở §2.1 (nỗi lo trưởng bản) và UJ-2.
- Loại cell broadcast, phương án A Sổ hộ, cụm F + lịch mùa vụ + cảm biến sống: khớp 1-1 giữa deck §8 và PRD §5/§6/§9.
- Nguồn cảm hứng (Grab, cháy rừng, Amber Alert) được bảo toàn và mở rộng ở addendum §2.
- Zalo/SMS hạ cấp best-effort: có tuyên bố `[ASSUMPTION]` tường minh — khác bản chất với Gap 1.
