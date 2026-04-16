# Tài Liệu Tích Hợp Frontend Với Backend

Tài liệu này dành cho frontend developer cần tích hợp các tính năng:
- đăng ký
- đăng nhập
- duy trì phiên đăng nhập
- hiển thị ECG chart
- chat trực tiếp giữa bác sĩ và bệnh nhân

Lưu ý quan trọng:
- Trong hệ thống hiện tại có **2 loại chat khác nhau**:
  - `POST /api/chat`: chat với trợ lý AI
  - `/api/chat/direct/*`: chat trực tiếp giữa bác sĩ và bệnh nhân
- Tài liệu này tập trung vào **đăng nhập / đăng ký / ECG chart / direct chat**.

## 1. Thông tin nền tảng

### Base URL
- HTTP API: `${API_BASE_URL}/api`
- Socket.IO: `${API_BASE_URL}`

### Kiểu xác thực đang dùng
Backend đang dùng mô hình **access token + refresh token**:
- access token: trả về trong body JSON, frontend nên lưu ở memory hoặc `localStorage`
- refresh token: backend set vào cookie `httpOnly`, frontend **không đọc trực tiếp** được
- khi gọi API cần gửi header:
  - `Authorization: Bearer <access_token>`
- khi gọi refresh token cần để `withCredentials: true`

### Vai trò người dùng
Giá trị role mà frontend sẽ nhận từ API:
- `bệnh nhân`
- `bác sĩ`
- `gia đình`
- `admin`

## 2. Đăng ký và đăng nhập

### 2.1. Đăng ký
**Endpoint**
- `POST /api/auth/register`

**Request body**
```json
{
  "name": "Nguyễn Văn An",
  "email": "patient@example.com",
  "password": "123456",
  "role": "bệnh nhân"
}
```

**Response thành công**
```json
{
  "message": "Đăng ký thành công",
  "token": "<access_token>",
  "user": {
    "user_id": 1,
    "name": "Nguyễn Văn An",
    "email": "patient@example.com",
    "role": "bệnh nhân"
  }
}
```

**Frontend nên làm gì sau khi đăng ký thành công**
1. Lưu `token`
2. Lưu `user`
3. Điều hướng theo `role`
4. Không cần gọi login lại vì backend đã cấp luôn token

### 2.2. Đăng nhập
**Endpoint**
- `POST /api/auth/login`

**Request body**
```json
{
  "email": "patient@example.com",
  "password": "123456"
}
```

**Response thành công**
```json
{
  "message": "Đăng nhập thành công",
  "token": "<access_token>",
  "user": {
    "user_id": 1,
    "name": "Nguyễn Văn An",
    "email": "patient@example.com",
    "role": "bệnh nhân"
  }
}
```

**Frontend nên làm gì sau khi đăng nhập thành công**
1. Lưu `token`
2. Gắn `Authorization: Bearer <token>` cho các request sau
3. Lưu `user`
4. Kết nối Socket.IO sau khi đã có `user_id` và `role`

### 2.3. Lấy thông tin phiên hiện tại
**Endpoint**
- `GET /api/auth/me`

**Header**
```http
Authorization: Bearer <access_token>
```

**Response**
```json
{
  "user": {
    "user_id": 1,
    "name": "Nguyễn Văn An",
    "email": "patient@example.com",
    "role": "bệnh nhân",
    "is_active": true,
    "created_at": "2026-01-01T00:00:00.000Z",
    "updated_at": "2026-01-01T00:00:00.000Z"
  }
}
```

### 2.4. Refresh token
**Endpoint**
- `POST /api/auth/refresh`

**Yêu cầu**
- request phải có `withCredentials: true`
- frontend không gửi body
- backend đọc refresh token từ cookie

**Response thành công**
```json
{
  "message": "Lam moi token thanh cong",
  "token": "<access_token_moi>",
  "user": {
    "user_id": 1,
    "name": "Nguyễn Văn An",
    "email": "patient@example.com",
    "role": "bệnh nhân"
  }
}
```

**Khuyến nghị tích hợp**
- dùng một axios instance chung
- nếu gặp `401`, gọi refresh **một lần duy nhất**, rồi retry request cũ
- nếu refresh cũng lỗi, xóa token local và logout mềm ở client

### 2.5. Đăng xuất
**Endpoint**
- `POST /api/auth/logout`

