# Hướng Dẫn ECG Realtime Cho Frontend Client 2

## Mục tiêu
Tài liệu này giải thích chính xác luồng ECG realtime đang chạy trong hệ thống hiện tại, chỉ ra frontend hiện tại nhận dữ liệu bằng cách nào, và nêu các lỗi tích hợp rất dễ gặp khiến thiết bị đã gửi telemetry nhưng chart vẫn không hiển thị.

Tài liệu này dành cho frontend dev của client 2 đang cần tích hợp hoặc debug phần biểu đồ ECG realtime.

## Kết luận ngắn gọn
Chart realtime **không** lấy dữ liệu từ event `reading-ai-updated`.

Chart realtime hiện tại của `another-client` lấy dữ liệu từ event Socket.IO tên là:

- `reading-update`

Event này mới chứa:

- `ecg_signal`
- `sample_rate_hz`
- `reading_id`
- `heart_rate`
- `ai_status: "PENDING"`

Còn event:

- `reading-ai-updated`

chỉ dùng để cập nhật:

- kết quả AI
- trạng thái AI
- nhịp tim cuối cùng
- cảnh báo bất thường

Event này **không mang `ecg_signal`**, nên nếu client 2 chỉ nghe `reading-ai-updated` thì chart sẽ không có dữ liệu để vẽ.

## Luồng dữ liệu end-to-end
### 1. Thiết bị gửi telemetry lên server
Thiết bị gửi ECG theo một trong hai đường:

- MQTT topic `devices/{serial}/telemetry`
- HTTP route `POST /api/readings/telemetry`

Dữ liệu vào cuối cùng đều đi qua `ingestTelemetry(...)` tại:

- `server/services/telemetryIngestService.js`

### 2. Backend tạo reading mới và emit realtime ngay
Trong `ingestTelemetry(...)`, backend sẽ:

1. chuẩn hóa `serial_number`
2. tìm `device` theo serial
3. chuẩn hóa `ecg_signal`
4. lọc tín hiệu để lưu DB
5. tạo một `reading` mới với `ai_status = "PENDING"`
6. đưa job AI vào queue
7. emit Socket.IO event `reading-update` đến các user liên quan

Event này được phát tại:

- `server/services/telemetryIngestService.js`

Payload emit của `reading-update` có dạng thực tế:

```json
{
  "reading_id": 123,
  "device_id": 10,
  "user_id": 5,
  "serial_number": "SN-ECG-0001",
  "heart_rate": 0,
  "ecg_signal": [0.01, 0.02, -0.01, ...],
  "sample_rate_hz": 250,
  "chunk_duration_seconds": 5,
  "chunk_sample_count": 1250,
  "abnormal_detected": false,
  "ai_result": null,
  "ai_status": "PENDING",
  "timestamp": "2026-04-16T..."
}
```

Lưu ý quan trọng:

- Đây là event **duy nhất** hiện đang mang `ecg_signal` realtime để vẽ chart.
- Nếu frontend không nghe event này thì chart không thể chạy realtime.

### 3. AI worker xử lý xong rồi emit event cập nhật lần 2
Sau khi worker AI xử lý xong, bridge realtime sẽ phát event:

- `reading-ai-updated`

Được phát tại:

- `server/services/aiQueueRealtimeBridgeService.js`

Payload của event này có dạng:

```json
{
  "reading_id": 123,
  "user_id": 5,
  "serial_number": "SN-ECG-0001",
  "ai_status": "DONE",
  "ai_result": "Bình thường",
  "abnormal_detected": false,
  "heart_rate": 72,
  "timestamp": "2026-04-16T..."
}
```

Lưu ý rất quan trọng:

- Event này **không chứa `ecg_signal`**.
- Nó chỉ dùng để cập nhật thẻ AI, BPM cuối cùng, trạng thái `DONE/FAILED`, và cảnh báo.
- Nếu frontend client 2 đang dùng event này để feed chart thì đó là sai contract.

