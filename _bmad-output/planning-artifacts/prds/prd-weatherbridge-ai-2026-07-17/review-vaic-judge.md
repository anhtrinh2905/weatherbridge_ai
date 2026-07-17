# Review phản biện — Hội đồng giám khảo VAIC 2026 (mô phỏng)

**Đối tượng review:** `prd.md` + `addendum.md` (WeatherBridge AI, 2026-07-17)
**Hội đồng:** Kiến trúc sư AI (KTS) · Nhà đầu tư (NĐT) · Cán bộ quản lý thiên tai Điện Biên (CB)
**Vai:** Chấm để đánh rớt. Mọi lời khen đều bị lược. Đội tự đọc và tự vá.

---

## Phán quyết chung

Đây là một PRD viết tốt hơn 90% hồ sơ hackathon — và chính điều đó làm nó nguy hiểm: nó **hứa như một sản phẩm 6 tháng nhưng phải chứng minh trong 36 giờ**, đặt "chất AI" lên một lời văn (FR-5) trong khi lõi quyết định là if-else, và dựng mô hình kinh doanh trên một model TTS **cấm thương mại hóa** cùng con số hành chính **đã hết hạn từ 01/7/2025**. Nếu nộp nguyên trạng: vòng 1 (AI sơ loại) sẽ đọc thấy các ghi chú nội bộ "[NOTE FOR PM]" và câu "được coi như đã kiểm duyệt" — tự thú ngay trên giấy; vòng Q&A 2 phút đủ để một giám khảo bất kỳ trong ba chúng tôi hạ knock-out bằng một trong bốn câu: *"AI ở đâu?" — "36h làm sao kịp?" — "Ai trả tiền thật?" — "Bản mất sóng thì sao?"*

**Ước lượng điểm nếu giữ nguyên:** Kỹ thuật 12–14/20 · AI-Native 9–12/20 · Kinh doanh 8–11/20 · UX 11–12/15 · An toàn AI 11–13/15 · Trình bày 6–7/10 → **~57–69/100**. Vá xong các finding Critical/High thì trần điểm mới mở ra.

**Tổng finding: 16** — Critical 3 · High 5 · Medium 5 · Low 3.

---

## CRITICAL

### C1. "AI ở đâu? Đây chỉ là if-else có văn." — lõi AI quá mỏng cho tiêu chí 20đ AI-Native
**Ref:** §4.2 ("Quyết định CÓ/KHÔNG và Mức là **thuần rule**"), FR-5, FR-15, addendum §4.

**KTS tấn công:** Bóc từng lớp: (1) động cơ cảnh báo = bảng ngưỡng tĩnh so sánh số — if-else; (2) hiệu chỉnh độ cao FR-2 = phép nhân lapse rate — số học lớp 10; (3) LLM chỉ *diễn đạt lại* bản tin tiếng Việt, và chính PRD ghi fallback là **template tĩnh** (FR-5) — nghĩa là đội tự thừa nhận LLM **bỏ đi được mà sản phẩm vẫn chạy**; (4) tiếng Mông/Thái = template dịch sẵn + ghép biến số + audio ghi âm/cache — **zero AI tại runtime**. Câu Q&A sẽ là: *"Thứ duy nhất là AI trong hệ của bạn là một lời văn có thể thay bằng template — chính bạn viết thế. Vậy 20 điểm AI-Native chấm vào đâu?"* Lập luận "hybrid an toàn" (addendum §1) đúng về an toàn nhưng chỉ bảo vệ được 15đ Grounding, không mua được 20đ AI-Native.

**Fix:** Không đụng nguyên tắc "rule quyết Mức" (giữ — đó là điểm an toàn). Thêm 1–2 chỗ AI *chịu lực thật* mà vẫn an toàn, chọn trong: (a) **LLM tổng hợp đa nguồn + bất định**: so Open-Meteo vs OpenWeatherMap, sinh đoạn "độ tin cậy của dự báo đêm nay" có trích nguồn — AI làm việc con người không làm nổi trong 5 phút; (b) **eval harness trình diễn được**: bộ test tự động chấm bản tin LLM (đủ 4 phần, số khớp, cấm từ gây hoảng loạn) + LLM-as-judge chấm "tính hành động được" — biến guardrail thành *sản phẩm AI engineering* demo sống trước giám khảo; (c) cá nhân hóa theo nghề × Bản × lịch sử xác nhận thật sự qua LLM có few-shot, không chỉ đổi danh từ. Viết lại hàng "AI-Native" ở bảng §10 để trỏ vào các thứ này, không trỏ vào "Tầng con người" (vốn không phải AI — giám khảo sẽ vạch ra).

