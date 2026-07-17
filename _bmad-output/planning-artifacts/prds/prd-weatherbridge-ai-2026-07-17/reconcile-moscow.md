# Đối chiếu input: MVP Feature List MoSCoW ↔ PRD + Addendum

**Input:** `docs/brainstorming/brainstorm-weather-forecasting-dien-bien-2026-07-17/mvp-feature-list-moscow.md`
**Đối chiếu với:** `prd.md`, `addendum.md` (workspace này)
**Ngày:** 2026-07-17

---

## 1. Ma trận ánh xạ đầy đủ

### MUST HAVE (MoSCoW) → PRD

| Mục MoSCoW | Ánh xạ PRD | Trạng thái |
|---|---|---|
| Dự báo 3–7 ngày cho ≥3 địa điểm (Open-Meteo/OWM, cache theo địa điểm) | FR-1 (lấy + chuẩn hóa + cache TTL), FR-12 (xem theo địa điểm); 5 địa điểm — vượt yêu cầu | ✅ Đủ, có nâng cấp |
| Cảnh báo theo ngưỡng tự sinh bản tin (bảng ngưỡng tĩnh) | FR-3 (bảng Ngưỡng cấu hình), FR-4 (sinh Cảnh báo) | ✅ Đủ |
| Nội dung cảnh báo 4 phần (template + AI dịch số → hành động) | FR-5 (hybrid rule + LLM, fallback template, validator số) | ✅ Đủ, có guardrail mạnh hơn |
| Giao diện dân: thẻ màu + icon + câu hành động, có lớp số liệu (KHÔNG bỏ số) | FR-10 (thẻ hành động), FR-11 (lớp số liệu); §4.4 nhắc rõ quyết định "giữ số liệu"; addendum §1 ghi phương án "bỏ số" đã bác | ✅ Đủ |
| ≥1 kênh phân phối chạy thật (không phụ thuộc cell broadcast) | FR-14 (web push — kênh thật bắt buộc), FR-17 (Zalo/SMS best-effort); §5 Non-Goals loại cell broadcast | ✅ Đủ |
| Tài liệu kiến trúc + deck 1 trang (sản phẩm phụ bắt buộc) | §6.1 (trong phạm vi, trỏ dàn ý deck); §10 bảng ánh xạ đề bài | ⚠️ Có trong phạm vi nhưng **không xuất hiện trong bảng ưu tiên §6.3** (xem Gap 2) |

### SHOULD HAVE (MoSCoW) → PRD

| Mục MoSCoW | Ánh xạ PRD | Trạng thái |
|---|---|---|
| Phân vùng cảnh báo theo bản (độ cao, hướng dốc; mượn cảnh báo cháy rừng) | FR-2 (hiệu chỉnh độ cao), FR-8 (hồ sơ Bản), FR-9 (đăng ký Hộ); addendum §2 ghi nguồn mượn | ✅ Đủ |
| Thang 2 mức "chuẩn bị / đi ngay" | Glossary "Mức"; nhúng trong FR-4 (sinh Cảnh báo gắn Mức); addendum §2 | ⚠️ Không có FR riêng — xem Gap 3 |
| TTS tiếng Mông / Thái (phát qua **loa bản** / app) | FR-15 (TTS bản địa, pipeline chi tiết addendum §4) | ⚠️ Phần app đủ; kênh **loa bản vật lý** chỉ "mô phỏng" — xem Gap 4 |
| Last-mile human relay (danh sách "nhà cần đến tận nơi") | FR-20 (Danh sách đến nhắc) | ✅ Đủ |
| Sổ hộ dễ tổn thương — khai báo thủ công, KHÔNG suy đoán tự động | FR-19; §5 Non-Goals nhắc lại | ✅ Đủ |
| Nút xác nhận "đã đến nhắc" (mô hình Grab ETA+confirm) | FR-21 (thêm cả "Không gặp" → leo thang tức thì) | ✅ Đủ, có mở rộng |
| Nhật ký trách nhiệm tự động | FR-22 (append-only, xuất báo cáo) | ✅ Đủ |

