# Frontend Guide: Hien Thi Ket Qua AI Realtime

Tai lieu nay chi tap trung vao 2 noi dung:

- Frontend can lam gi de hien thi ket qua AI realtime.
- Backend hien tai tra ve va emit nhung payload nao.

Tai lieu nay khong dua code mau.

## 1. Muc Tieu Tich Hop

Frontend can dam bao 4 kha nang:

1. Khi reading moi vua toi, UI phai hien duoc trang thai "Dang phan tich".
2. Khi AI xu ly xong, UI phai tu dong doi sang ket qua cuoi cung.
3. Neu AI that bai, UI phai hien duoc trang thai loi.
4. Neu AI phat hien bat thuong, UI phai cap nhat danh sach canh bao va chi tiet reading.

## 2. Tong Quan Luong Realtime

Luong nghiep vu hien tai:

1. Thiet bi gui telemetry len backend.
2. Backend tao reading moi trong database voi `ai_status = PENDING`.
3. Backend emit event `reading-update` ngay lap tuc.
4. Backend dua reading vao hang doi AI.
5. Khi AI xu ly xong, backend emit event `reading-ai-updated`.
6. Neu co bat thuong, backend emit them event `alert`.
7. Neu co thong bao lien quan, backend emit them event `notification:new`.

Frontend can hieu ro:

- `reading-update` la su kien "co reading moi, AI chua xong".
- `reading-ai-updated` la su kien "AI cua reading da co ket qua".

Hai event nay khong thay the cho nhau.

## 3. Frontend Can Lam Gi

### 3.1 Sau khi nguoi dung dang nhap

Frontend can:

- Mo ket noi Socket.IO.
- Join vao room theo `user_id`.
- Giu ket noi nay trong suot session dang nhap.

Neu frontend khong join room theo `user_id`, se khong nhan duoc ket qua AI realtime.

### 3.2 O cac man hinh co hien thi AI

Frontend can lang nghe it nhat event:

- `reading-ai-updated`

Tuy vao man hinh, frontend co the can them:

- `reading-update` neu can hien thi ECG live hoac reading moi vua toi
- `alert` neu can panel canh bao gan nhat
- `notification:new` neu co chuong thong bao hoac notification bell

### 3.3 O danh sach reading / lich su reading

Frontend can:

- Xac dinh reading nao can cap nhat bang `reading_id`.
- Cap nhat lai dung row/item do trong state.
- Doi trang thai AI tu `PENDING` sang `DONE` hoac `FAILED`.

Frontend khong can reload toan bo danh sach sau moi event neu chi thay doi ket qua AI cua 1 reading da co san.

### 3.4 O man hinh dashboard realtime

Frontend can:

- Dung `reading-update` de biet reading moi da den.
- Hien trang thai tam thoi "Dang phan tich".
- Khi nhan `reading-ai-updated`, cap nhat card ket qua AI sang ket qua cuoi cung.

### 3.5 O modal/trang chi tiet reading

Frontend can:

- Hien duoc `ai_status`, `ai_result`, `ai_error`, `ai_completed_at`.
- Neu can ve segment bat thuong tren ECG chart, phai goi lai API chi tiet reading khi AI da `DONE`.

Ly do:

- Payload realtime `reading-ai-updated` chi cho biet ket qua tong quat.
- Payload nay khong chua day du thong tin `alerts[]` de ve highlight segment chi tiet.

### 3.6 O panel canh bao

Frontend can:

- Lang nghe event `alert`.
- Cap nhat panel canh bao gan nhat.
- Neu can, cho phep nguoi dung mo nhanh reading lien quan tu `reading_id`.

## 4. Contract Server Hien Tai

## 4.1 Event `reading-update`

Backend emit event nay ngay sau khi tao reading moi.

Y nghia:

- Da co reading moi.
- ECG va nhip tim da co.
- AI chua co ket qua cuoi cung.

Payload hien tai:

```json
{
  "reading_id": 123,
  "device_id": 10,
  "user_id": 5,
  "serial_number": "HOLTER-001",
  "heart_rate": 78,
  "ecg_signal": [0.12, 0.15, 0.09],
  "sample_rate_hz": 250,
  "abnormal_detected": false,
  "ai_result": null,
  "ai_status": "PENDING",
  "timestamp": "2026-04-16T15:30:00.000Z"
}
```

Frontend nen dung event nay de:

- Hien reading moi vua toi.
- Hien nhip tim hien tai.
- Hien ECG live.
- Hien badge "Dang phan tich".

Frontend khong nen coi day la ket qua AI cuoi cung.

## 4.2 Event `reading-ai-updated`

