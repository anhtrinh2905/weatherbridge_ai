# Deck 1 trang — DÀN Ý NỘI DUNG (chưa phải thiết kế cuối)

> **Lưu ý:** Đây là bộ khung nội dung (content outline) để điền vào 1 trang deck cho VAIC 2026, KHÔNG phải bản thiết kế đồ họa cuối cùng. Toàn bộ nội dung phải nằm gọn về mặt ý tưởng trên MỘT trang. Nguồn: phiên brainstorm ngày 2026-07-17.

---

## 1. Tiêu đề + Tagline

- **Tên sản phẩm:** WeatherBridge AI — Cảnh báo thời tiết & thiên tai cho Điện Biên
- **Tagline:** "Không đẩy con số — đẩy hành động: LÀM GÌ, TRƯỚC KHI NÀO."
- **Insight lõi (in đậm, đặt ngay dưới tagline):** Mỗi cảnh báo là một *quyết định nhị phân trước hạn chót* — dân không cần độ chính xác từng độ, cần biết "làm X trước Y giờ".

---

## 2. Vấn đề (Điện Biên)

- Địa hình rủi ro đặc thù: **sương mù** dày (đèo Pha Đin), **lũ quét** & sạt lở, **sương muối/rét hại** (nguy cơ lặp thảm họa rét 2008 giết gia súc, hỏng mạ non).
- Bản tin thời tiết cấp tỉnh **tới muộn**, **không chi tiết theo từng bản/mảnh nương**, và **khó hiểu với người mù chữ / người già / đồng bào dân tộc**.
- Hệ quả: dân không kịp ra quyết định (đốt lửa cứu mạ, lùa gia súc về chuồng, sơ tán khỏi vùng sạt) — có thể chết người mà "không được báo trước".

---

## 3. Giải pháp

- **Flow chính = Hệ thống → Dân** (đẩy cảnh báo chủ động; flow "dân báo ngược" chỉ là bonus).
- **AI đẩy HÀNH ĐỘNG, không đẩy số:** dịch dữ liệu thời tiết thành *quyết định + hạn chót*, cá nhân hóa theo độ cao / hướng dốc / vị trí từng hộ.
- **Giải phẫu 1 cảnh báo (4 phần):** (1) chuyện gì — (2) nguy hiểm cỡ nào — (3) làm gì — (4) trước khi nào.
- **Giao diện phân lớp (progressive disclosure):** trên cùng là thẻ màu + icon + câu hành động; bên dưới là đầy đủ số liệu đã phân tích (nhiệt độ, mm mưa, %) để tăng độ tin cậy.
- **Đa kênh + TTS tiếng bản địa:** phát bằng giọng nói tiếng Mông/Thái qua loa, kèm âm thanh/màu thay cho thang số.
- **Tầng con người (last-mile relay):** với người già/mù chữ, hệ thống báo cho cán bộ/trưởng bản tới nhắc tận nơi + nút xác nhận "đã đến nhắc" → nhật ký trách nhiệm cán bộ tự động.

---

## 4. Nguồn dữ liệu

- API thời tiết mở: **Open-Meteo**, **OpenWeatherMap**.
- **Trạm KTTV Điện Biên** (dữ liệu quan trắc địa phương).
- **Dữ liệu lịch sử thiên tai & cảnh báo** từ Ban Chỉ huy PCTT&TKCN (làm nền cho ngưỡng và bản đồ nguy cơ).
- (Bonus, giai đoạn sau) "cảm biến sống" — dân báo ngược thực địa để bù trạm đo thưa + tạo nhãn cho ML.

---

## 5. Mô hình xử lý

- **Ngưỡng cảnh báo → sinh bản tin hành động:** khi vượt ngưỡng, tự động dựng câu "làm gì trước khi nào" thay vì hiển thị số thô.
- **Cá nhân hóa / phân vùng theo bản:** khớp vị trí, độ cao, hướng dốc từng hộ/mảnh nương với vùng nguy cơ.
- **Thang 2 mức** (mô phỏng cảnh báo cháy rừng): "chuẩn bị" và "đi ngay / hành động ngay".

---

## 6. Kênh phân phối

- **Zalo, SMS, loa phát thanh bản.** (Đã loại cell broadcast vì lệ thuộc nhà mạng.)
- **TTS tiếng bản địa (Mông/Thái)** cho người không đọc chữ.
- **"Âm thanh đỏ" không thể phớt lờ** (mô phỏng Amber Alert) cho mức khẩn.
- **Đếm ngược hạn chót + vòng xác nhận** (mô phỏng Grab) và **escalation** khi chưa có xác nhận đã nhận/đã hành động.

---

## 7. Điểm khác biệt

- Ăn tiền ở **TẦNG CON NGƯỜI**: last-mile relay cứu người yếu thế + nhật ký trách nhiệm cán bộ + tiếng bản địa.
- **Không phải wrapper API thời tiết** — mà là hệ thống biến dữ liệu thành hành động có người chịu trách nhiệm ở "chặng cuối".

---

## 8. Lộ trình triển khai

- **MVP (làm ngay):** cụm A–E — nội dung cảnh báo 4 phần, cá nhân hóa/phân vùng theo bản, giao diện dân phân lớp, đa kênh + TTS + relay + escalation + đếm ngược, trách nhiệm cán bộ. (Sổ hộ dễ tổn thương: trưởng bản khai báo 1 lần — phương án A, không suy đoán tự động.)
- **Giai đoạn sau:** cụm F — hệ thống **tự học chỉnh ngưỡng** theo lịch sử từng bản + pha "trong & sau" cho lũ nhiều đợt; ghép **lịch mùa vụ / chợ phiên**.
- **Mở rộng:** "cảm biến sống" / dân báo ngược thực địa (vòng lặp dữ liệu tự lớn cho ML).
