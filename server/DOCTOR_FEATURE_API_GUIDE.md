# Doctor API Guide: EHR, Đặt lịch khám, Nhắc uống thuốc

Tài liệu này tổng hợp API backend dành cho phía bác sĩ cho 3 chức năng:
- EHR (hồ sơ sức khỏe bệnh nhân)
- Đặt lịch khám
- Kê đơn và theo dõi nhắc uống thuốc

Nội dung bám theo code hiện tại trong các controller/route backend.

## 1. Chuẩn gọi API chung

- Base URL: `/api`
- Auth bắt buộc: `Authorization: Bearer <access_token>`
- Role bác sĩ trong token: `bác sĩ`

### 1.1 Lỗi auth/permission thường gặp

- `401 { "message": "Thieu token xac thuc" }`
- `401 { "message": "Token khong hop le" }`
- `401 { "message": "Token da het han" }`
- `403 { "message": "Không có quyền truy cập" }` (middleware role)
- `403 { "message": "...không có quyền..." }` (controller domain-level)

## 2. Điều kiện quyền để bác sĩ thao tác dữ liệu bệnh nhân

Quyền domain của bác sĩ đi qua quan hệ thuê bác sĩ `doctor_hires` (status phải là `ACTIVE`):

- `can_view_ehr = true` -> bác sĩ được xem/sửa EHR
- `can_view_medications = true` -> bác sĩ được kê đơn, sửa đơn, xem log thuốc
- `can_view_ecg = true` -> bác sĩ được xem ECG/history/detail

Lưu ý:
- Quyền này do bệnh nhân bật/tắt từ phía bệnh nhân (`/api/doctor-hires/:id/access`).
- Bác sĩ cần duyệt yêu cầu thuê trước (`PENDING_DOCTOR_APPROVAL` -> `ACTIVE`).

## 3. API nền tảng để bác sĩ nhận bệnh nhân

## 3.1 Lấy danh sách yêu cầu thuê bác sĩ

- Method: `GET`
- Path: `/api/doctor-hires/requests`
- Query tùy chọn: `status=PENDING_DOCTOR_APPROVAL|ACTIVE|REJECTED|CANCELLED|EXPIRED`
- Bối cảnh dùng: màn hình bác sĩ duyệt bệnh nhân mới, hoặc lấy danh sách bệnh nhân đang active.

Response 200:
```json
{
  "requests": [
    {
      "hire_id": 12,
      "patient_id": 33,
      "doctor_id": 37,
      "status": "PENDING_DOCTOR_APPROVAL",
      "price_snapshot": 1200000,
      "can_view_ehr": false,
      "can_view_medications": false,
      "can_view_ecg": false,
      "requested_at": "2026-04-20T10:00:00.000Z",
      "approved_at": null,
      "rejected_at": null,
      "cancelled_at": null,
      "patient": {
        "user_id": 33,
        "name": "Nguyen Van An",
        "email": "patient@example.com"
      }
    }
  ]
}
```

## 3.2 Duyệt yêu cầu thuê

- Method: `PATCH`
- Path: `/api/doctor-hires/:id/approve`
- Bối cảnh dùng: bác sĩ chấp nhận đồng hành với bệnh nhân.

Response 200:
```json
{
  "message": "Đã duyệt yêu cầu thuê bác sĩ",
  "hire": {
    "hire_id": 12,
    "status": "ACTIVE",
    "patient_id": 33,
    "doctor_id": 37,
    "can_view_ehr": false,
    "can_view_medications": false,
    "can_view_ecg": false
  }
}
```

## 3.3 Từ chối yêu cầu thuê

- Method: `PATCH`
- Path: `/api/doctor-hires/:id/reject`

Response 200:
```json
{
  "message": "Đã từ chối yêu cầu thuê bác sĩ",
  "hire": {
    "hire_id": 12,
    "status": "REJECTED",
    "can_view_ehr": false,
    "can_view_medications": false,
    "can_view_ecg": false
  }
}
```

## 4. API EHR cho bác sĩ

## 4.1 Tổng quan hồ sơ sức khỏe

### GET /api/phr/overview/:user_id