### C2. Overscope trắng trợn cho 36h/6 người — và §6.1 tự phản bội §6.3
**Ref:** §6.1, §6.3, FR-1→FR-23.

**KTS + NĐT tấn công:** §6.1 tuyên bố "**Trọn 5 cụm A–E**" trong phạm vi — tức cả 23 FR — rồi §6.3 mới thú nhận sẽ rơi rụng. Máy sơ loại vòng 1 đọc §6.1 và chấm cam kết full-scope; giám khảo vòng 2 so demo với §6.1 và trừ điểm "không làm được điều đã hứa". Đếm riêng tier **Must**: ingest 2 API + chuẩn hóa + cache, bảng ngưỡng sửa nóng, engine đánh giá + dedupe, LLM + validator + fallback, scenario injection, PWA thẻ + lớp số liệu + 5 trang dự báo 7 ngày, web push ≤1 phút, và **FR-23: 3 vai + đăng nhập + cookie httpOnly + phân quyền theo Bản** — đó đã là ~2 tuần việc tử tế cho 6 người, chưa tính Should① (registry hộ + danh sách nhắc + log append-only + **xuất PDF** + view realtime). Q&A: *"36 giờ, 6 người, 23 FR — cho tôi xem bảng phân công theo giờ, hoặc thừa nhận đây là fiction."*

**Fix:** (1) Viết lại §6.1 thành đúng tier Must + Should①, đẩy phần còn lại xuống §6.2 "stretch" — tài liệu nộp phải hứa đúng cái sẽ demo. (2) Chém trong Must: FR-23 hạ thành **role-switch giả lập** (dropdown chọn vai, không Keycloak, không auth thật — ghi rõ "auth production là giai đoạn 2"); FR-11 hạ thành 1 bảng số liệu thay vì biểu đồ giờ; FR-12 dùng 1 layout render 5 địa điểm. (3) Xuất báo cáo FR-22 = print view của trình duyệt, không codegen PDF. (4) Thêm phụ lục "kế hoạch 36h": 6 người × vai trò × mốc giờ 6/12/24/30/36 — đây chính là câu trả lời Q&A "làm sao kịp" và ăn điểm Trình bày.

### C3. TTS Thái CC-BY-NC + mô hình B2G thu tiền = mâu thuẫn license đội tự ghi vào hồ sơ
**Ref:** §8 "Chi phí & license", §9.2 "Điều kiện thương mại hóa", addendum §4.

**NĐT tấn công:** PRD một tay viết "khách hàng trả tiền là chính quyền" (§9.2), tay kia viết model TTS Thái — *linh hồn của differentiation tiếng bản địa* — là **CC-BY-NC 4.0, không dùng được khi thương mại hóa** (§8). Pilot 6 tháng "bám ngân sách chương trình 2025–2035" **là hoạt động có thu tiền từ ngân sách** — NC chết ngay từ pilot, không đợi tới nhân rộng. Đường thoát duy nhất được nêu — "fine-tune từ VOV4" — còn tệ hơn: audio VOV4 là **nội dung phát thanh có bản quyền của Đài TNVN**, không có license huấn luyện; đội định chữa một vi phạm NC bằng một vi phạm bản quyền khác, và ghi nó vào mục "AI roadmap" để khoe. Q&A: *"TTS Thái license NC mà đòi bán cho tỉnh? Và kế hoạch B là train trên dữ liệu không xin phép của VOV?"*

**Fix:** (1) Trong PRD, tách bạch: **bài thi** dùng mms-tts-blt (hợp lệ, ghi oss-register) — **pilot có thu tiền** dùng pipeline giống tiếng Mông (ghi âm người bản ngữ + ghép biến số; ~200 mẫu câu là đủ cho domain hẹp này, chi phí vài triệu đồng, sở hữu trọn); (2) sửa §9.2 "đường thay thế": *"thu âm giọng Thái có hợp đồng/consent để tự huấn luyện VITS"* thay cho VOV4; nếu vẫn nhắc VOV4 thì phải kèm "đàm phán license dữ liệu với VOV" chứ không mặc định dùng được; (3) thêm 1 dòng chi phí thay thế vào mô hình kinh doanh — NĐT chấm điểm cho đội *biết trước* rủi ro license và có giá tiền cụ thể để thoát.

