---
title: "PRD — WeatherBridge AI: Cảnh báo thời tiết & thiên tai cho Điện Biên"
status: draft
created: 2026-07-17
updated: 2026-07-17
---

# PRD: WeatherBridge AI — Cảnh báo thời tiết & thiên tai cho Điện Biên

*Tên làm việc — sản phẩm dự thi VAIC 2026.*

> **Tagline:** "Không đẩy con số — đẩy hành động: LÀM GÌ, TRƯỚC KHI NÀO."

## 0. Mục đích tài liệu

PRD này dành cho đội dự thi VAIC 2026 (dev, kiến trúc, người làm deck) và là đầu vào cho tài liệu kiến trúc + epics/stories. Tài liệu xây trên kết quả phiên brainstorm 2026-07-17 (`docs/brainstorming/brainstorm-weather-forecasting-dien-bien-2026-07-17/`) — không lặp lại toàn bộ mà chưng cất thành yêu cầu. Thuật ngữ neo ở §3 Glossary; tính năng nhóm theo cụm với FR đánh số toàn cục; chỗ suy luận chưa xác nhận gắn `[ASSUMPTION]` và gom ở §12.

## 1. Tầm nhìn

Điện Biên là tỉnh miền núi địa hình chia cắt mạnh, trạm đo thưa, thường xuyên chịu sương muối, rét hại, lũ quét, sạt lở, sương mù đèo. Bản tin thời tiết cấp tỉnh tới muộn, chung chung, đầy số liệu, và khó hiểu với người mù chữ, người già, đồng bào dân tộc thiểu số. Hậu quả: người dân không kịp — hoặc không biết cách — hành động (thảm họa rét 2008 làm chết hàng loạt gia súc, hỏng mạ non là vết sẹo còn nguyên).

**WeatherBridge AI** dịch dự báo thành hành động. Mỗi cảnh báo là một *quyết định nhị phân trước một hạn chót*: người dân không cần biết chính xác bao nhiêu độ — họ cần biết **"làm X trước Y giờ"**. AI đọc dữ liệu dự báo đa nguồn, đối chiếu ngưỡng theo từng Bản, và sinh Bản tin 4 phần cá nhân hóa (chuyện gì — nguy hiểm cỡ nào — làm gì — trước khi nào), phát đa kênh kèm giọng đọc tiếng Mông/Thái.

Điểm ăn tiền không nằm ở API thời tiết — nằm ở **Tầng con người**: với hộ yếu thế không chạm được kênh số, hệ thống giao việc "đến nhắc tận nơi" cho trưởng bản, thu xác nhận, tự ghi Nhật ký trách nhiệm và leo thang khi chưa ai xác nhận. Sản phẩm biến dữ liệu thành hành động *có người chịu trách nhiệm ở chặng cuối* — điều chưa wrapper thời tiết nào làm.

**Vì sao bây giờ / vì sao chưa ai làm:** hệ thống hiện có ở Việt Nam (VNDMS/app PCTT, blast Zalo–SMS cấp quốc gia, loa xã) phát bằng tiếng Việt, độ hạt tỉnh/huyện, và diễn đạt *hiện tượng* chứ không phải *hành động*; các pilot cảnh báo cộng đồng (CBEWS) ở miền núi phía Bắc có tầng con người nhưng không có AI dịch hành động lẫn tiếng bản địa. WeatherBridge đúng khung **impact-based forecasting** mà WMO (No. 1150) xác nhận là mảng yếu nhất toàn cầu, giữa lộ trình "Early Warnings for All 2027" — thời điểm và khoảng trống đều thật (chi tiết bối cảnh cạnh tranh: `addendum.md`).

## 2. Người dùng mục tiêu

### 2.1 Jobs To Be Done

Mọi job chung một khuôn: **một quyết định nhị phân trước một hạn chót.**

- **Nông dân**: Đêm nay có sương muối không → đốt lửa/phủ bạt cứu mạ. Có đủ 3 ngày nắng để gặt + phơi thóc không. Tuần này xuống giống được chưa.
- **Hộ chăn nuôi**: Đêm nay rét hại mấy độ → lùa trâu bò/dê về chuồng, đốt sưởi.
- **Cán bộ xã / Trưởng bản**: Tối nay có phải bật loa/gõ kẻng sơ tán bản nào, nói câu gì để dân làm theo. Cần bằng chứng đã cảnh báo (mấy giờ, ai nhận) để báo cáo. Nỗi lo gốc: *đừng để bản mình có người chết mà không được báo trước.*
- **Tài xế**: Sáng mai đèo Pha Đin có sương mù dày/sạt lở không → đi/hoãn/đổi đường.
- **Phụ huynh / giáo viên**: Sáng mai suối lũ/cầu tràn ngập không → cho con đi học hay nghỉ.
- **Người già không đọc chữ**: Sắp có gì nguy hiểm → cần được báo bằng tiếng của họ, bằng giọng nói/hình ảnh.
- **Hộ vùng lũ quét/sạt lở**: Nhà tôi có trong vùng sắp sạt không, khi nào phải chạy, chạy đi đâu.

### 2.2 Không phục vụ (v1)

- Nhóm buôn bán / du lịch (đã chốt ngoài scope).
- Cơ quan khí tượng chuyên nghiệp — sản phẩm tiêu thụ dự báo, không sản xuất dự báo gốc.

### 2.3 Hành trình người dùng chính

- **UJ-1. Chị Mảy cứu đàn trâu trước đêm sương muối.**
  Chị Sùng Thị Mảy, người Mông ở Tủa Chùa (~1.400m), nuôi 4 con trâu — tài sản lớn nhất nhà. 15h chiều, điện thoại rung: thẻ cảnh báo màu cam trên app, icon bông tuyết, chữ to *"Đêm nay rét 2°C, sương muối. Lùa trâu về chuồng, che bạt, đốt sưởi. Xong trước 18h."* Chị bấm nút loa — máy đọc to nguyên câu bằng **tiếng Mông**. Chị kéo xuống xem lớp số liệu (nhiệt độ từng giờ, đúng là xuống 2°C lúc 3h sáng) — tin. Chị lùa trâu về, che chuồng, bấm **"Tôi đã làm"**. Đồng hồ đếm ngược trên thẻ tắt. **Edge case:** nếu 18h chị chưa bấm xác nhận, hệ thống nhắc lại lần hai bằng âm lượng lớn hơn và đưa hộ chị vào danh sách theo dõi của Trưởng bản.