## Backend emit vào room nào
Backend không broadcast global.

Dữ liệu realtime được phát bằng helper:

- `server/services/socketEmitService.js`

Helper này emit tới room dạng:

- `user-{id}`

Ví dụ:

- `user-12`
- `user-27`

Muốn nhận được ECG realtime, frontend phải:

1. kết nối Socket.IO đúng `API_BASE_URL`
2. sau khi `connect`, emit:

```js
socket.emit("join-user-room", userId)
```

Nếu không join đúng room thì backend vẫn emit thành công, nhưng client sẽ không nhận được event.

## Frontend hiện tại của another-client nhận ECG realtime bằng cách nào
### 1. Socket global trong app
App root mount hook:

- `another-client/src/App.js`

Hook dùng là:

- `another-client/src/hooks/useSocket.js`

Hook này chịu trách nhiệm cho các event mang tính toàn app như:

- `direct-message:new`
- `notification:new`
- `reading-ai-updated`

Hook này **không nghe `reading-update`**.

### 2. PatientDashboard tự mở socket riêng cho ECG chart
Phần chart realtime không dùng `useSocket` ở trên.

Nó tự tạo socket riêng tại:

- `another-client/src/components/patient/PatientDashboard.js`

Luồng ở đây là:

1. `io(API_BASE_URL)`
2. `socketClient.emit("join-user-room", user.user_id)` khi `connect`
3. `socketClient.on("reading-update", handleEcgData)`
4. `handleEcgData` lấy `data.ecg_signal`
5. append chunk mới vào buffer cũ
6. đưa buffer qua `useECGStream(...)`
7. render vào `ECGChart`

Đây là điểm rất quan trọng:

- `PatientDashboard` nghe trực tiếp `reading-update`
- `window.readingAiUpdated` chỉ được dùng để cập nhật AI state, không dùng để feed chart

### 3. Các bước xử lý trên frontend hiện tại
Trong `PatientDashboard.js`, frontend đang làm như sau:

1. chuẩn hóa chunk qua `normalizeEcgChunk(...)`
2. lấy `sample_rate_hz`, nếu thiếu thì fallback `250`
3. append chunk vào `buffer`
4. cắt buffer theo cửa sổ 10 giây
5. dùng `useECGStream(...)` để chỉ hiển thị cửa sổ 5 giây gần nhất
6. truyền `streamedEcgData` vào `ECGChart`

Nghĩa là chart không cần full history từ backend. Nó chỉ cần nhận liên tục các chunk mới từ `reading-update`.

## Các vấn đề rất có thể client 2 đang gặp
### 1. Nghe sai event
Sai phổ biến nhất:

- chỉ nghe `reading-ai-updated`
- hoặc chỉ nghe custom DOM event `readingAiUpdated`

Điều này sẽ làm:

- AI status có thể đổi
- BPM có thể đổi
- nhưng chart không có `ecg_signal` để vẽ

Dấu hiệu nhận biết:

- console có event AI về đều
- chart vẫn rỗng

Cách sửa:

- phải nghe trực tiếp Socket.IO event `reading-update`

### 2. Không join room `user-{id}`
Nếu client kết nối socket nhưng không emit:

```js
socket.emit("join-user-room", userId)
```

thì backend sẽ không gửi được event vào đúng room của client đó.

Dấu hiệu nhận biết:

- socket connect thành công
- backend vẫn ingest reading
- nhưng client không thấy `reading-update`

### 3. Dùng sai userId khi join room
Room cần join là user đang đăng nhập ở frontend.

Nếu join sai id thì:

- backend emit vào `user-{patientId}` hoặc `user-{viewerId}`
- client lại ngồi ở room khác
- kết quả là không nhận event

### 4. Kết nối sai host Socket.IO
Frontend phải dùng đúng:

- `API_BASE_URL`

và phải trỏ tới backend đang chạy Socket.IO.

Nếu HTTP API đúng nhưng socket lại trỏ sai host/port thì chart cũng không có realtime.