---

## HIGH

### H1. "Ai trả tiền thật?" — người mua chưa gặp, và số liệu hành chính sai từ 01/7/2025
**Ref:** §9.2, §12 (assumption cuối).

**CB + NĐT tấn công:** Thứ nhất, chính PRD gắn nhãn *"toàn mục 9.2 là đề xuất của đội, chưa kiểm chứng với bên mua"* — tức 20đ Kinh doanh đứng trên không khí: không thư quan tâm, không mức giá, không nói gì về **con đường mua sắm công** (đấu thầu/chỉ định thầu CNTT, chu kỳ ngân sách — B2G không phải "tỉnh thích thì chuyển khoản"). Thứ hai — và đây là chỗ tôi, người của tỉnh, bắt tại trận: **"Điện Biên (129 xã)"** là số liệu **trước sắp xếp đơn vị hành chính 01/7/2025**; từ ngày đó cấp huyện đã bỏ, Điện Biên còn ~45 xã/phường. Một dòng số cũ 1 năm trong mục ăn tiền nhất nói với giám khảo rằng đội chưa từng mở văn bản nào của tỉnh trong 12 tháng qua. Thứ ba, tên người mua "Ban Chỉ huy PCTT&TKCN" cần rà lại theo Luật Phòng thủ dân sự 2023 (hiệu lực 01/7/2024) — bộ máy chỉ huy PCTT đã được tổ chức lại về phòng thủ dân sự; gọi sai tên cơ quan mua trước mặt cán bộ tỉnh là mất điểm tức thì.

**Fix:** (1) Cập nhật toàn bộ số liệu hành chính hậu 01/7/2025 (~45 xã/phường; bỏ tham chiếu "huyện" như đơn vị hành chính — giữ như địa danh thì được); (2) rà tên cơ quan mua theo khung phòng thủ dân sự hiện hành; (3) thêm mức giá giả định (VNĐ/xã/năm) + con đường ngân sách cụ thể (mua sắm CNTT hay lồng vào dự án CBEWS của NGO — chọn một làm chính); (4) trước Demo Day, thực hiện **1 cuộc gọi/phỏng vấn** với 1 cán bộ xã hoặc cán bộ phòng thủ dân sự bất kỳ và ghi vào PRD "đã phỏng vấn N=1, phản hồi: …" — một dòng đó đáng hơn cả trang 9.2 hiện tại.

### H2. Bản mất sóng thì hệ thống của các anh chị là gì? — lỗ hổng offline/degraded mode
**Ref:** §4.5, §4.6, FR-14, FR-18, FR-21 ("realtime").

**CB tấn công:** Kịch bản UJ-2 — mưa cực lớn, lũ quét, 19h đêm Mường Nhé. Đó chính xác là lúc **mạng di động chết**: nhiều bản vùng sâu không có 4G ngay cả trời nắng, và giông bão đánh sập cả điện lẫn trạm BTS. Vậy mà toàn bộ Tầng con người — push tới trưởng bản, nút "Đã đến nhắc", leo thang "tức thì", view "realtime" của xã — đều giả định kết nối liên tục. PRD chỉ nhắc offline đúng một lần, cho... file audio (FR-15). Q&A của tôi: *"Đêm lũ quét, bản mất sóng — hệ thống của các bạn thua cái kẻng. Trả lời đi."* Không có câu trả lời này thì 15đ Độ tin cậy đứt một nửa.

**Fix:** Thêm FR hoặc mục NFR "chế độ suy giảm": (1) app Cán bộ **offline-first** — Danh sách đến nhắc tải sẵn khi có cảnh báo, nút xác nhận ghi queue local, sync khi có sóng (timestamp lấy lúc bấm, không lúc sync — Nhật ký trách nhiệm vẫn trung thực); (2) SMS làm kênh leo thang dự phòng cho Cán bộ (nâng FR-17 phần SMS-cho-cán-bộ từ Could lên Should① — rẻ hơn nhiều so với SMS đại trà cho dân); (3) định vị sản phẩm *bổ trợ* loa/kẻng, ghi rõ trong §5/§1 — biến câu hỏi kẻng thành slide "chúng tôi thiết kế cho ngày mạng chết".