### COULD HAVE (MoSCoW) → PRD

| Mục MoSCoW | Ánh xạ PRD | Trạng thái |
|---|---|---|
| Đếm ngược hạn chót | FR-6 — §6.3 tier Could | ✅ Khớp tier |
| Escalation ladder (dân → trưởng thôn → cán bộ xã) | FR-18 — §6.3 tier Could | ✅ Khớp tier |
| Âm thanh đỏ đặc trưng **qua loa** | FR-16 — §6.3 tier Could; nhưng chỉ âm trong app/thiết bị | ⚠️ Cùng nuance "loa bản" — Gap 4 |

### WON'T HAVE (MoSCoW) → PRD

| Mục MoSCoW | Ánh xạ PRD | Trạng thái |
|---|---|---|
| Cụm F — tự học chỉnh ngưỡng | §5, §6.2, §9.1 giai đoạn 2 | ✅ |
| Cụm F — pha "trong & sau" lũ nhiều đợt | §5, §6.2, §9.1 giai đoạn 2 | ✅ |
| Lịch mùa vụ / chợ phiên | §5, §6.2, §9.1 giai đoạn 2 | ✅ |
| Cảm biến sống (dân báo ngược) — bonus nếu dư thời gian | §6.2 (bonus, kèm NOTE FOR PM "emotionally load-bearing"), §9.1 mở rộng | ✅ |
| Cell broadcast — KHÔNG làm | §5 Non-Goals; addendum §1 kèm lý do | ✅ |
| Suy đoán tự động hộ dễ tổn thương — KHÔNG làm | §5 Non-Goals; FR-19; addendum §1 | ✅ |
| Nhóm buôn bán / du lịch — KHÔNG làm | §2.2, §5 Non-Goals; addendum §1 | ✅ |

## 2. Đối chiếu tier MoSCoW ↔ bảng ưu tiên §6.3

§6.3 cắt theo giờ (Must / Should① / Should② / Could) — về tổng thể **nhất quán** với tier MoSCoW:
- MoSCoW Must → FR-1, 3, 4, 5, 10, 11, 12, 14 đều nằm tier Must §6.3 (cộng FR-7 demo và FR-23 auth là bổ sung hợp lý của PRD).
- MoSCoW Should tách đôi: Tầng con người (FR-19–22 = Should①) trước cá nhân hóa/TTS (FR-2, 8, 9, 15 = Should②) — đã gắn `[ASSUMPTION]` chờ đội xác nhận, không mâu thuẫn với MoSCoW (MoSCoW không xếp thứ tự trong tier).
- MoSCoW Could (đếm ngược, escalation, âm thanh đỏ) khớp tier Could §6.3; FR-17 (Zalo/SMS) rơi vào Could là hợp lý vì MoSCoW Must chỉ đòi "≥1 kênh chạy thật" (= FR-14 đã ở Must).

**Điểm lệch duy nhất đáng kể:** FR-13 vắng mặt hoàn toàn khỏi bảng §6.3 (Gap 1 dưới đây).

## 3. GAPS phát hiện

### Gap 1 — FR-13 ("Tôi đã làm") không có trong bảng ưu tiên §6.3 *(lỗi nội bộ PRD, nghiêm trọng nhất)*
Bảng §6.3 liệt kê 22/23 FR; **FR-13 không thuộc tier nào**. Đây là omission chứ không phải quyết định: FR-13 phục vụ UJ-1 (hành trình chính), là đầu vào của vòng Leo thang FR-18, và ghi vào Nhật ký FR-22. Không xếp tier thì đội 36h không biết khi nào build. Đề xuất: đưa vào Could (cạnh FR-18, vì nó nuôi leo thang) hoặc Should① (vì SM-2/UJ-1 dựa vào xác nhận). Nguồn gốc: nút "Tôi đã làm" không có trong MoSCoW gốc (MoSCoW chỉ có nút "đã đến nhắc" của cán bộ) — là bổ sung của PRD nên bị sót khi lập bảng tier.

