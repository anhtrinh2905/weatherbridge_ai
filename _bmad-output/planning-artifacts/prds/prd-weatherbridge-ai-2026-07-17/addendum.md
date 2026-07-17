# Addendum — WeatherBridge AI PRD

*Chất liệu thuộc về tài liệu hạ nguồn (kiến trúc, solution design, deck) hoặc quá chi tiết cho PRD. Không phải yêu cầu — là ngữ cảnh và quyết định kỹ thuật kèm lý do.*

## 1. Phương án đã xem xét và loại (kèm lý do)

| Phương án | Kết luận | Lý do |
|---|---|---|
| Cell broadcast (kiểu J-Alert) | **Loại** | Lệ thuộc nhà mạng, ngoài tầm kiểm soát đội thi. Nghiên cứu cũng không tìm thấy cell broadcast triển khai toàn quốc ở VN — kênh thay thế thực tế là Zalo/SMS blast. |
| Bỏ hẳn số liệu ở giao diện dân (chỉ thẻ màu + câu hành động) | **Bác** (trong brainstorm) | Mất lớp tin cậy — dân cần thấy số đã phân tích để tin. Giải pháp: progressive disclosure (hành động trên, số dưới). |
| Suy đoán tự động hộ dễ tổn thương | **Loại cho MVP** | Rủi ro sai sót trên nhóm sinh tử + cần dữ liệu không có; phương án A (trưởng bản khai báo 1 lần) rẻ và chính xác hơn ở quy mô bản. |
| LLM end-to-end (LLM tự quyết mức cảnh báo) | **Loại** | Hallucination trong cảnh báo sinh tử không giải trình được với giám khảo; hybrid rule-quyết + LLM-viết giữ được cả an toàn lẫn "chất AI". |
| Zalo Mini App làm form factor chính | **Loại** | Phụ thuộc duyệt app + học công nghệ mới giữa cuộc thi; PWA 2 vai nhanh hơn và khớp repo `fe/` hiện có. |
| Nhóm người dùng buôn bán / du lịch | **Loại** | Ngoài scope ngành nghề đã chốt ở brainstorm. |

## 2. Cơ chế "mượn" — ánh xạ nguồn cảm hứng

| Cơ chế trong sản phẩm | Mượn từ | Ghi chú |
|---|---|---|
| Đếm ngược hạn chót + vòng xác nhận | Grab (ETA + confirm) | FR-6, FR-13 |
| Thang 2 mức "Chuẩn bị / Đi ngay" + phân vùng | Cảnh báo cháy rừng (warning/order + zone) | FR-4, Glossary "Mức" |
| Âm thanh đỏ không thể phớt lờ | Amber Alert | FR-16 |
| Leo thang khi im lặng | Quy trình escalation ngân hàng | FR-18 |
| Bản tin hành động thay vì hiện tượng | WMO impact-based forecasting (WMO-No. 1150) | Khung chính danh để cite với giám khảo |

## 3. Nguồn dữ liệu — ghi chú kỹ thuật

- **Open-Meteo (chính):** free, không cần API key; blend GFS (13–25km) + ICON (~11km); có **downscaling độ cao theo DEM Copernicus 90m** — lý do chọn làm nguồn chính cho địa hình Điện Biên và là cơ sở kỹ thuật cho FR-2 (hiệu chỉnh theo độ cao Bản). Hạn chế: mưa đối lưu quy mô lũ quét vẫn bị làm mượt — không hứa "dự báo lũ quét chính xác", chỉ hứa cảnh báo nguy cơ theo ngưỡng.
- **OpenWeatherMap (dự phòng):** free tier ~60 calls/phút, One Call 3.0 ~1.000 calls/ngày — đủ quy mô tỉnh. Độ phân giải Tây Bắc VN chưa kiểm chứng độc lập.
- **Google Flood Hub / Flood Forecasting API:** có phủ lưu vực sông Việt Nam, dự báo lũ sông tới 7 ngày, free — ứng viên nguồn bổ sung cho rủi ro lũ ở Mường Lay (giai đoạn 2, hoặc quick-win nếu dư thời gian).
- **Trạm KTTV Điện Biên + dữ liệu PCTT&TKCN:** không có API mở (theo khảo sát); để giai đoạn 2, cần quan hệ với cơ quan địa phương.
- Tọa độ tham chiếu 5 Địa điểm dự báo (gần đúng, chốt lại khi implement): TP. Điện Biên Phủ 21.386, 103.016 (~490m) · Mường Lay 22.037, 103.150 (~250m) · đèo Pha Đin 21.569, 103.526 (~1.500m) · Tủa Chùa 21.994, 103.376 (~1.400m) · Mường Nhé 22.173, 102.457 (~700m).

## 4. Ngôn ngữ bản địa — hiện trạng đã kiểm chứng (2026-07)