- **UJ-2. Anh Toản đi nhắc bốn hộ trước cảnh báo đỏ lũ quét.**
  Anh Lò Văn Toản, trưởng bản người Thái ở Mường Nhé. 19h, app chuyển chế độ Cán bộ, phát **âm thanh đỏ** không thể phớt lờ: cảnh báo mức **"Đi ngay"** — mưa cực lớn thượng nguồn, nguy cơ lũ quét trước 23h. Màn hình hiện **danh sách 4 hộ cần đến tận nơi** (từ Sổ hộ dễ tổn thương anh khai báo đầu mùa: 2 hộ người già neo đơn, 1 hộ không có điện thoại, 1 hộ sát khe suối). Anh đi từng nhà, nhắc bằng tiếng Thái, mỗi nhà xong bấm **"Đã đến nhắc"**. Nhà thứ tư không có người — anh bấm "Không gặp", hệ thống lập tức **leo thang** lên cán bộ xã kèm vị trí hộ. Sáng hôm sau, anh xuất **Nhật ký trách nhiệm** (phát cảnh báo 19h02, 3 hộ đã nhắc trước 20h30, 1 hộ leo thang 20h41) gửi báo cáo xã — không ai chết mà "không được báo trước".

- **UJ-3.** Bác Quàng Văn Pó, tài xế xe tải tuyến Hà Nội – Điện Biên, mở app lúc 5h sáng ở Tuần Giáo: thẻ vàng *"Sương mù dày trên đèo Pha Đin tới 9h. Hoãn qua đèo tới sau 9h."* — bác uống thêm chén trà, đi muộn 2 tiếng, an toàn. *(Hành trình nhẹ — một dòng đủ.)*

## 3. Glossary

- **Địa điểm dự báo** — điểm địa lý có dữ liệu dự báo 3–7 ngày (MVP: 5 điểm, §4.1). Một Địa điểm dự báo phủ một hoặc nhiều Bản.
- **Bản** — đơn vị dân cư nhỏ nhất hệ thống phân vùng; mang thuộc tính độ cao, hướng dốc, loại rủi ro. Mỗi Hộ thuộc đúng một Bản.
- **Hộ** — đơn vị nhận cảnh báo; có nghề chính (nông dân/chăn nuôi/…) để cá nhân hóa.
- **Ngưỡng** — điều kiện định lượng cấu hình theo loại hình thiên tai và Bản; vượt Ngưỡng thì sinh Cảnh báo. MVP: bảng tĩnh, không tự học.
- **Cảnh báo** — sự kiện hệ thống phát khi vượt Ngưỡng, mang Mức, Bản tin 4 phần, Hạn chót, và phạm vi Bản.
- **Mức** — thang 2 nấc: **"Chuẩn bị"** (vàng/cam) và **"Đi ngay"** (đỏ). Mức Đi ngay kích hoạt Âm thanh đỏ và Tầng con người.
- **Bản tin 4 phần** — nội dung một Cảnh báo: (1) chuyện gì, (2) nguy hiểm cỡ nào, (3) làm gì, (4) trước khi nào.
- **Hạn chót** — mốc thời gian phải hoàn thành hành động; nguồn cho đồng hồ đếm ngược.
- **Người dân** — vai người dùng xem thẻ cảnh báo, nghe TTS, bấm "Tôi đã làm".
- **Cán bộ** — vai có hai nấc quyền: **Trưởng bản** (quản Sổ hộ dễ tổn thương của Bản mình, nhận Danh sách đến nhắc, xác nhận) và **Cán bộ xã** (duyệt phát lệnh Cảnh báo sơ tán Mức Đi ngay, nhận leo thang, xem Nhật ký trách nhiệm toàn xã). Nấc nào xuất hiện trong FR thì gọi đúng tên nấc đó.
- **Sổ hộ dễ tổn thương** — danh sách Hộ yếu thế do Cán bộ khai báo thủ công một lần (người già neo đơn, không điện thoại, mù chữ, sát vùng nguy cơ). Không suy đoán tự động.
- **Danh sách đến nhắc** — danh sách Hộ trong Sổ hộ dễ tổn thương thuộc phạm vi một Cảnh báo Mức Đi ngay, cần Cán bộ tới tận nơi.
- **Xác nhận** — hành động bấm nút: Người dân "Tôi đã làm" hoặc Cán bộ "Đã đến nhắc"/"Không gặp".
- **Nhật ký trách nhiệm** — log tự động, bất biến: phát cảnh báo lúc nào, tới ai, ai xác nhận lúc nào, leo thang ra sao; xuất được thành báo cáo.
- **Leo thang (escalation)** — khi thiếu Xác nhận trước mốc quy định, hệ thống đẩy cảnh báo lên nấc trên (Hộ → Trưởng bản → Cán bộ xã).
- **Âm thanh đỏ** — âm báo đặc trưng, không thể phớt lờ, chỉ dùng cho Mức Đi ngay (mô hình Amber Alert).
- **TTS bản địa** — giọng đọc máy tiếng Mông/Thái đọc Bản tin 4 phần.

## 4. Tính năng

### 4.1 Nền dự báo đa điểm

**Mô tả:** Hệ thống lấy dự báo 3–7 ngày từ API mở (Open-Meteo chính, OpenWeatherMap dự phòng) cho **5 Địa điểm dự báo** chọn theo dải độ cao và phủ đủ loại rủi ro: TP. Điện Biên Phủ (~490m — mưa lớn/ngập, baseline), Mường Lay (~250m ven sông Đà — lũ, ngập), đèo Pha Đin/Tuần Giáo (~1.500m — sương mù), Tủa Chùa (~1.400m — sương muối/rét hại), Mường Nhé (~600–1.800m — lũ quét/sạt lở). Vượt yêu cầu đề bài ≥3 địa điểm. Dữ liệu chuẩn hóa về một schema nội bộ, cache theo địa điểm.

