# Tài Liệu API Response Backend

Tài liệu này mô tả **response hiện tại theo code** của toàn bộ HTTP API trong `server/`.

Quy ước:
- `Endpoint` ghi kèm method.
- `Dùng để làm gì (khi nào)` mô tả mục đích sử dụng ngắn gọn.
- `Cấu trúc response` ưu tiên mô tả **response thành công**; lỗi thường có dạng `{ message: string }` hoặc `{ error: string }` tùy controller.

## Hệ thống / tiện ích

| Endpoint | Dùng để làm gì (khi nào) | Cấu trúc response |
| --- | --- | --- |
| `GET /api/hello` | Đánh thức app và database khi platform sleep, thường gọi sớm khi mở app/login. | Thành công: `{ ok: true, message: "hello", timestamp }`<br>Lỗi: `{ ok: false, message: "database wake failed" }` |
| `GET /test/readings` | Route test nội bộ để xem 20 bản ghi reading mới nhất trên giao diện EJS. | `HTML render` từ view `readings`, không trả JSON API chuẩn. |

## Xác thực

| Endpoint | Dùng để làm gì (khi nào) | Cấu trúc response |
| --- | --- | --- |
| `POST /api/auth/register` | Đăng ký tài khoản mới. | `{ message, token, user: { user_id, name, email, role } }` |
| `POST /api/auth/login` | Đăng nhập, nhận access token và cookie refresh token. | `{ message, token, user: { user_id, name, email, role } }` |
| `POST /api/auth/refresh` | Làm mới access token bằng refresh token trong cookie. | `{ message, token, user: { user_id, name, email, role } }` |
| `POST /api/auth/logout` | Đăng xuất, thu hồi refresh token hiện tại. | `{ message }` |
| `GET /api/auth/me` | Lấy hồ sơ người dùng đang đăng nhập để khôi phục session phía client. | `{ user: { user_id, name, email, role, is_active, created_at, updated_at } }` |

## Người dùng

| Endpoint | Dùng để làm gì (khi nào) | Cấu trúc response |
| --- | --- | --- |
| `GET /api/users` | Admin lấy toàn bộ danh sách người dùng. | `{ users: [{ user_id, name, email, role, is_active, created_at, updated_at }] }` |
| `PUT /api/users/:id` | Admin cập nhật thông tin hoặc trạng thái tài khoản. | `{ message, user: { user_id, name, email, role, is_active, created_at, updated_at } }` |
| `DELETE /api/users/:id` | Admin xóa một người dùng khỏi hệ thống. | `{ message }` |
| `PUT /api/users/change-password` | Người dùng đổi mật khẩu của chính mình. | `{ message }` |

## Thiết bị

| Endpoint | Dùng để làm gì (khi nào) | Cấu trúc response |
| --- | --- | --- |
| `POST /api/devices/register` | Đăng ký thiết bị mới cho bệnh nhân hoặc admin gán thiết bị cho user. | `{ message, device: { device_id, serial_number, user_id, status, created_at, updated_at } }` |
| `GET /api/devices/:user_id` | Lấy danh sách thiết bị của một người dùng. | `{ devices: [{ device_id, serial_number, user_id, status, created_at, updated_at, user (nếu có): { name, email } }] }` |
| `PUT /api/devices/:id/status` | Cập nhật trạng thái thiết bị. | `{ message, device: { device_id, serial_number, user_id, status, created_at, updated_at } }` |
| `GET /api/devices` | Admin lấy toàn bộ thiết bị trong hệ thống. | `{ devices: [{ device_id, serial_number, user_id, status, created_at, updated_at, user: { name, email, role } hoặc null }] }` |

## Reading / telemetry

| Endpoint | Dùng để làm gì (khi nào) | Cấu trúc response |
| --- | --- | --- |
| `POST /api/readings/telemetry` | Thiết bị hoặc backend khác gửi telemetry ECG vào hệ thống qua HTTP. | Thành công: `{ message: "Telemetry data received", data: reading }` |
| `POST /api/readings/fake` | Tạo dữ liệu ECG giả và publish lên MQTT để test luồng realtime/AI. | Thành công: `{ message, data: { device_id, serial_number, topic, message_id } }`<br>Nếu MQTT lỗi: `{ message, code }` |
| `GET /api/readings/detail/:reading_id` | Lấy chi tiết một bản ghi ECG để vẽ đồ thị và xem alert theo segment. | `{ reading: { reading_id, timestamp, heart_rate, ecg_signal, abnormal_detected, ai_result, ai_status, ai_error, ai_completed_at, device: { device_id, serial_number }, patient: { user_id, name, email }, alerts: [{ alert_id, alert_type, label_code, label_text, segment_start_sample, segment_end_sample, timestamp, resolved }] } }` |
| `GET /api/readings/:device_id` | Lấy danh sách reading theo thiết bị, thường dùng cho lịch sử theo device. | `{ readings: [...] }` |
| `GET /api/readings/history/:user_id` | Lấy lịch sử reading của bệnh nhân theo user. | `{ readings: [{ ..., device: { device_id, serial_number } }] }` |

