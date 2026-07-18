# WeatherBridge AI

> **Không chỉ dự báo thời tiết, WeatherBridge AI chuyển dữ liệu thành hành động đúng người, đúng lúc và dễ hiểu.**

WeatherBridge AI là giải pháp cảnh báo thời tiết cực đoan và thiên tai dành cho người dân vùng cao
Điện Biên. Hệ thống phân tích dữ liệu thời tiết, đặc điểm địa hình và ngưỡng nguy hiểm để tạo dự báo
chi tiết theo từng khu vực nhỏ, sau đó chuyển kết quả thành cảnh báo trực quan kèm hành động cụ thể.

Mục tiêu của dự án là giúp một người dân không cần hiểu thuật ngữ khí tượng vẫn có thể trả lời ngay
bốn câu hỏi:

1. **Chuyện gì sắp xảy ra?**
2. **Mức độ nguy hiểm đến đâu?**
3. **Tôi cần làm gì?**
4. **Phải hoàn thành trước khi nào?**

## Bối Cảnh

Điện Biên có địa hình miền núi phức tạp, độ cao thay đổi lớn và nhiều khu dân cư nằm gần suối, sườn
dốc hoặc vùng có nguy cơ sạt lở. Thời tiết có thể thay đổi nhanh với các hiện tượng nguy hiểm như:

- mưa lớn cục bộ, lũ quét và lũ ống;
- sạt lở đất tại khu vực sườn dốc;
- sương mù dày ảnh hưởng đến giao thông;
- rét đậm, rét hại và sương muối ảnh hưởng đến cây trồng, vật nuôi;
- chia cắt giao thông và cô lập các bản vùng cao.

Thông tin dự báo hiện nay chủ yếu ở quy mô cấp tỉnh hoặc khu vực rộng. Khi đến được người dân tại
xã, thôn, bản, thông tin có thể đã muộn, chưa đủ chi tiết hoặc chứa nhiều thuật ngữ và con số khó
hiểu. Người già, người ít đọc chữ và đồng bào dân tộc thiểu số vì thế khó chuyển một bản tin khí
tượng thành quyết định bảo vệ người và tài sản.

## Bài Toán Cần Giải Quyết

Xây dựng một giải pháp AI đưa thông tin thời tiết đến **đúng người, đúng thời điểm, đúng khu vực và
đúng ngôn ngữ**, thông qua bốn năng lực chính:

### 1. Dự Báo Chi Tiết Theo Tiểu Vùng

Xử lý dữ liệu thời tiết kết hợp với đặc điểm địa hình để tạo góc nhìn chi tiết hơn dự báo cấp tỉnh,
hướng đến cấp huyện, cụm xã và từng nhóm thôn, bản, đặc biệt tại các khu vực có nguy cơ thiên tai cao.

### 2. Cảnh Báo Sớm Kèm Hành Động Cụ Thể

Khi phát hiện mưa lớn, lũ quét, sạt lở, rét hại hoặc sương muối vượt ngưỡng nguy hiểm, hệ thống tự
động tạo bản tin ngắn, dễ hiểu và nêu rõ người dân hoặc cán bộ địa phương cần làm gì trước một thời
hạn cụ thể.

### 3. Đa Kênh Và Đa Ngôn Ngữ

Thông tin được định hướng phân phối qua giao diện web, Zalo, SMS và loa phát thanh công cộng. Nội
dung tiếng Thái và tiếng Mông/Hmong là một phần của lộ trình để phục vụ khu vực đồng bào dân tộc
thiểu số, nhưng chỉ được đưa vào vận hành sau khi có người bản ngữ kiểm định.

### 4. Giao Diện Trực Quan Cho Người Dân

Thay vì yêu cầu người dùng đọc bảng số liệu khí tượng, hệ thống ưu tiên màu sắc, biểu tượng, câu ngắn,
hai mức hành động và đồng hồ đếm ngược.

## Giải Pháp WeatherBridge AI