#### FR-1: Lấy và chuẩn hóa dự báo
Hệ thống lấy dự báo 3–7 ngày (nhiệt độ, mưa, độ ẩm, gió, tầm nhìn) cho 5 Địa điểm dự báo, chuẩn hóa về schema nội bộ, cache có TTL.
**Hệ quả (kiểm được):**
- Mỗi Địa điểm dự báo có dữ liệu theo giờ cho ≥72h và theo ngày cho ≥7 ngày.
- Nguồn API lỗi → dùng cache còn hạn và gắn nhãn "dữ liệu cũ lúc HH:MM"; không hiển thị trắng.

#### FR-2: Hiệu chỉnh theo độ cao Bản
Hệ thống nội suy/hiệu chỉnh giá trị dự báo cho từng Bản theo chênh lệch độ cao so với Địa điểm dự báo gần nhất (lapse rate chuẩn). `[ASSUMPTION: hiệu chỉnh tuyến tính theo độ cao là đủ cho MVP; không mô hình vi khí hậu.]`
**Hệ quả (kiểm được):**
- Hai Bản cùng Địa điểm dự báo nhưng lệch ≥300m độ cao cho ra nhiệt độ hiệu chỉnh khác nhau.

### 4.2 Động cơ cảnh báo theo Ngưỡng

**Mô tả:** Trái tim "quyết định": bảng Ngưỡng cấu hình theo loại hình (sương muối, rét hại, mưa lớn, lũ/lũ quét, sạt lở, sương mù) và theo Bản. Vượt Ngưỡng → sinh Cảnh báo với Mức 2 nấc và Hạn chót. Quyết định CÓ/KHÔNG và Mức là **thuần rule** — minh bạch, giải trình được với giám khảo.

#### FR-3: Bảng Ngưỡng cấu hình
Quản trị viên có thể xem/sửa Ngưỡng theo loại hình và Bản (giá trị, Mức tương ứng) không cần deploy lại.
**Hệ quả (kiểm được):**
- Sửa Ngưỡng có hiệu lực ở lần đánh giá kế tiếp (≤ chu kỳ đánh giá, FR-4).

#### FR-4: Sinh Cảnh báo khi vượt Ngưỡng
Hệ thống đánh giá dự báo đã hiệu chỉnh với bảng Ngưỡng theo chu kỳ; vượt Ngưỡng → sinh Cảnh báo gắn Mức, phạm vi Bản, và Hạn chót suy từ thời điểm hiện tượng dự kiến. Thực hiện UJ-1, UJ-2.
**Hệ quả (kiểm được):**
- Chu kỳ đánh giá ≤ 60 phút; từ lúc dữ liệu vượt Ngưỡng đến lúc phát kênh ≤ 5 phút.
- Cùng hiện tượng đang hiệu lực không sinh Cảnh báo trùng (dedupe theo loại hình + Bản + khung thời gian).
- Hạn chót suy theo công thức cấu hình được: *thời điểm hiện tượng dự kiến bắt đầu − thời gian cần để hành động theo loại hình* (bảng thời-gian-hành-động nằm cạnh bảng Ngưỡng).
- **Cổng duyệt con người:** Cảnh báo Mức Đi ngay thuộc nhóm sơ tán (lũ quét, sạt lở) sinh ra ở trạng thái "chờ phát lệnh" và chỉ phát sau khi Cán bộ xã duyệt một chạm; các loại hình khác phát tự động. Hệ thống *đề xuất* — con người *phát lệnh*.

#### FR-5: Bản tin 4 phần — hybrid rule + LLM
Với mỗi Cảnh báo, LLM sinh Bản tin 4 phần bằng tiếng Việt đơn giản, cá nhân hóa theo Bản và nghề của Hộ (chăn nuôi nhận "lùa trâu bò", nông dân nhận "che mạ"), dưới guardrail: rule quyết Mức và Hạn chót, LLM chỉ diễn đạt. Thực hiện UJ-1.
**Hệ quả (kiểm được):**
- Output bắt buộc đủ 4 trường; thiếu trường → tự fallback template tĩnh.
- Mọi con số trong Bản tin khớp 100% dữ liệu nguồn (validator so khớp trước khi phát); LLM không được đổi Mức/Hạn chót.
- LLM lỗi/timeout ≤ 10s → phát bản template tĩnh, không giữ Cảnh báo lại.

#### FR-6: Hạn chót & đếm ngược
Mỗi Cảnh báo hiển thị đồng hồ đếm ngược tới Hạn chót trên thẻ (mô hình Grab-ETA).
**Hệ quả (kiểm được):**
- Đếm ngược nhất quán giữa các kênh hiển thị; quá Hạn chót thẻ chuyển trạng thái "đã quá hạn".

#### FR-7: Kích hoạt kịch bản demo/diễn tập
Quản trị viên có thể bơm dữ liệu thời tiết giả định (scenario) để kích hoạt trọn pipeline cảnh báo trong demo và diễn tập, gắn nhãn "DIỄN TẬP" xuyên suốt.
**Hệ quả (kiểm được):**
- Scenario sương muối Tủa Chùa kích hoạt được chuỗi FR-4 → FR-5 → kênh → Tầng con người không cần chờ thời tiết thật.
- Nhật ký trách nhiệm ghi rõ cờ diễn tập, không lẫn sự kiện thật.

**Notes:** kịch bản hero cho pitch là **sương muối/rét hại** — loại hình dự báo được tốt bằng nguồn dữ liệu hiện có; lũ quét chỉ demo dạng diễn tập có nhãn, tuyệt đối không tuyên bố "dự báo được lũ quét" (giới hạn năng lực nguồn dữ liệu, xem addendum §3).

#### FR-24: Bộ eval bản tin tự động

