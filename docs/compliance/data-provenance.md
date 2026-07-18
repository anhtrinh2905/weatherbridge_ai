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
