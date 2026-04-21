# Kỹ thuật Backend và Hướng Tối Ưu

Tài liệu này tóm tắt các kỹ thuật hiện đang được dùng trong backend của dự án, đồng thời đề xuất các kỹ thuật có thể thay thế hoặc bổ sung để tăng hiệu suất, độ ổn định và khả năng mở rộng.

## 1. Các kỹ thuật backend đang sử dụng

### 1.1 Kiến trúc API
- Runtime: `Node.js`.
- Framework HTTP: `Express`.
- Tổ chức code theo hướng `route -> controller -> service -> database`.
- Backend vừa xử lý API đồng bộ, vừa xử lý realtime và ingest telemetry trong cùng một process.
- View engine `EJS` vẫn được cấu hình trong `server.js`, chủ yếu phục vụ một số route/test hoặc trang nội bộ.

### 1.2 Xác thực và phân quyền
- Xác thực dùng `JWT Bearer Token` qua middleware `authenticateToken`.
- Token được verify bằng `jsonwebtoken` và `JWT_SECRET`.
- Phân quyền dùng `RBAC` qua middleware `authorizeRoles(...roles)`.
- Role hiện có trong hệ thống:
  - `bệnh nhân`
  - `bác sĩ`
  - `gia đình`
  - `admin`
- Mật khẩu được băm bằng `bcrypt` trước khi lưu DB.

### 1.3 Truy cập dữ liệu và ORM
- ORM sử dụng `Prisma`.
- Cơ sở dữ liệu hiện tại là `MySQL`.
- Prisma schema đã mô hình hóa các thực thể nghiệp vụ chính:
  - `User`
  - `Device`
  - `Reading`
  - `Alert`
  - `Report`
  - `DirectMessage`
  - `AccessPermission`
  - `MedicalHistory`
  - `Notification`
  - `NotificationRecipient`
- Dữ liệu ECG đang được lưu dưới dạng `Json` trong bảng `Reading`.

### 1.4 Bảo mật cơ bản cho API
- `helmet` để thêm HTTP security headers.
- `cors` để kiểm soát truy cập cross-origin từ frontend.
- `express.json()` và `express.urlencoded()` để parse request body.
- Một số route đã có kiểm tra role rõ ràng bằng middleware.

### 1.5 Realtime
- `Socket.IO` được dùng để push dữ liệu realtime về frontend.
- Backend emit nhiều nhóm sự kiện realtime:
  - `reading-update`
  - `alert`
  - `notification:new`
  - `direct-message:new`
  - các event liên quan đến chia sẻ quyền truy cập
- Có `socketService` để quản lý kết nối/room và `socketEmitService` để emit đến đúng người dùng.
- Mô hình room hiện tại xoay quanh `user-{id}`.

### 1.6 Telemetry ingest đa kênh
- Backend nhận telemetry qua 2 đường vào:
  - HTTP API
  - MQTT subscriber
- Cả hai đường đều đi vào chung lõi nghiệp vụ `ingestTelemetry(...)` trong `telemetryIngestService`.
- Đây là một kỹ thuật tốt vì tránh duplicate business logic giữa HTTP và MQTT.

### 1.7 MQTT telemetry pipeline
- Dùng package `mqtt` để kết nối tới broker.
- Có service riêng `mqttTelemetryService.js` để quản lý:
  - connect/reconnect
  - subscribe topic telemetry
  - publish ACK về thiết bị
  - state snapshot
  - cleanup dedupe định kỳ
- Có cơ chế `ACK application-level` cho thiết bị sau khi backend ingest xong.
- Có cơ chế `dedupe` theo cặp `serial + message_id` bằng `Map` in-memory và TTL.
- Có guardrails cho payload:
  - giới hạn kích thước payload
  - kiểm tra JSON hợp lệ
  - kiểm tra `message_id`
  - kiểm tra `serial_number`
  - kiểm tra lệch serial giữa topic và payload

### 1.8 Xử lý AI tín hiệu ECG
- Backend đang chạy phân tích AI ngay trong process Node.
- Thư viện AI chính là `@tensorflow/tfjs`.
- Tiền xử lý tín hiệu dùng thêm `fili` để lọc tín hiệu.
- Service AI hiện tại có các đặc điểm:
  - preprocess ECG
  - infer bằng mô hình CNN
  - fallback an toàn nếu model lỗi hoặc input không hợp lệ
  - tạo tóm tắt kết quả AI để lưu vào reading
  - gom các đoạn bất thường thành nhóm để sinh alert
