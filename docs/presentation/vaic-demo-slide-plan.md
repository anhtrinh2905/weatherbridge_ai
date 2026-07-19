# WeatherBridge AI - VAIC Demo Slide Plan

Mục tiêu: tạo bộ slide demo đủ sức bảo vệ theo 6 tiêu chí chấm điểm 100 điểm.
Tài liệu này viết để đội làm slide có thể copy trực tiếp nội dung, biết cần chụp ảnh màn hình nào,
và biết mỗi slide đang ăn điểm ở tiêu chí nào.

## Rubric Coverage

| Tiêu chí | Điểm | Slide chính cần đánh |
|---|---:|---|
| Chất lượng triển khai kỹ thuật | 20 | 5, 6, 7, 8, 11 |
| Kiến trúc AI-Native & Đổi mới sáng tạo | 20 | 3, 4, 5, 10 |
| Tính khả thi kinh doanh & Lộ trình Pilot | 20 | 2, 12, 13 |
| UX AI-Native & Tư duy thiết kế | 15 | 6, 7, 8, 9 |
| An toàn AI, Grounding & Độ tin cậy | 15 | 4, 5, 10, 11 |
| Trình bày & Bảo vệ giải pháp | 10 | 1, 14 |

## Slide 1 - One-Liner

**Tên slide:** WeatherBridge AI - Không đẩy con số, đẩy hành động

**Thông điệp chính:** WeatherBridge AI biến dữ liệu mưa và địa hình thành cảnh báo hành động theo bản,
để người dân miền núi biết ngay phải làm gì, trước khi nào.

**Nội dung trên slide:**

- Cảnh báo lũ quét/sạt lở theo bản cho xã Mường Pồn, Điện Biên.
- Heatmap 5 cấp cho cán bộ; cảnh báo 2 mức cho người dân.
- AI không tự quyết định nguy hiểm; AI chỉ diễn đạt nội dung đã được tính và kiểm soát.

**Ảnh/visual cần có:**

- Ảnh nền: screenshot resident alert card hoặc admin heatmap.
- Một câu tagline lớn: "Từ forecast đến hành động trong một luồng có kiểm chứng."

**Speaker note:**

"Bài toán của bọn em không phải dự báo thời tiết chung chung. Bọn em tập trung vào điểm nghẽn cuối cùng:
người dân ở bản có hiểu và hành động kịp không. Vì vậy hệ thống bắt đầu từ forecast và địa hình, nhưng kết thúc
bằng một câu hành động rõ ràng."

**Tiêu chí:** Presentation, UX, AI-Native.

## Slide 2 - Problem & Why Now

**Tên slide:** Một bản tin cấp tỉnh không trả lời được: nhà tôi phải làm gì?

**Thông điệp chính:** Cảnh báo thiên tai miền núi thất bại ở khoảng cách giữa dữ liệu và hành động.

**Nội dung trên slide:**

- Điện Biên có địa hình chia cắt, độ cao thay đổi lớn, nhiều bản gần suối/sườn dốc.
- Bản tin thời tiết rộng khó chỉ ra rủi ro theo bản.
- Người già, người ít chữ, đồng bào dân tộc thiểu số cần biểu tượng, màu, âm thanh và câu hành động.
- Mường Pồn có sự kiện lũ quét thật ngày 25/7/2024, gây thiệt hại lớn, là case pilot có ý nghĩa.

**Ảnh/visual cần có:**

- Bản đồ Điện Biên/Mường Pồn hoặc ảnh địa hình miền núi.
- Một callout: "Dữ liệu đúng nhưng đến sai dạng = hành động muộn."

**Speaker note:**

"Nếu người dân chỉ nhận được lượng mưa hoặc cảnh báo cấp tỉnh, họ vẫn phải tự suy ra nên làm gì. Ở thiên tai nhanh
như lũ quét, bước suy luận đó là quá đắt."

**Tiêu chí:** Business/Pilot, UX.

## Slide 3 - Product Promise

**Tên slide:** 4 vai, một chuỗi trách nhiệm

**Thông điệp chính:** Hệ thống không chỉ có model; nó gắn model với vai trò vận hành thực tế.

**Nội dung trên slide:**

| Vai | Câu hỏi họ cần trả lời |
|---|---|
| Admin | Pipeline có chạy đúng, ngưỡng và quyền có kiểm soát không? |
| Cán bộ xã | Bản nào nguy hiểm nhất, vì sao, cần ưu tiên nguồn lực ở đâu? |
| Trưởng bản | Hộ nào cần nhắc, ai đã an toàn, khi nào cần phát loa? |
| Người dân | Tôi có nguy hiểm không, phải làm gì, trước khi nào? |

