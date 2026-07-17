---
title: "WeatherBridge AI — Hướng phát triển AI-first"
status: final
created: 2026-07-17
updated: 2026-07-17
---

# WeatherBridge AI — Hướng phát triển AI-first

## Kết luận chọn hướng

WeatherBridge AI nên được phát triển như một **hệ thống hỗ trợ quyết định an
toàn**, không phải ứng dụng chatbot và cũng không phải mô hình tự dự báo thời
tiết. Giá trị của sản phẩm nằm ở chuỗi khép kín:

> Dữ liệu có nguồn gốc → đánh giá rủi ro giải trình được → AI chuyển thành hành
> động dễ hiểu → con người duyệt quyết định sinh tử → giao đa kênh → xác nhận và
> leo thang → đo chất lượng để cải tiến.

MVP không nên huấn luyện mô hình dự báo riêng. Hãy dùng dự báo số từ Open-Meteo
và các nguồn được phép, dành AI cho phần mà rule/template đơn thuần làm kém:
tổng hợp ngữ cảnh, diễn đạt theo nhóm người dùng, kiểm thử chất lượng ngôn ngữ,
và TTS. Mọi quyết định nguy hiểm vẫn thuộc về rule và người có thẩm quyền.

## Ba profile thực thi

| Profile | Được phép gọi là hoàn thành khi | Không được đánh tráo thành bằng chứng |
| --- | --- | --- |
| **Submission Core** | Đủ bốn yêu cầu tối thiểu VAIC, có một vertical slice chạy dưới 2 phút và failure drill | Pilot-ready, đa kênh thực tế, TTS đã kiểm duyệt, dự báo lũ quét chính xác |
| **Submission Differentiator** | Core đã pass và có thêm human relay/eval/local-audio exercise | Production reliability hoặc business validation |
| **Pilot Contract** | Có authority, data rights, privacy, lifecycle, operations và license đầy đủ | Demo 36 giờ |

`ARCHITECTURE-SPINE.md` là hợp đồng kỹ thuật; `VAIC-SELF-ASSESSMENT.md` là nơi
ghi bằng chứng và điểm. Không được đổi “target score” thành “điểm đã đạt”.

## AI-first nghĩa là gì

| Nguyên tắc | Cách áp dụng |
| --- | --- |
| AI là capability, không phải màn hình chat | AI nằm trong pipeline tạo `ActionBulletin`, không yêu cầu người dân prompt. |
| Input/output có kiểu | AI chỉ nhận bằng chứng và hành động đã duyệt; trả đúng bốn trường. |
| AI asset được quản trị như code | Prompt, model, protocol, schema, validator và golden set cùng có phiên bản. |
| Eval đi trước mở rộng tính năng | Prompt/model mới phải qua bộ test số liệu, an toàn, rõ ràng và cá nhân hóa. |
| Có đường lui không-AI | Timeout hoặc sai schema dùng template tĩnh; cảnh báo vẫn phát đúng hạn. |
| Có provenance | Mỗi câu cảnh báo truy được về nguồn, thời điểm, policy, prompt/model và validator. |
| Human-in-the-loop đúng chỗ | Cán bộ duyệt cảnh báo sơ tán; không bắt người duyệt mọi cảnh báo thông thường. |
| Học từ vận hành, không giả vờ tự học | Thu kết quả giao/xác nhận/sai lệch trước; chỉ huấn luyện hoặc hiệu chỉnh khi đã có nhãn đáng tin. |

## Năm lớp sản phẩm

### 1. Evidence Layer

- **Submission Core:** Open-Meteo là nguồn duy nhất cho forecast thật; scenario
  fixture đi cùng schema để diễn tập. Không gọi đây là fusion đa nguồn.
- **Pilot:** OpenWeatherMap và trạm địa phương chỉ được kích hoạt qua
  `SourcePolicy` đã duyệt, định nghĩa freshness, quality, failover, disagreement
  và switchback.
- Chuẩn hóa thành `ForecastSnapshot`, không để schema của nhà cung cấp lan sang
  rule engine hoặc frontend.
- Lưu source/product/model run, issue/valid/retrieved/expiry time, raw digest,
  độ cũ, đơn vị, transform version, terms/attribution và completeness.