- Đây là kỹ thuật `in-process inference`: đơn giản để triển khai, nhưng sẽ cạnh tranh CPU/RAM trực tiếp với API server.

### 1.9 Notification pipeline
- Notification được lưu DB trước, sau đó emit realtime.
- `notificationService.js` tạo record `Notification`, tạo `NotificationRecipient`, rồi emit `notification:new` qua Socket.IO.
- Đây là mô hình `persist-first, emit-after`, giúp frontend có thể đồng bộ lại trạng thái kể cả khi bỏ lỡ socket event.

### 1.10 Direct messaging và chia sẻ dữ liệu
- Có bảng `DirectMessage` để lưu chat trực tiếp.
- Có `AccessPermission` để quản lý chia sẻ quyền xem dữ liệu bệnh nhân cho bác sĩ và gia đình.
- Đây là một kỹ thuật `authorization by relationship`: quyền không chỉ dựa trên role mà còn dựa trên quan hệ giữa patient và viewer.

### 1.11 Wake-up endpoint cho hạ tầng ngủ
- Có endpoint `GET /api/hello`.
- Endpoint này chạy `SELECT 1` qua Prisma để đánh thức cả app và database khi hạ tầng serverless/free tier ngủ.
- Đây là kỹ thuật `warm-up endpoint` để giảm độ trễ ở lần truy cập đầu tiên.

### 1.12 Logging hiện tại
- Một phần backend dùng `console.log` và `console.error`.
- Một số luồng quan trọng đã dùng log JSON line như:
  - lifecycle server
  - telemetry ingest
  - MQTT lifecycle
- Đây là nền tảng tốt để nâng lên logging có cấu trúc bài bản hơn.

## 2. Đánh giá ngắn về kiến trúc hiện tại

### Điểm mạnh
- Luồng ingest đã được gom về một service lõi chung.
- Có JWT + RBAC rõ ràng.
- Có realtime bằng Socket.IO.
- Có MQTT ACK và dedupe để tăng độ tin cậy khi nhận dữ liệu từ thiết bị.
- Có AI inference thật thay vì chỉ mock.
- Có notification lưu DB trước khi emit.

### Điểm giới hạn hiện tại
- `dedupe` đang là in-memory nên mất sau khi restart process.
- AI chạy cùng process với API, dễ tranh chấp tài nguyên khi tải tăng.
- Socket.IO hiện phù hợp single-instance; khi scale ngang sẽ cần cơ chế đồng bộ state.
- Logging chưa đồng nhất hoàn toàn.
- Chưa thấy lớp validation request chuẩn hóa mạnh cho toàn bộ input API.
- ECG signal lưu trực tiếp trong DB dạng JSON có thể trở thành bottleneck khi dữ liệu lớn dần.

## 3. Các vấn đề có thể gặp phải và giải pháp hiện có

### 3.1 Thiết bị gửi trùng dữ liệu telemetry
**Vấn đề**
- Thiết bị IoT có thể retry do timeout ACK hoặc mạng không ổn định, dẫn tới cùng một bản tin được gửi nhiều lần.

**Giải pháp hiện có**
- Backend dùng cơ chế dedupe theo cặp `serial + message_id`.
- Nếu phát hiện trùng trong TTL, backend không ingest lại mà trả ACK `ok` với `duplicate=true`.

**Giới hạn còn lại**
- Dedupe hiện là in-memory nên mất hiệu lực nếu process restart hoặc khi scale nhiều instance.

### 3.2 Payload MQTT lỗi hoặc không hợp lệ
**Vấn đề**
- Thiết bị có thể gửi payload JSON lỗi, thiếu `message_id`, thiếu `serial_number`, lệch serial giữa topic và payload, hoặc payload quá lớn.

**Giải pháp hiện có**
- Backend kiểm tra kích thước payload.
- Parse JSON có try/catch.
- Validate các trường bắt buộc.
- Validate serial trong topic khớp với serial trong payload.
- Nếu lỗi, backend publish ACK `error` với `error_code` phù hợp.