Hệ thống có bộ eval chạy được bằng một lệnh: golden set kịch bản thời tiết (theo 5 địa điểm × các loại hình) → sinh Bản tin → chấm tự động bằng validator (đủ 4 trường, số khớp nguồn, đúng Mức/Hạn chót do rule quyết) + LLM-as-judge (dễ hiểu, đúng nghề, không thêm thắt). Đây là bằng chứng grounding trình được cho giám khảo.

**Hệ quả (kiểm được):**
- Đổi prompt/template phải chạy eval và đạt ngưỡng đậu trước khi merge.
- Báo cáo eval xuất được (bảng đậu/rớt theo kịch bản) để đính kèm bài nộp.

### 4.3 Phân vùng & cá nhân hóa theo Bản

**Mô tả:** Cảnh báo phát theo **Bản**, không phát cả tỉnh (mô hình phân vùng của cảnh báo cháy rừng). Mỗi Bản có hồ sơ độ cao, hướng dốc, loại rủi ro; mỗi Hộ đăng ký thuộc Bản nào, nghề gì.

#### FR-8: Hồ sơ Bản
Quản trị viên/Cán bộ có thể tạo và sửa hồ sơ Bản (tên, tọa độ, độ cao, hướng dốc, loại rủi ro, Địa điểm dự báo gắn kèm, **điểm sơ tán an toàn**).
**Hệ quả (kiểm được):**
- Bản không nằm trong vùng rủi ro lũ quét thì không nhận Cảnh báo lũ quét.
- Bản tin sơ tán (lũ quét/sạt lở) phải chứa điểm sơ tán của Bản — trả lời trọn JTBD "khi nào phải chạy, **chạy đi đâu**".

**Notes:** *hướng dốc* là trường dự trữ cho giai đoạn 2 (sương muối lệch theo hướng phơi nắng) — MVP lưu nhưng chưa tiêu thụ trong tính toán.

#### FR-9: Đăng ký Hộ
Người dân (hoặc Cán bộ thay mặt) đăng ký Hộ: thuộc Bản nào, nghề chính, kênh nhận. Thực hiện UJ-1.
**Hệ quả (kiểm được):**
- Hộ chỉ nhận Cảnh báo có phạm vi chứa Bản của mình.
- Bản tin cá nhân hóa đúng nghề (hộ chăn nuôi không nhận câu "che mạ non").

### 4.4 Giao diện Người dân phân lớp (PWA)

**Mô tả:** Một web app PWA mobile-first, hai vai (Người dân / Cán bộ). View Người dân theo **progressive disclosure**: trên cùng là thẻ màu + icon + câu hành động chữ to; kéo xuống là lớp số liệu đầy đủ (nhiệt độ, mm mưa, %, biểu đồ giờ) để tăng độ tin cậy — *giữ số liệu, không bỏ* (quyết định đã chốt ở brainstorm). Nguyên tắc xuyên suốt cho người không đọc chữ: **âm thanh và màu thay cho thang số** — màu theo Mức, icon hiện tượng, giọng nói bản địa; con số chỉ nằm ở lớp dưới cho người cần kiểm chứng. Thực hiện UJ-1, UJ-3.

#### FR-10: Thẻ cảnh báo hành động
Người dân thấy thẻ Cảnh báo: màu theo Mức, icon hiện tượng, câu "làm gì" + "trước khi nào" chữ to, đếm ngược (FR-6).
**Hệ quả (kiểm được):**
- Thẻ đọc được không cần cuộn trên màn hình 360px; câu hành động ≤ 2 dòng.
- Không có Cảnh báo hiệu lực → hiển thị trạng thái "an toàn" + dự báo thường.

#### FR-11: Lớp số liệu chi tiết
Từ thẻ, Người dân mở được lớp số liệu: giá trị dự báo theo giờ/ngày đã phân tích, nguồn dữ liệu, thời điểm cập nhật.
**Hệ quả (kiểm được):**
- Số liệu ở lớp chi tiết khớp số trong Bản tin (cùng nguồn với validator FR-5).

#### FR-12: Xem dự báo 3–7 ngày theo địa điểm
Người dân chọn 1 trong 5 Địa điểm dự báo và xem dự báo 3–7 ngày dạng đơn giản (đáp ứng trực tiếp yêu cầu tối thiểu đề bài).
**Hệ quả (kiểm được):**
- Cả 5 địa điểm truy cập được; mỗi địa điểm hiển thị đủ 7 ngày.

#### FR-13: Xác nhận "Tôi đã làm"
Người dân bấm xác nhận đã hành động; trạng thái này nuôi vòng Leo thang (FR-18). Thực hiện UJ-1.
**Hệ quả (kiểm được):**
- Xác nhận ghi vào Nhật ký trách nhiệm kèm timestamp và định danh Hộ.
- Sau Xác nhận, thẻ chuyển trạng thái "đã hành động" (đếm ngược tắt) nhưng vẫn xem lại được tới khi Cảnh báo hết hiệu lực.

### 4.5 Đa kênh & tiếng bản địa

**Mô tả:** Cảnh báo đẩy chủ động (flow Hệ thống → Dân). Kênh **chạy thật trong demo**: web push + TTS phát trong app (mô phỏng loa bản). Zalo OA và SMS gateway là mục tiêu thêm nếu kịp đăng ký/tích hợp. `[ASSUMPTION: Zalo OA và SMS là best-effort, không chặn demo — user chọn cả 3 kênh nhưng ưu tiên suy luận từ tính khả thi.]`

#### FR-14: Web push
Hệ thống đẩy push notification tới Hộ trong phạm vi Cảnh báo ngay khi phát.
**Hệ quả (kiểm được):**
- Push đến thiết bị đã đăng ký ≤ 1 phút sau khi Cảnh báo phát; bấm push mở đúng thẻ.