- Open-Meteo đã hỗ trợ hiệu chỉnh theo độ cao. Nếu dùng tham số `elevation` thì
  không cộng thêm lapse rate lần hai.

### 2. Decision Layer

- `ThresholdPolicy` cấu hình theo hiện tượng, Bản/cụm xã, mức cảnh báo và thời
  gian cần hành động.
- `RiskAssessment` là kết quả deterministic, có bằng chứng và dedupe key.
- Sương muối/rét hại là hero scenario vì nguồn hiện tại có thể chứng minh tốt.
- Lũ quét/sạt lở chỉ trình bày là nguy cơ theo ngưỡng mưa hoặc diễn tập cho đến
  khi có dữ liệu/bản đồ/ngưỡng địa phương đáng tin.

### 3. AI Communication Layer

- Tra `ActionProtocol` đã duyệt theo hiện tượng, mức, nghề và địa phương.
- LLM chỉ sinh phần nối/giải thích có giới hạn và tham chiếu fact/action ID;
  renderer deterministic chèn số, mức, hạn chót, hành động, địa điểm.
- Validator kiểm ID, biến render, output bounds, claim class, channel projection
  và final artifact, không cố suy lại sự thật từ prose.
- Fallback template chạy ngay khi LLM lỗi hoặc quá 10 giây.
- Tiếng Thái/Mông dùng template có scope `exercise_only` hoặc `live` rõ ràng;
  không machine-translate trực tiếp cảnh báo sinh tử ở runtime. Chưa có reviewer
  + consent/license thì chỉ được demo có nhãn diễn tập.

### 4. Delivery & Accountability Layer

- Một revision `AlertEnvelope` đóng băng cohort, locale, bulletin, protocol và
  channel intent trước khi tạo `DeliveryCommand`.
- Mỗi kênh có trạng thái gửi riêng; một kênh lỗi không chặn kênh khác.
- Người dân xác nhận “Tôi đã làm”; Trưởng bản xác nhận “Đã đến nhắc/Không gặp”.
- Submission Core: in-app alert + Web Push khi permission đã preflight; polling
  là fallback demo chứ không phải bằng chứng push. Offline officer sync là Pilot.
- Nhật ký append-only liên kết toàn chuỗi bằng `trace_id`; Pilot thêm hash chain,
  role DB và restore/verification drill.

### 5. Evaluation & Learning Layer

- Golden set theo địa điểm × hiện tượng × nghề × mức × ngôn ngữ × fallback path.
- Kiểm deterministic: đủ trường, số khớp, đúng mức/hạn, hành động hợp lệ, không
  thêm địa điểm hoặc lời hứa không có nguồn.
- LLM-as-judge chỉ chấm độ rõ, tính hành động và phù hợp nghề; không thay
  validator.
- Theo dõi tỷ lệ fallback, cảnh báo trùng, source age, delivery success,
  acknowledgement closure và false-alarm review.
- So AI với template baseline: chỉ nhận điểm AI-native khi AI cải thiện rõ ràng
  về hiểu hành động/hạn chót hoặc occupation fit mà không có safety regression.

## Lát cắt dọc phải làm đầu tiên

```text
Scenario sương muối Tủa Chùa hoặc Open-Meteo
  -> ForecastSnapshot
  -> ThresholdPolicy vượt ngưỡng
  -> RiskAssessment + deadline
  -> ActionProtocol cho hộ chăn nuôi
  -> ActionBulletin AI bốn phần
  -> Validator hoặc fallback
  -> Thẻ cảnh báo 360px + lớp số liệu
  -> In-app delivery/Web Push
  -> “Tôi đã làm”
  -> Nhật ký truy vết
```

Chỉ khi chuỗi này chạy end-to-end và có test mới ghép thêm Tầng con người, TTS,
SMS/Zalo hoặc các hiện tượng khác.

## Kế hoạch 36 giờ cho 6 người