WeatherBridge AI tạo một cầu nối từ **dữ liệu** đến **quyết định hành động**:

```text
Dữ liệu thời tiết + địa hình + lịch sử thiên tai
                         ↓
          Phân tích nguy cơ theo từng tiểu vùng
                         ↓
         So sánh với ngưỡng cảnh báo nguy hiểm
                         ↓
        Tạo bản tin: nguy cơ + hành động + hạn chót
                         ↓
     Hiển thị trực quan và phân phối đến đúng đối tượng
```

### Phân Tích Nguy Cơ Có Thể Giải Thích

Mỗi loại thiên tai được đánh giá theo cơ chế riêng thay vì sử dụng một công thức chung:

- **Lũ quét:** ưu tiên lượng mưa tích lũy, cường độ mưa ngắn hạn, vùng trũng và khả năng tập trung
  dòng chảy.
- **Sạt lở đất:** ưu tiên quan hệ cường độ - thời lượng mưa, mưa trước đó, độ dốc và độ nhạy địa
  hình.
- **Rét hại và sương muối:** thuộc lộ trình tiếp theo, sử dụng nhiệt độ tối thiểu, độ cao, gió, độ
  ẩm và khả năng tích tụ khí lạnh, không dùng ngưỡng mưa.

Điểm nguy hiểm được tính theo quy tắc xác định và có thể giải thích. AI tạo sinh không được phép tự
thay đổi cấp nguy hiểm; AI chỉ hỗ trợ chuyển kết quả đã tính thành ngôn ngữ ngắn gọn, dễ hiểu.

### Thang Nguy Cơ Và Hành Động

Hệ thống sử dụng năm cấp nguy cơ cho cán bộ chuyên môn và rút gọn thành hai mức hành động cho người
dân:

| Cấp | Ý nghĩa | Hiển thị cho người dân | Hành động chính |
|---|---|---|---|
| 1 | Rất thấp | **CHUẨN BỊ** | Theo dõi thông tin |
| 2 | Thấp | **CHUẨN BỊ** | Kiểm tra người thân và vật dụng thiết yếu |
| 3 | Trung bình | **CHUẨN BỊ** | Sẵn sàng di chuyển, bảo vệ tài sản |
| 4 | Cao | **ĐI NGAY** | Rời khu vực nguy hiểm theo hướng dẫn |
| 5 | Rất cao | **ĐI NGAY** | Sơ tán ngay, ưu tiên bảo vệ tính mạng |

Màu sắc luôn đi cùng biểu tượng và câu chữ để tránh phụ thuộc hoàn toàn vào khả năng phân biệt màu.

### Bản Tin Hành Động Bốn Phần

Mỗi cảnh báo phải có đủ bốn thành phần:

| Thành phần | Câu hỏi được trả lời | Ví dụ |
|---|---|---|
| Sự việc | Chuyện gì xảy ra? | Nguy cơ lũ quét tại khu vực ven suối |
| Mức độ | Nguy hiểm đến đâu? | Cấp 4 - nguy cơ cao |
| Hành động | Cần làm gì? | Đưa người và gia súc lên vị trí cao an toàn |
| Hạn chót | Trước khi nào? | Hoàn thành trong 3 giờ tới |

**Ví dụ bản tin:**

> **ĐI NGAY - NGUY CƠ LŨ QUÉT CAO.** Đưa người và gia súc lên nơi cao an toàn. Không đi qua suối,
> ngầm tràn hoặc khu vực nước chảy xiết. Hoàn thành trong 3 giờ tới và tiếp tục nghe hướng dẫn của
> trưởng bản.

## Đối Tượng Sử Dụng

### Người Dân

Nhận cảnh báo bằng màu, biểu tượng, câu hành động và hạn chót. Thông tin kỹ thuật chỉ hiển thị khi
người dùng muốn xem thêm.

### Trưởng Thôn, Bản