Nghịch lý bổ trợ nhau: **Thái có TTS nhưng không có máy dịch; Mông có máy dịch nhưng không có TTS.** Pipeline mỗi ngôn ngữ vì thế khác nhau:

| | Chữ (dịch) | Giọng nói (TTS) |
|---|---|---|
| **Thái (Tai Dam)** | Không có MT Việt→Thái → template do người bản ngữ dịch một lần | ✅ `facebook/mms-tts-blt` (VITS 36M, **CC-BY-NC 4.0**) — **self-host** (Meta không host API); chạy CPU gần realtime; HF Inference API chỉ để prototype, không tin cậy cho demo |
| **Mông** | ✅ Google Cloud Translation API mã `hmn` — dịch sẵn template rồi người bản ngữ duyệt; lưu ý `hmn` = Hmong Daw chữ RPA (chuẩn cộng đồng Lào/Mỹ), độ đọc-được với người Mông Điện Biên cần kiểm chứng | Không tồn tại (đã kiểm MMS — chỉ ASR; FPT.AI/Viettel/Zalo — chỉ giọng Việt; duy nhất 1 đồ án MaryTTS sinh viên Mỹ) → ghi âm sẵn mẫu câu + ghép biến số |

- **Guardrail chung:** không machine-translate "sống" từng bản tin sinh tử; runtime chỉ ghép biến số vào template đã duyệt.
- **Vận hành TTS Thái:** sinh audio 1 lần mỗi (Cảnh báo × ngôn ngữ) trong `worker/`, cache file tĩnh — không sinh theo Hộ, không inference trong API process.
- **License:** `mms-tts-blt` CC-BY-NC 4.0 → hợp lệ bài thi, không dùng được khi thương mại hóa; ghi `docs/compliance/oss-register.yaml` (cùng việc dùng Google Translation API nếu có ràng buộc điều khoản).
- **Hướng dài hạn:** fine-tune VITS/MMS tiếng Mông trên audio **VOV4** (đài tiếng dân tộc, phát 11 thứ tiếng gồm Mông) — vừa nguồn dữ liệu huấn luyện, vừa kênh phát bổ sung. Điểm cộng "AI roadmap" khi trình bày.

## 5. Bối cảnh cạnh tranh (digest nghiên cứu 2026-07-17)

- **Hệ thống nhà nước VN:** VNDMS/app PCTT (VNDMA), bản tin NCHMF, blast Zalo/SMS quy mô quốc gia (Yagi 2024: ~65M SMS + 67M tin Zalo), loa xã + huy động thôn bản. Pilot CBEWS đào tạo dân nhận biết dấu hiệu sạt lở (Hà Giang, Yên Bái, Sơn La), chương trình lũ quét/sạt lở 2025–2035 có phủ Điện Biên. Khoảng trống: tiếng Việt-only, độ hạt tỉnh/huyện, diễn đạt hiện tượng, chưa thấy nội dung tiếng dân tộc (chưa xác minh được chiều ngược lại).
- **Quốc tế:** CAP (ITU X.1303) là chuẩn "ổ cắm chung" — kiến trúc nên phát cảnh báo theo schema tương thích CAP để ăn điểm chuẩn hóa. Google Flood Hub: free, AI, một loại rủi ro, không dịch hành động, không last-mile. Ignitia (Tây Phi): SMS forecast theo GPS cho nông hộ ít chữ — bán "độ chính xác". Viamo 3-2-1: IVR/SMS voice-first cho người ít chữ — không AI tiếng thiểu số.
- **Vị thế WeatherBridge trước giám khảo:** chưa hệ thống nào tìm thấy ghép đủ 3 lớp — (1) bản tin *hành động* chuẩn IBF, (2) TTS/ngôn ngữ bản địa, (3) chuỗi relay con người có nhật ký trách nhiệm. Analogue gần nhất là chính CBEWS của VN — thiếu cả (1) lẫn (2). Human relay qua trưởng bản là pattern có bằng chứng quốc tế, không phải ý tưởng lạ cần bảo vệ.

## 6. Ghi chú triển khai cho kiến trúc (không phải yêu cầu PRD)

- Pipeline gợi ý: `worker/` chạy chu kỳ ingest + đánh giá ngưỡng (FR-1, FR-4) — đúng ranh giới repo (worker độc lập, không chạy trong API process). `be/src/ai/` giữ contract LLM sinh bản tin + validator số liệu (FR-5). `fe/` PWA 2 vai.
- Kênh dạng adapter (FR-17): interface `AlertChannel.send(alert, household)` — web push, Zalo OA, SMS, (giai đoạn 2: loa xã qua file audio).
- Audio TTS sinh 1 lần mỗi (Cảnh báo × ngôn ngữ), cache tĩnh — không sinh theo từng Hộ.
- Demo scenario (FR-7) nên là fixture JSON bơm vào cùng schema chuẩn hóa của FR-1 → toàn pipeline hạ nguồn không phân biệt thật/giả ngoài cờ "DIỄN TẬP".
