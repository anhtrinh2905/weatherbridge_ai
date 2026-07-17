# Đối chiếu: brainstorm memlog ↔ PRD + Addendum

- **Nguồn:** `docs/brainstorming/brainstorm-weather-forecasting-dien-bien-2026-07-17/.memlog.md`
- **Đích:** `prd.md`, `addendum.md` (workspace prd-weatherbridge-ai-2026-07-17)
- **Ngày đối chiếu:** 2026-07-17

## 1. Bảng đối chiếu từng dòng memlog

| # | Dòng memlog | Trạng thái | Nơi thể hiện |
|---|---|---|---|
| 1 | [decision] Chế độ Creative Partner | N/A (process) | — |
| 2 | [decision] Bộ kỹ thuật JTBD→AR→SCAMPER→Provocation | N/A (process) | — |
| 3 | JTBD Nông dân: sương muối → đốt lửa/phủ bạt cứu mạ | ✅ | prd §2.1, UJ-1 |
| 4 | JTBD Nông dân: 3 ngày nắng gặt+phơi thóc | ✅ | prd §2.1 |
| 5 | JTBD Nông dân: xuống giống hay đợi | ✅ | prd §2.1 |
| 6 | JTBD Chăn nuôi: rét hại → lùa trâu bò (thảm hoạ rét 2008) | ✅ | prd §2.1; vết sẹo 2008 ở §1 |
| 7 | JTBD Cán bộ: bật loa/gõ kẻng, nói câu gì | ✅ | prd §2.1, UJ-2 |
| 8 | JTBD Cán bộ: bằng chứng đã cảnh báo | ✅ | prd §2.1, FR-22 |
| 9 | JTBD Cán bộ nỗi lo gốc: đừng để có người chết mà không được báo | ✅ | prd §2.1, kết UJ-2 |
| 10 | JTBD Tài xế: đèo Pha Đin sương mù/sạt | ✅ | prd §2.1, UJ-3 |
| 11 | JTBD Phụ huynh: suối lũ/cầu tràn → đi học hay nghỉ | ✅ | prd §2.1 |
| 12 | JTBD Người già không đọc chữ: báo bằng tiếng của họ + giọng/hình | ✅ | prd §2.1, FR-15, FR-19–21 |
| 13 | JTBD Hộ vùng lũ quét: có trong vùng sạt không, **khi nào chạy, chạy đi đâu** | ⚠️ một phần | "khi nào chạy" = Hạn chót ✅; **"chạy đi đâu" không có chỗ đứng**: Bản tin 4 phần (chuyện gì/nguy hiểm/làm gì/trước khi nào) không có trường điểm-đến-sơ-tán, hồ sơ Bản (FR-8) không có thuộc tính điểm sơ tán an toàn |
| 14 | [insight] Job = quyết định nhị phân trước mốc thời gian → "làm X trước Y giờ" | ✅ | prd §1, §2.1, tagline |
| 15 | [decision-user] Scope MVP chỉ nhóm đã liệt kê, không buôn bán/du lịch | ✅ | prd §2.2, §5; addendum §1 (rejected có lý do) |
| 16 | [idea] Dân là "cảm biến sống" báo ngược (label cho ML) | ✅ | prd §6.2 bonus + §9.1 mở rộng (đúng diện bonus user chốt) |
| 17 | [decision-user] Flow chính = Hệ thống→Dân; Dân→Hệ thống chỉ bonus | ✅ | prd §4.5 mô tả, §6.2 (bonus, "không được ảnh hưởng flow chính") |
| 18 | [idea] AI đẩy HÀNH ĐỘNG; cá nhân hóa **từng hộ/mảnh nương** theo độ cao, hướng dốc, vị trí | ⚠️ một phần | Đẩy hành động ✅ (FR-5). Cá nhân hóa hạ độ hạt xuống **Bản + nghề của Hộ** (FR-2, FR-8, FR-9) — chấp nhận được vì các quyết định user sau đó hội tụ về phân vùng theo Bản; NHƯNG **hướng dốc** chỉ được lưu trong hồ sơ Bản (FR-8) mà không FR nào tiêu thụ (FR-2 chỉ hiệu chỉnh theo độ cao) — thuộc tính mồ côi |
| 19 | [decision-user] Giải phẫu cảnh báo = 4 phần | ✅ | Glossary "Bản tin 4 phần", FR-5 |
| 20 | [idea-user] Last-mile human relay cho người già/mù chữ | ✅ | prd §4.6, UJ-2 |
| 21 | [idea] Relay đóng job cán bộ: danh sách + nút "đã đến nhắc" → nhật ký | ✅ | FR-20, FR-21, FR-22 |
| 22 | [decision-user] Sổ hộ dễ tổn thương khai báo 1 lần (phương án A), không suy đoán | ✅ | FR-19, §5 Non-goals; addendum §1 (rejected có lý do) |
| 23 | S-Substitute: TTS Mông/Thái **qua loa** + màu/tiếng kẻng thay thang số | ✅ (đủ dùng) | FR-15 TTS "mô phỏng loa bản"; loa xã thật = adapter giai đoạn 2 (addendum §6); màu theo Mức + âm đặc trưng (FR-10, FR-16) |
| 24 | C-Combine: lịch mùa vụ/chợ phiên + bản đồ nguy cơ sạt lở sẵn có | ✅ | Lịch mùa vụ dời giai đoạn 2 (đúng quyết định user, §6.2/§9); bản đồ nguy cơ → "loại rủi ro" hồ sơ Bản (FR-8) + giai đoạn 2 + câu hỏi mở §11.5 |
| 25 | A-Adapt: J-Alert, cháy rừng, Amber, Grab, triage màu, escalation ngân hàng | ✅ | addendum §2 bảng ánh xạ nguồn cảm hứng (triage màu hoà vào Mức/màu thẻ) |
| 26 | [decision-user] Kéo vào MVP: Grab đếm ngược+xác nhận / 2 mức+chia vùng / âm thanh đỏ; **bỏ cell broadcast** | ✅ | FR-6+FR-13 / Mức+FR-4+§4.3 / FR-16; cell broadcast ở §5 Non-goals + addendum §1 |
| 27 | E-Eliminate: bỏ số phía dân — **bị bác** | ✅ | addendum §1 ghi rõ "Bác (trong brainstorm)" kèm lý do |
| 28 | [decision-user] Giao diện dân phân lớp (progressive disclosure), giữ đủ số liệu | ✅ | prd §4.4, FR-10, FR-11 |
| 29 | PO1: pha "trong & sau" lũ nhiều đợt + tự học chỉnh ngưỡng | ✅ | dời giai đoạn 2 đúng quyết định user (§5, §6.2, §9.1) |
| 30 | [direction-user] Bỏ qua phần còn lại Provocation | N/A (process) | — |
| 31 | [decision] Converge: **7 cụm A–G**, MoSCoW cắt scope | ⚠️ một phần | PRD nêu "cụm A–E" (§6.1) và cụm F (§6.2) — **cụm G không được gọi tên ở đâu**. Suy từ các quyết định thì G ≈ "cảm biến sống" (nội dung đã có ở §6.2 bonus), nhưng vết ánh xạ A–G không đầy đủ; ai đọc PRD không tra ngược được G là gì |
| 32 | [decision-user] MVP đủ cụm A,B,C,D,E | ✅ | prd §6.1 liệt kê đúng 5 cụm kèm FR |
| 33 | [decision-user] Giai đoạn sau: cụm F + lịch mùa vụ/chợ phiên | ✅ | prd §6.2, §9.1 |
| 34 | [decision-user] Không làm: cell broadcast, suy đoán tự động, buôn bán/du lịch | ✅ | prd §5; cả 3 có mặt trong bảng rejected addendum §1 |
| 35 | [decision-user] "Cảm biến sống" = bonus nếu dư thời gian, không phải lõi | ✅ | prd §6.2 (kèm note PM về slide tầm nhìn) |
| 36 | [insight] Xương sống = quyết định nhị phân trước hạn chót | ✅ | prd §1 |
| 37 | [insight] Điểm ăn tiền = TẦNG CON NGƯỜI, không phải wrapper API | ✅ | prd §1, §4.6, §10 |
| 38 | [insight] Relay đội 3 mũ: cứu người yếu thế + nhật ký + escalation | ✅ | prd §4.6 mô tả nguyên văn "ba mũ" |
| 39 | [insight] Progressive disclosure hoà giải hành động vs số liệu | ✅ | prd §4.4 |

