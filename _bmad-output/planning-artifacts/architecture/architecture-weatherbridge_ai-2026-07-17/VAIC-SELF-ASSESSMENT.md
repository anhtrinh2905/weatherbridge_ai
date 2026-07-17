---
title: "WeatherBridge AI — VAIC Self-Assessment Scorecard"
status: final
created: 2026-07-17
updated: 2026-07-17
purpose: evidence-based self-assessment against the provided VAIC rubric
---

# WeatherBridge AI — VAIC Self-Assessment Scorecard

## Cách dùng

Scorecard này dùng đúng sáu tiêu chí VAIC do đội cung cấp. Nó không dự đoán điểm
của giám khảo. Nó buộc đội phân biệt ba trạng thái:

| Trạng thái | Ý nghĩa |
| --- | --- |
| **Điểm hiện tại** | Chỉ tính code, test, tài liệu, demo hoặc bằng chứng đã tồn tại. |
| **Mục tiêu Submission Core** | Trần điểm hợp lý nếu toàn bộ vertical slice và evidence bắt buộc hoàn tất trong 36 giờ. Không phải điểm đã đạt. |
| **Mục tiêu Differentiator** | Trần điểm nếu Core đã pass và human relay/eval/local-audio exercise được chứng minh thêm. |

**Quy tắc chấm:** Không có link tới source, test report, ảnh/video demo, biên bản
test người dùng, hoặc artifact đã review thì mục đó nhận `0`, dù có trong roadmap.
Không cộng điểm cho claim “production-ready”, “đa nguồn”, “AI-native”, hoặc
“tiếng bản địa” nếu chỉ là kế hoạch.

## Tổng quan điểm

_Đánh giá bảo thủ tại thời điểm 2026-07-17. Điểm hiện tại tính repo scaffold và
artifact đã viết, không tính hạng mục dự định làm._

| # | Tiêu chí | Tối đa | Hiện tại | Mục tiêu Core | Mục tiêu Differentiator | Điều kiện để nhận điểm cao |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Technical Implementation & Engineering Depth | 20 | 5 | 15 | 17 | Demo end-to-end, test, contract rõ, code vận hành được. |
| 2 | AI-Native Architecture & Innovation | 20 | 4 | 15 | 17 | AI bounded nhưng load-bearing cho chất lượng giao tiếp, có eval so baseline. |
| 3 | Business Viability & Pilot Pathway | 20 | 7 | 11 | 13 | B2G/pilot có owner, chi phí, license và validation thực tế. |
| 4 | AI-Native UX & Design Thinking | 15 | 4 | 11 | 13 | Thẻ action-first, progressive disclosure, usability evidence. |
| 5 | AI Safety, Grounding & Trust | 15 | 6 | 12 | 13 | Rule/human authority, validator, fallback, provenance, failure drill. |
| 6 | Presentation, Demo & Defensibility | 10 | 5 | 8 | 9 | Deck, demo <2', Q&A bank, rehearsal evidence. |
| **Tổng** |  | **100** | **31** | **72** | **82** |  |

### Diễn giải

- **31/100 hiện tại:** repo có foundation kỹ thuật, PRD, kiến trúc, roadmap và
  deck, nhưng chưa có WeatherBridge vertical slice chạy được.
- **72/100 Core:** là mục tiêu đáng tin hơn một demo “nhiều tính năng nhưng
  nửa vời”. Nó đủ cạnh tranh khi bốn minimum requirements, AI grounding và demo
  đều có evidence.
- **82/100 Differentiator:** chỉ khả thi nếu Core không lỗi và đội chứng minh được
  human relay hoặc language/audio exercise mà không tạo claim an toàn/giấy phép
  sai.

## Score Caps

Các cap dưới đây có hiệu lực trước khi cộng điểm chi tiết.

