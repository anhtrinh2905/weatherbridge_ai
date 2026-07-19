# Screenshot Shotlist

Chụp ảnh theo danh sách này để làm slide demo. Đề xuất dùng viewport desktop `1440x900` hoặc `1536x864`.
Nếu chụp bằng browser devtools, giữ zoom 100%, theme dark mặc định.

## 1. Login / role selection

- Route: `/login`
- Chụp: 4 thẻ demo role.
- Dùng cho slide: mở đầu demo, chứng minh 4 vai RBAC.

## 2. Admin heatmap - full map

- Route: `/admin/heatmap`
- Hành động: click một điểm trong vùng màu vàng/cam.
- Chụp: toàn màn hình, thấy map + panel thông số.
- Dùng cho slide: technical + explainability.

## 3. Admin heatmap - evidence crop

- Route: `/admin/heatmap`
- Hành động: sau khi click điểm.
- Chụp crop: panel "Điểm đã chọn", gồm cao độ, độ dốc, terrain, rain trigger, confidence.
- Dùng cho slide: AI không hộp đen.

## 4. Resident alert

- Route: `/resident`
- Chụp: alert card lớn, countdown, nút "Xem vì sao".
- Dùng cho slide: UX action-first.

## 5. Resident safety action

- Route: `/resident`
- Hành động: chụp vùng nút "Tôi an toàn" / "Tôi cần giúp đỡ".
- Dùng cho slide: last-mile feedback loop.

## 6. Resident map + watch point

- Route: `/resident/map`
- Hành động: click một điểm khác nhà, bấm "Đăng ký theo dõi điểm này".
- Chụp: heatmap nhỏ + panel thang màu + điểm theo dõi.
- Dùng cho slide: map phụ + personal watchpoint.

## 7. Resident notifications

- Route: `/resident/notifications`
- Chụp: panel nhận tin / notification settings.
- Dùng cho slide: delivery and pilot readiness.

## 8. Village-head overview

- Route: `/village-head/overview`
- Chụp: summary + broadcast audio panel.
- Dùng cho slide: trưởng bản là kênh relay.

## 9. Village-head residents

- Route: `/village-head/residents`
- Chụp: danh sách resident/household, trạng thái/kênh nhận tin nếu có.
- Dùng cho slide: scope theo bản + hỗ trợ hộ ưu tiên.

## 10. Village-head map

- Route: `/village-head/map`
- Chụp: bản đồ bản + thông tin scope.
- Dùng cho slide: mỗi vai thấy đúng phạm vi.

## 11. Admin pipeline / overview

- Route: `/admin/overview` hoặc `/admin/pipeline`
- Chụp: trạng thái hệ thống/job/freshness.
- Dùng cho slide: operational readiness.

## 12. Admin users

- Route: `/admin/users`
- Chụp: user list + role assignment.
- Dùng cho slide: Keycloak/RBAC.

## 13. Localization workflow

- Route gợi ý: admin operations page nếu `AlertLocalizationPanel` đang được render.
- Nếu UI chưa rõ: vẽ diagram từ `docs/runbooks/alert-localization.md`.
- Dùng cho slide: human-reviewed localization.

## 14. Architecture diagram

- Nguồn: tự vẽ từ `docs/presentation/vaic-demo-slide-plan.md` slide 4.
- Dùng cho slide: AI-native architecture.

## 15. Pilot timeline

- Nguồn: tự vẽ từ `docs/presentation/vaic-demo-slide-plan.md` slide 12.
- Dùng cho slide: business feasibility.

