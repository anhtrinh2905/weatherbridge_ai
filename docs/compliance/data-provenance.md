# Data provenance

Before adding any dataset, record:

- source and exact version/date;
- legal permission and license;
- whether it contains personal, medical, financial, or restricted data;
- collection and consent basis;
- transformations and redaction steps;
- retention and deletion policy;
- intended model use and known limitations.

Only synthetic, public-permissioned, or explicitly consented data may enter the
project. Raw sensitive data must stay outside Git and local developer fixtures.

## Study area: xã Mường Pồn, Điện Biên (chốt 2026-07-17)

Phạm vi MVP giới hạn ở một xã (Mường Pồn, ~21,5°N / 103,1°E). Nguồn dữ liệu dự
kiến — cần điền version/date + license cụ thể trước khi nạp vào repo:

| Loại | Nguồn | License / điều kiện | Nhạy cảm? | Ghi chú |
|---|---|---|---|---|
| Thời tiết lịch sử (mưa, nhiệt, ẩm; hourly 1940→nay) | Open-Meteo Historical (ERA5); dự phòng NASA POWER, ECMWF ERA5 | Open-Meteo: miễn phí, non-commercial (kiểm tra ToS); ERA5: Copernicus licence | Không | Truy theo tọa độ — giải bài "trạm đo thưa" |
| Địa hình (độ cao, hướng dốc) | Copernicus DEM 30m / SRTM | Copernicus / công cộng | Không | Phục vụ cá nhân hoá theo độ cao, hướng dốc |
| Nhãn sự kiện thiên tai (ngày, loại, thiệt hại) | Cổng huyện Điện Biên, VNDMA/PCTT (phongchongthientai.mard.gov.vn), báo Nhân Dân/Tuổi Trẻ/Dân Trí | Nội dung công khai của cơ quan nhà nước / báo chí — ghi rõ URL + ngày truy cập, trích dẫn nguồn | Không (số liệu tổng hợp, không phải PII) | Báo cáo 25/7/2024 đã định lượng theo bản → ground-truth |
| Cảnh báo chính thức (đối chiếu baseline) | NCHMF (nchmf.gov.vn), khung QĐ 18/2021/QĐ-TTg | Công khai | Không | Baseline "ngưỡng chung của chính phủ" |
| Sạt lở (inventory) | NASA Global Landslide Catalog | Công khai | Không | Bổ sung nhãn sạt lở |

Sổ hộ dễ tổn thương (last-mile relay) chứa **PII** → không đưa vào Git; chỉ dùng
dữ liệu tổng hợp/ẩn danh hoặc dữ liệu tổng hợp giả lập cho phát triển.

Nguồn tham khảo sự kiện mỏ neo (lũ quét Mường Pồn 25/7/2024): Cổng TTĐT huyện
Điện Biên; Tuổi Trẻ; Nhân Dân. Chốt version/ngày truy cập khi nạp dữ liệu thực.

## `data/samples/households_muong_pon_sample.json` (ghi nhận 2026-07-17)