| Điều kiện thiếu | Cap bắt buộc |
| --- | --- |
| Không có demo chạy trọn forecast -> threshold -> bulletin -> resident UI | Technical <= 8, Presentation <= 5 |
| Không có golden eval và so sánh AI với template baseline | AI-Native <= 10 |
| AI có thể đổi số, mức, deadline, action hoặc destination | Safety <= 6, AI-Native <= 8 |
| Không có fallback khi LLM/source lỗi | Safety <= 9 |
| Không có test người dùng/quan sát comprehension | UX <= 9 |
| Không có một bước xác minh buyer/operator/pilot owner | Business <= 12 |
| Asset tiếng Thái/Mông chưa có review/license nhưng trình bày là dùng thật | Safety <= 9; không tính điểm language innovation |
| Không có timed rehearsal/video demo hoặc không trả lời được 4 phản biện chính | Presentation <= 6 |
| Gọi lũ quét/sạt lở là “dự báo chính xác” từ API toàn cầu | Safety <= 7, Presentation <= 6 |

## 1. Technical Implementation & Engineering Depth — 20 điểm

### Phân rã điểm

| Hạng mục | Tối đa | Hiện tại | Core | Differentiator | Bằng chứng cần có |
| --- | ---: | ---: | ---: | ---: | --- |
| Luồng sản phẩm chính chạy được | 6 | 0 | 5 | 6 | Video/screen recording và test scenario. |
| Kiến trúc phù hợp quy mô | 4 | 2 | 3 | 4 | Spine, module ownership, API contracts, ADR/migration notes. |
| FE/BE/DB/API/workflow triển khai hợp lý | 4 | 2 | 3 | 3 | OpenAPI, migration, integration tests, working PWA. |
| Xử lý lỗi và chất lượng kỹ thuật | 3 | 1 | 2 | 2 | Stale source/LLM timeout/dedupe test results. |
| Khả năng bảo trì/mở rộng | 3 | 0 | 2 | 2 | Config-driven locality/policy, generated client, clear Pilot cutover. |
| **Tổng** | **20** | **5** | **15** | **17** |  |

### Evidence hiện có

- [x] React/Vite, FastAPI, PostgreSQL, Redis, Keycloak, worker và AI boundary
  đã scaffold.
- [x] `ARCHITECTURE-SPINE.md` nêu domain contracts, ownership và profile cut line.
- [x] `AI-FIRST-DEVELOPMENT-ROADMAP.md` có lanes và cổng kiểm thử.
- [ ] Forecast 3-7 ngày cho >=3 điểm chạy trong UI.
- [ ] Risk engine và threshold migration/test.
- [ ] Resident alert card và acknowledgement chạy end-to-end.
- [ ] Kết quả `make check`, `make test`, `make build` sau khi feature hoàn tất.

### Việc nâng điểm cao nhất

1. Hoàn thành hero vertical slice sương muối trước mọi stretch feature.
2. Thêm boundary tests dưới/bằng/trên threshold và fixture không gọi mạng.
3. Giữ worker queue hiện tại cho Core nếu cần, nhưng hiển thị failure trạng thái;
   không dành 36 giờ để rewrite Streams/outbox.

## 2. AI-Native Architecture & Innovation — 20 điểm

### Phân rã điểm

| Hạng mục | Tối đa | Hiện tại | Core | Differentiator | Bằng chứng cần có |
| --- | ---: | ---: | ---: | ---: | --- |
| AI có vai trò rõ và có mục đích | 4 | 1 | 3 | 4 | `CompositionRequest`/`ActionBulletin` flow chạy thật. |
| AI là một phần kiến trúc, không phải chatbot | 4 | 1 | 4 | 4 | Typed contracts, release manifest, provider-neutral adapter. |
| Automation/personalization/decision support | 4 | 1 | 3 | 3 | Nghề/Bản thay đổi output trong scenario có kiểm soát. |
| Khác biệt/sáng tạo | 4 | 1 | 2 | 3 | Human relay + action-first + evidence comparison, không chỉ LLM text. |
| Đo được lợi ích so với baseline | 4 | 0 | 3 | 3 | Eval AI vs template: clarity/action recall/occupation fit. |
| **Tổng** | **20** | **4** | **15** | **17** |  |