#### FR-15: TTS bản địa
Người dân bấm nút loa trên thẻ để nghe Bản tin 4 phần bằng tiếng Mông hoặc Thái (theo cài đặt Hộ), và đọc được bản chữ tiếng bản địa; Mức Đi ngay tự phát âm thanh khi mở app. Thực hiện UJ-1. Pipeline mỗi ngôn ngữ khác nhau (chi tiết `addendum.md` §4):
- **Thái (Tai Dam):** template do người bản ngữ dịch → TTS `facebook/mms-tts-blt` **self-host** trong worker (model mở 36M, chạy CPU, không có API của Meta), audio cache theo bản tin. License CC-BY-NC 4.0 — hợp bài thi, ghi oss-register.
- **Mông:** bản chữ dịch qua **Google Cloud Translation API (`hmn`)** ở dạng template dịch-sẵn có người bản ngữ duyệt (không machine-translate sống từng bản tin); giọng nói = ghi âm sẵn mẫu câu + ghép biến số (chưa tồn tại TTS Mông sản xuất được).
`[ASSUMPTION: chữ Hmong Daw/RPA của Google đọc được với người Mông Điện Biên biết chữ — cần người bản ngữ kiểm chứng.]` `[ASSUMPTION: bộ ghi âm mẫu câu tiếng Mông đủ cho demo.]`
**Guardrail:** mọi bản dịch template phải được người bản ngữ duyệt trước khi dùng; runtime chỉ ghép biến số (giờ, tên Bản, giá trị) — không dịch máy trực tiếp nội dung cảnh báo sinh tử.
**Hệ quả (kiểm được):**
- Mỗi Cảnh báo có audio tương ứng ngôn ngữ Hộ đã chọn; audio phát offline được nếu đã tải về.

#### FR-16: Âm thanh đỏ
Cảnh báo Mức Đi ngay phát âm báo đặc trưng, khác biệt mọi âm khác, kèm rung dài (mô hình Amber Alert). Thực hiện UJ-2.
**Hệ quả (kiểm được):**
- Âm thanh đỏ chỉ gắn với Mức Đi ngay; Mức Chuẩn bị dùng âm thường.

#### FR-17: Kênh Zalo OA và SMS *(best-effort)*
Hệ thống gửi Bản tin qua Zalo OA và/hoặc SMS cho Hộ đăng ký kênh này; kiến trúc kênh dạng adapter để thêm kênh không sửa lõi.
**Hệ quả (kiểm được):**
- Kênh lỗi/không sẵn sàng không ảnh hưởng kênh khác; trạng thái gửi từng kênh ghi vào Nhật ký trách nhiệm.

### 4.6 Tầng con người & trách nhiệm

**Mô tả:** Lớp giá trị khác biệt. Ba mũ trên một cơ chế: cứu hộ yếu thế (last-mile relay), bằng chứng trách nhiệm cho Cán bộ, và Leo thang khi im lặng. Thực hiện UJ-2.

#### FR-18: Vòng Leo thang
Cảnh báo Mức Đi ngay chưa có Xác nhận của Hộ sau X phút → nhắc lại; sau Y phút → đẩy Hộ vào diện theo dõi của Trưởng bản; Hộ trong Sổ hộ dễ tổn thương chưa được "Đã đến nhắc" trước mốc Z → leo lên Cán bộ xã. `[ASSUMPTION: X=15, Y=30 phút, Z = Hạn chót − 60 phút cho MVP — cấu hình được.]`
**Hệ quả (kiểm được):**
- Mỗi nấc leo thang ghi Nhật ký trách nhiệm kèm timestamp; "Không gặp" của Cán bộ leo ngay lập tức, không chờ hết mốc.

#### FR-19: Sổ hộ dễ tổn thương
Cán bộ khai báo một lần danh sách Hộ yếu thế trong Bản mình (lý do: già neo đơn / không điện thoại / mù chữ / sát vùng nguy cơ), sửa được khi biến động. Không suy đoán tự động.
**Hệ quả (kiểm được):**
- Chỉ Cán bộ đúng Bản (và cấp trên) xem/sửa được sổ của Bản đó.

#### FR-20: Danh sách đến nhắc
Khi Cảnh báo Mức Đi ngay phủ một Bản, Trưởng bản Bản đó nhận Danh sách đến nhắc: các Hộ trong Sổ hộ dễ tổn thương thuộc phạm vi, kèm lý do và chỉ dẫn vị trí.
**Hệ quả (kiểm được):**
- Danh sách xuất hiện ≤ 1 phút sau khi Cảnh báo phát; Hộ ngoài phạm vi không xuất hiện.
- Mỗi Hộ trong danh sách kèm **câu nhắc mẫu** sinh từ Bản tin 4 phần — đóng JTBD của cán bộ "*nói câu gì* để dân làm theo".

#### FR-21: Nút "Đã đến nhắc" / "Không gặp"
Cán bộ xác nhận từng Hộ trong Danh sách đến nhắc; "Không gặp" kích hoạt leo thang tức thì (FR-18).
**Hệ quả (kiểm được):**
- Trạng thái từng Hộ (chưa đi / đã nhắc / không gặp / đã leo thang) nhìn thấy realtime trên view Cán bộ xã.

#### FR-22: Nhật ký trách nhiệm & xuất báo cáo
Hệ thống tự ghi log bất biến mọi sự kiện (phát, gửi kênh, Xác nhận, leo thang) và cho Cán bộ xuất báo cáo theo Cảnh báo hoặc theo khoảng thời gian.
**Hệ quả (kiểm được):**
- Log chỉ ghi thêm (append-only), không sửa/xóa qua UI; báo cáo xuất được (PDF/print view) trả lời đủ: cảnh báo lúc nào, ai nhận, ai nhắc, lúc nào.

### 4.7 Vai, đăng nhập & quản trị

#### FR-23: Vai và xác thực
Hệ thống có 3 vai: Người dân (không bắt buộc đăng nhập ngoài định danh Hộ), Cán bộ (đăng nhập), Quản trị viên (đăng nhập). Trong phạm vi 36h, chấp nhận cơ chế role-switch + mật khẩu đơn giản thay cho hệ thống tài khoản đầy đủ; token (nếu có) không lưu trong `localStorage` (chuẩn repo — cookie httpOnly).
**Hệ quả (kiểm được):**
- View Cán bộ/Quản trị không truy cập được khi chưa xác thực; API kiểm quyền theo Bản.