**Ảnh/visual cần có:**

- 4 screenshot nhỏ: admin heatmap, officer/triage hoặc alerts, village-head overview, resident alert.

**Speaker note:**

"Điểm khác biệt là bọn em không dừng ở bản đồ. Mỗi vai chỉ thấy việc mình cần làm, và dữ liệu được scope theo vai."

**Tiêu chí:** Technical, UX, Business.

## Slide 4 - AI-Native Architecture

**Tên slide:** AI-Native nhưng không để AI tự quyết định an toàn

**Thông điệp chính:** AI nằm đúng vị trí: hỗ trợ diễn đạt, localization và vận hành; quyết định nguy hiểm là pipeline có kiểm chứng.

**Nội dung trên slide:**

```text
Open-Meteo forecast + DEM/terrain
        -> rainfall trigger + terrain susceptibility
        -> hazard raster 5 cấp
        -> threshold_config
        -> alert prepare/go_now
        -> LLM/localization/audio chỉ diễn đạt nội dung đã khóa
```

**Điểm cần nhấn:**

- Hazard scoring deterministic, explainable.
- Lũ quét và sạt lở có trigger riêng.
- Worker xử lý pipeline; API không chạy compute dài.
- LLM không được phép đổi cấp nguy hiểm, deadline hay tier.

**Ảnh/visual cần có:**

- Diagram pipeline dạng ngang.
- Có thể lấy ý từ `docs/architecture/architecture-weatherbridge-2026-07-18/SOLUTION-DESIGN.md`.

**Speaker note:**

"Đây là AI-native theo nghĩa hệ thống được thiết kế quanh AI có kiểm soát, không phải ném mọi thứ cho LLM."

**Tiêu chí:** AI-Native, Safety, Technical.

## Slide 5 - Technical Implementation

**Tên slide:** Từ demo UI sang nền tảng vận hành

**Thông điệp chính:** Repo đã có các khối kỹ thuật thật cho MVP mở rộng: auth, domain backend, geospatial, notification, localization.

**Nội dung trên slide:**

- Frontend: React/Vite, RBAC routes, 4 role dashboards, heatmap raster, alert cards, i18n.
- Backend: FastAPI, Keycloak verification, service-layer authorization, generated OpenAPI client.
- Data/domain: PostgreSQL + PostGIS migrations, resident registry, hazard domain, alert delivery, evacuation domain.
- Worker: forecast ingest, risk scoring, notification dispatch outbox.
- Privacy: simulated residents by default, PII encrypted/HMAC in live mode.

**Ảnh/visual cần có:**

- Screenshot terminal tree hoặc architecture boxes.
- Chụp OpenAPI/generated client hoặc migration list nếu cần chứng minh "không chỉ mock".

**Speaker note:**

"Bản demo hiện vẫn dùng một số lớp mock ở FE để trình diễn nhanh, nhưng kiến trúc backend mới đã có domain để nối thật:
hazards, residents, alerts, notifications, localization."

**Tiêu chí:** Technical, Safety.

## Slide 6 - Demo Page: Admin Heatmap

**Tên slide:** Admin/Cán bộ nhìn toàn xã: heatmap 5 cấp và giải thích được

**Route demo:** `http://localhost:5173/admin/heatmap`

**Mục tiêu demo:** Cho BGK thấy mô hình không phải hộp đen.

**Nội dung trên slide:**

- Toggle lớp: nguy hiểm gộp, lũ quét, sạt lở.
- Time horizon theo ngày dự báo.
- Click một điểm để xem:
  - cấp nguy hiểm,
  - bản gần nhất,
  - cao độ mô phỏng,
  - độ dốc,
  - đóng góp địa hình,
  - kích hoạt mưa,
  - độ tin cậy.

**Ảnh cần chụp:**

- Screenshot full admin heatmap sau khi click một điểm.
- Crop bên phải panel "Điểm đã chọn".
- Crop legend 5 cấp.

**Speaker note:**

"Cán bộ không chỉ thấy màu đỏ. Họ xem được vì sao điểm đó nguy hiểm: địa hình đóng góp bao nhiêu, mưa kích hoạt bao nhiêu,
và độ tin cậy là bao nhiêu."

**Tiêu chí:** Technical, AI-Native, Safety, UX.

## Slide 7 - Demo Page: Resident Alert