### 3.3 AI inference lỗi hoặc tín hiệu đầu vào không đạt điều kiện
**Vấn đề**
- Mô hình AI có thể lỗi khi load/infer, hoặc tín hiệu ECG quá ngắn, quá nhiễu, không đủ điều kiện xử lý.

**Giải pháp hiện có**
- Service AI có cơ chế fallback an toàn.
- Nếu infer lỗi hoặc bị skip, ingest vẫn tiếp tục với kết quả mặc định thay vì làm hỏng toàn bộ luồng lưu reading.
- Có log riêng cho các tình huống `AI_INFER_SKIP` và `AI_INFER_ERROR`.

### 3.4 Mất đồng bộ realtime giữa backend và frontend
**Vấn đề**
- Frontend có thể bỏ lỡ socket event do rớt mạng, reload tab hoặc reconnect chậm.

**Giải pháp hiện có**
- Notification được lưu DB trước khi emit realtime.
- Frontend có thể gọi lại API notifications, unread count, history, alerts để đồng bộ trạng thái.
- Dữ liệu quan trọng không phụ thuộc hoàn toàn vào Socket.IO.

### 3.5 Truy cập trái phép dữ liệu bệnh nhân
**Vấn đề**
- Đây là hệ thống y tế, nên dữ liệu rất nhạy cảm. Nếu kiểm soát quyền lỏng, bác sĩ hoặc người thân có thể xem dữ liệu ngoài phạm vi được cấp.

**Giải pháp hiện có**
- Backend dùng JWT để xác thực người dùng.
- Dùng RBAC để chặn theo role.
- Dùng thêm bảng `AccessPermission` để kiểm soát chia sẻ theo quan hệ thực tế giữa bệnh nhân và người xem.

### 3.6 Hạ tầng free tier ngủ làm request đầu tiên rất chậm
**Vấn đề**
- Khi backend hoặc database ngủ, request đầu tiên có thể timeout hoặc phản hồi rất chậm.

**Giải pháp hiện có**
- Có endpoint `GET /api/hello` để đánh thức backend và database sớm.
- Frontend có thể gọi endpoint này ngay từ màn login để warm-up hệ thống trước khi người dùng thao tác chính.

### 3.7 Tải tăng làm backend chậm dần
**Vấn đề**
- Khi số reading, alert, notification, chat và inference tăng lên, backend có thể bị nghẽn ở DB, ở AI inference hoặc ở luồng realtime.

**Giải pháp hiện có**
- Đã có tách lớp service khá rõ.
- Đã có log ở các luồng ingest, MQTT và server để hỗ trợ truy vết.
- Đã có một số index trong Prisma schema cho notification và direct message.

**Giới hạn còn lại**
- Chưa có cache phân tán, chưa có queue riêng cho tác vụ nặng, chưa có metrics và observability đầy đủ.

### 3.8 Restart process làm mất một phần state tạm
**Vấn đề**
- Một số state runtime như dedupe TTL hoặc kết nối realtime sẽ mất khi app restart.

**Giải pháp hiện có**
- Backend có graceful shutdown cho MQTT và DB.
- Dữ liệu nghiệp vụ quan trọng vẫn nằm trong MySQL qua Prisma.
- Notification, alert, reading, access permission và history không mất theo restart.

**Giới hạn còn lại**
- Các state tạm thời trong memory vẫn chưa bền vững qua restart.

## 4. Kỹ thuật có thể thay thế hoặc bổ sung để tăng hiệu suất backend

### 4.1 Redis để thay cho dedupe in-memory
**Hiện tại**
- `Map` in-memory + TTL trong process Node.

**Có thể thay bằng**
- `Redis` với key TTL.

**Lợi ích**
- Dedupe không mất khi restart app.
- Dùng được cho nhiều instance backend cùng lúc.
- Phù hợp nếu sau này scale ngang hoặc deploy nhiều replica.

**Mức ưu tiên**
- Rất cao nếu backend bắt đầu chạy nhiều instance hoặc MQTT traffic tăng.

### 4.2 Queue/job system cho AI và notification
**Hiện tại**
- Ingest, AI inference, tạo alert, tạo notification đều chạy ngay trong request/message flow.