Theo dõi nguy cơ trong phạm vi phụ trách, xác định nhóm hộ cần được hỗ trợ trước và tổ chức nhắc nhở
trực tiếp trong trường hợp người dân không có điện thoại thông minh.

### Cán Bộ Phòng Chống Thiên Tai

Theo dõi bản đồ nguy cơ theo ngày và loại thiên tai, so sánh các khu vực, điều chỉnh ngưỡng trong
phạm vi được phê duyệt và ưu tiên nguồn lực ứng phó.

### Đơn Vị Quản Trị

Theo dõi chất lượng dữ liệu, nguồn gốc mô hình, lịch sử cảnh báo, độ tin cậy và hiệu quả vận hành của
toàn hệ thống.

## Phạm Vi Trình Diễn Hiện Tại

Phiên bản trình diễn tập trung vào xã **Mường Pồn, Điện Biên**, khu vực chịu ảnh hưởng nghiêm trọng
bởi lũ quét và sạt lở.

- Hiển thị dự báo mưa trong **5 ngày**; quy trình thu thập dữ liệu hỗ trợ tầm nhìn **7 ngày**.
- Trình diễn trên **5 khu vực bản**: Mường Pồn 1, Mường Pồn 2, Huổi Chan 1, Bản Lôm và Tin Tốc.
- Phân tích hai loại nguy cơ chính: **lũ quét** và **sạt lở đất**.
- Tự động thay đổi danh sách cảnh báo khi cấp nguy cơ vượt ngưỡng đã chọn.
- Tạo khuyến nghị theo vai trò, nghề nghiệp và nhóm cần ưu tiên hỗ trợ.
- Cho phép xem trải nghiệm của người dân, trưởng bản, cán bộ xã và quản trị viên.

**Giới hạn cần minh bạch:** dữ liệu mưa có thể được lấy trực tiếp từ Open-Meteo cho một tọa độ đại
diện Mường Pồn; địa hình, hộ dân, ngưỡng và sự khác biệt giữa các bản trong bản demo hiện là dữ liệu
mô phỏng có tính xác định. Việc dự báo độc lập cho ít nhất ba địa điểm bằng dữ liệu trực tiếp là bước
hoàn thiện tiếp theo.

## Đối Chiếu Yêu Cầu Tối Thiểu

| Yêu cầu bài thi | WeatherBridge AI đáp ứng như thế nào | Trạng thái hiện tại |
|---|---|---|
| Dự báo 3-7 ngày cho ít nhất 3 địa điểm tại Điện Biên | Trình diễn 5 ngày trên 5 khu vực bản tại Mường Pồn; có quy trình dữ liệu 7 ngày | **Đáp ứng một phần:** cần bổ sung nguồn dự báo độc lập cho ít nhất 3 tọa độ |
| Tự động cảnh báo khi vượt ngưỡng nguy hiểm | Điểm nguy cơ được quy đổi thành 5 cấp và tự tạo cảnh báo khi đạt ngưỡng | **Đã có trong bản demo** |
| Giao diện đơn giản, người không đọc được dự báo vẫn hiểu | Màu, biểu tượng, hai nhãn `CHUẨN BỊ`/`ĐI NGAY`, câu hành động và hạn chót | **Đã có trong bản demo** |
| Cảnh báo kèm hành động cụ thể | Bản tin bốn phần và khuyến nghị theo nhóm người dùng | **Đã có trong bản demo** |
| Đa kênh Zalo, SMS, loa phát thanh | Đã xác định kịch bản và lộ trình tích hợp | **Chưa vận hành, thuộc giai đoạn tiếp theo** |
| Tiếng Thái và tiếng Mông/Hmong | Đã xác định yêu cầu dịch và chuyển văn bản thành giọng nói | **Chưa vận hành, cần kiểm định người bản ngữ** |
| Tài liệu kiến trúc và deck một trang | Có tài liệu thiết kế giải pháp, luồng dữ liệu, lộ trình và dàn ý deck | **Đã chuẩn bị** |