- Method: `GET`
- Path: `/api/phr/overview/:user_id`
- Bối cảnh dùng: load tab tổng quan hồ sơ bệnh nhân.
- Quyền: `can_view_ehr=true` hoặc chủ hồ sơ.

Response 200 (khi đã có dữ liệu):
```json
{
  "overview_id": 5,
  "user_id": 33,
  "personal_info": { "fullName": "Nguyen Van An" },
  "vitals": { "heartRate": 75 },
  "medical_history": { "personal": ["Viem loet da day"] },
  "clinical_results": { "conclusion": { "healthClass": "Loai II" } },
  "created_at": "2026-04-01T08:00:00.000Z",
  "updated_at": "2026-04-20T08:00:00.000Z"
}
```

Response 200 (chưa có dữ liệu):
```json
{
  "user_id": 33,
  "personal_info": {},
  "vitals": {},
  "medical_history": {},
  "clinical_results": {}
}
```

### PUT /api/phr/overview/:user_id

- Method: `PUT`
- Path: `/api/phr/overview/:user_id`
- Bối cảnh dùng: bác sĩ cập nhật tổng quan bệnh án.
- Quyền: `can_view_ehr=true`.

Request body mẫu:
```json
{
  "personal_info": { "bloodType": "O+" },
  "vitals": { "bloodPressure": "120/80" },
  "medical_history": { "allergies": ["Hai san"] },
  "clinical_results": { "conclusion": { "advice": "Ngu du" } }
}
```

Response 200:
```json
{
  "message": "Cập nhật tổng quan bệnh án thành công",
  "data": {
    "overview_id": 5,
    "user_id": 33,
    "personal_info": { "bloodType": "O+" },
    "vitals": { "bloodPressure": "120/80" },
    "medical_history": { "allergies": ["Hai san"] },
    "clinical_results": { "conclusion": { "advice": "Ngu du" } }
  }
}
```

## 4.2 Lịch sử khám (Medical Visits)

### GET /api/phr/visits/:user_id

- Method: `GET`
- Bối cảnh dùng: timeline khám bệnh trong EHR.
- Quyền: `can_view_ehr=true`.

Response 200:
```json
[
  {
    "visit_id": 91,
    "user_id": 33,
    "doctor_id": 37,
    "facility": "Benh vien Cho Ray",
    "doctor_name": "BS. Tran Thi Mai",
    "visit_date": "2026-04-18T08:00:00.000Z",
    "diagnosis": "Tang huyet ap",
    "reason": "Hoi hop",
    "diagnosis_details": "...",
    "tests": [{ "name": "ECG.pdf" }],
    "prescription": [{ "name": "Amlodipine", "dosage": "5mg" }],
    "appointment": "18/05/2026",
    "doctor": {
      "user_id": 37,
      "name": "BS. Tran Thi Mai",
      "email": "doctor1@example.com",
      "role": "bác sĩ"
    }
  }
]
```

### POST /api/phr/visits

- Method: `POST`
- Bối cảnh dùng: bác sĩ thêm bệnh sử mới cho bệnh nhân.
- Quyền: `can_view_ehr=true`.

Request body mẫu:
```json
{
  "user_id": 33,
  "facility": "LifeTrack Care",
  "doctor_name": "BS. Tran Thi Mai",
  "visit_date": "2026-04-22T09:00:00.000Z",
  "diagnosis": "Roi loan nhip nhe",
  "reason": "Tai kham",
  "diagnosis_details": "Khong co dau hieu nguy hiem",
  "tests": [{ "name": "ECG_Apr.pdf" }],
  "prescription": [{ "name": "Bisoprolol", "dosage": "2.5mg" }],
  "appointment": "15/05/2026"
}
```

Response 201:
```json
{
  "message": "Thêm lịch sử khám thành công",
  "data": {
    "visit_id": 120,
    "user_id": 33,
    "doctor_id": 37,
    "diagnosis": "Roi loan nhip nhe"
  }
}
```

### PUT /api/phr/visits/:visit_id

- Method: `PUT`
- Bối cảnh dùng: bác sĩ cập nhật kết quả tái khám.
- Quyền: `can_view_ehr=true`.