### Gap 2 — "Tài liệu kiến trúc + deck 1 trang" là MUST của MoSCoW nhưng vắng trong §6.3
MoSCoW xếp deliverable này ở MUST (bắt buộc theo đề bài). PRD có ở §6.1 và §10, nhưng bảng ưu tiên thực thi 36h (§6.3) chỉ chứa FR — deliverable tài liệu không có dòng riêng, nên khi "cắt scope theo giờ" không có chỗ neo cho nó. Đề xuất: thêm một dòng non-FR ở tier Must của §6.3 (hoặc ghi chú dưới bảng) để nó không bị rơi khi cạn giờ.

### Gap 3 — Thang 2 mức "chuẩn bị / đi ngay" không có FR riêng (nuance ưu tiên)
MoSCoW xếp thang 2 mức ở SHOULD (một tính năng độc lập). PRD nhúng nó vào Glossary "Mức" + FR-4 (tier Must). Hệ quả: (a) mặc nhiên được "thăng cấp" Should → Must — an toàn hơn, không mâu thuẫn về hướng; (b) nhưng mất khả năng degrade riêng: nếu cạn giờ, đội không thể "bỏ thang 2 mức, chỉ phát cảnh báo 1 mức" vì nó dính liền FR-4. Chỉ cần flag để đội biết đây là quyết định ngầm, không phải sơ sót.

### Gap 4 — Kênh "loa bản" vật lý trong ghi chú MoSCoW không được tuyên bố tường minh là ngoài phạm vi
Ghi chú kỹ thuật MoSCoW cho TTS ("phát qua **loa bản** / app") và Âm thanh đỏ ("phát qua **loa bản**") hàm ý kênh loa vật lý. PRD chỉ có: §4.5 "TTS phát trong app (**mô phỏng** loa bản)" và addendum §6 "giai đoạn 2: loa xã qua file audio". Tức là loa vật lý thực chất đã dời giai đoạn 2, nhưng **prd.md không có câu out-of-scope tường minh** ở §5/§6.2 (chỉ suy ra được từ addendum — mà addendum tự tuyên bố "không phải yêu cầu"). Đề xuất: thêm 1 dòng vào §6.2 ("tích hợp loa bản/loa xã vật lý → giai đoạn 2; MVP mô phỏng qua TTS trong app").

### Không phải gap (đã kiểm, ghi lại để khỏi tra lại)
- 5 loại hình thiên tai MoSCoW (sương muối, rét hại, mưa lớn, lũ, sạt lở) đều có trong §4.2; PRD thêm sương mù (khớp JTBD tài xế) — mở rộng hợp lệ.
- "Cache theo địa điểm", "bảng ngưỡng tĩnh", "template 4 trường", "không phụ thuộc cell broadcast", "phương án A khai báo thủ công" — đều được giữ nguyên và tăng cường (validator, fallback, dedupe).
- Xương sống "quyết định nhị phân trước hạn chót" và điểm khác biệt "tầng con người" giữ nguyên vẹn ở §1, §2.1, §4.6.
- PRD nâng 3 địa điểm → 5 địa điểm: vượt chuẩn, có chủ đích (§4.1), không mâu thuẫn.

## 4. Kết luận

Toàn bộ 23 mục MoSCoW (6 Must, 7 Should, 3 Could, 7 Won't) đều truy vết được vào FR hoặc tuyên bố out-of-scope, trừ 4 điểm ở mục 3 — trong đó Gap 1 (FR-13 rơi khỏi bảng tier) và Gap 2 (deliverable tài liệu không neo trong §6.3) là hai điểm cần sửa trước khi finalize; Gap 3 và Gap 4 là nuance nên ghi chú/bổ sung 1 dòng.
