# Backlog tính năng MVP - Ma trận MoSCoW

**Dự án:** Giải pháp AI dự báo & cảnh báo thời tiết cho Điện Biên (VAIC 2026)
**Nguồn:** Buổi brainstorm ngày 2026-07-17 (`.memlog.md`)
**Ngày lập:** 2026-07-17

**Xương sống sản phẩm:** Cảnh báo = "một quyết định nhị phân trước một mốc hạn chót" - AI dịch số liệu thành hành động, không đẩy dự báo/số thô.
**Điểm khác biệt ăn tiền:** TẦNG CON NGƯỜI (last-mile relay + trách nhiệm cán bộ + tiếng bản địa), không phải wrapper API thời tiết.

**Quyết định scope:** Triển khai đầy đủ cụm A, B, C, D, E trong MVP. Để giai đoạn sau cụm F + lịch mùa vụ/chợ phiên. Không làm: cell broadcast, suy đoán tự động hộ dễ tổn thương, nhóm buôn bán/du lịch.

---

## MUST HAVE - Bắt buộc (yêu cầu tối thiểu đề bài + lõi sản phẩm)

- [ ] **Dự báo 3-7 ngày cho ≥3 địa điểm** - lấy và chuẩn hóa dữ liệu dự báo nhiều điểm ở Điện Biên.
  *Ghi chú kỹ thuật: nguồn dữ liệu Open-Meteo và/hoặc OpenWeatherMap; cache theo địa điểm.*
- [ ] **Cảnh báo theo ngưỡng tự sinh bản tin** - vượt ngưỡng (sương muối, rét hại, mưa lớn, lũ, sạt lở) thì tự động phát sinh cảnh báo.
  *Ghi chú kỹ thuật: bảng ngưỡng cấu hình tĩnh cho MVP (chưa tự học - xem cụm F ở WON'T).*
- [ ] **Nội dung cảnh báo 4 phần** - mỗi bản tin gồm: (1) chuyện gì + (2) nguy hiểm cỡ nào + (3) làm gì + (4) trước khi nào (hạn chót).
  *Ghi chú kỹ thuật: template hóa 4 trường; AI dịch số → câu hành động "làm X trước Y giờ".*
- [ ] **Giao diện dân: thẻ màu + icon + câu hành động, có lớp số liệu** - progressive disclosure: hành động ở trên, số liệu đầy đủ (nhiệt độ, mm mưa, %) ở dưới để tăng độ tin cậy.
  *Ghi chú kỹ thuật: web/app cho dân xem; KHÔNG bỏ số liệu (đề xuất "bỏ số" đã bị bác).*
- [ ] **≥1 kênh phân phối chạy thật** - ít nhất một kênh đẩy cảnh báo hoạt động thực tế trong demo.
  *Ghi chú kỹ thuật: chọn kênh khả thi nhất (app/web push, Zalo, SMS...); không phụ thuộc cell broadcast.*
- [ ] **Tài liệu kiến trúc + deck 1 trang** - sản phẩm phụ bắt buộc theo đề bài.
  *Ghi chú kỹ thuật: sơ đồ luồng dữ liệu nguồn → ngưỡng → cảnh báo → kênh → dân/cán bộ.*

---

## SHOULD HAVE - Nên có (cá nhân hóa + tầng con người, giá trị khác biệt)

- [ ] **Phân vùng cảnh báo theo bản** - chia vùng phát cảnh báo theo từng bản/mảnh nương thay vì cả tỉnh.
  *Ghi chú kỹ thuật: cá nhân hóa theo độ cao, hướng dốc, vị trí; mô hình mượn từ cảnh báo cháy rừng.*
- [ ] **Thang 2 mức "chuẩn bị / đi ngay"** - hai cấp độ hành động rõ ràng thay cho thang số khó hiểu.
  *Ghi chú kỹ thuật: mô hình 2 mức warning/order của cảnh báo cháy rừng.*
- [ ] **TTS tiếng Mông / Thái** - đọc cảnh báo bằng giọng nói tiếng bản địa cho người già/không đọc chữ.
  *Ghi chú kỹ thuật: text-to-speech tiếng dân tộc; phát qua loa bản / app.*
- [ ] **Last-mile human relay** - hệ thống đưa danh sách "nhà cần đến tận nơi" cho cán bộ/trưởng thôn gần nhất.
  *Ghi chú kỹ thuật: tầng con người bù cho hộ không tiếp cận được kênh số.*
- [ ] **Sổ hộ dễ tổn thương (trưởng thôn khai báo)** - danh sách hộ yếu thế khai báo thủ công 1 lần (phương án A).
  *Ghi chú kỹ thuật: KHÔNG suy đoán tự động ở MVP; nhập liệu do trưởng thôn.*
- [ ] **Nút xác nhận "đã đến nhắc"** - cán bộ bấm xác nhận sau khi tới nhắc từng hộ.
  *Ghi chú kỹ thuật: vòng xác nhận theo mô hình ETA + confirm của Grab.*
- [ ] **Nhật ký trách nhiệm tự động** - ghi lại đã cảnh báo lúc mấy giờ, ai nhận, ai đã đến nhắc.
  *Ghi chú kỹ thuật: log phục vụ báo cáo cấp trên - đóng job "bằng chứng đã cảnh báo" của cán bộ.*

---

## COULD HAVE - Có thể có (nếu còn thời gian, tăng ấn tượng)

- [ ] **Đếm ngược hạn chót** - hiển thị đồng hồ đếm ngược tới mốc "phải làm X".
  *Ghi chú kỹ thuật: cơ chế countdown mượn từ Grab, gắn với trường "trước khi nào".*
- [ ] **Escalation ladder** - leo thang cảnh báo khi chưa có xác nhận (từ dân → trưởng thôn → cán bộ xã).
  *Ghi chú kỹ thuật: mô hình escalation của ngân hàng; kích hoạt khi thiếu confirm.*
- [ ] **Âm thanh đỏ đặc trưng qua loa** - âm báo động không thể phớt lờ cho mức "đi ngay".
  *Ghi chú kỹ thuật: mô hình âm thanh đặc trưng của Amber Alert; phát qua loa bản.*

---

## WON'T HAVE (this time) - Không làm lần này / để sau

- [ ] **Cụm F - Tự học chỉnh ngưỡng** - hệ thống tự học và tự điều chỉnh ngưỡng theo lịch sử từng bản. *(để giai đoạn sau)*
- [ ] **Cụm F - Pha "trong & sau" cho lũ nhiều đợt** - cảnh báo diễn tiến trong và sau sự kiện, nhiều đợt. *(để giai đoạn sau)*
- [ ] **Lịch mùa vụ / chợ phiên** - ghép cảnh báo với lịch mùa vụ, chợ phiên. *(để giai đoạn sau)*
- [ ] **Cảm biến sống (dân báo ngược thực địa)** - flow Dân → Hệ thống. *(bonus - chỉ làm nếu dư thời gian, không phải lõi, không ảnh hưởng performance)*
- [ ] **Cell broadcast (kiểu J-Alert)** - KHÔNG làm: lệ thuộc nhà mạng.
- [ ] **Suy đoán tự động hộ dễ tổn thương** - KHÔNG làm: MVP dùng khai báo thủ công (phương án A).
- [ ] **Nhóm buôn bán / du lịch** - KHÔNG làm: ngoài scope nhóm ngành nghề đã chốt.