### H3. "Đi ngay" là lệnh sơ tán — app của đội không có thẩm quyền phát lệnh đó
**Ref:** Glossary "Mức", FR-4 (tự động sinh + phát ≤5 phút), UJ-2, §5.

**CB tấn công:** Theo pháp luật hiện hành, quyết định sơ tán dân là **thẩm quyền của chính quyền**, không phải của một phần mềm. FR-4 hiện cho pipeline **tự động** phát cảnh báo "Đi ngay" (bản chất là lệnh rời nhà) tới dân trong ≤5 phút, không người nào phê duyệt. §5 nói "không thay thế hệ thống PCTT chính thống" nhưng hành vi hệ thống nói ngược lại. Hai hệ quả: (a) pháp lý — không tỉnh nào dám mua một hệ tự phát lệnh sơ tán; (b) niềm tin — một cảnh báo đỏ sai (mà H4 dưới đây cho thấy xác suất cao) do máy tự phát sẽ giết sản phẩm, đúng như counter-metric SM-C1 của chính đội cảnh báo.

**Fix:** Thêm **cổng phê duyệt con người cho Mức Đi ngay**: rule engine sinh *đề xuất* cảnh báo đỏ → Cán bộ xã bấm duyệt (một nút, có đếm ngược nhắc) → mới phát diện rộng; Mức Chuẩn bị vẫn tự động. Ghi vào §8 như guardrail thứ tư. Điều này (1) hợp pháp hóa mô hình B2G, (2) cộng thẳng vào 15đ An toàn AI — "human-in-the-loop cho quyết định sinh tử" là câu giám khảo an toàn muốn nghe, (3) chi phí code = một màn hình duyệt, rẻ.

### H4. Hero scenario UJ-2 dựa trên năng lực dự báo mà addendum tự thú là không có
**Ref:** UJ-2, FR-4, SM-1, addendum §3 ("mưa đối lưu quy mô lũ quét vẫn bị làm mượt"), §11.4–5.

**KTS + CB tấn công:** Câu chuyện ăn tiền nhất của đội — cảnh báo đỏ lũ quét lúc 19h cho sự kiện 23h — đòi hỏi dự báo mưa đối lưu định lượng, đúng lưu vực, lead time 4 giờ, từ mô hình toàn cầu 11–25km. Addendum §3 tự viết là không làm được. §11.4–5 thú nhận **chưa biết lấy ngưỡng từ đâu** và chưa có bản đồ nguy cơ. SM-1 hứa lead time ≥6h nhưng UJ-2 minh họa 4h. Q&A: *"Ngưỡng lũ quét của bạn số bao nhiêu, trích từ văn bản nào? Nếu không có, cảnh báo đỏ của bạn là ngẫu nhiên có chủ đề."*

**Fix:** (1) Đổi hero demo sang **sương muối/rét hại Tủa Chùa** (UJ-1) — hiện tượng nhiệt độ dự báo được thật với lead time 12–24h, ngưỡng có chuẩn ngành KTTV trích dẫn được; lũ quét giữ làm kịch bản phụ có gắn nhãn "nguy cơ theo ngưỡng mưa, không phải dự báo lũ quét" (đúng chữ addendum đã viết — đưa chữ đó vào PRD chính); (2) trả lời §11.4 ngay bây giờ: dẫn QĐ 18/2021/QĐ-TTg (quy định về dự báo, cảnh báo KTTV) + ngưỡng rét hại/sương muối của ngành làm nguồn ngưỡng khởi tạo — một buổi tra cứu, đừng để "câu hỏi mở"; (3) sửa UJ-2 hoặc SM-1 cho khớp số nhau.

### H5. Vòng 1 AI sơ loại sẽ đọc thấy những thứ đội không muốn nó đọc
**Ref:** §6.2 "[NOTE FOR PM: … emotionally load-bearing … 1 slide 'tầm nhìn' thay vì code]", §8 "[NOTE FOR PM…]", §11.1 "được coi như đã kiểm duyệt", §12, §0 + §6.1 (tham chiếu file ngoài), §10 ("tài liệu kiến trúc (hạ nguồn)").