- Nguồn: dữ liệu **hư cấu hoàn toàn** (synthetic), sinh bằng script (`gen_households.py`, không lưu trong repo, chỉ để tái tạo) — không phải hộ dân thật, không thu thập từ bất kỳ cá nhân nào.
- Phạm vi: 200 hộ, xã Mường Pồn, tỉnh Điện Biên (đơn vị hành chính mới sau sáp nhập với xã Mường Mươn, hiệu lực 1/7/2025), rải trên 9/22 bản thật của xã: 4 bản có lịch sử lũ quét thật (Mường Pồn 1, Mường Pồn 2, Lĩnh, Tin Tốc — 120 hộ, trọng số cao hơn) và 5 bản đối chứng độ cao khác (Huổi Chan 1, Huổi Chan 2, Púng Giắt 1, Púng Giắt 2, Đỉnh Đèo — 80 hộ).
- **Căn cứ lịch sử thiên tai thật** (chỉ dùng để chọn vùng/trọng số, không gắn với hộ dân cụ thể nào): lũ quét rạng sáng 25/7/2024 do hoàn lưu bão số 2, xảy ra tại đúng 4 bản nêu trên — 4 người chết, 3 mất tích, 7 người bị thương, >20 nhà cuốn trôi/sập, >100 nhà ngập/sạt lở/vùi lấp, thiệt hại ước tính ~175 tỷ đồng. Nguồn: báo chí công khai (Tuổi Trẻ, Nhân Dân, Đại Đoàn Kết, Cổng TTĐT huyện Điện Biên — tra cứu 2026-07-17), không phải dữ liệu nội bộ PCTT.
- Toạ độ: tâm mỗi bản chọn quanh toạ độ hành chính thật của xã Mường Pồn (~21.59°N, 103.03°E), từng hộ rải ngẫu nhiên trong bán kính ~800m quanh tâm bản — có thật về mặt địa hình, không phải toạ độ nhà thật của hộ nào.
- Độ cao: tra cứu thật cho toàn bộ 200 điểm từ Open-Meteo Elevation API (`api.open-meteo.com/v1/elevation`, DEM 90m), ngày 2026-07-17, gọi theo batch 60 điểm/lần — dữ liệu địa hình công khai, không phải dữ liệu cá nhân. Kết quả cho gradient hợp lý: bản vùng lũ thung lũng thấp (~460–490m) tới bản đối chứng vùng cao (~1.211–1.226m).
- Dữ liệu cá nhân/nhạy cảm: tên, tuổi, dân tộc (nhãn demo), nghề nghiệp, lý do dễ tổn thương đều là **giả định**, sinh ngẫu nhiên có kiểm soát phân bố (không map với bất kỳ nạn nhân/hộ thật nào trong sự kiện 2024), gắn nhãn rõ "(tên giả định)" trong file. **Không dùng tên người thật, không đại diện cho bất kỳ nạn nhân thật nào của thảm hoạ 2024.**
- Cờ `is_exercise: true` xuyên suốt — theo đúng AD-13 của `ARCHITECTURE-SPINE.md`, không được dùng để gửi cảnh báo cho người nhận thật.
- Giấy phép/quyền sử dụng: không áp dụng (dữ liệu tự tạo); tham chiếu thiệt hại thiên tai trích từ báo chí công khai, chỉ dùng làm căn cứ chọn vùng, không trích dẫn nguyên văn.
- Mục đích sử dụng và giới hạn: fixture cho module `localities` (Household/VulnerabilityEntry) và kịch bản diễn tập lũ quét/mưa lớn; không đại diện cho dân số thật của Mường Pồn (xã thật có 1.115 hộ/5.133 người trước sáp nhập), không dùng để suy luận thống kê thật, không dùng để suy đoán danh tính nạn nhân thật của sự kiện 25/7/2024.

## `data/policies/action_protocols_v1.json` (ghi nhận 2026-07-17)

- Loại: **policy/config do team tự soạn** (không phải dữ liệu thu thập) — bảng `ActionProtocol` theo đúng AD-4 của `ARCHITECTURE-SPINE.md`, quy định hành động khuyến nghị cố định theo `(hazard, public_level, occupation, locality)`.
- Trạng thái: `status: "draft"` toàn bộ — **chưa có chuyên gia KTTV/PCTT hoặc cán bộ xã thật duyệt nội dung**, chỉ dùng để demo/diễn tập. Trước khi coi là "live", cần người có thẩm quyền (theo đúng field `author/reviewer/approver` đã khai trong file) ký duyệt.
- Điểm sơ tán (`destinations`): toạ độ/text mô tả là **giả định, chưa xác thực với chính quyền xã Mường Pồn** — đánh dấu `status: "exercise_only_unverified"` ở từng điểm; không được dùng làm hướng dẫn sơ tán thật.
- Căn cứ nội dung: với sương muối/rét hại — bám ngưỡng khí tượng thuỷ văn Việt Nam đã research (nhiệt độ 2m ≤4°C, rét hại <13°C); với mưa lớn/lũ quét — bám QĐ 18/2021/QĐ-TTg, nhưng **ghi rõ đây là chỉ báo rủi ro, không phải dự báo lũ quét chính xác** (đúng giới hạn đã thống nhất, tránh vi phạm score cap AD-19 "Gọi lũ quét là dự báo chính xác").
- Dữ liệu cá nhân/nhạy cảm: không có.
- Mục đích sử dụng và giới hạn: nguồn tra bảng cho AI Composer (`be/src/ai/bulletins`) khi sinh bản tin — AI chỉ được chọn/diễn đạt lại action_text có sẵn trong bảng này theo occupation của hộ, không được tự tạo hành động mới.