**Có thể thay bằng**
- `BullMQ + Redis`
- hoặc `RabbitMQ`
- hoặc `Kafka` nếu hệ thống lớn hơn nhiều

**Lợi ích**
- Tách tác vụ nặng khỏi đường nóng của API/MQTT consumer.
- Giảm thời gian block request.
- Dễ retry các tác vụ AI/notification riêng biệt.
- Hệ thống ổn định hơn khi có spike telemetry.

**Tradeoff**
- Phức tạp hơn trong vận hành.
- Cần thêm worker process.

**Mức ưu tiên**
- Cao nếu ingest bắt đầu chậm hoặc AI inference làm API trễ rõ rệt.

### 4.3 Tách AI inference ra service riêng
**Hiện tại**
- `@tensorflow/tfjs` chạy trong chính backend Node.

**Có thể thay bằng**
- `@tensorflow/tfjs-node` nếu môi trường cho phép native binding
- `ONNX Runtime`
- service Python riêng dùng `TensorFlow` hoặc `PyTorch`
- microservice AI riêng giao tiếp qua HTTP hoặc queue

**Lợi ích**
- Tăng tốc inference.
- Giảm cạnh tranh CPU và RAM với luồng API.
- Dễ scale AI và API độc lập.

**Mức ưu tiên**
- Cao nếu model ngày càng nặng hoặc số reading tăng.

### 4.4 Validation layer chuẩn hóa cho input
**Hiện tại**
- Có nhiều kiểm tra thủ công trong controller và service.

**Có thể bổ sung**
- `zod`
- `joi`
- `express-validator`

**Lợi ích**
- Fail sớm ở biên request.
- Mã nguồn dễ bảo trì hơn.
- Giảm số nhánh kiểm tra thủ công trong service.
- Hạn chế input xấu đi sâu vào lõi nghiệp vụ.

**Mức ưu tiên**
- Cao. Đây là cải tiến chất lượng và độ ổn định, chi phí triển khai vừa phải.

### 4.5 Rate limiting và abuse protection
**Hiện tại**
- Chưa thấy lớp rate limit rõ ràng cho auth và API nhạy cảm.

**Có thể bổ sung**
- `express-rate-limit`
- `slow-down`
- hoặc rate limit theo Redis nếu nhiều instance

**Lợi ích**
- Bảo vệ login, notification, chat, telemetry HTTP.
- Giảm nguy cơ flood request làm nghẽn server.

**Mức ưu tiên**
- Cao với route auth và route public-facing.

### 4.6 Tối ưu truy vấn DB và index
**Hiện tại**
- Prisma schema đã có một số index, nhưng vẫn còn dư địa tối ưu.

**Có thể bổ sung**
- index cho các truy vấn lịch sử reading theo `device_id + timestamp`
- index cho alert theo `user_id + resolved + timestamp`
- index cho access permission theo `patient_id + status`
- index cho medical history theo `user_id + created_at`

**Lợi ích**
- Giảm thời gian query cho dashboard, lịch sử, cảnh báo và notification.
- Giảm tải DB khi dữ liệu tăng.

**Mức ưu tiên**
- Rất cao. Đây là tối ưu hiệu quả và ít rủi ro.

### 4.7 Structured logging chuyên dụng
**Hiện tại**
- Log một phần đã ở dạng JSON, nhưng chưa thống nhất.

**Có thể thay bằng hoặc bổ sung**
- `pino`
- `winston`

**Lợi ích**
- Log đồng nhất, dễ lọc, dễ đưa vào ELK, Loki hoặc Grafana.
- Có thể log level rõ ràng: `info`, `warn`, `error`, `debug`.
- Tốt hơn cho production observability.

**Mức ưu tiên**
- Trung bình đến cao.

### 4.8 Metrics và observability
**Hiện tại**
- Chưa thấy hệ metrics hoặc trace rõ ràng.

**Có thể bổ sung**
- `prom-client` cho Prometheus metrics
- OpenTelemetry cho tracing
- health endpoint hoặc readiness endpoint riêng

**Lợi ích**
- Đo chính xác latency của ingest, AI inference, DB query, MQTT ACK.
- Phát hiện bottleneck bằng số liệu thay vì cảm giác.

**Mức ưu tiên**
- Trung bình, nhưng rất quan trọng khi bước vào production thực sự.