**KTS tấn công (đội mũ AI-screener):** Máy sơ loại chấm văn bản nguyên trạng, không có thiện chí. Nó sẽ thấy: (a) **hai ghi chú nội bộ "[NOTE FOR PM]"** — trong đó một cái bàn cách *gây ấn tượng với giám khảo bằng slide thay vì code* — đó là tự thú chiến thuật trình diễn ngay trong hồ sơ nộp; (b) câu *"bản dịch template **được coi như đã kiểm duyệt**"* + assumption "verify người bản ngữ dời sang sau" — máy đọc thành "đội thừa nhận nội dung sinh tử tiếng dân tộc chưa ai kiểm"; (c) **9 assumption + 5 câu hỏi mở** với mật độ này có thể bị chấm là "thiếu hoàn chỉnh" dù bản chất là trung thực tốt; (d) bằng chứng cạnh tranh, kiểm chứng TTS, nguồn dữ liệu nằm hết ở `addendum.md` và `docs/brainstorming/...` — nếu screener chỉ ăn `prd.md`, toàn bộ phần "đã kiểm chứng" biến mất; (e) bảng §10 trỏ tiêu chí 20đ vào "tài liệu kiến trúc (hạ nguồn)" — một tài liệu **chưa tồn tại**, và "deck 1 trang" mới chỉ là dàn ý.

**Fix:** Tạo **bản nộp** (submission build) tách khỏi bản làm việc: (1) xóa sạch mọi "[NOTE FOR PM]"; (2) viết lại §11.1 thành chủ động: "bản dịch template sẽ được người bản ngữ duyệt trước khi dùng ngoài demo; trong demo dùng bộ template đã rà soát nội bộ" — cùng sự thật, khác tông; (3) inline 1 trang digest addendum (cạnh tranh + kiểm chứng ngôn ngữ + nguồn dữ liệu) vào PRD nộp, không bắt máy đi theo link; (4) gom assumption thành mục "Giả định có kiểm soát & kế hoạch xác minh" — chuyển từ "chưa biết" sang "biết và có plan"; (5) hoàn thành tài liệu kiến trúc + deck **trước** khi nộp, vì §10 đã hứa chúng.

---

## MEDIUM

### M1. "Validator khớp 100%" và "log bất biến" — hai tuyên bố tuyệt đối sẽ bị bẻ trong 30 giây
**Ref:** FR-5, FR-15, FR-22, §8.
Validator so số chỉ chạy trên bản tin **tiếng Việt** do LLM sinh; bản Mông/Thái là template ghép biến số — ai kiểm số "2°C, 18h" ghép vào chuỗi RPA/chữ Thái đúng vị trí, đúng định dạng, và **audio ghép** đọc đúng số? Không FR nào phủ. Tương tự, FR-22 nói log "bất biến" nhưng hệ quả chỉ là "không sửa/xóa **qua UI**" — admin DB sửa thoải mái; chữ "bất biến" là mời giám khảo kỹ thuật vặn. **Fix:** (1) mở rộng validator: test tự động render template mỗi ngôn ngữ với biến biên (0h, số âm, tên Bản dài) + checksum audio theo (template × biến); (2) đổi "bất biến" thành "append-only, có hash chain/chữ ký từng bản ghi" nếu làm được trong 36h (một cột hash-của-bản-ghi-trước là 30 phút code), không thì hạ ngôn từ xuống "append-only ở tầng ứng dụng".

### M2. Nghịch lý UX: người yếu thế nhất nhận ít AI nhất
**Ref:** FR-5 vs FR-15, §2.1 (persona người già không đọc chữ), tiêu chí UX 15đ.
Người Kinh biết chữ nhận bản tin LLM cá nhân hóa theo nghề; bà cụ người Mông — persona anh hùng của chính PRD — nhận **template cố định ghép biến số**, không cá nhân hóa. Q&A: *"Sản phẩm 'AI cho đồng bào' của bạn dành phần AI cho người không cần nó nhất?"* **Fix:** làm bộ template Mông/Thái **có biến thể theo nghề** (chăn nuôi/nông dân — nhân đôi số template, không đổi kiến trúc), và chủ động nêu framing "safety-first tiering" trong deck: ngôn ngữ sinh tử ít dữ liệu → template kiểm duyệt là *lựa chọn an toàn*, kèm roadmap TTS/MT bản địa. Nói trước thì là design decision; để bị hỏi thì là lỗ hổng.