## `data/samples/households_dien_bien_province_sample.json` (ghi nhận 2026-07-17)

- Nguồn: dữ liệu **hư cấu hoàn toàn** (synthetic), sinh bằng script, phủ 44/45 xã/phường tỉnh Điện Biên sau sáp nhập 1/7/2025 (xã Mường Pồn nằm riêng ở `households_muong_pon_sample.json`, không lặp lại ở đây).
- Toạ độ tâm xã: tra cứu thật qua **Nominatim/OpenStreetMap** (geocoding ranh giới hành chính), ngày 2026-07-17, 45/45 xã khớp thành công. **Giới hạn đã phát hiện và một phần đã sửa**: toạ độ trả về là tâm hình học của ranh giới hành chính, có thể lệch khỏi khu dân cư đông nhất với xã/phường rộng vừa sáp nhập — đã phát hiện và sửa thủ công cho Mường Lay (tâm hình học ra 1063m, trong khi khu dân cư thị xã cũ thực tế ~212-223m, xác minh chéo qua Open-Meteo). 44 xã còn lại **chưa được kiểm tra từng cái** — cần rà lại trước khi dùng ngoài mục đích demo.
- Độ cao: tra cứu thật cho toàn bộ ~900 điểm hộ dân qua Open-Meteo Elevation API (DEM 90m), batch 60 điểm/lần.
- Phân tầng độ chi tiết khu vực (ghi rõ trong `_meta.tier_definition` của file, tránh lẫn lộn giữa dữ liệu đã xác thực và chưa xác thực):
  - **detailed** (Mường Lay, Tuần Giáo): dùng tên khối/bản **thật**, trích từ Cổng TTĐT phường Mường Lay và nguồn hành chính huyện Tuần Giáo (tra cứu 2026-07-17).
  - **medium** (Tủa Chùa, Mường Nhé, Nậm Kè, Si Pa Phìn): chỉ có tên xã cũ trước sáp nhập (thật, nhưng ở cấp xã không phải cấp bản) — ví dụ "Mường Báng", "Phìn Hồ" — gắn nhãn rõ **chưa xác định bản cụ thể**.
  - **light** (39 xã còn lại): không có dữ liệu khu vực thật, dùng nhãn chung "Khu vực trung tâm/ngoại vi xã X" — không giả vờ là tên bản thật.
- `hazard_baseline`: gán "cao" cho 26 xã trùng khớp trực tiếp với danh sách cảnh báo lũ quét/sạt lở đã research trước đó (nguồn: bản tin PCTT tháng 7/2026); 19 xã còn lại gán "chưa_xác_định" (không phải "thấp" — vì không tìm thấy cảnh báo gần đây không đồng nghĩa an toàn, tránh overclaim).
- Dữ liệu cá nhân/nhạy cảm: tên/tuổi/nghề/lý do dễ tổn thương đều giả định, sinh ngẫu nhiên có kiểm soát, không đại diện người thật nào.
- Cờ `is_exercise: true` xuyên suốt.
- Mục đích sử dụng và giới hạn: minh hoạ kiến trúc **mở rộng toàn tỉnh** (theo đúng lộ trình Pilot của PRD — "thêm tỉnh = thêm địa điểm dự báo, không đổi lõi"), KHÔNG dùng làm căn cứ vận hành thật; các xã tier `medium`/`light` cần bổ sung dữ liệu bản thật trước khi dùng ngoài demo.