### 4.9 Scale realtime bằng Socket.IO adapter
**Hiện tại**
- Socket.IO phù hợp một instance.

**Có thể bổ sung**
- `@socket.io/redis-adapter`

**Lợi ích**
- Nhiều instance backend vẫn emit đúng đến user rooms.
- Realtime không bị lệch khi scale ngang.

**Mức ưu tiên**
- Cao nếu triển khai nhiều replica backend.

### 4.10 Caching cho dữ liệu đọc nhiều
**Hiện tại**
- Mọi thứ chủ yếu đi DB trực tiếp.

**Có thể bổ sung**
- Redis cache cho:
  - unread notification count
  - danh sách contact chat
  - latest reading theo device hoặc user
  - access permission lookup

**Lợi ích**
- Giảm query lặp lại.
- Tăng tốc dashboard và navbar counters.

**Mức ưu tiên**
- Trung bình, tùy pattern truy cập thực tế.

### 4.11 Tách lưu trữ tín hiệu ECG khỏi bảng nghiệp vụ nếu dữ liệu phình to
**Hiện tại**
- `ecg_signal` lưu trực tiếp dạng `Json` trong bảng `Reading`.

**Có thể thay bằng**
- object storage như S3 hoặc MinIO
- file blob storage
- time-series store hoặc bảng riêng cho waveform chunk

**Lợi ích**
- Giảm kích thước row trong bảng nghiệp vụ.
- DB query metadata nhanh hơn.
- Dễ quản lý dữ liệu waveform lớn về dài hạn.

**Tradeoff**
- Tăng độ phức tạp lưu trữ và truy xuất.

**Mức ưu tiên**
- Trung bình hiện tại, cao nếu số reading tăng nhanh.

### 4.12 Cursor pagination thay cho offset pagination ở các danh sách lớn
**Hiện tại**
- Một số danh sách đang đi theo kiểu truy vấn truyền thống.

**Có thể thay bằng**
- cursor-based pagination.

**Lợi ích**
- Ổn định hơn khi dữ liệu lớn.
- Tránh query chậm ở offset sâu.

**Mức ưu tiên**
- Trung bình.

## 5. Đề xuất ưu tiên thực tế cho dự án này

### Ưu tiên 1: nên làm sớm
1. Thêm validation layer chuẩn hóa cho input API và telemetry.
2. Bổ sung rate limit cho auth và một số route nhạy cảm.
3. Rà soát và bổ sung index DB cho reading, alert, history, access và notification.
4. Chuyển dedupe MQTT từ in-memory sang Redis nếu chuẩn bị scale hoặc cần độ tin cậy cao hơn.

### Ưu tiên 2: nên làm khi tải bắt đầu tăng
1. Tách AI inference khỏi request path bằng queue hoặc service riêng.
2. Bổ sung metrics cho ingest, AI, DB và MQTT ACK.
3. Chuẩn hóa logging bằng `pino` hoặc `winston`.
4. Cân nhắc cache Redis cho unread count, latest reading và access lookup.

### Ưu tiên 3: nên làm khi mở rộng hệ thống
1. Dùng `Socket.IO Redis Adapter` để scale realtime đa instance.
2. Tách lưu trữ ECG waveform khỏi row `Reading` nếu dữ liệu quá lớn.
3. Đưa notification fanout và xử lý AI sang worker riêng.
4. Cân nhắc microservice hóa các phần nặng như AI hoặc ingest pipeline.

## 6. Kết luận

Backend hiện tại đã có nền tảng tốt cho một hệ thống theo dõi tim mạch thời gian thực:
- có JWT + RBAC
- có MQTT ingest + ACK + dedupe
- có AI inference thật
- có notification lưu DB + emit realtime
- có mô hình chia sẻ quyền dữ liệu bệnh nhân rõ ràng

Nếu mục tiêu tiếp theo là tăng hiệu suất và độ bền vững, hướng nâng cấp đáng giá nhất không phải là thay toàn bộ stack, mà là bổ sung đúng các lớp còn thiếu:
- validation
- rate limit
- index DB
- Redis cho dedupe, cache và realtime scale
- queue hoặc service riêng cho AI và các tác vụ nặng

Đó là lộ trình thực tế, ít rủi ro và phù hợp nhất với codebase backend hiện tại.