### M3. SM-3 "9/10 người hiểu trong ≤10s" — đo bằng ai, lúc nào, trong 36h?
**Ref:** §7 SM-3, SM-5.
Metric usability không có kế hoạch đo = số trang trí; giám khảo UX sẽ hỏi protocol. **Fix:** trước Demo Day chạy guerrilla test 10 người (đồng nghiệp/người thân không thuộc đội, ưu tiên ≥2 người lớn tuổi), quay video 30s, ghi kết quả thật vào deck ("8/10 đạt, 2 trường hợp fail vì icon X → đã sửa"). Kết quả 8/10 *có thật* ăn điểm hơn 9/10 *trên giấy*.

### M4. Web push là công nghệ hay chết đúng lúc demo
**Ref:** FR-14 ("≤1 phút"), §4.4 PWA.
iOS chỉ cho push khi PWA đã cài lên màn hình chính; permission prompt, chế độ Focus, mạng hội trường — cả chuỗi rủi ro nằm ngoài kiểm soát đội, gắn với claim cứng "≤1 phút". **Fix:** demo bằng thiết bị Android cắm sẵn quay màn hình lên máy chiếu, đã cấp quyền từ trước; fallback là in-app alert realtime (websocket/polling) trình diễn được y hệt; hạ "≤1 phút" thành hệ quả đo trong điều kiện đã đăng ký thành công. Ghi kịch bản dự phòng vào script demo FR-7.

### M5. Sổ hộ dễ tổn thương: consent của chính hộ được liệt kê ở đâu?
**Ref:** FR-19, §8 "Riêng tư".
§8 xử lý ổn cho demo (dữ liệu hư cấu) nhưng mục pilot §9.2 lại nói "trưởng bản dùng thật Sổ hộ" — tức thu thập dữ liệu nhạy cảm (sức khỏe, hoàn cảnh, vị trí nhà) của người thứ ba **do trưởng bản khai, không có sự đồng ý của chủ thể**. Nghị định 13/2023 được nhắc nhưng chưa chạm đúng điểm này. **Fix:** thêm vào §9.2 một dòng: pilot yêu cầu cơ sở pháp lý qua chính quyền xã (nhiệm vụ phòng thủ dân sự) + quy trình thông báo/đồng ý hộ được liệt kê + quyền yêu cầu xóa; đưa "compliance ND13" thành hạng mục có chủ trong lộ trình pilot thay vì note.

---

## LOW

### L1. Vệ sinh số liệu nội bộ mâu thuẫn
**Ref:** §4.1 vs addendum §3; §8.
Mường Nhé "~600–1.800m" (PRD) vs "~700m" (addendum); Pha Đin gán "~1.500m" chung với Tuần Giáo (thị trấn Tuần Giáo thấp hơn nhiều); "chi phí demo ~0" trong khi Google Cloud Translation API và LLM API đều trả phí (nhỏ nhưng ≠ 0). Máy sơ loại và giám khảo kỹ thuật đều thích bắt mâu thuẫn nội bộ. **Fix:** một lượt rà đối chiếu PRD ↔ addendum, chốt một bộ số; đổi "~0" thành "< X USD, liệt kê".

### L2. "Chưa hệ thống nào ghép đủ 3 lớp" — khẳng định không thể chứng minh
**Ref:** §1, §10 (hàng AI-Native), addendum §5.
Tuyên bố phủ định toàn cầu ("chưa ai làm") chỉ cần giám khảo biết một pilot IBF + local-language bất kỳ là sập. Addendum §5 đã tự hedge ("chưa xác minh được chiều ngược lại") nhưng PRD chính thì nói chắc. **Fix:** đổi thành "trong các hệ thống chúng tôi khảo sát được (danh sách kèm), chưa hệ thống nào ghép đủ 3 lớp" — cùng lực, không thể bẻ.