## Nguồn Dữ Liệu

| Nhóm dữ liệu | Nguồn dự kiến hoặc đang sử dụng | Vai trò |
|---|---|---|
| Dự báo thời tiết | Open-Meteo; OpenWeatherMap là nguồn mở rộng | Mưa, nhiệt độ, gió và tầm nhìn 3-7 ngày |
| Quan trắc địa phương | Đài Khí tượng Thủy văn Điện Biên | Hiệu chỉnh và xác nhận điều kiện thực tế |
| Lịch sử thiên tai | Ban Chỉ huy PCTT và Tìm kiếm cứu nạn Điện Biên | Xác định khu vực từng bị ảnh hưởng và kiểm định ngưỡng |
| Địa hình | SRTM/DEM và các lớp dẫn xuất địa hình | Độ dốc, hướng dốc, dòng chảy và vùng trũng |
| Mưa lịch sử | ERA5/ERA5-Land, GPM IMERG | Phân tích quá khứ và kiểm định, không dùng như dự báo tương lai |
| Thảm phủ bề mặt | ESA WorldCover và nguồn dữ liệu công khai phù hợp | Bổ sung độ nhạy sạt lở và khả năng tập trung dòng chảy |

Mọi nguồn dữ liệu phải được ghi nhận nguồn gốc, giấy phép, thời điểm thu thập và giới hạn sử dụng.
Dữ liệu quan trắc lịch sử không được trình bày sai thành dữ liệu dự báo.

## Điểm Khác Biệt

### Không Chỉ Hiển Thị Con Số

WeatherBridge AI không dừng ở nhiệt độ, lượng mưa hay phần trăm rủi ro. Kết quả cuối cùng là một
quyết định hành động có hạn chót.

### Chi Tiết Theo Địa Hình

Trong điều kiện lưới dự báo thời tiết còn thô, giải pháp sử dụng đặc điểm địa hình để xác định nơi
có khả năng chịu ảnh hưởng cao hơn. Hệ thống không tuyên bố thời tiết chính xác đến từng hộ dân.

### AI Có Giới Hạn An Toàn Rõ Ràng

Mô hình xác định cấp nguy hiểm hoạt động độc lập với AI tạo sinh. Nội dung do AI diễn đạt phải dựa
trên số liệu và mức cảnh báo đã được khóa, có thể kiểm tra lại và luôn kèm độ tin cậy.

### Hướng Đến Chặng Cuối Cùng

Giá trị của cảnh báo chỉ xuất hiện khi người cần nhận thực sự hiểu và hành động. Vì vậy, lộ trình
không chỉ có ứng dụng web mà còn bao gồm trưởng bản, loa công cộng, Zalo, SMS và ngôn ngữ bản địa.

## Tác Động Kỳ Vọng

- Rút ngắn thời gian từ khi có dữ liệu dự báo đến khi người dân nhận được hướng dẫn hành động.
- Giảm số cảnh báo chung chung, khó hiểu hoặc không phù hợp với từng khu vực.
- Hỗ trợ cán bộ ưu tiên đúng bản và đúng nhóm người cần giúp đỡ trước.
- Giảm thiệt hại về người, cây trồng, vật nuôi, tài sản và giao thông nông thôn.
- Tạo dữ liệu phản hồi để từng bước hiệu chỉnh ngưỡng cảnh báo theo điều kiện Điện Biên.

## Chỉ Số Đánh Giá

| Nhóm chỉ số | Cách đo đề xuất |
|---|---|
| Khả năng phát hiện | Tỷ lệ khu vực thực sự bị ảnh hưởng nằm trong vùng cảnh báo |
| Báo động giả | Tỷ lệ khu vực bị cảnh báo nhưng không xảy ra sự cố |
| Tính kịp thời | Thời gian từ khi có dự báo mới đến khi sinh cảnh báo |
| Tính dễ hiểu | Tỷ lệ người dùng chọn đúng hành động sau khi xem cảnh báo |
| Tính đầy đủ | Tỷ lệ bản tin có đủ sự việc, mức độ, hành động và hạn chót |
| Khả năng tiếp cận | Tỷ lệ người nhận được cảnh báo qua ít nhất một kênh phù hợp |
| Hiệu quả chặng cuối | Tỷ lệ hộ ưu tiên được trưởng bản xác nhận đã nhắc hoặc hỗ trợ |

