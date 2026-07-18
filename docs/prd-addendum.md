---
title: "PRD Addendum — Chi tiết kỹ thuật mô hình hazard"
status: draft
created: 2026-07-18
updated: 2026-07-18
parent: docs/prd.md
---

# PRD Addendum — Kỹ thuật mô hình nguy hiểm

Phần "cách làm" tách khỏi PRD (`docs/prd.md`). Đây là kiến thức nền cho `bmad-architecture` và
nhóm AI, không phải yêu cầu năng lực.

## 1. Công thức điểm nguy hiểm

```
Nguy_hiểm(ô, loại) = [ Σ wᵢ · chuẩn_hóa(đặc_trưng_địa_hìnhᵢ) ] × Trigger(loại)
Cấp = bin(Nguy_hiểm, ngưỡng-cấp)  → 1..5      # ngưỡng cần HIỆU CHỈNH, không phải [0,.2,.4,.6,.8,1] cứng
Màu ô = loại có Nguy_hiểm cao nhất
```

> **⚠️ Sửa sau reviewer 2026-07-18:** mỗi loại thiên tai có **trigger RIÊNG**, KHÔNG dùng chung
> `Trigger_mưa`. Bin về QĐ 18/2021 phải hiệu chỉnh (phân bố tích [0,1] lệch thấp → bins đều
> gây under-warn).

- **Nhạy cảm (tĩnh)** theo loại:
  - Lũ quét: HAND thấp, gần suối, lưu vực (flow accumulation) lớn, SPI cao.
  - Sạt lở: độ dốc 25–45°, TWI cao, mất rừng/ven đường, hướng dốc đón mưa.
  - Rét/sương muối: độ cao (lapse rate ~0,65°C/100m), TPI âm (lòng chảo đọng khí lạnh), hướng bắc.

- **Trigger theo loại (đúng cơ chế vật lý):**
  - **Sạt lở** → ngưỡng mưa **I–D Guzzetti** (mục 3) + mưa tiền đề (đất bão hòa).
  - **Lũ quét** → **mưa tích hợp theo lưu vực** phía trên (kiểu Flash Flood Guidance/FFG), theo
    cường độ ngắn hạn — KHÔNG dùng đường cong I–D của sạt lở.
  - **Rét/sương muối** → **trigger NHIỆT ĐỘ**, KHÔNG phải mưa: sương muối xảy ra đêm **quang mây,
    khô, lặng gió, Tmin xuống ngưỡng** (mưa≈0). Nhân với `Trigger_mưa` là SAI (triệt tiêu rủi ro
    đúng lúc cao nhất). → để Roadmap, cần mô hình nhiệt riêng (downscale Tmin theo độ cao + đọng khí lạnh).

## 2. Đặc trưng dẫn xuất từ DEM 30m & thuật toán

| Đặc trưng | Thuật toán | Nguồn gốc |
|---|---|---|
| Slope, aspect | sai phân (đầy đủ: 3×3) | Horn (1981); Zevenbergen & Thorne (1987) |
| Fill sinks | morphological reconstruction | Planchon & Darboux (2002); Soille (2004) |
| Flow direction/accumulation (D8) | steepest descent + topo sort | O'Callaghan & Mark (1984) |
| Mạng suối | ngưỡng lưu vực | Tarboton et al. (1991) |
| HAND | độ cao − suối gần nhất (đầy đủ: theo đường dòng chảy) | Rennó (2008); Nobre et al. (2011) |
| TWI = ln(a/tanβ) | — | Beven & Kirkby (1979) |
| SPI = a·tanβ | — | Moore et al. (1991) |

## 3. Trigger SẠT LỞ — đường cong I–D Guzzetti (chỉ dùng cho sạt lở, KHÔNG cho lũ quét)

```
I_ngưỡng = α · D^β         với  α = 2,20 ; β = −0,44   (Guzzetti et al. 2008, ngưỡng toàn cầu)
E        = I_thực / I_ngưỡng                            (E > 1 = vượt ngưỡng)
trigger  = 1 / (1 + e^(−k(E−1)))                        (logistic; k=2 minh họa; E=1 → 0,5)
```
- **α, β toàn cầu → hay báo thừa** ở thời lượng dài → cần hiệu chỉnh **α, β địa phương** từ
  inventory Tây Bắc.
- Ngưỡng antecedent nhiều ngày cho sạt lở (đất bão hòa). Tham khảo: systematic review rainfall
  thresholds (2023).

## 4. Lộ trình mô hình (A → B → C)

| Mức | Cách | Nhãn? | Ghi chú |
|---|---|---|---|
| A — heuristic/AHP + I–D | trọng số theo tài liệu | không | MVP, giải thích được |
| B — logistic regression / frequency ratio | học từ inventory | có | trọng số học |
| C — RandomForest / XGBoost / LightGBM | học phi tuyến | có | độ chính xác cao; dùng SHAP để giải thích |

- **Mẫu:** ô lưới 30m; dương = trùng inventory; âm = ngẫu nhiên vùng xa. **Spatial CV** (chia
  theo khối) để tránh rò rỉ do tự tương quan không gian.