**Tên slide:** Người dân thấy hành động trước, số liệu sau

**Route demo:** `http://localhost:5173/resident`

**Mục tiêu demo:** Cho thấy UX phù hợp người ít chữ/không đọc dự báo.

**Nội dung trên slide:**

- Alert card chiếm vị trí chính.
- 4 phần bắt buộc: chuyện gì, nguy hiểm cỡ nào, làm gì, trước khi nào.
- Countdown giúp biến cảnh báo thành deadline.
- Nút "Tôi an toàn" / "Tôi cần giúp đỡ".
- Có progressive disclosure: "Xem vì sao có cảnh báo này".

**Ảnh cần chụp:**

- Screenshot alert card lớn như hình bạn gửi.
- Crop nút xác nhận an toàn/cần giúp.

**Speaker note:**

"Ở màn người dân, heatmap không còn là nhân vật chính. Việc cần làm mới là nhân vật chính."

**Tiêu chí:** UX, Business, Safety.

## Slide 8 - Demo Page: Resident Map & Watch Point

**Tên slide:** Heatmap là công cụ phụ, vẫn cho người dân theo dõi thêm điểm quan trọng

**Route demo:** `http://localhost:5173/resident/map`

**Mục tiêu demo:** Cho thấy map vẫn hữu ích nhưng không làm loãng cảnh báo.

**Nội dung trên slide:**

- Sidebar resident chỉ có các mục chính: Cảnh báo, Bản đồ khu vực, Nhận tin.
- Heatmap nhỏ gọn hơn, bên cạnh có thang màu 5 cấp.
- Người dân click một điểm bất kỳ để đăng ký theo dõi thêm, ví dụ công ty/nương rẫy.
- Hệ thống theo dõi điểm nhà và điểm đăng ký thêm.

**Ảnh cần chụp:**

- Screenshot resident map với panel thang màu bên phải.
- Chụp trạng thái sau khi đăng ký điểm theo dõi.

**Speaker note:**

"Người dân vẫn có quyền xem bối cảnh rủi ro, nhưng trải nghiệm được đặt đúng thứ tự ưu tiên:
cảnh báo trước, map sau."

**Tiêu chí:** UX, Technical.

## Slide 9 - Demo Page: Village Head

**Tên slide:** Trưởng bản là cầu nối last-mile

**Routes demo:**

- `http://localhost:5173/village-head/overview`
- `http://localhost:5173/village-head/residents`
- `http://localhost:5173/village-head/map`

**Mục tiêu demo:** Chứng minh hệ thống đi qua kênh con người, không phụ thuộc smartphone 100%.

**Nội dung trên slide:**

- Overview: tình trạng bản, số hộ an toàn/cần giúp, việc cần làm tiếp theo.
- Broadcast alert: phát audio cảnh báo đã duyệt khi mức nguy cấp vượt ngưỡng.
- Residents: danh sách hộ trong bản, ưu tiên hộ cần hỗ trợ.
- Map: xem rủi ro trong phạm vi bản.

**Ảnh cần chụp:**

- Village-head overview có panel phát cảnh báo.
- Residents list có trạng thái hộ.
- Map bản.

**Speaker note:**

"Ở vùng cao, last-mile không chỉ là app. Trưởng bản và loa bản là một phần của kiến trúc vận hành."

**Tiêu chí:** Business/Pilot, UX, Safety.

## Slide 10 - Localization, Audio & Human Review

**Tên slide:** Ngôn ngữ dân tộc: không dịch bừa, không phát bừa

**Mục tiêu demo:** Ăn điểm Safety/Grounding.

**Nội dung trên slide:**

- Vietnamese là canonical content.
- Hmong/Tai/local-language content bắt đầu ở trạng thái draft/machine_draft.
- Chỉ `human_reviewed` và `published` mới được gửi.
- Tai Dam chưa có công cụ dịch an toàn -> dùng tiếng Việt + icon.
- Audio cảnh báo loa bản dùng file chuẩn bị trước hoặc TTS sau khi đã review.

**Ảnh/visual cần có:**

- Diagram review workflow:

```text
Vietnamese canonical
  -> machine draft
  -> human review
  -> publish
  -> notification/audio
```

- Nếu có UI admin operations localization, chụp `AlertLocalizationPanel`.

**Speaker note:**

"Sai một câu cảnh báo có thể gây rủi ro tính mạng. Vì vậy localization là workflow có người duyệt,
không phải gọi model rồi gửi thẳng."

