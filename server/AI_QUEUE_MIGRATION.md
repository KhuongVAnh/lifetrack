# Giáo Án: Tách AI Inference Sang Queue Với `BullMQ + Redis`

## 1. Mục tiêu của tài liệu

Tài liệu này hướng dẫn triển khai kiến trúc:

```text
ingest nhanh + create reading(PENDING) + enqueue job + AI worker async
```

cho backend hiện tại của project.

Mục tiêu sau khi làm xong:

- API HTTP ingest và MQTT ACK phản hồi nhanh hơn vì không chờ AI xong.
- `telemetryIngestService` chỉ còn lo validation, normalize, create reading ban đầu và enqueue.
- AI chạy trong worker process riêng.
- `reading`, `alert`, `notification` vẫn được tạo đúng, nhưng kết quả AI đến sau.
- Web server và AI worker có thể scale độc lập về sau.

Tài liệu này viết theo kiểu "giáo án":

- nói rõ vì sao phải đổi kiến trúc
- chỉ rõ cần sửa file nào
- đưa code mẫu theo từng bước
- giải thích vì sao code như vậy
- có checklist test local end-to-end

## 2. Vấn đề của kiến trúc hiện tại

Hiện tại file [telemetryIngestService.js](/Users/Dell/OneDrive/Desktop/iron-holter/ironman_holter/server/services/telemetryIngestService.js) đang làm quá nhiều việc trong cùng hot path:

1. nhận payload telemetry
2. validate và normalize ECG
3. gọi `predictFromReading(...)`
4. tạo `reading`
5. tạo `alert`
6. tạo `notification`
7. emit realtime
8. rồi mới trả kết quả cho HTTP hoặc MQTT

Điều này gây ra 3 vấn đề chính:

- request ingest bị chậm vì phải chờ AI xong
- MQTT ACK bị chậm vì ACK đang đi sau inference
- web server vừa làm I/O, vừa giữ socket, vừa chạy AI nên khó scale

Nói ngắn gọn: AI đang nằm trên đường nóng của ingest.

## 3. Queue là gì và khác gì với worker sync

### 3.1 Worker sync

Flow này là:

```text
HTTP/MQTT -> web server -> gửi sang worker -> chờ worker trả kết quả -> response/ACK
```

Ưu điểm:

- ít sửa code hơn
- tách AI ra process khác

Nhược điểm:

- request vẫn phải chờ AI
- latency ingest gần như vẫn bị chi phối bởi inference

### 3.2 Queue async

Flow đúng mục tiêu scale là:

```text
HTTP/MQTT
-> web server
-> validate + normalize + create reading(PENDING)
-> enqueue job
-> response/ACK ngay

AI worker
-> lấy job từ queue
-> chạy inference
-> update reading
-> create alert
-> create notification
-> báo web server emit realtime
```

Đây là mô hình tài liệu này sẽ hướng dẫn.

## 4. Kiến trúc đích

```text
Device / HTTP / MQTT
        |
        v
  Web / API Server
  - Express
  - MQTT subscriber
  - Prisma
  - Socket.IO / SSE
  - BullMQ producer
        |
        v
       Redis
  - queue ecg-infer
        |
        v
   AI Worker Process
   - BullMQ worker
   - ecgCnnService
   - Prisma update reading/alert/notification
```

### Quy tắc kiến trúc cần khóa ngay từ đầu

- Web server không gọi `predictFromReading(...)` nữa.
- Web server chỉ tạo `reading` ban đầu với `ai_status = PENDING`.
- AI worker là nơi duy nhất chạy model CNN.
- Worker không được giữ `Socket.IO io instance`.
- Realtime emit vẫn đi qua web process vì `io` chỉ sống trong process web.

Điểm cuối rất quan trọng: dù worker là nơi xử lý AI, worker không thể cầm trực tiếp `io` của web server vì đây là process khác. Vì vậy trong tài liệu này:

- worker ghi DB và trả metadata job hoàn thành
- web server lắng nghe `QueueEvents` rồi emit `reading-ai-updated`, `alert`, `notification:new`

Cách này đúng hơn việc cố truyền `io` sang worker.

## 5. Chuẩn bị hạ tầng local

### 5.1 Cài dependency mới

Sửa [server/package.json](/Users/Dell/OneDrive/Desktop/iron-holter/ironman_holter/server/package.json) bằng cách cài:

```bash
npm install bullmq ioredis
```

Vì sao cần 2 package này:

- `bullmq`: tạo queue, worker, queue events
- `ioredis`: kết nối Redis ổn định cho BullMQ

### 5.2 Chạy Redis local để test

Cách 1, nếu đã có Redis local:

```bash
redis-server
```

Cách 2, nếu dùng Docker:

```bash
docker run --name ironman-redis -p 6379:6379 redis:7
```

Vì sao phải có Redis:

- BullMQ không chạy in-memory
- queue cần nơi lưu job bền vững
- worker và web server cần cùng nhìn thấy một hàng đợi chung

### 5.3 Thêm env mới

Sửa [server/.env.example](/Users/Dell/OneDrive/Desktop/iron-holter/ironman_holter/server/.env.example):

```env
# Queue / Redis
REDIS_URL=redis://127.0.0.1:6379
AI_QUEUE_NAME=ecg-infer
AI_JOB_ATTEMPTS=3
AI_JOB_BACKOFF_MS=5000
```

Ý nghĩa:

- `REDIS_URL`: địa chỉ Redis để producer, worker, QueueEvents cùng dùng
- `AI_QUEUE_NAME`: tên queue, cần đồng nhất giữa producer và worker
- `AI_JOB_ATTEMPTS`: số lần retry nếu worker fail
- `AI_JOB_BACKOFF_MS`: thời gian chờ trước khi retry

## 6. Sửa schema và data contract

### 6.1 Sửa `Reading` trong Prisma

File cần sửa: [schema.prisma](/Users/Dell/OneDrive/Desktop/iron-holter/ironman_holter/server/prisma/schema.prisma)

Hiện `Reading` đang có:

```prisma
model Reading {
  reading_id        Int      @id @default(autoincrement())
  device_id         Int
  timestamp         DateTime @default(now())
  heart_rate        Int
  ecg_signal        Json
  abnormal_detected Boolean  @default(false)
  ai_result         String?
}
```

Thêm 3 field mới:

```prisma
model Reading {
  reading_id        Int      @id @default(autoincrement())
  device_id         Int
  timestamp         DateTime @default(now())
  heart_rate        Int
  ecg_signal        Json
  abnormal_detected Boolean  @default(false)
  ai_result         String?
  ai_status         String   @default("PENDING")
  ai_error          String?  @db.Text
  ai_completed_at   DateTime?

  device Device  @relation(fields: [device_id], references: [device_id], onDelete: Cascade, onUpdate: Cascade)
  alerts Alert[]

  @@map("readings")
}
```

### 6.2 Vì sao phải có `ai_status`

Vì từ bây giờ một `reading` sẽ có vòng đời:

- `PENDING`: vừa ingest xong, AI chưa chạy xong
- `DONE`: AI đã chạy xong và đã cập nhật kết quả
- `FAILED`: worker chạy lỗi hoặc job fail hết số lần retry

Không có `ai_status`, frontend sẽ không biết:

- reading chưa có `ai_result` vì đang phân tích
- hay reading thất bại thật

### 6.3 Chạy migration

```bash
npx prisma migrate dev --name add_reading_ai_status
npx prisma generate
```

## 7. Data contract mới của `reading`

Từ lúc này cần chấp nhận sự thật sau:

- ingest xong chưa chắc có `ai_result`
- `abnormal_detected` ban đầu có thể vẫn là `false`
- alert và notification có thể đến sau

Nghĩa là `reading` ngay sau ingest có thể trông như sau:

```json
{
  "reading_id": 123,
  "device_id": 10,
  "heart_rate": 78,
  "ecg_signal": [0.12, 0.08, -0.03],
  "abnormal_detected": false,
  "ai_result": null,
  "ai_status": "PENDING",
  "ai_error": null,
  "ai_completed_at": null
}
```

Frontend phải chấp nhận contract này.

## 8. Tách lớp queue service

### 8.1 Tạo file mới `server/services/ecgInferenceQueueService.js`

File mới: [ecgInferenceQueueService.js](/Users/Dell/OneDrive/Desktop/iron-holter/ironman_holter/server/services/ecgInferenceQueueService.js)

Code mẫu:

```js
const IORedis = require("ioredis")
const { Queue, QueueEvents } = require("bullmq")

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
})

const queueName = String(process.env.AI_QUEUE_NAME || "ecg-infer").trim() || "ecg-infer"

const ecgInferenceQueue = new Queue(queueName, {
  connection,
  defaultJobOptions: {
    attempts: Number.parseInt(process.env.AI_JOB_ATTEMPTS || "3", 10),
    backoff: {
      type: "fixed",
      delay: Number.parseInt(process.env.AI_JOB_BACKOFF_MS || "5000", 10),
    },
    removeOnComplete: 500,
    removeOnFail: 500,
  },
})

const ecgInferenceQueueEvents = new QueueEvents(queueName, { connection })

const enqueueEcgInference = async (payload) => {
  const readingId = Number.parseInt(payload?.readingId, 10)
  if (!Number.isInteger(readingId)) {
    throw new Error("INVALID_READING_ID_FOR_QUEUE")
  }

  return ecgInferenceQueue.add("ecg-infer", payload, {
    jobId: `reading-${readingId}`,
  })
}

module.exports = {
  connection,
  ecgInferenceQueue,
  ecgInferenceQueueEvents,
  enqueueEcgInference,
  queueName,
}
```

### 8.2 Vì sao dùng `jobId` theo `readingId`

Vì một reading chỉ nên có đúng một AI job chính.

Nếu enqueue trùng vì retry ở tầng ngoài hoặc MQTT publish lại:

- `jobId` ổn định giúp tránh tạo thêm job vô ích
- dễ trace log theo `readingId`

## 9. Tách script worker

### 9.1 Sửa `server/package.json`

Thêm script mới:

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "worker:ai": "node workers/ecgInferenceWorker.js",
    "worker:ai:dev": "nodemon workers/ecgInferenceWorker.js"
  }
}
```

Vì sao cần script riêng:

- web server và worker là 2 process khác nhau
- đúng tinh thần tách AI khỏi process web

## 10. Refactor `notificationService` để worker dùng được

### 10.1 Vấn đề hiện tại

File [notificationService.js](/Users/Dell/OneDrive/Desktop/iron-holter/ironman_holter/server/services/notificationService.js) đang vừa:

- ghi DB
- vừa emit `notification:new` qua `io`

Trong worker process, `io` không tồn tại. Vì vậy service này cần tách làm 2 phần:

- `persistNotification(...)`: chỉ ghi DB
- `emitNotificationToUsers(...)`: chỉ emit socket

### 10.2 Code mẫu

Sửa [notificationService.js](/Users/Dell/OneDrive/Desktop/iron-holter/ironman_holter/server/services/notificationService.js):

```js
const prisma = require("../prismaClient")
const { NotificationType } = require("@prisma/client")
const { emitToUsers } = require("./socketEmitService")