**Response**
```json
{
  "message": "Đăng xuất thành công"
}
```

**Frontend nên làm gì**
- xóa token local
- xóa user state
- ngắt socket nếu đang mở
- chuyển về màn hình login

## 3. Hiển thị ECG chart

ECG chart hiện tại được dựng từ dữ liệu reading chi tiết.

### 3.1. Lấy danh sách reading
**Endpoint**
- `GET /api/readings/history/:user_id`

**Ví dụ**
```http
GET /api/readings/history/1?limit=20&offset=0
Authorization: Bearer <token>
```

**Response**
```json
{
  "readings": [
    {
      "reading_id": 101,
      "device_id": 1,
      "timestamp": "2026-03-22T02:25:00.000Z",
      "heart_rate": 78,
      "ecg_signal": [...],
      "abnormal_detected": false,
      "ai_result": "Bình thường",
      "ai_status": "DONE",
      "ai_error": null,
      "ai_completed_at": "2026-03-22T02:25:06.000Z",
      "device": {
        "device_id": 1,
        "serial_number": "SN-ECG-0001"
      }
    }
  ]
}
```

**Dùng khi nào**
- màn lịch sử reading
- dashboard lấy reading gần nhất
- màn hồ sơ bệnh nhân cần danh sách bản ghi gần đây

### 3.2. Lấy chi tiết một reading để vẽ chart
**Endpoint**
- `GET /api/readings/detail/:reading_id`

**Response**
```json
{
  "reading": {
    "reading_id": 101,
    "timestamp": "2026-03-22T02:25:00.000Z",
    "heart_rate": 78,
    "ecg_signal": [0.0, 0.01, 0.03],
    "abnormal_detected": false,
    "ai_result": "Bình thường",
    "ai_status": "DONE",
    "ai_error": null,
    "ai_completed_at": "2026-03-22T02:25:06.000Z",
    "device": {
      "device_id": 1,
      "serial_number": "SN-ECG-0001"
    },
    "patient": {
      "user_id": 1,
      "name": "Nguyễn Văn An",
      "email": "patient@example.com"
    },
    "alerts": [
      {
        "alert_id": 33,
        "alert_type": "PVC",
        "label_code": "V",
        "label_text": "Ngoại tâm thu thất",
        "segment_start_sample": 120,
        "segment_end_sample": 168,
        "timestamp": "2026-01-14T04:10:12.000Z",
        "resolved": false
      }
    ]
  }
}
```

### 3.3. Frontend cần dùng các field nào cho ECG chart

#### Bắt buộc
- `reading.ecg_signal`
- `reading.heart_rate`
- `reading.timestamp`

#### Nếu muốn highlight segment bất thường
- `reading.alerts[]`
  - `segment_start_sample`
  - `segment_end_sample`
  - `label_code`
  - `label_text`

#### Nếu muốn hiển thị trạng thái AI
- `reading.ai_status`
- `reading.ai_result`
- `reading.ai_error`
- `reading.ai_completed_at`

### 3.4. Quy tắc hiển thị nên dùng
- `ecg_signal` có thể là JSON array thật hoặc string JSON, nên frontend nên normalize trước khi vẽ
- chỉ vẽ highlight khi:
  - `ai_status === "DONE"`
  - `segment_start_sample` và `segment_end_sample` hợp lệ
- nếu `ai_status === "PENDING"`:
  - hiển thị loading hoặc trạng thái “đang phân tích”
- nếu `ai_status === "FAILED"`:
  - không cố render phần bất thường từ AI
  - hiển thị `ai_error` nếu có

### 3.5. Realtime cho ECG / AI
Socket event liên quan:
- `reading-ai-updated`

Payload thường có dạng:
```json
{
  "reading_id": 101,
  "user_id": 1,
  "serial_number": "SN-ECG-0001",
  "ai_status": "DONE",
  "ai_result": "Bình thường",
  "abnormal_detected": false,
  "heart_rate": 78,
  "timestamp": "2026-03-22T02:25:06.000Z"
}
```

**Frontend nên làm gì khi nhận event này**
- nếu đang mở đúng `reading_id`:
  - gọi lại `GET /api/readings/detail/:reading_id`
  - hoặc cập nhật state hiện tại nếu payload đã đủ
- nếu event có `ai_status === "FAILED"`:
  - hiển thị lỗi AI nếu cần