### Điều kiện để claim “AI-native” đứng vững

- [ ] AI nhận structured evidence/protocol, không nhận `task + text` chung chung.
- [ ] AI output không có quyền quyết hazard, level, deadline, action, destination.
- [ ] Renderer/validator deterministic tạo final artifact.
- [ ] Golden set có minimum slices: hazard, severity, occupation, location,
  fallback, malformed model output.
- [ ] Report chứng minh AI hơn template baseline ở ít nhất một chỉ số UX mà không
  có safety regression.
- [ ] Prompt/model/provider/version/cost được ghi vào result hoặc release report.

### Câu trả lời Q&A 20 giây

> “AI của chúng tôi không được phép đoán mức nguy hiểm. Rule và cán bộ giữ quyền
> đó. AI là lớp giao tiếp được version/eval: nó biến cùng một evidence và action
> protocol thành bản tin dễ hiểu theo nghề/Bản; validator chặn mọi thay đổi sự
> thật và fallback template vẫn phát đúng hạn.”

## 3. Business Viability & Pilot Pathway — 20 điểm

### Phân rã điểm

| Hạng mục | Tối đa | Hiện tại | Core | Differentiator | Bằng chứng cần có |
| --- | ---: | ---: | ---: | ---: | --- |
| Vấn đề/người hưởng lợi rõ | 4 | 3 | 3 | 4 | JTBD/PRD, problem map, scenario. |
| Buyer/operator/value proposition | 4 | 2 | 3 | 3 | B2G owner hypothesis, role/responsibility statement. |
| Pilot khả thi | 4 | 1 | 2 | 3 | One-commune scope, data/channel/authority checklist. |
| Operating/cost/licence model | 4 | 1 | 2 | 2 | Cost envelope, channel/TTS licence path, provider terms. |
| Thị trường/khách hàng được xác minh | 4 | 0 | 1 | 1 | Ghi nhận tối thiểu một cuộc phỏng vấn/call, không bịa kết quả. |
| **Tổng** | **20** | **7** | **11** | **13** |  |

### Evidence bắt buộc để tránh “business trên giấy”

- [x] PRD xác định người hưởng lợi: hộ dân, trưởng bản/cán bộ xã; buyer giả định
  là B2G.
- [ ] Một operator/buyer interview hoặc xác nhận bằng văn bản, ghi N và insight
  thực tế.
- [ ] Pilot one-commune 6 tháng có owner, hazardous scope, KPIs, data rights,
  offline process và escalation authority.
- [ ] Cost sheet: nguồn forecast, LLM call theo cohort, TTS/audio, channel fee,
  hạ tầng, support.
- [ ] TTS Thai CC-BY-NC được ghi rõ là contest-only; paid pilot có replacement
  path bằng recordings/model được consent/license.

### KPI pilot nên trình bày

| KPI | Cách đo |
| --- | --- |
| Lead time hành động | Thời điểm released alert đến deadline; chỉ cho hazard có evidence phù hợp. |
| Closure hộ yếu thế | % assignment có `visited` hoặc `escalated` trước deadline. |
| False-alert review | Số alert bị operator/expert đánh giá sai theo hazard/mùa. |
| Delivery/acknowledgement | Theo channel, locality và network condition; không biến “sent” thành “read”. |
| Comprehension | Test người dùng nêu đúng action/deadline trong <=10 giây. |

## 4. AI-Native UX & Design Thinking — 15 điểm

### Phân rã điểm