**Tiêu chí:** Safety, AI-Native.

## Slide 11 - Trust, Grounding & Fail-Safe

**Tên slide:** Grounding: mọi cảnh báo đều có nguồn, thời gian, độ tin cậy và giới hạn

**Nội dung trên slide:**

- Forecast source: Open-Meteo/GFS/IFS, không dùng ERA5 làm forecast.
- Data freshness badge: fresh/stale/unavailable.
- Safety disclaimer trên mọi bề mặt hazard/alert.
- Backtest 25/7/2024 là đánh giá nội bộ, không claim quá mức.
- Service-layer RBAC, không dựa vào việc ẩn UI.
- PII live mode fail-closed nếu thiếu encryption/hash keys.

**Ảnh cần chụp:**

- Crop DataFreshnessBadge trên heatmap.
- Crop SafetyDisclaimer.
- Crop admin calibration/backtest nếu có.

**Speaker note:**

"Điểm em muốn bảo vệ là hệ thống không giả vờ chắc chắn. Nó nói rõ nguồn, thời điểm cập nhật,
độ tin cậy và giới hạn vận hành."

**Tiêu chí:** Safety, Technical.

## Slide 12 - Business & Pilot Plan

**Tên slide:** Pilot 6 tháng tại Mường Pồn: nhỏ, đo được, có đường ra vận hành

**Nội dung trên slide:**

**Giai đoạn 1 - 0-1 tháng: Chuẩn bị**

- Chốt 5-9 bản pilot.
- Xác nhận bản đồ bản, điểm tập kết, người phụ trách.
- PCTT xã duyệt ngưỡng vận hành và mẫu cảnh báo.
- Người bản ngữ duyệt bản dịch/audio.

**Giai đoạn 2 - 2-4 tháng: Diễn tập và đo**

- Chạy forecast/heatmap hằng ngày.
- Gửi cảnh báo diễn tập qua web push/Zalo/SMS mô phỏng hoặc cấu hình thật.
- Trưởng bản xác nhận đã phát loa/đi nhắc.
- Đo người dân hiểu đúng hành động.

**Giai đoạn 3 - 5-6 tháng: Đánh giá**

- KPI: độ trễ forecast -> alert, tỷ lệ nhận, tỷ lệ hiểu đúng, FPR, số cảnh báo trùng/lặp, số hộ ưu tiên được nhắc.
- Quyết định mở rộng sang thêm xã/huyện.

**Ảnh/visual cần có:**

- Timeline 6 tháng.
- Bảng KPI.

**Speaker note:**

"Pilot không bắt đầu bằng toàn tỉnh. Bọn em chọn một xã đã có sự kiện thật, đo hẹp nhưng nghiêm túc,
rồi mới mở rộng."

**Tiêu chí:** Business/Pilot.

## Slide 13 - Evaluation Plan

**Tên slide:** Đánh giá cả model, UX và vận hành

**Nội dung trên slide:**

| Nhóm đánh giá | Metric |
|---|---|
| Hazard model | affected area in top-risk percentile, recall@threshold, FPR, AUC nếu có inventory vùng |
| Alert quality | 100% alert có đủ 4 phần; không tự ý đổi tier/deadline |
| UX resident | tỷ lệ chọn đúng hành động sau khi xem alert; thời gian hiểu cảnh báo |
| Operations | forecast-to-alert latency, notification delivery success, duplicate alert rate |
| Safety | số nội dung localization được human-reviewed; số cảnh báo bị stale/unavailable |

**Ảnh/visual cần có:**

- Bảng metric.
- Nếu có thời gian: mock chart backtest 25/7/2024.

**Speaker note:**

"Bọn em không chỉ đo AUC. Với cảnh báo thiên tai, nếu người dân không hiểu hoặc trưởng bản không nhận được thì model tốt cũng chưa đủ."

**Tiêu chí:** Safety, Business, Technical.

## Slide 14 - Final Defense

**Tên slide:** Vì sao WeatherBridge AI có cơ hội đạt 100/100?

**Nội dung trên slide:**

1. **Technical:** có repo full-stack, RBAC, backend domain, worker, notification, geospatial.
2. **AI-Native:** AI nằm trong pipeline có kiểm soát, không thay thế quyết định an toàn.
3. **Business:** pilot hẹp ở Mường Pồn, có stakeholder rõ và KPI đo được.
4. **UX:** mỗi vai có đúng việc cần làm; resident action-first.
5. **Safety:** grounding, provenance, confidence, human review, no real PII.
6. **Presentation:** demo theo câu chuyện forecast -> heatmap -> alert -> last-mile -> audit.