Backend emit event nay khi AI queue xu ly xong.

### Truong hop `DONE`

```json
{
  "reading_id": 123,
  "user_id": 5,
  "serial_number": "HOLTER-001",
  "ai_status": "DONE",
  "ai_result": "N",
  "abnormal_detected": false,
  "heart_rate": 78,
  "timestamp": "2026-04-16T15:30:04.000Z"
}
```

### Truong hop `FAILED`

```json
{
  "reading_id": 123,
  "user_id": 5,
  "serial_number": "HOLTER-001",
  "ai_status": "FAILED",
  "ai_result": null,
  "abnormal_detected": false,
  "heart_rate": 0,
  "ai_error": "MODEL_TIMEOUT",
  "timestamp": "2026-04-16T15:30:04.000Z"
}
```

Frontend nen dung event nay de:

- Doi trang thai AI cua reading.
- Cap nhat ket qua text hien thi.
- Cap nhat nhan "Binh thuong" hoac "Bat thuong".
- Hien trang thai that bai neu co `FAILED`.

## 4.3 Event `alert`

Backend emit event nay khi AI phat hien bat thuong va da tao alert trong database.

Payload hien tai:

```json
{
  "user_id": 5,
  "reading_id": 123,
  "serial_number": "HOLTER-001",
  "abnormal_count": 2,
  "alerts": [
    {
      "alert_id": 301,
      "alert_type": "AFIB",
      "segment_start_sample": 300,
      "segment_end_sample": 560
    },
    {
      "alert_id": 302,
      "alert_type": "PVC",
      "segment_start_sample": 780,
      "segment_end_sample": 910
    }
  ],
  "timestamp": "2026-04-16T15:30:04.000Z"
}
```

Frontend nen dung event nay de:

- Cap nhat panel alert.
- Hien thong bao canh bao.
- Biet reading nao dang co bat thuong.

## 4.4 Event `notification:new`

Backend co the emit them event nay neu qua trinh AI tao thong bao.

Frontend co the dung event nay cho:

- notification bell
- popup/toast thong bao
- refresh trang notifications neu dang mo

## 5. API Frontend Se Can Goi

## 5.1 Lay lich su reading

Frontend goi:

```http
GET /api/readings/history/:user_id
```

Dung cho:

- trang lich su
- danh sach reading
- doctor/family xem danh sach reading cua benh nhan

Frontend can hieu:

- API nay cho snapshot ban dau.
- Realtime event se den sau de cap nhat tung reading.

## 5.2 Lay chi tiet reading

Frontend goi:

```http
GET /api/readings/detail/:reading_id
```

Dung cho:

- modal chi tiet reading
- ECG chart chi tiet
- man hinh can ve highlight segment bat thuong

Response hien tai:

```json
{
  "reading": {
    "reading_id": 123,
    "timestamp": "2026-04-16T15:30:00.000Z",
    "heart_rate": 78,
    "ecg_signal": [0.12, 0.15, 0.09],
    "abnormal_detected": true,
    "ai_result": "S",
    "ai_status": "DONE",
    "ai_error": null,
    "ai_completed_at": "2026-04-16T15:30:04.000Z",
    "device": {
      "device_id": 10,
      "serial_number": "HOLTER-001"
    },
    "patient": {
      "user_id": 5,
      "name": "Nguyen Van A",
      "email": "a@example.com"
    },
    "alerts": [
      {
        "alert_id": 301,
        "alert_type": "AFIB",
        "label_code": "S",
        "label_text": "Rung nhĩ",
        "segment_start_sample": 300,
        "segment_end_sample": 560,
        "timestamp": "2026-04-16T15:30:04.000Z",
        "resolved": false
      }
    ]
  }
}
```

Day la response frontend can dung neu muon hien thi:

- ECG full signal
- thong tin benh nhan/thiet bi
- danh sach segment bat thuong
- chu thich theo tung loai bat thuong

## 5.3 Lay danh sach alert

Frontend goi:

```http
GET /api/alerts/:user_id
```

Dung cho:

- panel alert
- trang canh bao
- reload danh sach sau khi nhan event `alert`

## 6. Frontend Nen Hien Thi Nhu The Nao

## 6.1 Trang thai `PENDING`

Frontend nen hien:

- badge "Dang phan tich"
- ket qua AI tam thoi de trong hoac "-"
- khong hien ket luan cuoi cung

Nguon du lieu:

- `reading-update`

## 6.2 Trang thai `DONE`

Frontend nen hien:

- ket qua AI
- danh dau binh thuong/bat thuong
- thoi diem AI hoan tat neu can