## Cảnh báo

| Endpoint | Dùng để làm gì (khi nào) | Cấu trúc response |
| --- | --- | --- |
| `POST /api/alerts` | Tạo thủ công một cảnh báo mới cho bệnh nhân từ reading cụ thể. | `{ message, alert: { alert_id, user_id, reading_id, alert_type, message, segment_start_sample, segment_end_sample, resolved, timestamp } }` |
| `GET /api/alerts/:user_id` | Lấy danh sách cảnh báo của một bệnh nhân, có thể lọc `resolved`. | `{ alerts: [...] }` |
| `PUT /api/alerts/:id/resolve` | Đánh dấu một cảnh báo là đã xử lý. | `{ message, alert: { ... } }` |
| `GET /api/alerts` | Admin/bác sĩ lấy toàn bộ cảnh báo trong hệ thống. | `{ alerts: [{ ..., user: { name, email, role } hoặc null }] }` |

## Thông báo

| Endpoint | Dùng để làm gì (khi nào) | Cấu trúc response |
| --- | --- | --- |
| `GET /api/notifications` | Lấy danh sách thông báo của user hiện tại, hỗ trợ lọc `is_read`, `type`, `limit`, `offset`. | `{ notifications: [{ notification_id, type, title, message, entity_type, entity_id, payload, created_at, is_read, read_at }] }` |
| `GET /api/notifications/unread-count` | Lấy số lượng thông báo chưa đọc để hiển thị badge chuông. | `{ unread_count }` |
| `PUT /api/notifications/read-all` | Đánh dấu đã đọc tất cả thông báo của user hiện tại. | `{ message, updated }` |
| `PUT /api/notifications/:notification_id/read` | Đánh dấu đã đọc một thông báo cụ thể. | `{ message, updated }` |

## Quyền truy cập

| Endpoint | Dùng để làm gì (khi nào) | Cấu trúc response |
| --- | --- | --- |
| `POST /api/access/share` | Bệnh nhân gửi yêu cầu chia sẻ dữ liệu cho bác sĩ/người thân theo email. | `{ message, data: { permission_id, patient_id, viewer_id, role, status, created_at, updated_at } }` |
| `PUT /api/access/respond/:id` | Bác sĩ/người thân chấp nhận hoặc từ chối yêu cầu truy cập. | `{ message, data: { permission_id, patient_id, viewer_id, role, status, created_at, updated_at } }` |
| `GET /api/access/list/:patient_id` | Lấy toàn bộ quyền truy cập của một bệnh nhân. | `[{ permission_id, patient_id, viewer_id, role, status, created_at, updated_at, viewer: { user_id, name, email, role } hoặc null }]` |
| `DELETE /api/access/:id` | Thu hồi một quyền truy cập đã cấp. | `{ message }` |
| `GET /api/access/pending` | Lấy danh sách yêu cầu truy cập đang chờ user hiện tại phản hồi. | `[{ permission_id, patient_id, viewer_id, role, status, created_at, updated_at, patient: { user_id, name, email, role } hoặc null }]` |

## Chat AI và direct message

| Endpoint | Dùng để làm gì (khi nào) | Cấu trúc response |
| --- | --- | --- |
| `POST /api/chat` | Gửi câu hỏi tới trợ lý AI tim mạch. | `{ response }` |
| `GET /api/chat/history` | Lấy lịch sử chat AI của user hiện tại. | `{ history: [{ chat_id, user_id, role, message, timestamp }] }` |
| `GET /api/chat/contacts` | Lấy danh sách contact direct message mà user được phép chat. | `{ contacts: [{ user_id, name, email, role, conversation_key, last_message, last_message_at, unread_count }] }` |
| `GET /api/chat/direct/:other_user_id` | Lấy lịch sử tin nhắn direct với một người dùng cụ thể; hỗ trợ `limit`, `offset`, `cursor`. | `{ conversation_key, contact: { user_id, name, email, role }, messages: [{ message_id, conversation_key, sender_id, receiver_id, message, is_read, created_at }], next_cursor, has_more }` |
| `POST /api/chat/direct` | Gửi một direct message giữa bệnh nhân và bác sĩ. | `{ message, data: { message_id, conversation_key, sender_id, receiver_id, message, is_read, created_at } }` |
| `PUT /api/chat/direct/:other_user_id/read` | Đánh dấu các tin nhắn direct incoming từ user kia là đã đọc. | `{ updated }` |

## Bệnh sử thống nhất `/api/history`