Response 200:
```json
{
  "message": "Cập nhật lịch sử khám thành công",
  "data": {
    "visit_id": 120,
    "diagnosis": "Roi loan nhip da cai thien"
  }
}
```

### DELETE /api/phr/visits/:visit_id

- Method: `DELETE`
- Bối cảnh dùng: ẩn bản ghi visit sai.
- Quyền: `can_view_ehr=true`.

Response 200:
```json
{
  "message": "Đã xóa (ẩn) lịch sử khám"
}
```

## 4.3 ECG trong EHR

### GET /api/readings/history/:user_id

- Method: `GET`
- Query: `limit`, `offset`
- Bối cảnh dùng: tab lịch sử ECG theo bệnh nhân.
- Quyền: `can_view_ecg=true`.

Response 200:
```json
{
  "readings": [
    {
      "reading_id": 48,
      "device_id": 16,
      "timestamp": "2026-04-18T09:00:00.000Z",
      "heart_rate": 72,
      "abnormal_detected": false,
      "ai_result": "Binh thuong",
      "ai_status": "DONE",
      "device": {
        "device_id": 16,
        "serial_number": "SN-ECG-0002"
      }
    }
  ]
}
```

### GET /api/readings/detail/:reading_id

- Method: `GET`
- Bối cảnh dùng: màn hình chi tiết ECG + segment cảnh báo.
- Quyền: `can_view_ecg=true`.

Response 200:
```json
{
  "reading": {
    "reading_id": 48,
    "timestamp": "2026-04-18T09:00:00.000Z",
    "heart_rate": 72,
    "ecg_signal": [0.01, 0.02, 0.03],
    "abnormal_detected": false,
    "ai_result": "Binh thuong",
    "ai_status": "DONE",
    "device": {
      "device_id": 16,
      "serial_number": "SN-ECG-0002"
    },
    "patient": {
      "user_id": 33,
      "name": "Nguyen Van An",
      "email": "patient@example.com"
    },
    "alerts": [
      {
        "alert_id": 21,
        "alert_type": "PVC",
        "label_code": "PVC",
        "label_text": "Ngoai tam thu that",
        "segment_start_sample": 120,
        "segment_end_sample": 168,
        "resolved": false
      }
    ]
  }
}
```

## 4.4 Báo cáo y khoa

### POST /api/reports/:user_id

- Method: `POST`
- Bối cảnh dùng: bác sĩ tạo báo cáo cho bệnh nhân sau buổi khám.
- Role: chỉ `bác sĩ`.

Request body mẫu:
```json
{
  "summary": "Benh nhan on dinh, tiep tuc theo doi 3 thang"
}
```

Response 201:
```json
{
  "message": "Tạo báo cáo thành công",
  "report": {
    "report_id": 301,
    "user_id": 33,
    "doctor_id": 37,
    "summary": "Benh nhan on dinh, tiep tuc theo doi 3 thang",
    "patient": { "name": "Nguyen Van An", "email": "patient@example.com" },
    "doctor": { "name": "BS. Tran Thi Mai", "email": "doctor1@example.com" }
  }
}
```

### GET /api/reports/:user_id

- Method: `GET`
- Bối cảnh dùng: xem danh sách báo cáo của bệnh nhân.

Response 200:
```json
{
  "reports": [
    {
      "report_id": 301,
      "user_id": 33,
      "doctor_id": 37,
      "summary": "...",
      "doctor": { "name": "BS. Tran Thi Mai", "email": "doctor1@example.com" },
      "created_at": "2026-04-22T09:00:00.000Z"
    }
  ]
}
```

### GET /api/reports/doctor/my-reports

- Method: `GET`
- Bối cảnh dùng: dashboard bác sĩ -> các báo cáo đã viết.
- Role: `bác sĩ` hoặc `admin`.

Response 200:
```json
{
  "reports": [
    {
      "report_id": 301,
      "summary": "...",
      "patient": { "name": "Nguyen Van An", "email": "patient@example.com" },
      "doctor": { "name": "BS. Tran Thi Mai", "email": "doctor1@example.com" }
    }
  ]
}
```