## Open-Meteo forecast ingest — bảng `forecast_snapshots` (ghi nhận 2026-07-18)

- Nguồn: **Open-Meteo Forecast API** (`api.open-meteo.com/v1/forecast`, model "best match" GFS/IFS — **không phải ERA5**, đúng AC Story 2.2), không cần API key.
- License/điều kiện: Open-Meteo free tier — non-commercial, attribution khuyến nghị (CC-BY 4.0 cho dữ liệu); cần rà lại ToS nếu chuyển sang thương mại.
- Dữ liệu lấy: mưa ngày (`precipitation_sum`, mm) + mưa giờ (`precipitation`, mm/h → suy ra cường độ đỉnh/ngày), 7 ngày, timezone Asia/Bangkok, cho toạ độ Mường Pồn (21.59°N, 103.03°E).
- Nhạy cảm: không — dữ liệu khí tượng công khai, không PII.
- Lưu trữ: bảng `forecast_snapshots` (PostgreSQL), append-only kèm `fetched_at` + `source`; ingest lỗi giữ nguyên snapshot cũ (không blank bản đồ). Không commit dữ liệu ingest vào Git.
- Mục đích/giới hạn: đầu vào trigger mưa cho tính điểm nguy cơ (FR3); là dự báo mô hình toàn cầu chưa hiệu chỉnh địa phương — không thay thế cảnh báo KTTV/PCTT chính thức.

## `fe/src/features/demo/boundary.ts` — ranh giới xã Mường Pồn (ghi nhận 2026-07-18)

- Nguồn: **OpenStreetMap**, relation `19571212` (boundary administrative "Xã Mường Pồn, Tỉnh Điện Biên"), lấy qua Nominatim API (`polygon_geojson=1`) ngày 2026-07-18.
- License: **ODbL 1.0** (© OpenStreetMap contributors) — dữ liệu ranh giới công khai, không có PII.
- Biến đổi: polygon gốc 864 đỉnh → chiếu equirectangular (hiệu chỉnh cos φ), đơn giản hoá Douglas–Peucker (ε ≈ 0,2% đường chéo bbox) còn 212 đỉnh, chuẩn hoá về hệ toạ độ đơn vị (y hướng xuống, đệm 4,5%). Tỉ lệ khung bbox gốc (rộng/cao): 1,1017.
- Mục đích và giới hạn: mask + viền cho bản đồ raster **demo** (`/demo`); độ chính xác sau đơn giản hoá đủ cho minh hoạ, KHÔNG dùng cho nghiệp vụ đo đạc/pháp lý về ranh giới hành chính.

## Audit kết quả — `households_muong_pon_sample.json` (2026-07-18)

Kiểm tra lại bằng script (không chỉ đọc mắt) sau khi dữ liệu đã ổn định. Kết quả:
- Cấu trúc, phân bố theo bản, độ cao, logic vulnerability: khớp đúng kế hoạch, 0 lỗi logic.
- **2 cặp trùng chính xác tên+tuổi+bản** trong 200 hộ (do pool tên chỉ có ~23 mẫu) — giới hạn thật của cách sinh ngẫu nhiên, không phải trùng lặp có chủ đích.
- **Tỉ lệ dân tộc (Mông 40%/Kinh 23%/Khơ Mú 22%/Thái 15%) là giả định của generator, KHÔNG lấy từ số liệu dân số thật** của Mường Pồn — nghiên cứu trước chỉ xác nhận xã có 4 dân tộc này, không có tỉ lệ %.
- **Tuổi bị chủ đích đôn già hơn dân số nông thôn thật** (24.5% ≥60 tuổi, thực tế nông thôn VN thường ~10-13%) — để có đủ mẫu cho tính năng Sổ hộ dễ tổn thương, không phải mô phỏng nhân khẩu học chính xác. Không có ai <18 tuổi (mỗi hộ chỉ 1 người đại diện đăng ký, không phải census toàn thành viên).