| Mốc | Kết quả bắt buộc | Phụ trách chính | Điều kiện qua cổng |
| --- | --- | --- | --- |
| H0–H4 | Chốt contracts strict, 5 địa điểm seed, frost scenario, `SourcePolicy`/threshold/action protocol v1, demo script | Data/Risk + Backend + QA/Docs | Fixture chạy được; không còn DTO `text -> dict` trong flow mới. |
| H4–H10 | Open-Meteo adapter, normalize/cache/freshness, scenario đi cùng schema | Data/Risk + Backend | Có forecast 7 ngày cho 5 điểm; source lỗi hiện stale. |
| H6–H14 | Migrations, Risk Engine, dedupe, deadline, API query/command | Backend/Workflow | Boundary tests cho ngưỡng; cùng input không sinh alert trùng. |
| H10–H18 | ActionProtocol, anchored composer, renderer, validator, fallback, golden eval command | AI/Eval | Golden set đạt 100% deterministic safety checks; AI so với template baseline. |
| H14–H24 | Resident PWA: thẻ, màu/icon, chi tiết số liệu, năm địa điểm | Resident FE | Người mới nhìn ra “làm gì/trước khi nào” trong 10 giây. |
| H18–H28 | In-app alert, Web Push preflight, acknowledgement và audit view | Backend + Channels + FE | Push tap-through chạy trên Android đã cấp quyền; polling là fallback; mọi bước có `trace_id`. |
| H24–H32 | Stretch ưu tiên 1: approval + danh sách đến nhắc + Không gặp + print report | Officer FE + Backend | UJ-2 chạy bằng dữ liệu diễn tập, không cần realtime socket. |
| H28–H34 | Stretch ưu tiên 2: template bản địa + audio cache | AI/Eval + Channels | Asset mang nhãn `exercise_only`, provenance/license record, fallback audio pre-generate; không gọi dịch sống. |
| H34–H36 | Freeze code, full demo rehearsal, failure drill, số liệu thật cho deck | Cả đội, QA/Docs chốt | Chạy ba lần liên tiếp dưới hai phút; có video dự phòng. |

### Sáu lane trách nhiệm

| Lane | Trách nhiệm |
| --- | --- |
| 1. Data/Risk | Adapter, normalized schema, freshness, threshold, deadline, scenario. |
| 2. AI/Eval | ActionProtocol, prompt, structured output, validators, golden set, TTS stretch. |
| 3. Backend/Workflow | Models, services, Core job status/dedupe, approval, audit, OpenAPI; outbox/Streams là Pilot work. |
| 4. Resident FE | Forecast, alert card, details, acknowledgement, offline shell. |
| 5. Officer FE/Channels | Approval, visit list, delivery status, print view. |
| 6. QA/Infra/Docs | CI, fixtures, integration tests, Compose, preflight, architecture/deck/demo. |

## Scope cắt theo giá trị

### Submission Core

- Forecast 7 ngày cho 5 điểm.
- Một risk engine chạy thật với sương muối/rét hại.
- Scenario diễn tập dùng cùng pipeline.
- Bản tin AI bốn phần, validator, fallback và báo cáo eval.
- Resident alert card + lớp số liệu + in-app delivery; Web Push được preflight và
  chạy thật trên thiết bị demo, polling là fallback trình diễn.
- Architecture document và deck một trang.

### Differentiator

- Cổng duyệt cảnh báo sơ tán.
- Danh sách hộ cần đến nhắc, xác nhận, Không gặp, escalation và print report.
- Template/audio Thái hoặc Mông có kiểm soát, `exercise_only` nếu chưa có native
  reviewer và license/consent đầy đủ.

### Không làm trong 36 giờ

- Huấn luyện mô hình dự báo hoặc tự học ngưỡng.
- Vector database/RAG mở cho hướng dẫn sinh tử.
- PostGIS/TimescaleDB khi mới có năm điểm.
- Zalo + SMS + loa cùng lúc; chỉ làm adapter khi có credential thật.
- Lời hứa dự báo chính xác lũ quét từ mô hình thời tiết toàn cầu.
- Production-grade multi-region, Kubernetes hoặc tách microservice.

## Bản đồ thay đổi code

1. Thay flow generic `InferenceRequest(task, text) -> dict` bằng contract riêng
   cho `ActionBulletin`; giữ provider-neutral adapter dưới `be/src/ai`.