## 4.5 Cảnh báo (phục vụ màn EHR/monitoring)

### GET /api/alerts/:user_id

- Method: `GET`
- Query tùy chọn: `resolved=true|false`
- Bối cảnh dùng: danh sách cảnh báo của bệnh nhân.

Response 200:
```json
{
  "alerts": [
    {
      "alert_id": 21,
      "user_id": 33,
      "reading_id": 45,
      "alert_type": "PVC",
      "message": "Phat hien ngoai tam thu",
      "resolved": false,
      "timestamp": "2026-01-14T04:10:12.000Z"
    }
  ]
}
```

### POST /api/alerts

- Method: `POST`
- Role: `bác sĩ` hoặc `admin`
- Bối cảnh dùng: bác sĩ tạo cảnh báo thủ công.

Request body mẫu:
```json
{
  "user_id": 33,
  "reading_id": 45,
  "alert_type": "TACHYCARDIA",
  "message": "Nhip tim tang cao",
  "segment_start_sample": 64,
  "segment_end_sample": 110
}
```

Response 201:
```json
{
  "message": "Tạo cảnh báo thành công",
  "alert": {
    "alert_id": 99,
    "user_id": 33,
    "reading_id": 45,
    "alert_type": "TACHYCARDIA",
    "resolved": false
  }
}
```

### PUT /api/alerts/:id/resolve

- Method: `PUT`
- Bối cảnh dùng: bác sĩ đánh dấu đã xử lý cảnh báo.

Response 200:
```json
{
  "message": "Đánh dấu cảnh báo đã xử lý thành công",
  "alert": {
    "alert_id": 99,
    "resolved": true
  }
}
```

## 5. API đặt lịch khám cho bác sĩ

## 5.1 Lấy danh sách lịch hẹn của bác sĩ

### GET /api/appointments

- Method: `GET`
- Query tùy chọn:
  - `status=PENDING|APPROVED|REJECTED|CANCELLED|COMPLETED`
  - `from=<ISO datetime>`
  - `to=<ISO datetime>`
- Bối cảnh dùng: lịch hẹn tổng quan của bác sĩ.

Response 200:
```json
{
  "appointments": [
    {
      "appointment_id": 66,
      "patient_id": 33,
      "doctor_id": 37,
      "appointment_date": "2026-06-15T00:00:00.000Z",
      "start_time": "2026-06-15T09:00:00.000Z",
      "end_time": "2026-06-15T09:30:00.000Z",
      "status": "PENDING",
      "type": "OFFLINE",
      "reason": "Tai kham",
      "meeting_url": null,
      "doctor_note": null,
      "patient": { "user_id": 33, "name": "Nguyen Van An", "email": "patient@example.com" },
      "doctor": { "user_id": 37, "name": "BS. Tran Thi Mai", "email": "doctor1@example.com" }
    }
  ]
}
```

## 5.2 Duyệt lịch hẹn

### PATCH /api/appointments/:id/approve

- Method: `PATCH`
- Bối cảnh dùng: bác sĩ xác nhận lịch từ trạng thái `PENDING` -> `APPROVED`.

Request body mẫu:
```json
{
  "meeting_url": "https://meet.example.com/abc",
  "doctor_note": "Dung gio, mang ket qua ECG"
}
```

Response 200:
```json
{
  "message": "Đã duyệt lịch hẹn thành công.",
  "appointment": {
    "appointment_id": 66,
    "status": "APPROVED",
    "meeting_url": "https://meet.example.com/abc",
    "doctor_note": "Dung gio, mang ket qua ECG"
  }
}
```

## 5.3 Cập nhật trạng thái lịch hẹn

### PATCH /api/appointments/:id/status

- Method: `PATCH`
- Bối cảnh dùng: bác sĩ từ chối hoặc hoàn tất buổi khám.
- Status hợp lệ ở endpoint này: `REJECTED`, `CANCELLED`, `COMPLETED`.

Request body mẫu:
```json
{
  "status": "COMPLETED",
  "reason": "Da kham xong"
}
```