const parseOptionalInt = (value) => {
  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) ? parsed : null
}

const normalizeRecipientIds = (userIds = []) => {
  return [...new Set(userIds.map((id) => Number.parseInt(id, 10)).filter(Number.isInteger))]
}

const buildSocketPayload = (notification) => ({
  notification_id: notification.notification_id,
  type: notification.type,
  title: notification.title,
  message: notification.message,
  entity_type: notification.entity_type,
  entity_id: notification.entity_id,
  payload: notification.payload,
  created_at: notification.created_at,
  is_read: false,
})

const persistNotification = async ({
  type,
  title,
  message,
  actorId,
  entityType,
  entityId,
  payload,
  recipientUserIds,
}) => {
  const recipients = normalizeRecipientIds(recipientUserIds)
  if (!recipients.length) return null

  if (!Object.values(NotificationType).includes(type)) {
    throw new Error(`INVALID_NOTIFICATION_TYPE: ${type}`)
  }

  const notification = await prisma.notification.create({
    data: {
      type,
      title: String(title || "Thông báo"),
      message: String(message || ""),
      actor_id: parseOptionalInt(actorId),
      entity_type: entityType ? String(entityType) : null,
      entity_id: parseOptionalInt(entityId),
      payload: payload || null,
    },
  })

  await prisma.notificationRecipient.createMany({
    data: recipients.map((userId) => ({
      notification_id: notification.notification_id,
      user_id: userId,
    })),
    skipDuplicates: true,
  })

  return { notification, recipients }
}

const emitNotificationToUsers = ({ io, recipients, notification }) => {
  if (!io || !notification) return
  emitToUsers(io, recipients, "notification:new", buildSocketPayload(notification))
}

const createNotification = async (args) => {
  try {
    const result = await persistNotification(args)
    if (!result) return null

    emitNotificationToUsers({
      io: args.io,
      recipients: result.recipients,
      notification: result.notification,
    })

    return result.notification
  } catch (error) {
    console.error("Loi tao notification:", error)
    return null
  }
}

module.exports = {
  createNotification,
  persistNotification,
  emitNotificationToUsers,
}
```

### 10.3 Vì sao phải tách như vậy

Worker vẫn cần ghi `notification` vào DB, nhưng không nên phụ thuộc `io`.

Tách service như trên giúp:

- web server vẫn dùng `createNotification(...)` như cũ
- worker dùng `persistNotification(...)`
- phần emit realtime được web server xử lý riêng

## 11. Tạo AI worker

### 11.1 File mới `server/workers/ecgInferenceWorker.js`

Code mẫu:

```js
const IORedis = require("ioredis")
const { Worker } = require("bullmq")
const prisma = require("../prismaClient")
const { NotificationType } = require("@prisma/client")
const { predictFromReading } = require("../services/ecgCnnService")
const { persistNotification } = require("../services/notificationService")
const { getRecipientIdsByPatientCached } = require("../services/telemetryRuntimeCacheService")

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
})

const queueName = String(process.env.AI_QUEUE_NAME || "ecg-infer").trim() || "ecg-infer"

const FALLBACK_AI_RESULT = "Binh thuong"

const toAiResultSummary = (aiResult) => {
  const summary = String(aiResult?.ai_result_summary || "").trim()
  return summary || FALLBACK_AI_RESULT
}

const getAlertTypeFromGroup = (group) => {
  const labelText = String(group?.label_text || "").trim()
  const labelCode = String(group?.label_code || "").trim()
  return labelText || labelCode || "Bat thuong"
}

const buildAlertMessageFromGroup = (group, heartRate) => {
  const alertType = getAlertTypeFromGroup(group)
  const startSample = Number(group?.start_sample)
  const endSample = Number(group?.end_sample)
  const segmentCount = Number(group?.segment_count || 1)
  return `Phat hien ${alertType} tai doan mau ${startSample}-${endSample} (${segmentCount} segment). Nhip tim ${heartRate} bpm`
}

const createGroupedAlerts = async (userId, readingId, heartRate, abnormalGroups) => {
  const createOps = abnormalGroups.map((group) =>
    prisma.alert.create({
      data: {
        user_id: userId,
        reading_id: readingId,
        alert_type: getAlertTypeFromGroup(group),
        message: buildAlertMessageFromGroup(group, heartRate),
        segment_start_sample: Number.isInteger(Number(group.start_sample))
          ? Number(group.start_sample)
          : null,
        segment_end_sample: Number.isInteger(Number(group.end_sample))
          ? Number(group.end_sample)
          : null,
      },
    })
  )

  return prisma.$transaction(createOps)
}

