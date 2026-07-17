# PRD Quality Review — WeatherBridge AI (VAIC 2026)

*Rà theo rubric `prd-validation-checklist.md`, hiệu chỉnh theo mức rủi ro: hackathon 36 giờ, đội 6 người, PRD là đầu nguồn cho kiến trúc + epics. Đánh giá dựa trên `prd.md` và `addendum.md` ngày 2026-07-17.*

## Overall verdict

Đây là một PRD mạnh, hiếm khi thấy ở quy mô hackathon: luận đề rõ ("một quyết định nhị phân trước một hạn chót") xuyên suốt từ JTBD tới FR tới chỉ số, mọi FR có hệ quả kiểm được, phương án bị loại có lý do (addendum §1), và assumption được gắn thẻ + lập chỉ mục đầy đủ. Rủi ro chính không nằm ở nội dung mà ở **tính nhất quán của bảng ưu tiên §6.3**: vài FR ở tier cao phụ thuộc FR ở tier thấp hơn, nên nếu đội cắt scope đúng theo bảng thì chuỗi demo "điểm ăn tiền" (UJ-2) sẽ gãy. Điểm hở thứ hai là quy tắc suy **Hạn chót** — nguyên thủy cốt lõi của sản phẩm — chưa được đặc tả. Cả hai đều sửa nhanh; sửa xong PRD sẵn sàng đi tiếp xuống kiến trúc/epics.

## Decision-readiness — strong

Các quyết định được phát biểu như quyết định, không núp dưới "considerations": hybrid rule-quyết/LLM-viết (FR-5, §8), thang 2 mức, khai báo thủ công Sổ hộ ("phương án A đã chốt", §5), Zalo/SMS best-effort có gắn `[ASSUMPTION]`. Trade-off được nêu kèm cái đã từ bỏ — addendum §1 liệt kê 6 phương án bị loại với lý do cụ thể (cell broadcast "lệ thuộc nhà mạng", Zalo Mini App "phụ thuộc duyệt app"); license CC-BY-NC của TTS Thái được nêu thẳng kèm điều kiện thương mại hóa (§8, §9.2). Câu hỏi mở §11 thật sự mở (Q4 nguồn ngưỡng KTTV, Q5 bản đồ nguy cơ), câu đã trả lời được gạch bỏ tường minh. `[NOTE FOR PM]` đặt đúng chỗ căng thẳng thật — mục "cảm biến sống" được gọi thẳng là "emotionally load-bearing với đội" (§6.2), một mức tự phản tư ít PRD nào có.

### Findings
- **high** Bảng ưu tiên §6.3 có đảo ngược phụ thuộc (§6.3) — (1) FR-18 (vòng Leo thang) nằm ở **Could**, nhưng Should① phụ thuộc nó: FR-21 quy định "'Không gặp' kích hoạt leo thang tức thì (FR-18)", SM-2 đếm "đã leo thang trước Hạn chót", và UJ-2 — câu chuyện demo ăn điểm Đổi mới sáng tạo — có cảnh leo thang lên cán bộ xã. (2) FR-5 và FR-14 ở **Must** cá nhân hóa/đẩy theo Bản và Hộ, nhưng FR-8 (hồ sơ Bản) và FR-9 (đăng ký Hộ) ở **Should②**. Cắt đúng theo tier là demo Must/Should① không chạy được như mô tả. *Fix:* tách "leo thang tức thì từ Không gặp" thành phần của Should① (hoặc kéo FR-18 lên Should①, chỉ để phần hẹn giờ X/Y ở Could); ghi rõ tier Must chạy trên dữ liệu Bản/Hộ seed sẵn (fixture) và FR-8/9 chỉ là UI quản trị cho dữ liệu đó.

## Substance over theater — strong

Không có persona theater: §2.1 dùng JTBD một khuôn thống nhất thay vì gallery persona, và mỗi nhóm người dùng đều kéo theo ít nhất một quyết định trong PRD (người già mù chữ → FR-15 TTS bản địa; hộ yếu thế → FR-19–21; tài xế → địa điểm đèo Pha Đin trong FR-1). Tuyên bố khác biệt được *earn* bằng nghiên cứu thật: addendum §5 nêu đối thủ cụ thể với số liệu (blast Yagi 2024 "~65M SMS + 67M tin Zalo", Ignitia, Viamo 3-2-1, Google Flood Hub) và trung thực về giới hạn kiểm chứng ("chưa xác minh được chiều ngược lại"). NFR không boilerplate — toàn ngưỡng riêng của sản phẩm: chu kỳ đánh giá ≤60 phút, phát kênh ≤5 phút (FR-4), push ≤1 phút (FR-14), thẻ đọc được trên 360px và câu hành động ≤2 dòng (FR-10). Tầm nhìn §1 không thể swap sang PRD khác — nó gắn chặt với sẹo 2008, đèo Pha Đin, tiếng Mông/Thái.