### L3. Demo <2 phút phải cõng 8 bước — chưa có kịch bản trình bày
**Ref:** §8 "Ràng buộc thi đấu", FR-7, tiêu chí Trình bày 10đ.
Chuỗi scenario → cảnh báo → bản tin AI → push → TTS Mông/Thái → danh sách đến nhắc → leo thang → xuất báo cáo, trong <2' của một pitch 4' — chưa kể Q&A 2' chưa có ngân hàng câu hỏi. **Fix:** script demo theo giây (bảng: giây thứ N — màn hình — câu thoại), cắt còn 5 beat (thẻ → TTS → không xác nhận → leo thang → nhật ký); soạn sẵn 10 câu Q&A dữ nhất — bắt đầu bằng đúng 4 câu ở Phán quyết chung — kèm câu trả lời 20 giây/câu; tổng duyệt bấm giờ ≥3 lần.

---

## Bảng tổng hợp

| # | Mức | Finding | Ref chính | Tiêu chí bị đe dọa |
|---|---|---|---|---|
| C1 | Critical | Lõi AI mỏng — rule engine + LLM thay được bằng template | §4.2, FR-5, FR-15 | AI-Native 20đ |
| C2 | Critical | Overscope 36h; §6.1 hứa full-scope ngược §6.3 | §6.1, §6.3 | Kỹ thuật 20đ, Trình bày 10đ |
| C3 | Critical | TTS Thái CC-BY-NC vs B2G; đường thay VOV4 vô căn cứ pháp lý | §8, §9.2, add.§4 | Kinh doanh 20đ |
| H1 | High | Người mua chưa kiểm chứng; "129 xã" sai sau 01/7/2025; tên cơ quan mua cũ | §9.2 | Kinh doanh 20đ |
| H2 | High | Không có degraded mode khi bản mất sóng | §4.5–4.6 | Tin cậy 15đ |
| H3 | High | "Đi ngay" tự động = lệnh sơ tán không thẩm quyền; thiếu cổng duyệt | FR-4, Glossary | An toàn 15đ, Kinh doanh 20đ |
| H4 | High | Hero scenario lũ quét vượt năng lực dự báo tự thú; ngưỡng chưa có nguồn | UJ-2, add.§3, §11.4 | Tin cậy 15đ |
| H5 | High | Bản nộp lộ note nội bộ, "coi như đã kiểm duyệt", artefact hứa mà chưa có | §6.2, §11.1, §10 | Vòng 1 sơ loại |
| M1 | Medium | Validator không phủ ngôn ngữ bản địa; "bất biến" quá lời | FR-5, FR-15, FR-22 | An toàn 15đ |
| M2 | Medium | Người yếu thế nhất nhận ít AI/cá nhân hóa nhất | FR-5 vs FR-15 | UX 15đ |
| M3 | Medium | SM-3 không có protocol đo | §7 | UX 15đ |
| M4 | Medium | Web push mong manh đúng lúc demo | FR-14 | Trình bày 10đ |
| M5 | Medium | Thiếu consent chủ thể dữ liệu trong pilot Sổ hộ | FR-19, §9.2 | An toàn 15đ |
| L1 | Low | Mâu thuẫn số liệu PRD ↔ addendum; "chi phí ~0" | §4.1, add.§3 | Kỹ thuật 20đ |
| L2 | Low | Khẳng định "chưa ai làm" không thể chứng minh | §1 | Trình bày 10đ |
| L3 | Low | Chưa có script demo/Q&A theo giây | §8, FR-7 | Trình bày 10đ |

## Thứ tự vá đề xuất (trước hạn nộp vòng 1)

1. **H5 + C2** — làm bản nộp sạch, viết lại §6.1, thêm kế hoạch 36h (chi phí thấp, chặn chết vòng 1).
2. **C1** — thêm 1 thành phần AI chịu lực (eval harness là rẻ nhất) + viết lại hàng AI-Native §10.
3. **H3** — cổng duyệt cảnh báo đỏ (1 màn hình, ăn cả điểm an toàn lẫn hợp pháp hóa B2G).
4. **C3 + H1** — sửa mục kinh doanh: license path, số hành chính 2025, tên cơ quan, giá giả định, 1 phỏng vấn.
5. **H4** — đổi hero demo sang sương muối; trích nguồn ngưỡng.
6. **H2, M1–M5, L1–L3** — theo giờ còn lại.

*Hội đồng mô phỏng — kết quả nhằm tăng khả năng sống sót của hồ sơ, không phản ánh điểm thật của BTC.*