const worker = new Worker(
  queueName,
  async (job) => {
    const {
      readingId,
      userId,
      serialNumber,
      ecgSignal,
      providedHeartRate,
      source,
    } = job.data

    const reading = await prisma.reading.findUnique({
      where: { reading_id: Number(readingId) },
      select: {
        reading_id: true,
        device_id: true,
        ai_status: true,
      },
    })

    if (!reading) {
      throw new Error("READING_NOT_FOUND")
    }

    if (reading.ai_status === "DONE") {
      return {
        readingId,
        userId,
        skipped: true,
        reason: "ALREADY_DONE",
      }
    }

    const aiResult = await predictFromReading(ecgSignal, { context: source || "queue-worker" })
    const aiResultSummary = toAiResultSummary(aiResult)
    const abnormalGroups = Array.isArray(aiResult?.abnormal_groups) ? aiResult.abnormal_groups : []
    const abnormalDetected = abnormalGroups.length > 0

    const updatedReading = await prisma.reading.update({
      where: { reading_id: Number(readingId) },
      data: {
        heart_rate: Number.isInteger(Number(providedHeartRate)) ? Number(providedHeartRate) : 0,
        ai_result: aiResultSummary,
        abnormal_detected: abnormalDetected,
        ai_status: "DONE",
        ai_error: null,
        ai_completed_at: new Date(),
      },
    })

    let createdAlerts = []
    let notificationResult = null
    const recipients = await getRecipientIdsByPatientCached(userId)

    if (abnormalDetected) {
      createdAlerts = await createGroupedAlerts(userId, updatedReading.reading_id, updatedReading.heart_rate, abnormalGroups)

      notificationResult = await persistNotification({
        type: NotificationType.ALERT,
        title: "Cảnh báo sức khỏe",
        message: `Phát hiện ${createdAlerts.length} cảnh báo bất thường (${aiResultSummary})`,
        actorId: null,
        entityType: "alert",
        entityId: createdAlerts[0]?.alert_id || null,
        payload: {
          user_id: userId,
          reading_id: updatedReading.reading_id,
          serial_number: serialNumber || null,
          abnormal_count: createdAlerts.length,
          ai_result_summary: aiResultSummary,
          alerts: createdAlerts,
        },
        recipientUserIds: recipients,
      })
    }

    return {
      readingId: updatedReading.reading_id,
      userId,
      serialNumber: serialNumber || null,
      aiStatus: "DONE",
      aiResult: aiResultSummary,
      abnormalDetected,
      alertIds: createdAlerts.map((item) => item.alert_id),
      notificationId: notificationResult?.notification?.notification_id || null,
      recipients,
      completedAt: new Date().toISOString(),
    }
  },
  { connection }
)

worker.on("completed", (job) => {
  console.log(JSON.stringify({
    event: "AI_JOB_COMPLETED",
    source: "ecgInferenceWorker",
    timestamp: new Date().toISOString(),
    job_id: job.id,
  }))
})

worker.on("failed", (job, error) => {
  console.error(JSON.stringify({
    event: "AI_JOB_FAILED",
    source: "ecgInferenceWorker",
    timestamp: new Date().toISOString(),
    job_id: job?.id || null,
    reason: error?.message || "UNKNOWN",
  }))
})
```

### 11.2 Vì sao worker chỉ trả metadata

Worker cần trả về các thông tin như:

- `readingId`
- `userId`
- `aiStatus`
- `aiResult`
- `abnormalDetected`
- `alertIds`
- `notificationId`

để web process có thể emit realtime sau khi nhận `QueueEvents`.

Như vậy worker chịu trách nhiệm:

- inference
- update DB
- persist alert/notification

còn web process chịu trách nhiệm:

- emit Socket.IO / SSE

Đây là ranh giới hợp lý hơn cho repo hiện tại.

## 12. Refactor `telemetryIngestService.js`

### 12.1 Mục tiêu sau refactor

File [telemetryIngestService.js](/Users/Dell/OneDrive/Desktop/iron-holter/ironman_holter/server/services/telemetryIngestService.js) phải đổi từ:

```text
validate -> infer -> create reading -> create alert -> create notification -> emit
```

sang:

```text
validate -> normalize -> create reading(PENDING) -> emit ECG ngay -> enqueue -> return ngay
```

### 12.2 Import mới

Xóa import:

```js
const { predictFromReading } = require("./ecgCnnService")
```

Thêm import:

```js
const { enqueueEcgInference } = require("./ecgInferenceQueueService")
```

### 12.3 Tạo reading ban đầu

Khi đã có:

- `device`
- `rawEcg`
- `ecgToStore`
- `heartRate`
- `realtimeEcgMeta`

hãy tạo reading như sau:

```js
const reading = await prisma.reading.create({
  data: {
    device_id: device.device_id,
    heart_rate: heartRate,
    ecg_signal: ecgToStore,
    abnormal_detected: false,
    ai_result: null,
    ai_status: "PENDING",
    ai_error: null,
    ai_completed_at: null,
  },
})
```

Lưu ý quan trọng:

- `ecg_signal` nên lưu trực tiếp `ecgToStore`
- không `JSON.stringify(ecgToStore)` nếu field là `Json`

### 12.4 Emit ECG realtime ngay

Sau khi create reading xong, vẫn emit realtime ngay để dashboard lên sóng:

```js
const realtimePayload = {
  reading_id: reading.reading_id,
  device_id: reading.device_id,
  user_id: device.user_id,
  serial_number: device.serial_number,
  heart_rate: reading.heart_rate,
  ecg_signal: ecgToStore,
  ...realtimeEcgMeta,
  abnormal_detected: false,
  ai_result: null,
  ai_status: "PENDING",
  timestamp: reading.timestamp,
}