## Strategic coherence — strong

Luận đề được phát biểu tường minh và lặp lại đúng chỗ: "Không đẩy con số — đẩy hành động" (tagline) → "một quyết định nhị phân trước một hạn chót" (§2.1) → Bản tin 4 phần + Hạn chót là hai khái niệm trung tâm của Glossary và động cơ cảnh báo. Ưu tiên §6.3 không xếp theo "cái gì dễ trước" mà theo trọng số tiêu chí chấm, có lý do ghi rõ và gắn `[ASSUMPTION]` để đội xác nhận lại. Chỉ số thành công đo đúng luận đề chứ không đo activity: SM-3 "hiểu-là-làm-được ≤10s" đo khả năng *dịch thành hành động*, SM-2 đo *khép vòng* hộ yếu thế — không có DAU/MAU trang trí. Có counter-metrics (SM-C1 cảnh báo đỏ sai, SM-C2 chống spam) đối trọng đúng cặp. Bảng ánh xạ §10 nối thẳng từng tiêu chí chấm 100đ về vị trí trong PRD — đúng loại coherence mà một PRD dự thi cần.

### Findings
- **low** Counter-metrics chưa có ngưỡng đo (§7) — SM-C2 chỉ nói "giữ ở mức tối thiểu cần thiết", SM-C1 là chính sách ("mọi thay đổi Ngưỡng phải có căn cứ") hơn là chỉ số. Với hackathon chấp nhận được, nhưng một con số (vd. "≤ N bản tin Chuẩn bị/Hộ/tuần trong kịch bản diễn tập") sẽ giúp guardrail này kiểm được. *Fix:* thêm ngưỡng cụ thể cho SM-C2 và định nghĩa "sai" cho SM-C1 trong phạm vi diễn tập.

## Done-ness clarity — adequate

Điểm mạnh nổi bật: mọi FR (1–23) đều có mục "Hệ quả (kiểm được)" và phần lớn thật sự kiểm được — "hai Bản lệch ≥300m cho nhiệt độ khác nhau" (FR-2), "thiếu trường → tự fallback template tĩnh" (FR-5), "log chỉ ghi thêm, không sửa/xóa qua UI" (FR-22). Các bẫy tính từ ("thân thiện", "hợp lý") gần như vắng mặt; "tiếng Việt đơn giản" của FR-5 được vận hành hóa qua SM-3. Tuy nhiên dimension này phải khắt khe nhất vì PRD nuôi trực tiếp story creation, và có một lỗ ở đúng khái niệm trung tâm: **Hạn chót**.

### Findings
- **medium** Quy tắc suy Hạn chót chưa đặc tả (§4.2 FR-4) — FR-4 chỉ nói Hạn chót "suy từ thời điểm hiện tượng dự kiến". UJ-1 cho thấy có buffer (sương muối 3h sáng → hạn chót 18h hôm trước) nhưng không FR nào định nghĩa buffer đó lấy từ đâu, theo loại hình hay theo Bản. Hạn chót là nguyên thủy của toàn sản phẩm (đếm ngược FR-6, leo thang FR-18, SM-1, SM-2 đều neo vào nó) — engineer implement FR-4 sẽ phải tự bịa quy tắc. *Fix:* thêm vào bảng Ngưỡng (FR-3) một cột "lead buffer theo loại hình" và một hệ quả kiểm được cho FR-4 (vd. "Hạn chót = thời điểm hiện tượng − buffer cấu hình của loại hình").
- **low** Trạng thái thẻ sau Xác nhận chưa đặc tả (§4.4 FR-13) — UJ-1 mô tả "đồng hồ đếm ngược trên thẻ tắt" sau khi bấm "Tôi đã làm", nhưng hệ quả FR-13 chỉ nói ghi log; FR-6 chỉ định nghĩa trạng thái "đã quá hạn". *Fix:* thêm hệ quả UI cho FR-13 (thẻ chuyển trạng thái "đã hành động", tắt nhắc lại).

## Scope honesty — strong