Nguon du lieu:

- `reading-ai-updated`
- hoac `GET /api/readings/detail/:reading_id` neu can thong tin sau hon

## 6.3 Trang thai `FAILED`

Frontend nen hien:

- badge "Phan tich that bai"
- thong bao loi
- `ai_error` neu backend co tra ve

Nguon du lieu:

- `reading-ai-updated`

## 6.4 Truong hop bat thuong

Frontend nen hien:

- ket qua AI bat thuong
- canh bao moi neu co
- co duong dan mo reading lien quan
- neu mo chi tiet reading thi lay them `alerts[]` de ve vung bat thuong

Nguon du lieu:

- `reading-ai-updated`
- `alert`
- `GET /api/readings/detail/:reading_id`

## 7. Khi Nao Patch State, Khi Nao Goi Lai API

Frontend chi can patch state cuc bo khi:

- dang o list reading
- dang o bang lich su
- dang o dashboard card hien ket qua tong quat

Frontend nen goi lai API chi tiet khi:

- can hien thi `alerts[]`
- can ve highlight segment tren ECG
- can dong bo day du thong tin reading sau khi AI `DONE`

Tom gon:

- Ket qua tong quat: dung `reading-ai-updated`
- Chi tiet segment: dung `GET /api/readings/detail/:reading_id`

## 8. Cac Truong Quan Trong Frontend Can Dung

Frontend nen coi day la cac truong can xu ly o moi reading:

- `reading_id`
- `ai_status`
- `ai_result`
- `abnormal_detected`
- `ai_error`
- `ai_completed_at`
- `heart_rate`
- `timestamp`

Trong do:

- `reading_id` la khoa de xac dinh reading nao can cap nhat
- `ai_status` quyet dinh UI dang o `PENDING`, `DONE` hay `FAILED`
- `abnormal_detected` quyet dinh tone binh thuong/bat thuong
- `ai_error` dung cho UI loi

## 9. Cac Loi Tich Hop Thuong Gap

### 9.1 Chi nghe `reading-update`

Hau qua:

- Frontend chi thay reading moi den
- UI dung mai o "Dang phan tich"
- Khong bao gio co ket qua AI cuoi cung

### 9.2 Khong join room theo user

Hau qua:

- Khong nhan `reading-ai-updated`
- Khong nhan `alert`

### 9.3 Dung payload `reading-ai-updated` de ve ECG highlight chi tiet

Hau qua:

- Thieu `alerts[]`
- Khong du du lieu de biet segment nao bat thuong

### 9.4 Moi event deu reload toan bo man hinh

Hau qua:

- Nhieu request khong can thiet
- UI cham hon

Huong dung:

- Cap nhat reading bi anh huong bang `reading_id`
- Chi goi API detail khi that su can thong tin sau hon

## 10. Checklist Cho Frontend Dev

Frontend dev can kiem tra du cac buoc sau:

1. Sau login da tao socket connection.
2. Da join room theo `user_id`.
3. Da lang nghe `reading-ai-updated`.
4. Neu co dashboard live, da lang nghe `reading-update`.
5. Neu co panel canh bao, da lang nghe `alert`.
6. UI co 3 trang thai ro rang:
   - `PENDING`
   - `DONE`
   - `FAILED`
7. Reading list cap nhat theo `reading_id`.
8. Modal/trang detail goi lai `GET /api/readings/detail/:reading_id` khi can hien thi segment bat thuong.
9. UI co xu ly `ai_error`.
10. UI khong nham `reading-update` la ket qua AI cuoi cung.

## 11. Kich Ban Kiem Thu Thu Cong

Frontend team co the test theo thu tu nay:

1. Dang nhap.
2. Mo dashboard hoac history.
3. Tao reading moi bang telemetry that hoac fake reading.
4. Xac nhan UI hien `Dang phan tich`.
5. Cho AI xu ly xong.
6. Xac nhan UI tu doi sang `DONE` hoac `FAILED`.
7. Neu bat thuong, xac nhan panel alert duoc cap nhat.
8. Mo chi tiet reading va xac nhan co du lieu `alerts[]` de hien thi bat thuong tren chart.

## 12. Tom Tat Ngan Gon

Frontend can nho 5 quy tac:

1. `reading-update` la reading moi den, khong phai ket qua AI cuoi cung.
2. `reading-ai-updated` moi la event chinh de doi status AI.
3. Patch UI theo `reading_id`.
4. Muon ve segment bat thuong thi phai lay them `GET /api/readings/detail/:reading_id`.
5. Neu co panel canh bao thi phai nghe them event `alert`.

