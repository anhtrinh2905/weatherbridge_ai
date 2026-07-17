---
title: "WeatherBridge AI — Nội dung deck 1 trang"
status: final
created: 2026-07-17
updated: 2026-07-17
---

# WEATHERBRIDGE AI

> **Không đẩy con số — đẩy hành động: LÀM GÌ, TRƯỚC KHI NÀO.**

## Vấn đề

Địa hình Điện Biên làm thời tiết thay đổi mạnh theo tiểu vùng. Bản tin cấp tỉnh
đến muộn, nhiều thuật ngữ và không trả lời quyết định của người dân: **có cần
lùa trâu về chuồng, phủ mạ, hoãn qua đèo hay sơ tán không — và phải xong trước
khi nào?** Người già, người ít đọc chữ và hộ không có kênh số còn dễ bị bỏ lại.

## Giải pháp

WeatherBridge AI biến dự báo thành cảnh báo hành động theo Bản/cụm xã:

```text
Dữ liệu đa nguồn
  -> chuẩn hóa + độ cao + freshness
  -> rule minh bạch quyết mức/hạn chót
  -> AI tạo bản tin 4 phần từ hành động đã duyệt
  -> validator + fallback
  -> in-app / Push / SMS / Zalo / loa
  -> xác nhận / đến nhắc / leo thang / nhật ký
```

## Vì sao AI-first nhưng an toàn

- AI không tự quyết nguy hiểm: rule quyết hiện tượng, mức, vùng và hạn chót.
- AI làm phần chịu tải ngôn ngữ: diễn đạt theo nghề/Bản, bốn trường có cấu trúc.
- Mọi số và hành động được validator so với nguồn; lỗi 10 giây dùng template.
- Cảnh báo sơ tán cần cán bộ có thẩm quyền duyệt.
- Prompt + model + action protocol + validator + golden set được version và eval.
- Tiếng Thái/Mông dùng template đã duyệt; không dịch máy sống nội dung sinh tử.

## Demo đáp ứng đề bài

| Yêu cầu | Bằng chứng demo |
| --- | --- |
| Dự báo 3–7 ngày, ≥3 điểm | 7 ngày cho 5 điểm theo dải độ cao Điện Biên. |
| Cảnh báo tự động theo ngưỡng | Scenario sương muối Tủa Chùa chạy cùng pipeline thật. |
| Giao diện trực quan | Thẻ màu/icon, câu hành động ≤2 dòng, lớp số liệu để kiểm chứng. |
| AI-native | Bản tin structured, grounding validator, fallback và eval report. |
| Đa kênh/ngôn ngữ | In-app + Web Push chạy thật; adapter SMS/Zalo/loa; audio bản địa có kiểm soát. |

## Điểm khác biệt

**Tầng con người:** hộ yếu thế chưa xác nhận được đưa cho Trưởng bản đến nhắc;
“Không gặp” leo thang lên cấp xã; mọi bước để lại bằng chứng. Hệ thống không thay
loa/kẻng hay cán bộ — nó giúp đúng người biết phải làm gì và khép vòng cảnh báo.

## Roadmap

- **36 giờ:** vertical slice sương muối, 5 điểm, resident card, AI + validator,
  in-app/push, acknowledgement, eval; stretch là human relay và audio bản địa.
- **Pilot:** dữ liệu trạm/lịch sử được cấp quyền, ngưỡng do chuyên gia sở hữu,
  offline officer PWA, SMS/loa, privacy và giám sát false alarm.
- **Mở rộng:** bias calibration, điều chỉnh ngưỡng có phê duyệt, phản hồi thực địa
  tạo nhãn và TTS bản địa từ dữ liệu có license.

**North-star:** cảnh báo đến trước hạn đủ lâu, người dân hiểu trong 10 giây, và
100% hộ yếu thế trong vùng nguy hiểm được xác nhận hoặc leo thang trước hạn.