## 5. Non-Goals (tường minh)

- **Không** tích hợp loa phát thanh bản vật lý trong MVP — TTS phát trong app mô phỏng loa; nối hệ truyền thanh xã thật (qua file audio) → giai đoạn 2.
- **Không** làm cell broadcast kiểu J-Alert — lệ thuộc nhà mạng.
- **Không** suy đoán tự động hộ dễ tổn thương — MVP dùng khai báo thủ công (phương án A đã chốt).
- **Không** phục vụ nhóm buôn bán/du lịch.
- **Không** sản xuất dự báo khí tượng gốc hay thay thế hệ thống PCTT chính thống — WeatherBridge là lớp "dịch và giao hành động" bổ trợ.
- **Không** chạy training/GPU inference trong tiến trình API (chuẩn repo).
- **Không** tự học chỉnh Ngưỡng, không pha "trong & sau" lũ nhiều đợt, không lịch mùa vụ/chợ phiên — dời giai đoạn sau (§9).

## 6. Phạm vi MVP

### 6.1 Trong phạm vi

- Mục tiêu phủ 5 cụm brainstorm A–E theo thứ tự ưu tiên §6.3 — tier Must là cam kết, Should/Could cắt dần theo giờ còn lại: Bản tin 4 phần (FR-5), phân vùng/cá nhân hóa theo Bản (FR-2, 8, 9), giao diện phân lớp (FR-10–13), đa kênh + TTS + âm thanh đỏ + đếm ngược (FR-6, 14–17), Tầng con người + Nhật ký trách nhiệm + Leo thang (FR-18–22), eval bản tin (FR-24).
- Dự báo 3–7 ngày cho 5 địa điểm (FR-1, 12); Ngưỡng cấu hình tĩnh (FR-3, 4); kịch bản diễn tập cho demo (FR-7).
- Tài liệu kiến trúc + deck 1 trang (sản phẩm phụ bắt buộc của đề bài — dàn ý deck đã có ở `docs/brainstorming/.../deck-1page-outline.md`).

### 6.2 Ngoài phạm vi MVP

- **Cụm F** — tự học chỉnh Ngưỡng theo lịch sử từng Bản; pha "trong & sau" cho lũ nhiều đợt → giai đoạn 2.
- **Lịch mùa vụ / chợ phiên** ghép cảnh báo → giai đoạn 2.
- **Cụm G — "Cảm biến sống"** (dân báo ngược thực địa) → bonus, chỉ làm nếu dư thời gian, không phải lõi, không được ảnh hưởng flow chính. `[NOTE FOR PM: mục này "emotionally load-bearing" với đội — dễ gây ấn tượng ML data flywheel với giám khảo; cân nhắc 1 slide "tầm nhìn" thay vì code.]`
- **Bản tin cơ hội** (JTBD "đủ 3 ngày nắng để gặt+phơi", "tuần này xuống giống được chưa") — MVP chỉ đáp ứng thụ động qua màn hình dự báo 7 ngày (FR-12); bản tin cơ hội chủ động (engine dò *cửa sổ thuận lợi*, không chỉ ngưỡng nguy hiểm) → giai đoạn 2.
- **Cá nhân hóa tới mảnh nương** — MVP dừng độ hạt ở Bản/Hộ (quyết định thu hẹp so với brainstorm "từng hộ/mảnh nương"); tọa độ mảnh nương → giai đoạn 2.
- Tích hợp trực tiếp dữ liệu trạm KTTV Điện Biên và bản đồ nguy cơ PCTT&TKCN — MVP dùng API mở + ngưỡng tĩnh; dữ liệu địa phương là nguồn nâng cấp giai đoạn 2. `[ASSUMPTION: không xin được quyền truy cập dữ liệu KTTV trong thời gian thi.]`

### 6.3 Thứ tự ưu tiên thực thi trong 36h (6 người)

Cắt scope theo giờ, không theo cụm — mất giờ thì rơi từ dưới lên. Bảng đã kiểm để **không tier nào phụ thuộc tier thấp hơn**:

| Tier | FR | Ghi chú |
|---|---|---|
| **Must** — demo tối thiểu đạt đề bài | FR-1, 3, 4, 5, 7, 9, 10, 11, 12, 13, 14, 23 | Pipeline dữ liệu → ngưỡng → bản tin AI → thẻ → push + xác nhận; Hộ gắn Bản (FR-9) vì FR-5/14 cần đích nhắm; dữ liệu Bản seed bằng fixture của FR-7; FR-23 mức role-switch |
| **Must (ngoài code)** | Tài liệu kiến trúc + deck 1 trang | Sản phẩm phụ bắt buộc của đề bài — giữ giờ riêng, không để rơi vì áp lực code |
| **Should①** — điểm ăn tiền (ĐMST 20đ + An toàn 15đ) | FR-18, 19, 20, 21, 22, 24 | Tầng con người trọn bộ (leo thang FR-18 là mũ thứ ba, đi cùng gói) + eval bản tin |
| **Should②** — cá nhân hóa + tiếng bản địa | FR-2, 8, 15 | Hiệu chỉnh độ cao; hồ sơ Bản đầy đủ (điểm sơ tán); TTS Thái + chữ/audio Mông |
| **Could** — tăng ấn tượng nếu dư giờ | FR-6, 16, 17 | Đếm ngược, âm thanh đỏ, Zalo/SMS |

`[ASSUMPTION: xếp Tầng con người (Should①) trước cá nhân hóa (Should②) vì tiêu chí Đổi mới sáng tạo + An toàn AI cộng lại 35đ nghiêng về relay có trách nhiệm; đội xác nhận lại khi phân công.]`

## 7. Chỉ số thành công