2. Tạo các module backend `weather`, `risk`, `localities`, `alerts`, `delivery`,
   `accountability`; route chỉ gọi application service.
3. Submission: giữ Redis `BLPOP` chỉ cho synthetic/background task, bổ sung
   terminal status + domain dedupe và không hứa delivery guarantee. Pilot: thay
   bằng outbox + Redis Streams ACK/reclaim/DLQ; worker không định nghĩa lại bảng
   backend.
4. Sinh OpenAPI client vào `fe/src/shared/api/`; không tạo DTO thủ công song song.
5. Đưa golden data/eval CLI vào `ai/`; online validator/fallback ở `be/src/ai`.
6. Sửa cấu hình AI cho `worker`; mock chỉ chạy `is_exercise` và UI phải hiện nhãn.
   Pilot/production từ chối khởi động với mock provider.

## Cổng kiểm thử bắt buộc

- Adapter contract tests bằng fixture, không gọi mạng trong unit test.
- Boundary tests ngay dưới/bằng/trên từng threshold.
- Property tests cho deadline, timezone, đơn vị và dedupe.
- Golden tests cho mọi số âm, 0 giờ, tên Bản dài và từng nghề/ngôn ngữ.
- State-transition tests cho auto-release, pending approval, reject và exercise.
- Idempotency tests khi một event được giao ít nhất hai lần.
- Failure drills: nguồn chết, LLM timeout, Redis restart, push fail, thiết bị
  officer offline.
- Alert lifecycle tests: pending approval stale/expire, correction/retraction/
  all-clear revision, frozen cohort và expired job suppression.
- Scorecard check: mỗi điểm đã chấm phải có link đến test, screenshot, report,
  video hoặc biên bản; không có link = 0 điểm ở hạng mục đó.

## Lộ trình sau cuộc thi

### Giai đoạn 1 — Pilot an toàn

- Ký/kiểm chứng nguồn trạm và lịch sử thiên tai; chốt owner của ngưỡng.
- Xác nhận cơ quan/người có thẩm quyền phê duyệt và quy trình vận hành.
- Hoàn thiện privacy, consent/legal basis, retention, audit và incident response.
- Tích hợp một kênh vùng sâu đáng tin trước: SMS cho cán bộ hoặc file audio cho
  loa, thay vì mở rộng đại trà.
- Đo forecast error, false alarms, lead time, delivery và closure theo từng Bản.

### Giai đoạn 2 — Học từ dữ liệu có nhãn

- Hiệu chỉnh bias theo địa điểm/độ cao và so sánh đa mô hình.
- Đề xuất điều chỉnh ngưỡng nhưng vẫn cần chuyên gia phê duyệt.
- Thu phản hồi thực địa có kiểm duyệt để tạo nhãn, không tự coi mọi phản hồi là
  ground truth.
- Phát triển TTS bản địa bằng dữ liệu có quyền sử dụng và model card đầy đủ.

### Giai đoạn 3 — Mở rộng tỉnh/vùng

- Chuẩn hóa CAP profile, onboarding địa phương bằng cấu hình thay vì fork code.
- Tách worker theo loại tải khi volume chứng minh nhu cầu.
- Chỉ bổ sung PostGIS, time-series extension hoặc broker riêng khi số liệu vận
  hành cho thấy PostgreSQL/Redis hiện tại không đáp ứng SLO.

## Quyết định cần xác minh sớm

1. Đội có thật sự được truy cập dữ liệu Trạm KTTV Điện Biên và lịch sử thiên tai
   không; định dạng, license và update cadence là gì?
2. Nguồn pháp lý/chuyên môn nào sở hữu ngưỡng sương muối, rét hại, mưa lớn?
3. Ai có quyền duyệt lệnh sơ tán trong flow demo và pilot?
4. Ai duyệt nội dung tiếng Thái/Mông, và audio có consent/license nào?
5. Kênh nào có credential chắc chắn trong 36 giờ? Nếu không có, demo in-app là
   đường chính và push là enhancement.

Các câu hỏi này không chặn submission core, nhưng chặn mọi tuyên bố “sẵn sàng
triển khai thật”.