Đối với mô hình thiên tai, khả năng giảm bỏ sót được ưu tiên nhưng phải luôn theo dõi báo động giả
để tránh gây mệt mỏi cảnh báo.

## Lộ Trình Phát Triển

### Giai Đoạn 1 - Hoàn Thiện Bản Trình Diễn

- Bổ sung dự báo độc lập cho ít nhất ba địa điểm tại Điện Biên.
- Hoàn thiện cảnh báo lũ quét và sạt lở theo ngưỡng cấu hình.
- Trình diễn đầy đủ trải nghiệm người dân và cán bộ địa phương.
- Kiểm định lại các ngưỡng bằng sự kiện thiên tai lịch sử.

### Giai Đoạn 2 - Thí Điểm Tại Địa Phương

- Kết nối dữ liệu từ Đài Khí tượng Thủy văn Điện Biên.
- Làm việc với cơ quan PCTT để phê duyệt ngưỡng và hướng dẫn hành động.
- Thử nghiệm Zalo, SMS và quy trình trưởng bản nhắc trực tiếp.
- Đánh giá khả năng hiểu cảnh báo với người dân thực tế.

### Giai Đoạn 3 - Đa Ngôn Ngữ Và Loa Phát Thanh

- Xây dựng nội dung tiếng Thái và tiếng Mông/Hmong.
- Kiểm định bản dịch và giọng đọc với người bản ngữ.
- Tích hợp chuyển văn bản thành giọng nói và loa phát thanh bản.
- Bổ sung xác nhận đã nhận, đã nhắc và cơ chế chuyển cấp khi quá hạn.

### Giai Đoạn 4 - Mở Rộng Toàn Tỉnh

- Mở rộng theo cụm xã và huyện có nguy cơ cao.
- Bổ sung rét hại, sương muối, sương mù và mưa lớn theo mô hình riêng.
- Theo dõi chất lượng dự báo, cảnh báo giả và hiệu quả ứng phó theo mùa.
- Thiết lập quy trình vận hành, giám sát, sao lưu và ứng phó sự cố.

## Nguyên Tắc An Toàn Và Trách Nhiệm

- WeatherBridge AI là **công cụ hỗ trợ**, không thay thế cảnh báo chính thức của cơ quan khí tượng
  thủy văn và phòng chống thiên tai.
- Không sử dụng dữ liệu cá nhân thật trong bản trình diễn.
- Không để AI tạo sinh tự quyết định mức nguy hiểm.
- Luôn hiển thị nguồn dữ liệu, thời gian cập nhật, độ tin cậy và giới hạn của kết quả.
- Ngưỡng cảnh báo và hướng dẫn hành động phải được chuyên gia địa phương phê duyệt trước khi vận
  hành thực tế.
- Nội dung tiếng dân tộc và giọng đọc phải được người bản ngữ kiểm định vì sai lệch có thể gây rủi
  ro đến tính mạng.

## Tầm Nhìn

WeatherBridge AI hướng tới một hệ thống cảnh báo mà ở đó dữ liệu không dừng lại trên bản đồ hay bảng
số liệu. Mỗi tín hiệu nguy hiểm phải được chuyển thành một hướng dẫn rõ ràng, đến được đúng người và
đủ sớm để họ có thể bảo vệ bản thân, gia đình và cộng đồng.

> **WeatherBridge AI - Không đẩy con số, đẩy hành động.**

Hướng dẫn cài đặt và chạy bản trình diễn: [INSTALLATION.md](INSTALLATION.md).