| Endpoint | Dùng để làm gì (khi nào) | Cấu trúc response |
| --- | --- | --- |
| `GET /api/history/:user_id` | Lấy toàn bộ bệnh sử của một bệnh nhân theo contract chính hiện tại. | `[{ history_id, user_id, doctor_id, doctor_diagnosis, ai_diagnosis, medication, symptoms, condition, notes, deleted_at, created_at, updated_at, doctor: { user_id, name, email, role } hoặc null }]` |
| `POST /api/history` | Tạo mới một bản ghi bệnh sử; bệnh nhân tự tạo hoặc bác sĩ tạo cho bệnh nhân có quyền. | `{ message, data: { history_id, user_id, doctor_id, doctor_diagnosis, ai_diagnosis, medication, symptoms, condition, notes, created_at, updated_at, doctor: { user_id, name, email, role } hoặc null } }` |
| `PUT /api/history/:id` | Cập nhật một bản ghi bệnh sử theo quyền hiện tại. | `{ message, data: { ...medicalHistory, doctor } }` |
| `POST /api/history/:id/symptom` | Nối nhanh một triệu chứng mới vào field `symptoms`. | `{ message, data: { ...medicalHistory, doctor } }` |
| `PATCH /api/history/:id/ai` | Cập nhật phần chẩn đoán AI cho một bản ghi bệnh sử. | `{ message, data: { ...medicalHistory, doctor } }` |
| `DELETE /api/history/:id` | Xóa mềm một bản ghi bệnh sử bằng `deleted_at`. | `{ message }` |

## Báo cáo

| Endpoint | Dùng để làm gì (khi nào) | Cấu trúc response |
| --- | --- | --- |
| `POST /api/reports/:user_id` | Bác sĩ tạo báo cáo y khoa cho bệnh nhân. | `{ message, report: { report_id, user_id, doctor_id, summary, created_at, patient: { name, email }, doctor: { name, email } } }` |
| `GET /api/reports/:user_id` | Lấy danh sách báo cáo của một bệnh nhân. | `{ reports: [{ report_id, user_id, doctor_id, summary, created_at, doctor: { name, email } }] }` |
| `GET /api/reports/doctor/my-reports` | Bác sĩ hoặc admin lấy danh sách báo cáo đã tạo. | `{ reports: [{ report_id, user_id, doctor_id, summary, created_at, patient: { name, email }, doctor: { name, email } }] }` |

## Doctor API legacy

| Endpoint | Dùng để làm gì (khi nào) | Cấu trúc response |
| --- | --- | --- |
| `GET /api/doctor/patients/:viewer_id` | API legacy: bác sĩ lấy danh sách bệnh nhân đã được cấp quyền. | `[{ permission_id, patient_id, viewer_id, role, status, created_at, updated_at, patient: { user_id, name, email, is_active, created_at } }]` |
| `GET /api/doctor/history/:patient_id` | API legacy: bác sĩ lấy bệnh sử của bệnh nhân. | `[{ history_id, user_id, doctor_id, doctor_diagnosis, ai_diagnosis, medication, symptoms, condition, notes, created_at, updated_at, doctor: { user_id, name, email } hoặc null }]` |
| `POST /api/doctor/history` | API legacy: bác sĩ thêm một bản ghi bệnh sử/chẩn đoán. | `{ message, data: { history_id, user_id, doctor_id, doctor_diagnosis, medication, condition, notes, created_at, updated_at } }` |
| `DELETE /api/doctor/history/:id` | API legacy: xóa mềm một bản ghi bệnh sử. | `{ message }` |
| `PUT /api/doctor/history/:id` | API legacy: cập nhật nội dung bệnh sử của bác sĩ. | `{ message, data: { history_id, user_id, doctor_id, doctor_diagnosis, medication, condition, notes, created_at, updated_at } }` |

## Family API legacy

| Endpoint | Dùng để làm gì (khi nào) | Cấu trúc response |
| --- | --- | --- |
| `GET /api/family/patients/:viewer_id` | API legacy: người thân lấy danh sách bệnh nhân đã cấp quyền. | `[{ permission_id, patient_id, viewer_id, role, status, created_at, updated_at, patient: { user_id, name, email } }]` |
| `GET /api/family/history/:patient_id` | API legacy: người thân lấy bệnh sử của bệnh nhân được cấp quyền. | `[{ history_id, user_id, doctor_id, doctor_diagnosis, ai_diagnosis, medication, symptoms, condition, notes, created_at, updated_at, doctor: { user_id, name, email } hoặc null }]` |

## Ghi chú thêm

- Nhiều endpoint lỗi dùng `{ message: string }`, nhưng một số nhóm như `access`, `doctor`, `family`, `medicalHistory` lại dùng `{ error: string }`.
- Một số API legacy vẫn còn tồn tại song song với contract mới hơn, đặc biệt là nhóm `doctor`, `family` và `history`.
- Các response có trường `role`, `status`, `alert_type`, `type` đang phản ánh đúng dữ liệu/enum mà controller hiện tại trả về.