## 4. Chat trực tiếp giữa bác sĩ và bệnh nhân

Direct chat chỉ hỗ trợ giữa:
- `bệnh nhân <-> bác sĩ`

Điều kiện backend kiểm tra:
- bác sĩ phải có quyền truy cập `accepted` từ bệnh nhân

### 4.1. Lấy danh sách contact direct chat
**Endpoint**
- `GET /api/chat/contacts`

**Response**
```json
{
  "contacts": [
    {
      "user_id": 12,
      "name": "BS. Trần Thị Mai",
      "email": "doctor@example.com",
      "role": "BAC_SI",
      "conversation_key": "1_12",
      "last_message": "Kết quả tái khám hôm nay ổn hơn nhiều.",
      "last_message_at": "2026-03-22T05:10:00.000Z",
      "unread_count": 1
    }
  ]
}
```

**Dùng khi nào**
- sidebar danh sách hội thoại
- badge unread từng contact
- preview tin nhắn cuối cùng

### 4.2. Lấy lịch sử hội thoại direct
**Endpoint**
- `GET /api/chat/direct/:other_user_id`

**Query params hỗ trợ**
- `limit`
- `offset` (legacy)
- `cursor` (mới, nên ưu tiên)

**Response**
```json
{
  "conversation_key": "1_12",
  "contact": {
    "user_id": 12,
    "name": "BS. Trần Thị Mai",
    "email": "doctor@example.com",
    "role": "BAC_SI"
  },
  "messages": [
    {
      "message_id": 201,
      "conversation_key": "1_12",
      "sender_id": 1,
      "receiver_id": 12,
      "message": "Bác sĩ ơi, tối qua em lại có cơn hồi hộp.",
      "is_read": true,
      "created_at": "2026-01-14T04:40:00.000Z"
    }
  ],
  "next_cursor": "<base64_cursor>",
  "has_more": true
}
```

### 4.3. Gửi direct message
**Endpoint**
- `POST /api/chat/direct`

**Request body**
```json
{
  "receiver_id": 12,
  "message": "Bác sĩ ơi, em cần tư vấn thêm"
}
```

**Response**
```json
{
  "message": "Gửi tin nhắn thành công",
  "data": {
    "message_id": 250,
    "conversation_key": "1_12",
    "sender_id": 1,
    "receiver_id": 12,
    "message": "Bác sĩ ơi, em cần tư vấn thêm",
    "is_read": false,
    "created_at": "2026-04-16T10:00:00.000Z"
  }
}
```

### 4.4. Đánh dấu đã đọc
**Endpoint**
- `PUT /api/chat/direct/:other_user_id/read`

**Response**
```json
{
  "updated": 3
}
```

Ý nghĩa:
- có `3` message incoming trong hội thoại vừa được đánh dấu `is_read = true`

## 5. Socket.IO cho direct chat

### 5.1. Kết nối socket
Sau khi frontend có `user_id` và `role`, cần kết nối Socket.IO tới base URL server.

Sau khi `connect`, frontend nên emit:
```js
socket.emit("join-user-room", userId)
socket.emit("join-role-room", userRole)
```

### 5.2. Các event frontend nên lắng nghe

#### `direct-message:new`
Payload chính là một bản ghi `DirectMessage` mới tạo:
```json
{
  "message_id": 250,
  "conversation_key": "1_12",
  "sender_id": 1,
  "receiver_id": 12,
  "message": "Bác sĩ ơi, em cần tư vấn thêm",
  "is_read": false,
  "created_at": "2026-04-16T10:00:00.000Z"
}
```

**Frontend nên làm gì**
- nếu đang mở đúng hội thoại:
  - append message vào danh sách hiện tại
  - nếu đây là message incoming thì gọi API `mark read`
- nếu không mở đúng hội thoại:
  - cập nhật `last_message`
  - cập nhật `last_message_at`
  - tăng `unread_count` cục bộ

#### `notification:new`
Đây là notification hệ thống, trong direct chat nó thường được tạo sau khi queue background xử lý xong.

Payload thường có dạng:
```json
{
  "notification_id": 88,
  "type": "DIRECT_MESSAGE",
  "title": "Tin nhắn mới",
  "message": "Kết quả tái khám hôm nay ổn hơn nhiều.",
  "entity_type": "direct_message",
  "entity_id": 250,
  "payload": {
    "conversation_key": "1_12",
    "sender_id": 12,
    "receiver_id": 1
  },
  "created_at": "2026-03-22T05:10:05.000Z",
  "is_read": false
}
```