### 5. Không chuẩn hóa `ecg_signal` trước khi vẽ
`ecg_signal` cần là mảng số.

Nếu client 2:

- giữ nguyên string
- hoặc không convert `Number(item)`
- hoặc không lọc `Number.isFinite`

thì chart library có thể bỏ toàn bộ dataset.

### 6. Ghi đè buffer thay vì append chunk
Backend phát theo từng chunk reading mới.

Nếu client 2 chỉ set state kiểu:

```js
setSignal(data.ecg_signal)
```

thì chart vẫn có thể chạy, nhưng sẽ trông như nhảy cục và mất tính liên tục.

Nếu mục tiêu là realtime mượt, cần append:

- buffer cũ + chunk mới
- rồi cắt theo giới hạn sample count

### 7. Chờ AI DONE mới vẽ chart
Sai tư duy phổ biến:

- đợi `ai_status === "DONE"` rồi mới render ECG

Trong hệ thống hiện tại, chart phải chạy ngay từ `reading-update`, tức là từ lúc AI còn `PENDING`.

Nếu chờ `DONE`:

- chart sẽ chậm
- hoặc không lên gì nếu frontend bỏ qua event `reading-update`

### 8. Chưa xử lý sample rate fallback
Nếu `sample_rate_hz` không có hoặc sai, frontend nên fallback về `250` như client hiện tại.

Nếu không fallback, trục thời gian hoặc tính số sample hiển thị có thể bị sai, làm chart rỗng hoặc co cụm.

## Contract tối thiểu mà client 2 cần tuân theo
### Bắt buộc
- Kết nối Socket.IO tới backend
- Join room bằng `join-user-room`
- Lắng nghe `reading-update`
- Lấy `ecg_signal` từ `reading-update`
- Normalize mảng số trước khi render
- Dùng `sample_rate_hz` hoặc fallback `250`

### Nên có
- Lắng nghe thêm `reading-ai-updated` để cập nhật:
  - trạng thái AI
  - kết quả AI
  - nhịp tim cuối cùng
- Lắng nghe `alert` để hiển thị cảnh báo

## Mẫu tích hợp tối thiểu cho client 2
```js
import { useEffect, useMemo, useState } from "react"
import io from "socket.io-client"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const DEFAULT_SAMPLE_RATE_HZ = 250
const BUFFER_WINDOW_SECONDS = 10

const normalizeEcgChunk = (signal) => {
  if (!Array.isArray(signal)) return []
  return signal.map((item) => Number(item)).filter((item) => Number.isFinite(item))
}

const appendEcgChunk = (currentBuffer, nextChunk, bufferSampleLimit) => {
  const normalizedChunk = normalizeEcgChunk(nextChunk)
  if (normalizedChunk.length === 0) return currentBuffer

  return [...currentBuffer, ...normalizedChunk].slice(-bufferSampleLimit)
}

export default function PatientRealtimeChart({ userId }) {
  const [sampleRateHz, setSampleRateHz] = useState(DEFAULT_SAMPLE_RATE_HZ)
  const [buffer, setBuffer] = useState([])
  const [heartRate, setHeartRate] = useState(null)
  const [aiState, setAiState] = useState({ status: "PENDING", result: null })

  useEffect(() => {
    if (!userId) return

    const socket = io(API_BASE_URL)

    socket.on("connect", () => {
      socket.emit("join-user-room", userId)
    })

    socket.on("reading-update", (payload) => {
      const nextRate = Number(payload.sample_rate_hz) > 0
        ? Number(payload.sample_rate_hz)
        : DEFAULT_SAMPLE_RATE_HZ

      const bufferSampleLimit = Math.round(nextRate * BUFFER_WINDOW_SECONDS)

      setSampleRateHz(nextRate)
      setBuffer((current) => appendEcgChunk(current, payload.ecg_signal, bufferSampleLimit))

      const nextHeartRate = Number.parseInt(payload.heart_rate, 10)
      if (Number.isInteger(nextHeartRate) && nextHeartRate > 0) {
        setHeartRate(nextHeartRate)
      }
    })

    socket.on("reading-ai-updated", (payload) => {
      setAiState({
        status: payload.ai_status || "DONE",
        result: payload.ai_result || null,
      })

      const nextHeartRate = Number.parseInt(payload.heart_rate, 10)
      if (Number.isInteger(nextHeartRate) && nextHeartRate > 0) {
        setHeartRate(nextHeartRate)
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [userId])

  return (
    <div>
      <p>BPM: {heartRate ?? "--"}</p>
      <p>AI: {aiState.status}</p>
      <p>Số mẫu đang có: {buffer.length}</p>
      {/* buffer là dữ liệu đưa vào chart */}
    </div>
  )
}
```

