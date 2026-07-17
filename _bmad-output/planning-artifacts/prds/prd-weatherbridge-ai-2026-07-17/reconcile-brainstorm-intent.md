# Đối chiếu input: brainstorm-intent.md ↔ prd.md + addendum.md

_Nguồn input: `docs/brainstorming/brainstorm-weather-forecasting-dien-bien-2026-07-17/brainstorm-intent.md`_
_Ngày đối chiếu: 2026-07-17_

## 1. Phần đã được bảo toàn tốt

Đối chiếu từng mục của intent:

| Mục intent | Trạng thái trong PRD |
|---|---|
| Bối cảnh & vấn đề (địa hình, trạm thưa, bản tin muộn/chung chung, thảm họa rét 2008) | ✅ §1 Tầm nhìn — giữ nguyên cả chi tiết cảm xúc ("vết sẹo còn nguyên") |
| 7 nhóm JTBD, khuôn "quyết định nhị phân trước hạn chót" | ✅ §2.1 — chép gần nguyên văn, kể cả "nỗi lo gốc" của trưởng bản |
| Insight: AI dịch số thành hành động = xương sống | ✅ §1 + tagline |
| Progressive disclosure hòa giải "đẩy hành động vs giữ số" | ✅ §4.4 (FR-10, FR-11) + addendum §1 ghi rõ phương án "bỏ số" đã bị bác kèm lý do |
| Bản tin 4 phần | ✅ FR-5 + Glossary |
| Flow chính Hệ thống → Dân (đẩy hành động, không đẩy dự báo) | ✅ §4.5 |
| Last-mile human relay "3 mũ" + sổ hộ + nút xác nhận + nhật ký + escalation | ✅ §4.6 (FR-18–22), giữ đúng framing "điểm ăn tiền" / "tầng con người" |
| Differentiation "không phải wrapper API" | ✅ §1 — còn được củng cố thêm bằng nghiên cứu cạnh tranh (addendum §5) |
| Mô hình mượn: Grab-ETA, cháy rừng 2 mức, Amber Alert | ✅ FR-6, FR-4/Glossary, FR-16 + bảng ánh xạ addendum §2 |
| Để sau (cụm F, trong & sau lũ, mùa vụ/chợ phiên, cảm biến sống bonus) | ✅ §6.2 + §9.1 — kể cả sắc thái "cảm biến sống là bonus, không phải lõi" (có cả note PM về tính "emotionally load-bearing") |
| Không làm (cell broadcast, suy đoán tự động, buôn bán/du lịch) | ✅ §5 Non-Goals, tường minh |
| Yêu cầu tối thiểu bài thi | ✅ §10 bảng ánh xạ |

Về mặt định tính: giọng "quyết định nhị phân", framing "làm X trước Y giờ", và trọng tâm tầng con người đều được giữ và thậm chí làm đậm hơn. Đây là bản chưng cất trung thành ở tầng khung.

## 2. GAPS — chỗ intent chưa được đại diện hoặc bị bóp méo

### GAP-1. Độ hạt cá nhân hóa bị thu hẹp: "từng hộ / mảnh nương" → "Bản"
Intent (Concept, dòng đầu): *"Cá nhân hoá tới từng hộ/mảnh nương theo độ cao, hướng dốc, vị trí."* Cụm B của MVP cũng ghi "phân vùng theo bản, độ cao, hướng dốc" — tức hai tầng: bản VÀ hộ/mảnh nương.

PRD chỉ mô hình hóa độ cao/hướng dốc/vị trí ở cấp **Bản** (Glossary "Bản", FR-2, FR-8); **Hộ** chỉ mang thuộc tính *nghề* và *Bản trực thuộc* (FR-9). Việc cá nhân hóa theo vị trí/độ cao của từng hộ hay mảnh nương biến mất mà không được ghi là quyết định thu hẹp scope (không có trong §5 Non-Goals, không có `[ASSUMPTION]`). Nếu đây là chủ đích (hợp lý cho 36h), cần một dòng tường minh "cá nhân hóa vị trí dừng ở cấp Bản trong MVP; hộ/mảnh nương là giai đoạn 2".

### GAP-2. JTBD "cửa sổ thời tiết tốt" không có FR phục vụ
Hai job của nông dân trong intent là quyết định **cơ hội**, không phải nguy hiểm: *"Có đủ 3 ngày nắng để gặt+phơi thóc không. Tuần này xuống giống được chưa."* PRD chép nguyên các job này vào §2.1, nhưng toàn bộ động cơ cảnh báo (FR-3/FR-4) chỉ kích hoạt khi **vượt ngưỡng nguy hiểm**; thứ duy nhất phục vụ job này là FR-12 — xem dự báo 7 ngày thô, tức chính cái "bản tin đầy số liệu" mà intent phê phán. Câu trả lời nhị phân "ĐỦ/KHÔNG ĐỦ 3 ngày nắng" — đúng khuôn "quyết định nhị phân trước hạn chót" mà intent tuyên bố là khuôn của *mọi* job — không tồn tại dưới dạng yêu cầu. Cần hoặc (a) một FR "cửa sổ hành động thuận lợi" (rule đơn giản trên chuỗi ngày nắng), hoặc (b) ghi tường minh vào §5/§6.2 rằng MVP chỉ phủ job nguy hiểm, job cơ hội để sau.

