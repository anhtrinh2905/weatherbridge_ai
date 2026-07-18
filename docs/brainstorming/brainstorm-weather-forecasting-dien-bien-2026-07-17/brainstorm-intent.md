# Intent: Giải pháp AI dự báo & cảnh báo thời tiết cho Điện Biên

_Nguồn: phiên brainstorm 2026-07-17. Đầu vào cho bmad-product-brief / bmad-prd._

## Bối cảnh & vấn đề

Điện Biên là tỉnh miền núi địa hình chia cắt mạnh, trạm đo thưa, thường xuyên chịu sương muối, rét hại, lũ quét, sạt lở. Bản tin thời tiết cấp tỉnh tới muộn, chung chung, đầy số liệu và khó hiểu với người dân — đặc biệt người mù chữ và người dân tộc thiểu số. Hậu quả là người dân không kịp/không biết cách hành động (ví dụ thảm hoạ rét 2008). Cần một hệ thống dịch dự báo thành hành động cụ thể, đến đúng người, đúng lúc.

## Người dùng & "job" cốt lõi (JTBD)

Mọi job có chung khuôn mẫu: **một quyết định nhị phân trước một mốc thời gian (hạn chót)**.

- **Nông dân**: Đêm nay có sương muối không → đốt lửa/phủ bạt cứu mạ. Có đủ 3 ngày nắng để gặt+phơi thóc không. Tuần này xuống giống được chưa.
- **Hộ chăn nuôi**: Đêm nay rét hại mấy độ → lùa trâu bò/dê về chuồng, đốt sưởi.
- **Cán bộ xã / trưởng bản**: Tối nay có phải bật loa/gõ kẻng sơ tán bản nào, nói câu gì để dân làm theo. Cần bằng chứng đã cảnh báo (mấy giờ, ai nhận) để báo cáo. Nỗi lo gốc: đừng để bản mình có người chết mà không được báo trước.
- **Tài xế**: Sáng mai đèo (Pha Đin) có sương mù dày/sạt lở không → đi/hoãn/đổi đường.
- **Phụ huynh / giáo viên**: Sáng mai suối lũ/cầu tràn ngập không → cho con đi học hay nghỉ.
- **Người già không đọc chữ**: Sắp có gì nguy hiểm → báo bằng tiếng của họ + giọng nói/hình ảnh.
- **Hộ vùng lũ quét/sạt lở**: Nhà tôi có trong vùng sắp sạt không, khi nào phải chạy, chạy đi đâu.

## Insight nền

- Cảnh báo = **quyết định nhị phân trước một hạn chót**. Sản phẩm không cần số thật chính xác, cần biến số thành "làm X trước Y giờ".
- **AI dịch số thành hành động** — đó là xương sống sản phẩm.
- Progressive disclosure hoà giải mâu thuẫn "đẩy hành động" vs "giữ số liệu để tin cậy": hành động ở trên, số ở dưới.

## Concept giải pháp

- **Flow chính = Hệ thống → Dân** (đẩy cảnh báo hành động, không đẩy dự báo/số). Cá nhân hoá tới từng hộ/mảnh nương theo độ cao, hướng dốc, vị trí.
- **Nội dung 1 cảnh báo có 4 phần**: (1) chuyện gì + (2) nguy hiểm cỡ nào + (3) làm gì + (4) trước khi nào.
- **Giao diện dân phân lớp (progressive disclosure)**: thẻ màu + icon + câu hành động ở trên; đầy đủ số liệu đã phân tích (nhiệt độ, mm mưa, %) ở dưới để tăng độ tin cậy.
- **Đa kênh + TTS tiếng Mông/Thái** qua loa; âm thanh cảnh báo đỏ không thể phớt lờ (mô hình Amber Alert).
- **Last-mile human relay** (tầng con người — điểm ăn tiền): với người yếu thế/không đọc chữ, hệ thống báo cho cán bộ/trưởng thôn tới nhắc tận nơi. Kèm **sổ hộ dễ tổn thương** (trưởng thôn khai báo 1 lần), danh sách "nhà cần đến tận nơi", **nút xác nhận "đã đến nhắc"** → **nhật ký trách nhiệm** tự động → **escalation** khi chưa xác nhận. Tầng này đội 3 mũ: cứu người yếu thế + nhật ký trách nhiệm cán bộ + escalation.
- **Đếm ngược hạn chót + vòng xác nhận** (mô hình Grab-ETA).
- **Thang 2 mức "chuẩn bị / đi ngay" + phân vùng theo bản** (mô hình cảnh báo cháy rừng).

## Điểm khác biệt (differentiation)

Giá trị cạnh tranh nằm ở **tầng con người** (last-mile relay + trách nhiệm cán bộ + tiếng bản địa), **không phải một wrapper API thời tiết**.

## Phạm vi

**Địa bàn (đã chốt 2026-07-17):** giới hạn ở **một xã — Mường Pồn** (huyện Điện Biên cũ, tây bắc TP Điện Biên Phủ, dọc QL12; tọa độ tham chiếu ~21,5°N, 103,1°E) thay vì toàn tỉnh Điện Biên. Lý do: (1) hay tái diễn thiên tai, có "sự kiện mỏ neo" là lũ quét + sạt lở rạng sáng 25/7/2024 (hoàn lưu bão số 02; 4 chết, 3 mất tích, 7 bị thương, 86 nhà hư hại, ~175 tỷ đồng); (2) có báo cáo thiệt hại **đã lượng hóa theo từng bản** → dùng làm nhãn/ground-truth; (3) dữ liệu thời tiết + địa hình lấy được theo tọa độ (xem `docs/compliance/data-provenance.md`).
_Cần xác minh: sau sáp nhập ĐVHC giữa 2025, tên/ranh giới xã Mường Pồn có thể đã đổi — vùng địa lý vẫn cố định theo tọa độ nên không ảnh hưởng việc kéo dữ liệu._

**MVP (IN)** — triển khai đầy đủ cụm A–E:
- A. Nội dung cảnh báo 4 phần.
- B. Cá nhân hoá / phân vùng theo bản, độ cao, hướng dốc.
- C. Giao diện dân phân lớp (hành động trên, số dưới) — vẫn cần web/app cho dân xem.
- D. Đa kênh + TTS Mông/Thái + last-mile relay + escalation + đếm ngược hạn chót + âm thanh đỏ.
- E. Trách nhiệm cán bộ (sổ hộ dễ tổn thương, nút xác nhận, nhật ký).

**Để sau (cụm F + phụ)**:
- Tự học tự chỉnh ngưỡng theo lịch sử từng bản.
- Pha "trong & sau" cho lũ nhiều đợt.
- Ghép lịch mùa vụ / chợ phiên.
- Flow "cảm biến sống" (dân báo ngược thực địa) — giữ ở diện bonus, làm nếu dư thời gian, không phải lõi.

**Không làm**:
- Cell broadcast (lệ thuộc nhà mạng).
- Suy đoán tự động hộ dễ tổn thương (dùng khai báo thủ công thay thế).
- Nhóm người dùng buôn bán / du lịch.

## Yêu cầu tối thiểu của bài thi cần thoả

- Forecast 3–7 ngày cho ≥3 địa điểm.
- Cảnh báo theo ngưỡng.
- Giao diện đơn giản (đã đáp ứng qua giao diện dân phân lớp).
- Tài liệu kiến trúc + deck 1 trang.