## Checklist debug cho client 2
### Bước 1. Xác nhận backend đang ingest thành công
Kiểm tra log server có reading mới hay không.

Nếu telemetry không đi tới `ingestTelemetry(...)` thì frontend không thể có dữ liệu realtime.

### Bước 2. Xác nhận socket connect thành công
Trên frontend, phải thấy:

- socket connect success
- không có `connect_error`

Nếu không connect được, chart sẽ đứng im hoàn toàn.

### Bước 3. Xác nhận đã join đúng room
Ngay sau `connect`, frontend phải gọi:

```js
socket.emit("join-user-room", userId)
```

Nếu không có bước này, backend emit vào room `user-{id}` nhưng client không ở trong room.

### Bước 4. Log raw event `reading-update`
Thêm log tạm:

```js
socket.on("reading-update", (payload) => {
  console.log("reading-update", payload)
})
```

Nếu không thấy log này, vấn đề nằm ở:

- room
- socket host
- CORS / Socket.IO
- userId sai

### Bước 5. Kiểm tra `payload.ecg_signal`
Đảm bảo:

- là mảng
- có phần tử
- các phần tử convert được sang số

Nếu `ecg_signal` rỗng thì chart không lên là đúng.

### Bước 6. Kiểm tra chart đang bind vào state nào
Phải chắc rằng dataset của chart bind vào buffer được cập nhật từ `reading-update`.

Sai phổ biến:

- bind vào `reading-ai-updated`
- bind vào reading history từ API cũ
- bind vào state không được append chunk mới

### Bước 7. Tách rõ 2 loại event
Frontend client 2 nên tự hỏi:

- Event nào để vẽ ECG? => `reading-update`
- Event nào để cập nhật AI/result/BPM cuối? => `reading-ai-updated`

Nếu trộn 2 nhiệm vụ này vào một event thì sẽ dễ lệch contract.

## Những file nên đọc để bám đúng hành vi hiện tại
### Backend
- `server/services/telemetryIngestService.js`
- `server/services/aiQueueRealtimeBridgeService.js`
- `server/services/socketEmitService.js`
- `server/services/socketService.js`

### Frontend another-client
- `another-client/src/App.js`
- `another-client/src/hooks/useSocket.js`
- `another-client/src/components/patient/PatientDashboard.js`
- `another-client/src/components/patient/ECGChart.js`

## Kết luận dành cho frontend dev client 2
Nếu thiết bị đã gửi dữ liệu tới backend nhưng chart vẫn không lên, hãy kiểm tra theo thứ tự sau:

1. Có nhận được Socket.IO event `reading-update` chưa?
2. Có `join-user-room` đúng `userId` chưa?
3. `reading-update` có chứa `ecg_signal` hợp lệ không?
4. Chart có đang bind vào buffer cập nhật từ `reading-update` không?
5. Có đang nhầm `reading-ai-updated` là nguồn dữ liệu chart không?

Nguyên nhân có xác suất cao nhất trong hệ thống hiện tại là:

- client 2 đang nghe sai event
- hoặc chưa join đúng room `user-{id}`
- hoặc đang lấy dữ liệu chart từ `reading-ai-updated`, trong khi event đó không mang `ecg_signal`