**Ảnh/visual cần có:**

- 6 ô theo rubric, mỗi ô một icon.
- Dòng cuối: "Demo-ready now, pilot-ready after local approval gates."

**Speaker note:**

"Thông điệp kết thúc: đây không phải một app thời tiết đẹp hơn. Đây là một hệ thống chuyển cảnh báo thành hành động,
có kiểm soát, có vai trò vận hành và có lộ trình pilot."

**Tiêu chí:** Presentation, all.

## Live Demo Flow

Nếu có 5-7 phút demo live, đi theo thứ tự này:

1. `/login` - bấm admin demo.
2. `/admin/heatmap` - click một điểm, đổi layer lũ quét/sạt lở, chỉ panel đóng góp.
3. Logout/login resident hoặc dùng account resident.
4. `/resident` - đọc alert card, mở "Xem vì sao...", bấm "Tôi an toàn".
5. `/resident/map` - click điểm khác, bấm đăng ký theo dõi.
6. Login village-head.
7. `/village-head/overview` - chỉ panel phát cảnh báo/audio.
8. `/village-head/residents` - chỉ danh sách hộ và trạng thái.

Không demo quá lâu ở admin. Kết thúc bằng resident/village-head vì đây là tác động xã hội.

## Screenshot Checklist

Chụp ở desktop 1440x900 hoặc 1536x864, dark mode mặc định.

| Tên ảnh đề xuất | Route | Trạng thái cần chụp |
|---|---|---|
| `01-resident-alert.png` | `/resident` | Alert card lớn, có countdown |
| `02-resident-alert-expanded.png` | `/resident` | Mở phần "Xem vì sao..." |
| `03-resident-map-watchpoint.png` | `/resident/map` | Đã click và đăng ký một điểm theo dõi |
| `04-admin-heatmap-inspect.png` | `/admin/heatmap` | Click một điểm, panel chi tiết đang hiện |
| `05-admin-layer-tabs.png` | `/admin/heatmap` | Crop tabs layer + DataFreshnessBadge |
| `06-village-head-broadcast.png` | `/village-head/overview` | Panel phát cảnh báo |
| `07-village-head-residents.png` | `/village-head/residents` | Danh sách hộ dân/trạng thái |
| `08-notification-panel.png` | `/resident/notifications` hoặc notification UI | Cài nhận tin/Web Push |
| `09-architecture-diagram.png` | docs hoặc tự vẽ | Forecast -> worker -> DB -> alert -> delivery |
| `10-pilot-roadmap.png` | tự vẽ | Timeline 6 tháng |

## Risky Questions & Short Answers

**Q: AI của bạn có tự quyết định sơ tán không?**  
A: Không. Hazard level/tier được tính bởi pipeline deterministic và threshold config. AI chỉ diễn đạt nội dung đã khóa,
localization cũng cần human review trước khi gửi.

**Q: Dữ liệu người dân có thật không?**  
A: Không. MVP dùng simulated residents. Backend live mode đã có nguyên tắc encryption/HMAC và fail-closed nếu thiếu secrets,
nhưng pilot thật cần consent và quy trình pháp lý.

**Q: Vì sao không làm toàn tỉnh?**  
A: Cảnh báo thiên tai cần grounding địa phương. Mường Pồn là pilot hẹp có sự kiện thật; sau khi KPI đạt, mở rộng theo cụm xã.

**Q: Nếu Open-Meteo sai hoặc lỗi thì sao?**  
A: UI có freshness/stale/unavailable, worker fail rõ, admin thấy pipeline error. Có thể đổi provider vì forecast client được tách.

**Q: TTS Hmong có chạy thật chưa?**  
A: Có hướng optional MMS, nhưng với cảnh báo an toàn, chiến lược tốt hơn cho pilot là audio Kinh-Hmong được duyệt trước.

**Q: Làm sao chứng minh model tốt?**  
A: Backtest 25/7/2024 là internal evaluation: affected zones should fall in top-risk percentile, báo recall kèm FPR.
Không claim quá mức khi nhãn còn small-n.

## Minimum Slide Set

Nếu bị giới hạn chỉ 8 slide:

1. One-liner.
2. Problem.
3. AI-native architecture.
4. Admin heatmap explainability.
5. Resident alert-first UX.
6. Village-head last-mile relay.
7. Safety/grounding/localization.
8. Pilot + evaluation + final ask.