| Hạng mục | Tối đa | Hiện tại | Core | Differentiator | Bằng chứng cần có |
| --- | ---: | ---: | ---: | ---: | --- |
| Hiểu user/bối cảnh | 3 | 2 | 3 | 3 | JTBD, scenario, user-test notes. |
| Luồng rõ và dễ theo dõi | 3 | 0 | 3 | 3 | Resident/official flow, state screenshots. |
| Interaction trực quan | 3 | 1 | 2 | 3 | 360px card, colors/icons/sound, accessibility checks. |
| Trust/explainability | 3 | 1 | 2 | 3 | Source/freshness/evidence layer and wording limits. |
| User-centered validation | 3 | 0 | 1 | 1 | 10-person guerrilla test, actual result. |
| **Tổng** | **15** | **4** | **11** | **13** |  |

### UX acceptance checklist

- [ ] Một người lần đầu hiểu “làm gì, trước khi nào” trong <=10 giây.
- [ ] 360px card không cần scroll; action <=2 lines.
- [ ] `PREPARE`, `GO_NOW`, safe, stale, unknown có biểu đạt khác nhau.
- [ ] Số liệu/source/update time chỉ ở layer bằng chứng, không che action.
- [ ] Acknowledgement có feedback rõ nhưng không che alert/evidence.
- [ ] Test >=10 người không thuộc đội; ưu tiên có người lớn tuổi; ghi fail case
  và thay đổi đã làm.

## 5. AI Safety, Grounding & Trust — 15 điểm

### Phân rã điểm

| Hạng mục | Tối đa | Hiện tại | Core | Differentiator | Bằng chứng cần có |
| --- | ---: | ---: | ---: | ---: | --- |
| Authority boundary và giảm hallucination | 4 | 2 | 3 | 4 | Rule/approval/strict output tests. |
| Grounding/kiểm chứng | 3 | 1 | 3 | 3 | Evidence IDs, renderer, validators, stale policy. |
| Privacy/security/data rights | 3 | 1 | 2 | 2 | Synthetic demo, provenance register, no PII prompt test. |
| Reliability/fallback/human control | 3 | 1 | 2 | 2 | LLM/source failure drill, approval/revision tests. |
| Minh bạch giới hạn AI | 2 | 1 | 2 | 2 | UI/disclaimer, deck, Q&A answer. |
| **Tổng** | **15** | **6** | **12** | **13** |  |

### Safety checklist

- [ ] Level/deadline/action/destination do deterministic policy/protocol quyết,
  không do model.
- [ ] Mọi critical fact ở final output trace được tới `RiskAssessment`/
  `ActionProtocol` ID.
- [ ] LLM timeout/malformed output -> validated template; source stale ->
  `unknown/stale`, không phải `safe`.
- [ ] Scenario/exercise có `is_exercise` xuyên suốt và không có recipient thật.
- [ ] Hạn chế lũ quét/sạt lở được viết đúng: risk indicator/exercise, không hứa
  prediction chính xác.
- [ ] Provenance/terms được record cho Open-Meteo, LLM/provider, prompt, eval,
  TTS/recording và bất kỳ dataset nào dùng.
- [ ] Nếu demo `GO_NOW`: có seeded authorized approver, expiry/freshness check,
  correction/retraction state; nếu không có thì không demo như lệnh sơ tán thật.

## 6. Presentation, Demo & Defensibility — 10 điểm

### Phân rã điểm

| Hạng mục | Tối đa | Hiện tại | Core | Differentiator | Bằng chứng cần có |
| --- | ---: | ---: | ---: | ---: | --- |
| Cấu trúc/tài liệu tự giải thích | 4 | 3 | 4 | 4 | PRD, spine, roadmap, scorecard, deck không còn note nội bộ. |
| Demo giá trị lõi | 3 | 0 | 2 | 3 | Script theo giây, video/fallback, 3 rehearsals. |
| Defensibility/Q&A/khác biệt | 3 | 2 | 2 | 2 | Q&A bank, evidence links, comparison to alternatives. |
| **Tổng** | **10** | **5** | **8** | **9** |  |

### Năm beat demo dưới 2 phút