emitToUsers(io, recipients, "reading-update", realtimePayload)
```

Vì sao vẫn emit ngay:

- người dùng thấy ECG ngay lập tức
- chart không phải chờ AI
- chỉ phần kết luận AI và alert đến sau

### 12.5 Enqueue job

Ngay sau đó enqueue:

```js
await enqueueEcgInference({
  readingId: reading.reading_id,
  deviceId: device.device_id,
  userId: device.user_id,
  serialNumber: device.serial_number,
  ecgSignal: rawEcg,
  sampleRateHz: realtimeEcgMeta.sample_rate_hz || null,
  providedHeartRate: heartRate,
  source,
})
```

### 12.6 Vì sao `enqueue` vẫn phải `await`

Trong hot path mới, chỉ nên `await` những gì bắt buộc:

- `await prisma.reading.create(...)`
- `await enqueueEcgInference(...)`

Vì hai bước này là điều kiện để coi ingest thành công.

Không còn `await` cho:

- AI inference
- create alert
- create notification

vì các bước đó đã chuyển sang worker.

### 12.7 Contract trả về của ingest

`buildIngestResult(...)` nên trả:

```js
return buildIngestResult({
  ok: true,
  statusCode: 201,
  code: "INGEST_OK",
  message: "Nhan telemetry thanh cong",
  reading,
  data: {
    reading_id: reading.reading_id,
    device_id: device.device_id,
    user_id: device.user_id,
    serial_number: device.serial_number,
    heart_rate: reading.heart_rate,
    abnormal_detected: false,
    ai_result: null,
    ai_status: "PENDING",
    alert_count: 0,
  },
  alerts: [],
  recipients,
})
```

## 13. Tách bridge QueueEvents ra service riêng rồi mới gắn vào `server.js`

### 13.1 Vì sao emit ở web server thay vì worker

Vì `socketService.init(io)` đang được gọi trong [server.js](/Users/Dell/OneDrive/Desktop/iron-holter/ironman_holter/server/server.js). `io` chỉ thuộc process web.

Do đó:

- worker xử lý DB
- web server lắng nghe completion event rồi emit

### 13.2 Không nên để helper này trong `utils`

Không nên đặt phần bridge này trong `server/utils/` vì nó:

- phụ thuộc `QueueEvents`
- phụ thuộc `prisma`
- phụ thuộc `Socket.IO io`
- có side effect runtime

`utils` nên dành cho hàm thuần, không giữ state và không phụ thuộc hạ tầng.

Phần này nên đặt ở `services/`, ví dụ:

- [aiQueueRealtimeBridgeService.js](/Users/Dell/OneDrive/Desktop/iron-holter/ironman_holter/server/services/aiQueueRealtimeBridgeService.js)

### 13.3 Code mẫu cho service bridge riêng

Tạo file mới [aiQueueRealtimeBridgeService.js](/Users/Dell/OneDrive/Desktop/iron-holter/ironman_holter/server/services/aiQueueRealtimeBridgeService.js):

```js
const { Job } = require("bullmq")
const prisma = require("../prismaClient")
const { ecgInferenceQueue, ecgInferenceQueueEvents } = require("./ecgInferenceQueueService")
const { emitNotificationToUsers } = require("./notificationService")
const { emitToUsers } = require("./socketEmitService")