Response 200:
```json
{
  "message": "Đã cập nhật trạng thái lịch hẹn.",
  "appointment": {
    "appointment_id": 66,
    "status": "COMPLETED",
    "status_reason": "Da kham xong"
  }
}
```

## 5.4 Quản lý lịch rảnh của bác sĩ

### GET /api/appointments/doctor/availability

Response 200:
```json
{
  "availability": [
    {
      "availability_id": 10,
      "doctor_id": 37,
      "day_of_week": 1,
      "start_time": "08:00",
      "end_time": "11:00",
      "slot_minutes": 30,
      "is_active": true
    }
  ],
  "time_offs": [
    {
      "time_off_id": 5,
      "doctor_id": 37,
      "start_time": "2026-05-01T08:00:00.000Z",
      "end_time": "2026-05-01T12:00:00.000Z",
      "reason": "Cong tac"
    }
  ]
}
```

### PUT /api/appointments/doctor/availability

- Bối cảnh dùng: lưu cấu hình lịch rảnh lặp lại.

Request body mẫu:
```json
{
  "availability": [
    { "day_of_week": 1, "start_time": "08:00", "end_time": "11:00", "slot_minutes": 30 },
    { "day_of_week": 3, "start_time": "08:00", "end_time": "11:00", "slot_minutes": 30 }
  ]
}
```

Response 200:
```json
{
  "message": "Đã cập nhật lịch rảnh",
  "availability": [
    { "day_of_week": 1, "start_time": "08:00", "end_time": "11:00", "slot_minutes": 30 }
  ]
}
```

### POST /api/appointments/doctor/time-off

Request body mẫu:
```json
{
  "start_time": "2026-06-01T08:00:00.000Z",
  "end_time": "2026-06-01T12:00:00.000Z",
  "reason": "Hoi nghi"
}
```

Response 201:
```json
{
  "message": "Đã thêm lịch nghỉ",
  "time_off": {
    "time_off_id": 11,
    "doctor_id": 37,
    "start_time": "2026-06-01T08:00:00.000Z",
    "end_time": "2026-06-01T12:00:00.000Z",
    "reason": "Hoi nghi"
  }
}
```

### DELETE /api/appointments/doctor/time-off/:id

Response 200:
```json
{
  "message": "Đã xóa lịch nghỉ"
}
```

## 6. API kê đơn và nhắc uống thuốc cho bác sĩ

## 6.1 Tạo đơn thuốc cho bệnh nhân

### POST /api/medications/plans

- Bối cảnh dùng: bác sĩ kê đơn mới cho bệnh nhân.
- Quyền: `can_view_medications=true`.

Request body mẫu:
```json
{
  "user_id": 33,
  "title": "Don thuoc tang huyet ap",
  "start_date": "2026-04-22T00:00:00.000Z",
  "end_date": "2026-07-22T00:00:00.000Z",
  "notes": "Uong deu dan",
  "medications": [
    { "name": "Amlodipine", "dosage": "5mg", "times": ["08:00"] },
    { "name": "Bisoprolol", "dosage": "2.5mg", "times": ["08:00"] }
  ]
}
```

Response 201:
```json
{
  "message": "Tạo đơn thuốc thành công.",
  "plan": {
    "plan_id": 55,
    "user_id": 33,
    "doctor_id": 37,
    "title": "Don thuoc tang huyet ap",
    "is_active": true,
    "doctor": { "user_id": 37, "name": "BS. Tran Thi Mai", "email": "doctor1@example.com" },
    "medications": [
      { "medication_id": 90, "name": "Amlodipine", "dosage": "5mg", "times": ["08:00"] }
    ]
  }
}
```

## 6.2 Lấy danh sách đơn thuốc của bệnh nhân

### GET /api/medications/plans?user_id=:patientId

- Bối cảnh dùng: bác sĩ xem đơn hiện tại trước khi chỉnh sửa.
- Quyền: `can_view_medications=true`.

Response 200:
```json
{
  "plans": [
    {
      "plan_id": 55,
      "user_id": 33,
      "doctor_id": 37,
      "title": "Don thuoc tang huyet ap",
      "is_active": true,
      "medications": [
        { "medication_id": 90, "name": "Amlodipine", "dosage": "5mg", "times": ["08:00"] }
      ]
    }
  ]
}
```