| Giây | Màn hình | Điểm phải nói |
| ---: | --- | --- |
| 0-15 | Bản đồ/5 location forecast | “Forecast có nguồn, 7 ngày, không nói cả tỉnh chung chung.” |
| 15-40 | Scenario sương muối -> threshold | “Rule minh bạch quyết risk, level, deadline.” |
| 40-65 | AI bulletin + evidence/fallback | “AI diễn đạt, validator giữ sự thật; lỗi dùng template.” |
| 65-90 | Resident card + detail + push/in-app | “Người dân biết làm gì trước khi nào; số liệu ở lớp dưới.” |
| 90-115 | Acknowledgement / stretch relay ledger | “Khép vòng trách nhiệm; nếu stretch chưa xong, nói rõ roadmap.” |

### Bốn phản biện phải trả lời được

| Câu hỏi | Câu trả lời ngắn |
| --- | --- |
| “AI ở đâu, có phải if-else không?” | AI là communication layer có typed contracts/eval; rule giữ safety authority. Chúng tôi đo AI hơn template baseline, không trao quyền quyết định cho model. |
| “Mất mạng thì sao?” | Core không hứa giải quyết hạ tầng vùng sâu. Pilot có officer offline queue + fallback channel/loa; system bổ trợ kẻng/loa, không thay thế chúng. |
| “Lũ quét dự báo chính xác bằng gì?” | Chúng tôi không claim điều đó. Hero demo là frost/cold; flood/landslide chỉ risk indicator/exercise đến khi có map/threshold/station data được xác thực. |
| “TTS licence NC mà bán thế nào?” | Model NC chỉ dùng contest exercise. Pilot trả phí dùng recordings/model có consent/licence riêng; kiến trúc tách locale asset để thay thế không đổi lõi. |

## Evidence Register

Điền link thực tế trong quá trình build. Một dòng trống không mang điểm.

| Evidence ID | Rubric | Artifact/link | Owner | Status | Score effect |
| --- | --- | --- | --- | --- | --- |
| E-01 | 1, 6 | `ARCHITECTURE-SPINE.md` | QA/Docs | Draft | Architecture evidence only |
| E-02 | 2, 5 | Golden eval report | AI/Eval | Missing | Required for AI/safety target |
| E-03 | 1, 4, 6 | End-to-end demo recording | FE + Backend | Missing | Required for Core claim |
| E-04 | 1, 5 | Test report: stale/timeout/threshold/fallback | QA | Missing | Required for safety target |
| E-05 | 4 | 10-person usability notes | UX | Missing | Required to exceed UX 9 |
| E-06 | 3 | Buyer/operator interview note | Product | Missing | Required to exceed Business 12 |
| E-07 | 5 | Provenance/licence register update | AI/Compliance | Missing | Required for TTS/provider claims |
| E-08 | 6 | Timed demo script + 3 rehearsal results | Presenter | Missing | Required to exceed Presentation 6 |

## Checkpoint Protocol

| Checkpoint | Khi nào | Quyết định |
| --- | --- | --- |
| C0 | H4 | Core contract + scenario pass fixture hay cắt scope ngay. |
| C1 | H14 | Risk + bulletin + validator pass; chưa pass thì dừng TTS/human relay. |
| C2 | H24 | Resident flow + Web Push demo pass; cập nhật scorecard theo evidence. |
| C3 | H32 | Chỉ làm Differentiator nếu Core rehearsal pass hai lần liên tiếp. |
| C4 | H36 | Freeze, chấm lại bằng evidence register, chỉ trình bày điểm thật. |

## Điểm cần được xác nhận bởi con người

1. Một judge có thể chấm khác dù checklist đủ; scorecard chỉ giảm tự huyễn hoặc.
2. “Mục tiêu Core 72” không có hiệu lực nếu user test, golden eval, hoặc rehearsal
   không tồn tại.
3. “Differentiator 82” không có hiệu lực nếu human relay/TTS khiến demo chậm,
   lỗi hoặc tạo claim license/safety không chính xác.
4. Khi evidence mâu thuẫn, luôn chọn điểm thấp hơn và cập nhật assumption/register.
