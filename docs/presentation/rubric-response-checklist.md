# Rubric Response Checklist - WeatherBridge AI

Dùng file này trước khi nộp slide: mỗi tiêu chí phải có claim, bằng chứng demo, bằng chứng repo/docs,
và giới hạn nói rõ. Nếu thiếu một cột, slide dễ bị hỏi vặn.

## 1. Chất lượng triển khai kỹ thuật - 20 điểm

**Claim nên nói:** WeatherBridge AI là full-stack system, không chỉ prototype UI.

**Bằng chứng demo:**

- 4 role dashboards sau login: admin, commune officer, village head, resident.
- Admin heatmap có layer/time/cell inspect.
- Resident có alert-first dashboard, map phụ, watch point.
- Village-head có last-mile actions: residents, map, broadcast audio panel.

**Bằng chứng repo/docs:**

- `fe/src/app/App.tsx` - protected routes + role routes.
- `be/src/api/v1/endpoints/*` - alerts, hazards, residents, households, notifications, locales.
- `be/migrations/versions/0005...0012...` - PostGIS, resident registry, hazard domain, alert delivery, localization.
- `worker/src/risk_scoring.py`, `worker/src/notification_dispatch.py`.
- `fe/src/shared/api/generated.ts` - generated OpenAPI client.

**Cần nói thật:**

- Một số UI hazard/raster vẫn dùng demo layer để trình diễn ổn định.
- Backend domain đã có, integration realtime end-to-end cần thêm hardening.

## 2. Kiến trúc AI-Native & Đổi mới sáng tạo - 20 điểm

**Claim nên nói:** AI-native ở đây là hệ thống đưa AI vào đúng chỗ, có ranh giới an toàn.

**Bằng chứng demo:**

- Heatmap explainability: terrain + rain trigger + confidence.
- Alert card 4 phần chuyển số liệu thành hành động.
- Localization/audio workflow cho cảnh báo đa ngôn ngữ.

**Bằng chứng repo/docs:**

- `ai/src/rainfall_trigger.py`, `ai/src/risk.py`, `ai/src/bias_correction.py`.
- `docs/architecture/architecture-weatherbridge-2026-07-18/SOLUTION-DESIGN.md`.
- `docs/runbooks/alert-localization.md`.

**Cần nói thật:**

- LLM không nằm trong đường tính hazard score.
- MMS/Hmong TTS là optional; pilot ưu tiên audio đã duyệt.

## 3. Tính khả thi kinh doanh & Lộ trình Pilot - 20 điểm

**Claim nên nói:** Pilot hẹp tại Mường Pồn giúp giảm rủi ro triển khai và đo được tác động.

**Bằng chứng slide cần có:**

- Timeline 6 tháng.
- Stakeholders: UBND xã/PCTT xã/trưởng bản/người dân/đội vận hành.
- KPI: độ trễ forecast -> alert, tỷ lệ nhận, tỷ lệ hiểu đúng, FPR, duplicate alert rate, số hộ ưu tiên được nhắc.
- Điều kiện go-live: duyệt ngưỡng, duyệt bản dịch/audio, quy trình pháp lý PII.

**Bằng chứng repo/docs:**

- `README.md` phần Lộ trình phát triển.
- `docs/compliance/data-provenance.md`.
- `docs/notifications.md`.
- `docs/adr/0004-resident-data-and-geospatial-operations.md`.

**Cần nói thật:**

- Đây là MVP/pilot, chưa vận hành cảnh báo chính thức.
- Open-Meteo free tier cần rà ToS nếu thương mại hóa.

## 4. UX AI-Native & Tư duy thiết kế - 15 điểm

**Claim nên nói:** UX được thiết kế theo khả năng hành động của từng vai, không theo danh sách tính năng.

**Bằng chứng demo:**

- Resident: alert chiếm phần chính, map là mục phụ.
- Resident: 4 câu hỏi được trả lời ngay.
- Admin/officer: xem chi tiết kỹ thuật.
- Village-head: danh sách hộ, phát cảnh báo, map bản.

**Bằng chứng repo/docs:**

- `docs/design/ui-ux-role-spec.md`.
- `fe/src/pages/resident/HomePage.tsx`.
- `fe/src/features/heatmap/HeatmapView.tsx`.
- `fe/src/pages/village-head/*`.

**Cần nói thật:**

- Chưa có user testing thực địa; pilot sẽ đo tỷ lệ hiểu đúng hành động.

## 5. An toàn AI, Grounding & Độ tin cậy - 15 điểm

**Claim nên nói:** Hệ thống được thiết kế để không overclaim.

**Bằng chứng demo:**

- Safety disclaimer.
- Data freshness badge.
- Confidence trong alert/map.
- Backtest/internal evaluation label.
- Human-reviewed localization.

**Bằng chứng repo/docs:**

- `docs/runbooks/alert-localization.md`.
- `docs/adr/0004-resident-data-and-geospatial-operations.md`.
- `docs/compliance/data-provenance.md`.
- `be/src/core/pii.py`.

**Cần nói thật:**

- Backtest Mường Pồn là small-n, phải đọc với FPR.
- Local-language content chưa gửi thật nếu chưa human-reviewed.

## 6. Trình bày & Bảo vệ giải pháp - 10 điểm

**Claim nên nói:** Demo đi theo một câu chuyện vận hành, không phải tour UI.

**Demo story bắt buộc:**

```text
Forecast -> Heatmap -> Explainability -> Alert -> Resident action -> Village-head relay -> Notification/localization -> Pilot metrics
```

**Câu kết nên dùng:**

"WeatherBridge AI không thay cơ quan PCTT; nó rút ngắn đường từ dữ liệu đến hành động, có vai trò vận hành,
có kiểm soát AI, và có lộ trình pilot đo được."

## 100/100 Gaps To Close

Những việc nên làm thêm nếu còn thời gian:

1. Tạo 1 slide/tài liệu pilot thật có chi phí sơ bộ.
2. Tạo 1 hình backtest 25/7/2024: vùng ảnh hưởng nằm trong top-risk percentile.
3. Chụp screenshot đầy đủ 8 ảnh theo `vaic-demo-slide-plan.md`.
4. Cập nhật `docs/design/ui-ux-role-spec.md` vì file này vẫn ghi resident không dùng sidebar, trong khi code mới đã chuyển sang dashboard sidebar tối giản.
5. Chuẩn bị câu trả lời về phần mock vs live backend.