**Frontend nên dùng để làm gì**
- tăng badge chuông notification
- hiển thị toast “Tin nhắn mới” nếu UX cần
- điều hướng vào màn chat khi user bấm notification

### 5.3. Event AI / không nhầm lẫn với direct chat
- `POST /api/chat` là chat AI bằng HTTP, không phải socket realtime
- `direct-message:new` là direct chat giữa bác sĩ và bệnh nhân

## 6. Luồng frontend đề xuất

### 6.1. Luồng auth
1. User đăng nhập hoặc đăng ký
2. Lưu `token`
3. Gọi `GET /api/auth/me` khi app mount để restore session
4. Tạo axios interceptor refresh token
5. Sau khi có user, mở socket

### 6.2. Luồng ECG chart
1. Gọi `GET /api/readings/history/:user_id` để lấy danh sách reading
2. Chọn `reading_id` cần xem
3. Gọi `GET /api/readings/detail/:reading_id`
4. Normalize `ecg_signal`
5. Render chart
6. Nếu đang mở modal/detail thì lắng nghe `reading-ai-updated`

### 6.3. Luồng direct chat
1. Gọi `GET /api/chat/contacts`
2. Chọn contact
3. Gọi `GET /api/chat/direct/:other_user_id?limit=50`
4. Hiển thị messages theo thứ tự tăng dần thời gian
5. Khi gửi tin nhắn, gọi `POST /api/chat/direct`
6. Khi nhận `direct-message:new`, cập nhật local state
7. Khi mở đúng hội thoại, gọi `PUT /api/chat/direct/:other_user_id/read`

## 7. Interface gợi ý cho frontend

```ts
export type AuthUser = {
  user_id: number
  name: string
  email: string
  role: "bệnh nhân" | "bác sĩ" | "gia đình" | "admin"
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export type ReadingAlert = {
  alert_id: number
  alert_type: string
  label_code?: string | null
  label_text?: string | null
  segment_start_sample: number
  segment_end_sample: number
  timestamp: string
  resolved: boolean
}

export type ReadingDetail = {
  reading_id: number
  timestamp: string
  heart_rate: number
  ecg_signal: number[] | string
  abnormal_detected: boolean
  ai_result?: string | null
  ai_status: "PENDING" | "DONE" | "FAILED"
  ai_error?: string | null
  ai_completed_at?: string | null
  device: {
    device_id: number
    serial_number: string
  }
  patient: {
    user_id: number
    name: string
    email: string
  }
  alerts: ReadingAlert[]
}

export type DirectChatContact = {
  user_id: number
  name: string
  email: string
  role: string
  conversation_key: string
  last_message: string | null
  last_message_at: string | null
  unread_count: number
}

export type DirectMessage = {
  message_id: number
  conversation_key: string
  sender_id: number
  receiver_id: number
  message: string
  is_read: boolean
  created_at: string
}
```

## 8. Lưu ý tích hợp thực tế

- `withCredentials: true` là bắt buộc nếu muốn refresh token hoạt động đúng
- direct chat hiện tại không hỗ trợ mọi role nhắn cho mọi role; chỉ `bệnh nhân <-> bác sĩ`
- direct chat còn phụ thuộc `accessPermission.status = accepted`
- `role` trong một số API direct chat có thể trả theo enum DB như `BAC_SI`, trong khi auth trả text tiếng Việt; frontend nên normalize một lớp chung
- `notification:new` và `direct-message:new` là hai luồng khác nhau, không nên trộn logic xử lý
- `reading detail` là API quan trọng nhất để render ECG chart đúng vì đã có sẵn `alerts` để highlight segment

## 9. Nhầm lẫn thường gặp

### `POST /api/chat` có phải direct chat không?
Không. Đây là chat với trợ lý AI.

### Dùng API nào để vẽ ECG chart?
- danh sách: `GET /api/readings/history/:user_id`
- chi tiết để vẽ: `GET /api/readings/detail/:reading_id`

### Badge unread của direct chat lấy từ đâu?
Từ `GET /api/chat/contacts`, field `unread_count`.

### Khi nào cần gọi `mark read`?
Khi người dùng đang mở đúng hội thoại và đã hiển thị message incoming cho họ.