**Chính**
- **SM-1 — Lead time hành động:** Cảnh báo phát trước Hạn chót ≥ 6h với hiện tượng dự báo được (sương muối, rét hại, mưa lớn). Kiểm chứng FR-4, FR-5. `[ASSUMPTION: 6h đủ để đốt lửa/lùa gia súc/sơ tán hộ gần; xác nhận với thực tế địa phương.]`
- **SM-2 — Khép vòng hộ yếu thế:** 100% Hộ trong Sổ hộ dễ tổn thương thuộc phạm vi Cảnh báo Đi ngay có trạng thái "Đã đến nhắc" hoặc đã leo thang trước Hạn chót (trong kịch bản diễn tập demo). Kiểm chứng FR-18–22.
- **SM-3 — Hiểu-là-làm-được:** Người thử nghiệm lần đầu nhìn thẻ nêu đúng "làm gì, trước khi nào" trong ≤ 10 giây, ≥ 9/10 người. Kiểm chứng FR-5, FR-10.

**Phụ**
- **SM-4 — Đạt đề bài:** 100% yêu cầu tối thiểu VAIC được demo trực tiếp (bảng ánh xạ §10). Kiểm chứng FR-1, 3, 4, 10, 12.
- **SM-5 — Độ tin của lớp số liệu:** Người thử nghiệm đánh giá "tin cảnh báo này" ≥ 4/5 sau khi mở lớp số liệu. Kiểm chứng FR-11.

**Counter-metrics (không được tối ưu)**
- **SM-C1 — Tỉ lệ cảnh báo Đi ngay sai:** không hạ Ngưỡng bừa để "trông nhạy" — cảnh báo đỏ sai lặp lại giết lòng tin và gây alert fatigue; mọi thay đổi Ngưỡng phải có căn cứ. Ngưỡng theo dõi: 0 trong demo; pilot ≤ 1 cảnh báo đỏ sai/mùa. Đối trọng SM-1, SM-2.
- **SM-C2 — Số bản tin/Hộ/tuần:** không spam; Hộ nhận quá nhiều bản tin Mức Chuẩn bị sẽ tắt thông báo. Ngưỡng theo dõi: ≤ 3 bản tin Chuẩn bị/Hộ/tuần trong pilot. Đối trọng SM-3.

## 8. Ràng buộc & Guardrails

**An toàn (cảnh báo sinh tử)**
- Quyết định CÓ/KHÔNG, Mức, Hạn chót: chỉ rule — LLM không được quyết, không được đổi (FR-5).
- Mọi con số phát ra khớp nguồn 100%; guardrail validator chặn trước khi phát.
- Hệ thống "fail-loud": nguồn dữ liệu chết → hiển thị "dữ liệu cũ", không im lặng như bình thường.

**Riêng tư (Sổ hộ dễ tổn thương = dữ liệu cá nhân nhạy cảm)**
- Demo và repo chỉ dùng dữ liệu hư cấu — không tên thật, không tọa độ nhà thật (chuẩn repo: không personal data trong Git).
- Truy cập sổ theo Bản, chỉ vai Cán bộ; log truy cập. Ngoài demo, cần cơ sở pháp lý trước khi thu dữ liệu thật (Nghị định 13/2023 về bảo vệ dữ liệu cá nhân). `[NOTE FOR PM: nếu sản phẩm đi tiếp sau thi, mục này thành phần compliance riêng.]`

**Ràng buộc thi đấu**
- Đội 6 thành viên, build trong **36 giờ** — scope thực thi cắt theo thứ tự ưu tiên §6.3; mọi FR ngoài nhóm Must phải degrade được (bỏ mà demo vẫn chạy).
- Vòng 1 là **AI sơ loại tự động** → tài liệu nộp (PRD, kiến trúc, deck) phải tự giải thích, cấu trúc rõ, không dựa vào thuyết trình miệng.
- Demo Day: pitch 4 phút + Q&A 2 phút → kịch bản demo (FR-7) phải chạy trọn một chuỗi cảnh báo trong < 2 phút.

**Chi phí & license**
- Nguồn dữ liệu ưu tiên free tier (Open-Meteo không cần key); LLM chỉ gọi lúc sinh Bản tin (ít, ngắn); TTS cache audio theo bản tin — chi phí demo ~0.
- Model TTS Tai Dam (`facebook/mms-tts-blt`) license **CC-BY-NC 4.0** — hợp lệ cho bài thi, **không** dùng được nếu thương mại hóa sau này; ghi vào `docs/compliance/oss-register.yaml` cùng mọi model/dataset dùng đến (chuẩn repo).

## 9. Lộ trình & tính khả thi kinh doanh

### 9.1 Lộ trình sản phẩm

1. **MVP (dự thi, 36h)** — §4 theo thứ tự ưu tiên §6.3; demo bằng kịch bản diễn tập (FR-7) trên 5 địa điểm.
2. **Giai đoạn 2 (sau thi)** — cụm F: tự học chỉnh Ngưỡng theo lịch sử Bản, pha "trong & sau" lũ nhiều đợt; ghép lịch mùa vụ/chợ phiên; tích hợp dữ liệu trạm KTTV + bản đồ nguy cơ PCTT&TKCN.
3. **Mở rộng** — "cảm biến sống": dân báo ngược thực địa, bù trạm đo thưa và tạo nhãn cho ML (data flywheel).

### 9.2 Lộ trình Pilot & mô hình kinh doanh *(tiêu chí chấm 20đ)*

**Khách hàng trả tiền là chính quyền, không phải người dân** — mô hình B2G. `[ASSUMPTION: toàn mục 9.2 là đề xuất của đội, chưa kiểm chứng với bên mua.]`