const attachAiQueueRealtimeBridge = ({ io, logEvent }) => {
  ecgInferenceQueueEvents.on("completed", async ({ jobId, returnvalue }) => {
    try {
      const payload = returnvalue || {}
      const recipients = Array.isArray(payload.recipients) ? payload.recipients : []

      emitToUsers(io, recipients, "reading-ai-updated", {
        reading_id: payload.readingId,
        user_id: payload.userId,
        serial_number: payload.serialNumber || null,
        ai_status: payload.aiStatus || "DONE",
        ai_result: payload.aiResult || null,
        abnormal_detected: Boolean(payload.abnormalDetected),
        timestamp: payload.completedAt || new Date().toISOString(),
      })

      if (payload.notificationId) {
        const notification = await prisma.notification.findUnique({
          where: { notification_id: Number(payload.notificationId) },
        })

        if (notification) {
          emitNotificationToUsers({
            io,
            recipients,
            notification,
          })
        }
      }

      if (Array.isArray(payload.alertIds) && payload.alertIds.length > 0) {
        const alerts = await prisma.alert.findMany({
          where: {
            alert_id: { in: payload.alertIds.map((id) => Number(id)).filter(Number.isInteger) },
          },
        })

        if (alerts.length > 0) {
          emitToUsers(io, recipients, "alert", {
            user_id: payload.userId,
            reading_id: payload.readingId,
            serial_number: payload.serialNumber || null,
            abnormal_count: alerts.length,
            alerts,
            timestamp: payload.completedAt || new Date().toISOString(),
          })
        }
      }
    } catch (error) {
      logEvent("AI_QUEUE_COMPLETED_BRIDGE_ERROR", {
        job_id: jobId || null,
        reason: error?.message || "UNKNOWN",
      })
    }
  })

  ecgInferenceQueueEvents.on("failed", async ({ jobId, failedReason }) => {
    try {
      const job = await Job.fromId(ecgInferenceQueue, jobId)
      const data = job?.data || {}
      const recipients = Number.isInteger(Number(data.userId)) ? [Number(data.userId)] : []

      emitToUsers(io, recipients, "reading-ai-updated", {
        reading_id: data.readingId || null,
        user_id: data.userId || null,
        serial_number: data.serialNumber || null,
        ai_status: "FAILED",
        ai_result: null,
        abnormal_detected: false,
        ai_error: failedReason || "UNKNOWN",
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      logEvent("AI_QUEUE_FAILED_BRIDGE_ERROR", {
        job_id: jobId || null,
        reason: error?.message || "UNKNOWN",
      })
    }
  })
}

module.exports = {
  attachAiQueueRealtimeBridge,
}
```

### 13.3.1 Giải thích từng phần của code bridge

Đây là phần dễ rối nhất vì nó nối 3 lớp với nhau:

- queue event
- database
- realtime socket

Hiểu theo trình tự này:

#### A. Import ở đầu file

```js
const { Job } = require("bullmq")
const prisma = require("../prismaClient")
const { ecgInferenceQueue, ecgInferenceQueueEvents } = require("./ecgInferenceQueueService")
const { emitNotificationToUsers } = require("./notificationService")
const { emitToUsers } = require("./socketEmitService")
```

Ý nghĩa:

- `Job`: dùng ở nhánh `failed` để đọc lại `job.data` từ queue
- `prisma`: cần query lại `notification` và `alert` đã được worker tạo trong DB
- `ecgInferenceQueueEvents`: là nguồn phát event `completed` và `failed`
- `emitNotificationToUsers` và `emitToUsers`: là cầu nối để đẩy event ra frontend

Vì sao phải query DB lại thay vì dùng hết dữ liệu trong `returnvalue`:

- `returnvalue` chỉ nên là metadata gọn nhẹ
- DB mới là nguồn dữ liệu chuẩn cuối cùng
- cách này giúp payload từ worker không phình quá lớn

#### B. Hàm `attachAiQueueRealtimeBridge({ io, logEvent })`

```js
const attachAiQueueRealtimeBridge = ({ io, logEvent }) => {
```

Hàm này không tự tạo `io`, mà nhận `io` từ `server.js`.

Vì sao viết vậy:

- service này không nên biết web server bootstrap thế nào
- nó chỉ nhận dependency từ bên ngoài
- dễ test hơn và ít coupling hơn

`logEvent` cũng truyền từ ngoài vào để service dùng chung logger hiện có của `server.js`, không tự tạo thêm một kiểu log khác.

#### C. Nhánh `completed`

```js
ecgInferenceQueueEvents.on("completed", async ({ jobId, returnvalue }) => {
```

Đây là lúc worker đã:

- infer xong
- update `reading`
- có thể đã tạo `alert`
- có thể đã tạo `notification`

Nhiệm vụ của bridge ở đây không phải chạy lại nghiệp vụ, mà chỉ:

1. đọc metadata worker trả về
2. emit event realtime phù hợp

#### D. `const payload = returnvalue || {}`

Vì `returnvalue` là dữ liệu worker trả về sau khi hoàn thành job. Nó thường chứa:

- `readingId`
- `userId`
- `serialNumber`
- `aiStatus`
- `aiResult`
- `abnormalDetected`
- `alertIds`
- `notificationId`
- `recipients`

Tại sao phải có fallback `{}`:

- tránh crash nếu worker trả về thiếu dữ liệu
- nhánh error sẽ do `try/catch` xử lý tiếp

#### E. Emit `reading-ai-updated`

```js
emitToUsers(io, recipients, "reading-ai-updated", {
  reading_id: payload.readingId,
  user_id: payload.userId,
  serial_number: payload.serialNumber || null,
  ai_status: payload.aiStatus || "DONE",
  ai_result: payload.aiResult || null,
  abnormal_detected: Boolean(payload.abnormalDetected),
  timestamp: payload.completedAt || new Date().toISOString(),
})
```

Đây là event realtime quan trọng nhất của pha 2.

Pha 1 lúc ingest:

- frontend đã nhận `reading-update`
- nhưng lúc đó `ai_status = PENDING`

Pha 2 sau worker:

- frontend nhận `reading-ai-updated`
- UI đổi từ `PENDING` sang `DONE` hoặc `FAILED`
- badge AI, text kết luận và trạng thái bất thường mới được cập nhật

Tại sao không reuse `reading-update`:

- `reading-update` đang mang nghĩa “ECG vừa tới”
- `reading-ai-updated` mang nghĩa “AI của reading cũ vừa xong”
- tách 2 event sẽ làm logic frontend rõ ràng hơn

#### F. Query lại `notification` rồi emit

```js
if (payload.notificationId) {
  const notification = await prisma.notification.findUnique({
    where: { notification_id: Number(payload.notificationId) },
  })
```

Worker đã persist notification trong DB, nhưng worker không emit socket. Vì vậy web process phải:

1. đọc notification đó từ DB
2. dùng `emitNotificationToUsers(...)` để đẩy `notification:new`

Vì sao không truyền full object notification từ worker sang:

- payload queue completion sẽ bị nặng hơn
- dữ liệu chuẩn vẫn nằm ở DB
- nếu sau này worker schema thay đổi, web process vẫn chỉ cần `notificationId`

#### G. Query lại `alerts` rồi emit event `alert`

```js
if (Array.isArray(payload.alertIds) && payload.alertIds.length > 0) {
  const alerts = await prisma.alert.findMany(...)
```

Lý do giống notification:

- worker chỉ trả `alertIds`
- web process đọc DB rồi emit event `alert`

Cách này giúp:

- payload return từ worker gọn
- socket event luôn phát từ đúng web process

#### H. `try/catch` quanh từng event queue

```js
} catch (error) {
  logEvent("AI_QUEUE_COMPLETED_BRIDGE_ERROR", ...)
}
```

Bridge là lớp realtime phụ trợ. Nếu emit lỗi:

- không được làm crash server
- phải log lại để còn debug

Đó là lý do phải bọc `try/catch` ngay ở callback event, thay vì để promise rơi tự do.

#### I. Nhánh `failed`

```js
ecgInferenceQueueEvents.on("failed", async ({ jobId, failedReason }) => {
```

Nhánh này dùng để xử lý trường hợp:

- worker throw error
- job retry hết số lần
- job bị mark fail

Ở đây frontend vẫn cần biết reading đó đã thất bại để:

- không treo `PENDING` mãi
- có thể hiện badge `FAILED`

#### J. Vì sao phải dùng `Job.fromId(...)`

```js
const job = await Job.fromId(ecgInferenceQueue, jobId)
const data = job?.data || {}
```

Với event `failed`, thường anh chỉ có:

- `jobId`
- `failedReason`

Muốn biết:

- `readingId`
- `userId`
- `serialNumber`

thì phải đọc lại `job.data`.

Đây là lý do cần import `Job` từ `bullmq`.

#### K. Emit `reading-ai-updated` với `FAILED`

```js
emitToUsers(io, recipients, "reading-ai-updated", {
  reading_id: data.readingId || null,
  user_id: data.userId || null,
  serial_number: data.serialNumber || null,
  ai_status: "FAILED",
  ai_result: null,
  abnormal_detected: false,
  ai_error: failedReason || "UNKNOWN",
  timestamp: new Date().toISOString(),
})
```

Ý nghĩa:

- reading vẫn tồn tại
- ECG có thể đã hiển thị rồi
- nhưng AI thất bại, nên frontend phải bỏ trạng thái `PENDING`

Nếu không có bước này, user sẽ thấy reading bị treo phân tích vô thời hạn.

### 13.4 `server.js` lúc này chỉ còn bootstrap

Sửa [server.js](/Users/Dell/OneDrive/Desktop/iron-holter/ironman_holter/server/server.js):

```js
const { attachAiQueueRealtimeBridge } = require("./services/aiQueueRealtimeBridgeService")
```

Gọi sau khi `socketService.init(io)` xong:

```js
attachAiQueueRealtimeBridge({
  io,
  logEvent: logServerEvent,
})
```

### 13.4.1 Giải thích vì sao `server.js` chỉ nên bootstrap

`server.js` là entrypoint của web process. File này đã lo:

- load env
- tạo Express app
- tạo HTTP server
- tạo Socket.IO instance
- mount routes
- init MQTT subscriber

Nếu nhét luôn code `QueueEvents.on("completed"...)` dài vào đây thì file sẽ nhanh chóng trở thành chỗ chứa mọi thứ.

Giữ `server.js` ở vai trò bootstrap sẽ có lợi:

- đọc file dễ hơn
- biết ngay hệ thống đang khởi tạo service nào
- logic queue bridge được test/maintain riêng
- sau này nếu có thêm worker khác, chỉ cần attach thêm bridge tương ứng

Tóm lại:

- `server.js` nên là nơi wiring dependencies
- `aiQueueRealtimeBridgeService.js` mới là nơi chứa runtime logic của bridge

Vì sao cách này tốt hơn:

- `server.js` chỉ còn vai trò bootstrap
- code bridge có file riêng để test và đọc dễ hơn
- sau này nếu bridge lớn thêm, không làm `server.js` phình ra

### 13.5 Vì sao `reading-ai-updated` là event mới

Không nên lạm dụng lại `reading-update` cho cả hai pha:

- pha ingest ban đầu
- pha AI hoàn tất

Tách event mới sẽ giúp frontend rõ ràng hơn:

- `reading-update`: ECG window mới vừa đến
- `reading-ai-updated`: AI đã phân tích xong một reading có sẵn

## 14. Frontend cần chuẩn bị gì

Tài liệu này tập trung backend, nhưng frontend cần chấp nhận 2 trạng thái.

### 14.1 Khi vừa ingest xong

Dashboard có thể nhận:

```json
{
  "reading_id": 123,
  "ai_status": "PENDING",
  "ai_result": null
}
```

UI nên hiển thị:

- "Đang phân tích"
- hoặc badge `PENDING`

### 14.2 Khi AI xong

Có 2 cách:

1. Tối giản:
   - không nghe `reading-ai-updated`
   - UI định kỳ fetch lại API

2. Tốt hơn:
   - nghe event `reading-ai-updated`
   - cập nhật trực tiếp badge và kết luận AI

Tài liệu này khuyên chọn cách 2.

## 15. Thứ tự triển khai thực tế

Làm theo đúng thứ tự này để ít vỡ hệ thống:

1. Thêm dependency `bullmq`, `ioredis`
2. Thêm env queue vào `.env.example` và `.env`
3. Sửa Prisma `Reading` với `ai_status`, `ai_error`, `ai_completed_at`
4. Chạy migration
5. Tạo `ecgInferenceQueueService.js`
6. Tách `notificationService` thành DB-only + emit-only
7. Tạo `workers/ecgInferenceWorker.js`
8. Refactor `telemetryIngestService.js` để create `PENDING` + enqueue
9. Tạo `aiQueueRealtimeBridgeService.js` và gắn nó vào `server.js`
10. Cập nhật frontend đọc `ai_status`

Đừng refactor tất cả cùng lúc mà không có checkpoint.

## 16. Checklist test local end-to-end

### 16.1 Chuẩn bị

1. Redis đang chạy
2. MySQL đang chạy
3. `npm install` trong thư mục `server`
4. `npx prisma migrate dev`

### 16.2 Chạy process

Terminal 1:

```bash
npm run dev
```

Terminal 2:

```bash
npm run worker:ai:dev
```

### 16.3 Test ingest

1. Gửi HTTP telemetry hoặc publish MQTT telemetry
2. Kiểm tra web server log:
   - ingest nhận payload
   - create reading thành công
   - enqueue job thành công
3. Kiểm tra DB:
   - có `reading`
   - `ai_status = PENDING`
4. Kiểm tra worker log:
   - nhận job
   - chạy AI
   - update `reading`
5. Kiểm tra DB lần nữa:
   - `ai_status = DONE`
   - `ai_result` có giá trị
   - nếu bất thường thì có `alert`
   - có `notification`
6. Kiểm tra frontend:
   - ban đầu hiện `PENDING`
   - sau đó nhận `reading-ai-updated`
   - alert/notification đến sau

## 17. Log quan sát nên có

Nên thêm log JSON line ở cả web server và worker:

### Web server

- `INGEST_RECEIVED`
- `INGEST_READING_CREATED`
- `QUEUE_ENQUEUE_OK`
- `QUEUE_ENQUEUE_ERROR`
- `AI_QUEUE_COMPLETED_BRIDGE_ERROR`

### Worker

- `AI_JOB_STARTED`
- `AI_INFER_OK`
- `AI_INFER_ERROR`
- `AI_JOB_COMPLETED`
- `AI_JOB_FAILED`

Nên log thêm:

- `reading_id`
- `serial_number`
- `job_id`
- `infer_ms`
- `job_total_ms`

## 18. Các lỗi thường gặp

### Redis không chạy

Dấu hiệu:

- enqueue fail ngay
- worker không boot

Cách xử lý:

- kiểm tra `REDIS_URL`
- chạy lại Redis local

### Reading bị kẹt ở `PENDING`

Nguyên nhân thường gặp:

- worker chưa chạy
- queue name không khớp
- worker fail nhưng không retry thành công

Cách xử lý:

- kiểm tra `AI_QUEUE_NAME`
- xem log `AI_JOB_FAILED`
- kiểm tra `attempts`, `backoff`

### Duplicate job

Nguyên nhân:

- publish trùng message
- enqueue nhiều lần cùng một reading

Cách xử lý:

- dùng `jobId` theo `readingId`
- chỉ enqueue sau khi create reading thành công

### Worker ghi DB được nhưng không emit realtime

Nguyên nhân:

- `aiQueueRealtimeBridgeService` chưa được gắn vào `server.js`
- event `completed` có nhưng `returnvalue` thiếu dữ liệu

Cách xử lý:

- log `returnvalue`
- kiểm tra `attachAiQueueRealtimeBridge({ io, logEvent })`

## 19. Tradeoff cần chấp nhận

Kiến trúc mới tốt hơn về scale, nhưng phải chấp nhận:

- ingest nhanh hơn nhưng AI result đến sau
- frontend phải hiểu `PENDING`
- hệ thống có thêm Redis và worker process
- debug phức tạp hơn vì có nhiều process

Đổi lại, anh được:

- ACK nhanh hơn
- web server nhẹ hơn
- dễ scale web và AI độc lập
- retry AI job tốt hơn

## 20. Tóm tắt quyết định kỹ thuật

- Queue stack: `BullMQ + Redis`
- Web server chỉ ingest + enqueue
- AI chỉ chạy ở worker
- `Reading` có `ai_status`
- `notificationService` phải tách phần persist và emit
- Realtime emit đi qua web process bằng `QueueEvents`
- Event mới nên có: `reading-ai-updated`

## 21. Gợi ý commit theo từng checkpoint

Nên tách commit để dễ rollback:

1. `feat(queue): add BullMQ and Redis queue scaffolding`
2. `feat(reading): add ai_status fields for async inference`
3. `refactor(notification): split persistence from realtime emit`
4. `refactor(telemetry): enqueue AI jobs after creating pending readings`
5. `feat(worker): add async ECG inference worker`
6. `feat(realtime): bridge AI queue completion to socket events`

## 22. Kết luận

Nếu mục tiêu là mở rộng server thật sự, đây là hướng đúng hơn nhiều so với:

- giữ AI trong hot path
- hoặc chỉ tách AI sang worker sync nhưng vẫn chờ kết quả

Điểm mấu chốt của kiến trúc này là:

- `reading` được tạo ngay
- queue hấp thụ tải
- AI hoàn tất sau
- realtime được cập nhật theo 2 pha: `PENDING` rồi `DONE/FAILED`

Đó là cách đưa backend hiện tại sang mô hình chịu tải tốt hơn mà vẫn giữ được logic nghiệp vụ cũ.