## 6.3 Cập nhật đơn thuốc

### PUT /api/medications/plans/:plan_id

- Bối cảnh dùng: bác sĩ thay đổi phác đồ thuốc.
- Quyền: `can_view_medications=true`.

Request body mẫu giống tạo đơn (title/start_date/medications...).

Response 200:
```json
{
  "message": "Cập nhật đơn thuốc thành công.",
  "plan": {
    "plan_id": 55,
    "title": "Don thuoc da dieu chinh",
    "is_active": true,
    "medications": [
      { "name": "Amlodipine", "dosage": "10mg", "times": ["08:00"] }
    ]
  }
}
```

## 6.4 Ngưng đơn thuốc

### PATCH /api/medications/plans/:plan_id/archive

Response 200:
```json
{
  "message": "Đã ngưng đơn thuốc"
}
```

## 6.5 Xem log nhắc uống thuốc của bệnh nhân

### GET /api/medications/logs

- Query:
  - `user_id` (nên truyền ở phía bác sĩ)
  - `from`, `to` (ISO date/datetime)
  - `status=PENDING|TAKEN|MISSED|SKIPPED`
- Bối cảnh dùng: theo dõi tuân thủ uống thuốc.
- Quyền: `can_view_medications=true`.

Response 200:
```json
{
  "logs": [
    {
      "log_id": 500,
      "user_id": 33,
      "medication_id": 90,
      "scheduled_time": "2026-04-22T01:00:00.000Z",
      "taken_at": null,
      "status": "PENDING",
      "medication": {
        "medication_id": 90,
        "name": "Amlodipine",
        "dosage": "5mg",
        "times": ["08:00"],
        "plan": {
          "plan_id": 55,
          "title": "Don thuoc tang huyet ap",
          "notes": "Uong deu dan"
        }
      }
    }
  ]
}
```

Lưu ý nghiệp vụ:
- API đánh dấu uống/bỏ qua (`PATCH /api/medications/logs/:log_id/take|skip`) hiện tại chỉ cập nhật cho chính user trong token, nên phía bác sĩ thường không dùng để thao tác thay bệnh nhân.

## 7. Gợi ý mapping UI bác sĩ theo workflow

## 7.1 Màn danh sách bệnh nhân bác sĩ

1. Gọi `GET /api/doctor-hires/requests?status=ACTIVE`
2. Dùng `patient` trong mỗi `request` làm nguồn danh sách bệnh nhân đang theo dõi

## 7.2 Màn EHR chi tiết bệnh nhân

1. `GET /api/phr/overview/:user_id`
2. `GET /api/phr/visits/:user_id`
3. `GET /api/readings/history/:user_id`
4. `GET /api/reports/:user_id`
5. (tùy chọn) `GET /api/alerts/:user_id`

## 7.3 Màn đặt lịch của bác sĩ

1. `GET /api/appointments?status=PENDING` để xử lý yêu cầu mới
2. `PATCH /api/appointments/:id/approve` hoặc `PATCH /api/appointments/:id/status`
3. `GET/PUT /api/appointments/doctor/availability` để quản lý lịch rảnh
4. `POST/DELETE /api/appointments/doctor/time-off...` để chặn lịch theo ngày

## 7.4 Màn kê đơn và nhắc thuốc

1. `GET /api/medications/plans?user_id=...`
2. `POST /api/medications/plans` (kê mới)
3. `PUT /api/medications/plans/:plan_id` (chỉnh đơn)
4. `GET /api/medications/logs?user_id=...&from=...&to=...` (theo dõi tuân thủ)

## 8. Checklist trước khi frontend bác sĩ gọi API

- Access token có role `bác sĩ`
- Quan hệ thuê bác sĩ đã `ACTIVE`
- Bệnh nhân đã bật đúng quyền domain:
  - EHR: `can_view_ehr`
  - Thuốc: `can_view_medications`
  - ECG: `can_view_ecg`

Nếu thiếu một trong các điều kiện trên, backend sẽ trả `403`.