- **Người mua mục tiêu:** UBND tỉnh / Ban Chỉ huy PCTT&TKCN Điện Biên. Nguồn ngân sách bám được: chương trình quốc gia phòng chống lũ quét – sạt lở **2025–2035** (có phủ Điện Biên) và các dự án CBEWS do NGO tài trợ (UNICEF/IFRC đang chạy kênh Zalo tương tự) — WeatherBridge là lớp phần mềm giúp các chương trình này đạt KPI "cảnh báo đến tận hộ".
- **Pilot đề xuất (6 tháng):** 1 xã nguy cơ cao ở Mường Nhé, phủ 1 mùa mưa lũ + 1 đợt rét; đo SM-1 (lead time), SM-2 (khép vòng hộ yếu thế) và SM-C1 (cảnh báo sai) trên sự kiện thật; trưởng bản dùng thật Sổ hộ + nút xác nhận. Kết quả pilot = bằng chứng bán hàng cho nhân rộng cấp tỉnh.
- **Nhân rộng:** Điện Biên (129 xã) → các tỉnh Tây Bắc cùng hồ sơ rủi ro (Lai Châu, Sơn La, Hà Giang). Chi phí biên thấp: thêm tỉnh = thêm địa điểm dự báo + bảng ngưỡng + hồ sơ Bản, không đổi lõi.
- **Chi phí vận hành thấp có chủ đích:** dữ liệu API mở miễn phí, LLM chỉ gọi lúc sinh bản tin, TTS self-host CPU — phù hợp ngân sách xã/tỉnh.
- **Điều kiện thương mại hóa:** thay/li-xăng lại TTS Thái (CC-BY-NC) — đường thay thế đã xác định (fine-tune từ VOV4, §addendum); tuân thủ Nghị định 13/2023 khi thu dữ liệu hộ thật (§8).

## 10. Ánh xạ yêu cầu & tiêu chí chấm VAIC 2026

**Yêu cầu tối thiểu:**

| Yêu cầu đề bài | Đáp ứng bởi |
|---|---|
| Forecast 3–7 ngày cho ≥3 địa điểm | FR-1, FR-12 (5 địa điểm) |
| Cảnh báo theo ngưỡng | FR-3, FR-4 |
| Giao diện đơn giản | FR-10 (thẻ hành động), SM-3 |
| Tài liệu kiến trúc + deck 1 trang | §6.1; dàn ý deck có sẵn trong brainstorm |

**Sáu tiêu chí chấm (100đ) — PRD trả lời ở đâu:**

| Tiêu chí | Điểm | Nơi trả lời |
|---|---|---|
| Chất lượng triển khai kỹ thuật | 20 | §4 FRs có hệ quả kiểm được; NFR fail-loud (§8); pipeline demo FR-7 |
| Kiến trúc AI-Native & Đổi mới sáng tạo | 20 | Hybrid rule+LLM (FR-5); Tầng con người (§4.6) — chưa hệ thống nào ghép đủ 3 lớp (§1); tài liệu kiến trúc (hạ nguồn) |
| Tính khả thi kinh doanh & Lộ trình Pilot | 20 | §9.2 — B2G, pilot Mường Nhé 6 tháng, đường nhân rộng Tây Bắc |
| UX AI-Native & Tư duy thiết kế | 15 | Progressive disclosure (§4.4); Bản tin 4 phần cá nhân hóa; SM-3 "hiểu-là-làm-được ≤10s"; TTS bản địa |
| An toàn AI, Grounding & Độ tin cậy | 15 | §8 guardrails: rule quyết — LLM chỉ diễn đạt, validator số khớp nguồn 100%, fallback template, không MT sống, counter-metrics chống alert fatigue |
| Trình bày & Bảo vệ giải pháp | 10 | Deck 1 trang (dàn ý sẵn); kịch bản demo <2' (§8); Nhật ký trách nhiệm làm bằng chứng "câu chuyện" UJ-2 |

## 11. Câu hỏi mở

1. **Tiếng bản địa** *(đã gỡ chặn cho bài thi)*: trong phạm vi thi, bản dịch template Mông/Thái **được coi như đã kiểm duyệt** `[ASSUMPTION: xác nhận người bản ngữ dời sang giai đoạn triển khai thực tế]`. Việc còn treo cho giai đoạn thật: ai duyệt bản dịch, ai ghi âm mẫu câu Mông, độ đọc-được của chữ RPA với người Mông Điện Biên.
2. ~~Deadline & tiêu chí chấm~~ **Đã trả lời**: 3 vòng (AI sơ loại → giám khảo top 30–40 → Demo Day top 10, pitch 4'+Q&A 2'); 6 tiêu chí/100đ — ánh xạ ở §10. Ngày nộp cụ thể vẫn chưa ghi nhận.
3. ~~Cấu trúc đội~~ **Đã trả lời**: 6 thành viên, build 36h — thứ tự ưu tiên thực thi ở §6.3.
4. **Ngưỡng ban đầu lấy từ đâu**: chuẩn ngành KTTV Việt Nam cho sương muối/rét hại/mưa lớn — cần nguồn trích dẫn được cho giám khảo.
5. **Bản đồ nguy cơ sạt lở/lũ quét**: có nguồn công khai nào cho Điện Biên (Viện KHĐC&KS?) đủ dùng cho phân vùng Bản demo?

## 12. Bảng chỉ mục Assumption

- §4.1 FR-2 — hiệu chỉnh tuyến tính theo độ cao đủ cho MVP.
- §4.5 — Zalo OA/SMS là best-effort, không chặn demo; web push + TTS là kênh thật bắt buộc.
- §4.5 FR-15 — chữ Hmong Daw/RPA của Google Translate đọc được với người Mông Điện Biên biết chữ; bộ ghi âm mẫu câu tiếng Mông đủ cho demo (TTS Thái đã xác minh khả dụng, self-host).
- §11.1 — bản dịch template coi như đã kiểm duyệt trong phạm vi bài thi; verify người bản ngữ dời sang triển khai thực tế (quyết định của user 2026-07-17).
- §4.6 FR-18 — mốc leo thang X=15, Y=30 phút, Z=Hạn chót−60 phút.
- §6.2 — không xin được dữ liệu KTTV địa phương trong thời gian thi.
- §7 SM-1 — lead time 6h là đủ cho các hành động chính.
- §6.3 — Tầng con người ưu tiên trước cá nhân hóa trong 36h (căn cứ trọng số tiêu chí chấm); đội xác nhận lại khi phân công.
- §9.2 — toàn bộ mô hình kinh doanh/pilot là đề xuất của đội, chưa kiểm chứng với bên mua.