### GAP-3. "MVP = triển khai đầy đủ cụm A–E" vs bảng tier §6.3 cho rơi lõi của cụm D/E
Intent chốt: *"MVP (IN) — triển khai đầy đủ cụm A–E"*, trong đó cụm D bao gồm tường minh **escalation + đếm ngược hạn chót + âm thanh đỏ**. PRD §6.1 tuyên bố giữ trọn A–E, nhưng §6.3 xếp FR-18 (leo thang), FR-16 (âm thanh đỏ), FR-6 (đếm ngược) vào tier **Could** — "mất giờ thì rơi từ dưới lên". Hệ quả kép:
- Lệch với cam kết "đầy đủ A–E" của intent mà không được flag như một assumption/trade-off (bảng §12 chỉ flag thứ tự Should① vs Should②, không flag việc D/E có phần rơi được).
- Mâu thuẫn nội bộ: SM-2 (chỉ số thành công **chính**) đo "đã leo thang trước Hạn chót" và UJ-2 (hành trình đinh của demo) dựa hoàn toàn vào leo thang — nhưng FR-18 nằm ở tier thấp nhất. Nếu FR-18 rơi, SM-2 và UJ-2 sụp theo.

### GAP-4. Kênh "loa" bị chuyển thành "TTS trong app mô phỏng loa" — thu hẹp ngầm
Intent (Concept): *"Đa kênh + TTS tiếng Mông/Thái **qua loa**"* — loa (loa bản/loa xã) là kênh phát trong hình dung gốc. PRD §4.5 chuyển thành "TTS phát trong app (**mô phỏng** loa bản)"; loa xã thật chỉ xuất hiện trong addendum §6 như adapter "giai đoạn 2", trong ngoặc. Việc hạ cấp kênh loa thật ra khỏi MVP là hợp lý về khả thi, nhưng chưa được nêu ở §5 Non-Goals hay §6.2 Ngoài phạm vi của PRD chính — người đọc PRD (không đọc addendum) sẽ không biết kênh loa từng là ý gốc và đã bị dời.

### GAP-5. Chi tiết JTBD rơi khỏi tầng tính năng: "nói câu gì trên loa" và "chạy đi đâu"
- Trưởng bản/cán bộ xã trong intent cần biết *"nói câu gì để dân làm theo"* khi bật loa/gõ kẻng. PRD không có yêu cầu nào cấp cho Cán bộ một **kịch bản phát loa / câu thông báo sẵn** — Bản tin 4 phần (FR-5) được cá nhân hóa theo Hộ, view Cán bộ (FR-20/21) chỉ là danh sách đến nhắc. Đây là chỗ FR structure làm rơi một nhu cầu định tính: cán bộ cần *ngôn từ*, không chỉ danh sách.
- Hộ vùng lũ quét/sạt lở hỏi *"chạy đi đâu"* — hồ sơ Bản (FR-8) không có trường điểm sơ tán/nơi trú an toàn, và Bản tin 4 phần không cam kết trả lời "đi đâu" (chỉ "làm gì, trước khi nào"). Với cảnh báo mức "Đi ngay", "làm gì" mà thiếu "đi đâu" là hành động không hoàn chỉnh.

## 3. Nhận xét không phải gap (đã kiểm, hợp lệ)

- Zalo/SMS best-effort (intent chỉ nói "đa kênh" không chốt kênh cụ thể) — PRD flag `[ASSUMPTION]` đúng cách.
- 5 địa điểm thay vì "≥3" — vượt yêu cầu, hợp intent.
- Nhóm buôn bán/du lịch, cell broadcast, suy đoán tự động: loại đúng như intent, có ghi tường minh.
- "Giao diện đơn giản (đã đáp ứng qua giao diện dân phân lớp)" — ánh xạ đúng ở §10.
- Ngưỡng tĩnh không tự học — đúng với "Để sau" của intent.
- "Hình ảnh" cho người già không đọc chữ — thẻ màu + icon (FR-10) + TTS (FR-15) phủ được, chấp nhận.

## 4. Đề xuất xử lý (cho vòng finalize)

1. GAP-1: thêm 1 dòng vào §5 hoặc §6.2 — cá nhân hóa vị trí dừng ở cấp Bản trong MVP, hộ/mảnh nương là giai đoạn 2 (hoặc thêm trường vị trí/độ cao tùy chọn vào FR-9 nếu muốn giữ).
2. GAP-2: quyết định (a) thêm FR nhỏ "cửa sổ thuận lợi" (rule thuần, rẻ) hoặc (b) ghi tường minh job cơ hội ngoài scope MVP — hiện đang lơ lửng.
3. GAP-3: hoặc nâng FR-18 lên Should①, hoặc hạ SM-2 xuống chỉ số phụ + sửa tuyên bố "trọn 5 cụm A–E" thành "A–E theo thứ tự ưu tiên §6.3", và thêm dòng assumption vào §12.
4. GAP-4: thêm 1 gạch đầu dòng vào §6.2: "Loa bản/xã thật → giai đoạn 2; MVP dùng TTS trong app mô phỏng".
5. GAP-5: cân nhắc mở rộng FR-20 (Danh sách đến nhắc kèm **câu thông báo mẫu** cho Cán bộ đọc trên loa — tái dùng output FR-5, chi phí gần 0) và thêm trường "điểm sơ tán" vào hồ sơ Bản (FR-8) để phần "làm gì" của cảnh báo Đi ngay trả lời được "chạy đi đâu".