## 2. Kiểm tra riêng: ý tưởng bị bác / bị loại có mặt trong addendum chưa

| Ý bị bác/loại trong brainstorm | Có trong addendum §1? |
|---|---|
| Cell broadcast (bỏ vì lệ thuộc nhà mạng) | ✅ kèm lý do + bằng chứng nghiên cứu |
| Bỏ hẳn số liệu phía dân ("bị bác") | ✅ ghi rõ "Bác (trong brainstorm)" |
| Suy đoán tự động hộ dễ tổn thương | ✅ kèm lý do |
| Nhóm buôn bán/du lịch | ✅ |

Đầy đủ. (Addendum còn ghi thêm 2 phương án loại phát sinh sau brainstorm — LLM end-to-end, Zalo Mini App — không mâu thuẫn memlog.)

## 3. Gaps

1. **[Nhỏ] "Chạy đi đâu" (dòng 24 memlog) không được hiện thực hoá.** JTBD hộ vùng lũ quét gồm 3 vế: có trong vùng không / khi nào chạy / **chạy đi đâu**. Hai vế đầu có (phạm vi Bản + Hạn chót); vế "chạy đi đâu" không có trường dữ liệu nào đỡ: Bản tin 4 phần không có "điểm đến an toàn", hồ sơ Bản (FR-8) không có thuộc tính điểm sơ tán. Đề xuất: thêm thuộc tính "điểm sơ tán/điểm an toàn" tùy chọn vào hồ sơ Bản để phần "làm gì" của bản tin lũ quét/sạt lở nêu được nơi đến, hoặc ghi nhận tường minh là giới hạn MVP.
2. **[Nhỏ] "Hướng dốc" là thuộc tính mồ côi.** Ý gốc (dòng 30 memlog) cá nhân hóa theo độ cao + hướng dốc + vị trí. PRD lưu hướng dốc trong hồ sơ Bản (FR-8, Glossary) nhưng không FR nào dùng nó (FR-2 chỉ hiệu chỉnh theo độ cao). Nên hoặc nêu hướng dốc là input tương lai (gắn giai đoạn 2/[ASSUMPTION]), hoặc bỏ khỏi FR-8 để tránh gây kỳ vọng với giám khảo/dev.
3. **[Nhỏ — truy vết] Cụm G không được gọi tên.** Memlog chốt converge thành 7 cụm A–G; PRD chỉ nhắc A–E (MVP) và F (giai đoạn 2). Nội dung của G (suy đoán ≈ "cảm biến sống") thực chất đã nằm ở §6.2 bonus, nhưng nhãn G biến mất — người đối chiếu ngược brainstorm→PRD sẽ vấp. Đề xuất: một câu ở §6.2 gắn nhãn "cụm G — cảm biến sống (bonus)" hoặc chú thích ánh xạ cụm.
4. **[Ghi nhận, không phải lỗi] Độ hạt cá nhân hóa hạ từ "từng hộ/mảnh nương" xuống "Bản + nghề".** Đây là ý coach ở pha phân kỳ, và các quyết định user sau đó (phân vùng theo Bản, sổ hộ theo Bản) hội tụ về độ hạt Bản — PRD chọn đúng hướng hội tụ. Không cần sửa; nêu ở đây để khép vòng truy vết.

## 4. Kết luận

Toàn bộ **quyết định của user** (scope, flow chính, 4 phần, phương án A, 3 cơ chế mượn, progressive disclosure, MoSCoW A–E/F/không-làm, cảm biến sống bonus) đều được tôn trọng đúng trong prd.md; toàn bộ ý **bị bác/loại** đều xuất hiện trong addendum §1 kèm lý do; các **insight** chủ chốt đều thành xương sống PRD (§1, §4.4, §4.6). Ba gap còn lại đều nhỏ: một vế JTBD chưa có chỗ đỡ dữ liệu ("chạy đi đâu"), một thuộc tính mồ côi (hướng dốc), một đứt vết truy xuất nhãn cụm (G).