- **Đặc trưng RF (demo):** `[elev, slope, aspect_sin, aspect_cos, twi, spi, hand, dist_stream, log(acc)]`.
- **Kiểm định:** backtest 25/7/2024 (AUC/ROC, recall vùng đỏ) — KHÔNG dùng để train.

## 5. Dataset & nguồn (để ghi vào oss-register + data-provenance)

- SRTM 30m v3 — NASA/USGS, public domain.
- **Mưa DỰ BÁO (3–7 ngày):** Open-Meteo (ToS non-commercial — kiểm tra) / GFS / IFS.
- **Mưa LỊCH SỬ (backtest):** ERA5 (Copernicus, reanalysis — **trễ ~5 ngày, KHÔNG phải forecast**),
  GPM IMERG.
- NASA COOLR/GLC; High Mountain Asia Landslide Catalog v2 (NSIDC).
- NASA LHASA nowcast (Earthdata + GitHub nasa/LHASA); Global Landslide Susceptibility Map
  (Stanley & Kirschbaum 2017).
- ESA WorldCover 10m.

## 6. Bài báo tham khảo (đã kiểm chứng link trong phiên 2026-07-17/18)

- Guzzetti et al. (2008) — I–D threshold — https://link.springer.com/article/10.1007/s10346-007-0112-1
- Systematic review rainfall thresholds (2023) — https://pmc.ncbi.nlm.nih.gov/articles/PMC10755328/
- Tien Bui et al. (2012) — LSM ML, Hòa Bình VN — https://www.hindawi.com/journals/mpe/2012/974638/
- ML LSM miền Trung VN (PLOS One 2024) — https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0308494
- Flash flood susceptibility Bắc Trung Bộ (ESI 2024) — https://link.springer.com/article/10.1007/s12145-024-01285-8
- HAND flood mapping data-scarce (2023) — https://link.springer.com/article/10.1007/s12145-023-01218-x
- Stanley & Kirschbaum (2017) global susceptibility — https://link.springer.com/article/10.1007/s11069-017-2757-y

*Kinh điển (nêu tên, tự xác minh DOI): Caine 1980; Beven & Kirkby 1979; Moore et al. 1991;
Nobre et al. 2011; Horn 1981; O'Callaghan & Mark 1984.*

## 8. Kiểm định & cách tính recall/AUC (cho G4)

**Ground-truth:** số hóa **dấu vết sự kiện** (landslide scar / vùng ngập) từ ảnh vệ tinh
Sentinel-2 trước/sau (và/hoặc điểm COOLR) → tập ô **dương** (đã sạt/lũ). Ô còn lại = **âm**.

**Ma trận nhầm lẫn tại ngưỡng τ** (ô có điểm nguy hiểm ≥ τ = "dự đoán dương"):
```
              Thực tế Dương     Thực tế Âm
Dự đoán Dương     TP               FP
Dự đoán Âm        FN               TN

Recall (độ nhạy) = TP / (TP + FN)     # bắt được bao nhiêu % nơi thật sự xảy ra
Precision        = TP / (TP + FP)     # trong số báo động, bao nhiêu % đúng
FPR              = FP / (FP + TN)     # tỉ lệ báo động giả
```

**ROC-AUC (chỉ số CHÍNH, không phụ thuộc τ):** quét τ từ 1→0, vẽ (FPR, Recall) → diện tích dưới
đường = AUC. AUC=0,5 ngẫu nhiên; ≥0,75 khá; ≥0,8 tốt. Đây là chuẩn đánh giá trong tài liệu LSM.

**Vì sao KHÔNG dùng recall một-sự-kiện làm chính:** tập dương từ 1 sự kiện quá nhỏ (2–3 bản) →
thống kê không vững; và recall đơn lẻ gian lận được (tô đỏ hết → recall=1). Do đó:
- **Chính (khả thi trong kỳ thi):** sự kiện 25/7/2024 — kiểm tra bản bị ảnh hưởng có rơi vào
  **top phân vị nguy hiểm** không; báo recall@τ **kèm FPR** để minh bạch.
- **Stretch (nếu còn thời gian):** AUC trên **inventory vùng Tây Bắc** (nhiều sự kiện), spatial
  cross-validation; bổ sung **success-rate / prediction-rate curve** (chuẩn LSM).

**Ví dụ số:** nếu dấu vết 2024 có 40 ô dương; tại τ chọn, mô hình bắt 31 → Recall=31/40=0,78;
nếu cũng báo 90 ô ở nơi không xảy ra trên tổng 5000 ô âm → FPR=90/5000=0,018. Cặp (Recall 0,78;
FPR 0,018) là một điểm trên ROC.

## 9. Demo tham chiếu (Hướng 1)

Pipeline đã chạy thật trên DEM Mường Pồn: clip → UTM 48N → flow accumulation → đặc trưng →
RandomForest (300 cây, 9 đặc trưng, lưới 561×525) → heatmap 5 cấp + trigger Guzzetti trên dự
báo Open-Meteo 3 ngày. Feature importance học được: slope 0,48 · SPI 0,20 · HAND 0,09.
(Nhãn demo là bootstrap — minh họa phương pháp, chưa kiểm định.)