Đây là dimension mẫu mực của PRD này. §5 Non-Goals làm việc thật (loại cell broadcast, loại suy đoán tự động hộ yếu thế — cả hai đều là thứ người đọc dễ ngầm định là có). §6.2 de-scope tường minh kèm lý do và cả cám dỗ ("cảm biến sống" — đề xuất 1 slide tầm nhìn thay vì code). 9 `[ASSUMPTION]` inline đều được gom về §12; các suy luận chưa xác nhận đúng là chỗ rủi ro thật (chữ RPA với người Mông Điện Biên, lead time 6h, mô hình B2G chưa kiểm chứng với bên mua). Mật độ open-items (5 câu hỏi mở, 9 assumption, 2 NOTE FOR PM) là cao nhưng tương xứng: đây là PRD tiền-build cho cuộc thi, không phải green-light sản xuất — và điều đó được nói thẳng (§11.1: "xác nhận người bản ngữ dời sang giai đoạn triển khai thực tế").

## Downstream usability — strong

PRD này là chain-top (tự khai ở §0: đầu vào cho kiến trúc + epics) nên dimension này nặng ký — và nó đạt. Glossary §3 định nghĩa 17 thuật ngữ và chúng được dùng nhất quán, viết hoa nhất quán (Bản, Hộ, Mức, Ngưỡng, Hạn chót) xuyên FR/UJ/SM. ID liền mạch: FR-1→23 không gap, UJ-1→3, SM-1→5 + SM-C1/C2; cross-reference nội bộ (FR-5→FR-4, FR-13→FR-18, FR liên kết UJ) đều resolve. UJ có nhân vật hữu danh mang ngữ cảnh inline (chị Sùng Thị Mảy, anh Lò Văn Toản, bác Quàng Văn Pó). Addendum tách đúng chất liệu hạ nguồn (tọa độ, pipeline gợi ý, adapter interface) khỏi yêu cầu. Một vết nứt mô hình vai đáng sửa trước khi làm data model:

### Findings
- **medium** Vai "Cán bộ" gộp nhưng leo thang lại phân biệt hai nấc (§3 Glossary vs §4.6) — Glossary định nghĩa "**Cán bộ** — vai gộp trưởng bản + cán bộ xã" và FR-23 chỉ có 3 vai, nhưng FR-18 leo thang theo nấc "Hộ → Trưởng bản → Cán bộ xã" và FR-21 yêu cầu trạng thái "nhìn thấy realtime trên view **Cán bộ xã**". Nếu vai là gộp thì hệ thống không phân biệt được hai nấc leo thang và hai view. Người dựng data model sẽ vấp ngay. *Fix:* định nghĩa trong Glossary hai cấp trong vai Cán bộ (Trưởng bản — phạm vi 1 Bản; Cán bộ xã — phạm vi nhiều Bản) và sửa FR-23 tương ứng.

## Shape fit — strong

Đúng khuôn cho một sản phẩm đa stakeholder có UX là lõi giá trị: UJ hữu danh là load-bearing (UJ-2 đồng thời là kịch bản pitch), FR nhóm theo cụm năng lực, SM hướng người dùng. Độ rigor được hiệu chỉnh có chủ ý theo stakes hackathon — UJ-3 tự nhận "hành trình nhẹ — một dòng đủ", phần compliance chỉ mở đúng mức cần (Nghị định 13/2023 gắn NOTE FOR PM cho giai đoạn sau thay vì viết cả mục). Không over-formalize, không thiếu hình thức ở chỗ cần. Việc đẩy chất liệu kỹ thuật xuống addendum giữ PRD đúng cao độ.

## Mechanical notes

- **Assumption roundtrip:** đủ hai chiều — 9 entry ở §12 đều có bản inline tương ứng (FR-2, §4.5, FR-15 ×2, FR-18, §6.2, §6.3, SM-1, §9.2, §11.1) và không có `[ASSUMPTION]` inline nào bị bỏ sót khỏi index.
- **ID continuity:** FR-1→23, UJ-1→3, SM-1→5, SM-C1→2 — không gap, không trùng; mọi tham chiếu chéo resolve.
- **Lệch nhỏ giữa PRD và addendum:** §4.1 ghi Mường Nhé "~600–1.800m", addendum §3 ghi tọa độ tham chiếu "~700m" — không mâu thuẫn (dải vs điểm) nhưng nên chú thích để người làm FR-2 không hiểu nhầm điểm neo hiệu chỉnh độ cao.
- **Cross-ref informal:** §9.2 viết "§addendum" — nên ghi rõ "addendum.md §4" cho nhất quán với các tham chiếu khác.
- **UJ protagonist:** cả 3 UJ đều có nhân vật hữu danh, ngữ cảnh inline — đạt.
