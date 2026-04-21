const path = require("path")
const dotenv = require("dotenv")

// Quy tắc ưu tiên env:
// 1) `server/.env` là nguồn chính.
// 2) Root `.env` chỉ bổ sung key còn thiếu, không override key đã có.
dotenv.config({ path: path.resolve(__dirname, ".env") })
dotenv.config({ path: path.resolve(__dirname, "../.env"), override: false })

const express = require("express")
const cors = require("cors")
const helmet = require("helmet")
const http = require("http")
const socketIo = require("socket.io")
const cookieParser = require("cookie-parser") // để parse cookie

const prisma = require("./prismaClient")
const socketService = require("./services/socketService")
const {
  initMqttTelemetry,
  shutdownMqttTelemetry,
  publishAck,
  extractSerialFromTopic,
  buildAckPayload,
  isDuplicateMessage,
  markMessageSeen,
  getMaxPayloadBytes,
} = require("./services/mqttTelemetryService")
const { ingestTelemetry } = require("./services/telemetryIngestService")
const { attachAiQueueRealtimeBridge } = require("./services/aiQueueRealtimeBridgeService")
const { attachDirectMessageNotificationBridge } = require("./services/directMessageNotificationBridgeService")

const allowedClientOrigins = [process.env.CLIENT_URL, process.env.CLIENT_URL2, process.env.CLIENT_URL3, process.env.CLIENT_URL4, process.env.CLIENT_URL5]
  .map((origin) => origin?.trim())
  .filter(Boolean)

// Hàm kiểm tra origin gửi lên có nằm trong danh sách frontend được phép hay không.
// Cho phép request không có Origin như Postman hoặc server-to-server để tránh chặn nhầm luồng nội bộ.
const isAllowedClientOrigin = (origin) => {
  if (!origin) {
    return true
  }

  return allowedClientOrigins.includes(origin)
}

const app = express()
const server = http.createServer(app)
const io = socketIo(server, {
  cors: {
    origin(origin, callback) {
      if (isAllowedClientOrigin(origin)) {
        return callback(null, true)
      }

      return callback(new Error(`CORS chặn Socket.IO origin: ${origin}`))
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
})
// View engine
app.set("views", path.join(__dirname, "views"))
app.set("view engine", "ejs")

// Middleware
app.use(helmet())
app.use(cors({
  // Chỉ cho phép hai frontend đã cấu hình trong env truy cập có credentials, để cookie refresh token được browser chấp nhận.
  origin(origin, callback) {
    if (isAllowedClientOrigin(origin)) {
      return callback(null, true)
    }

    return callback(new Error(`CORS chặn HTTP origin: ${origin}`))
  },
  credentials: true,
}))
app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))


// Endpoint wake-up để đánh thức app và database khi platform ngủ.
app.get("/api/hello", async (_req, res) => {
  try {
    await prisma.$queryRawUnsafe("SELECT 1")
    return res.status(200).json({
      ok: true,
      message: "hello",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logServerEvent("HELLO_DB_WAKE_FAILED", {
      reason: error?.message || "UNKNOWN",
    })
    return res.status(503).json({
      ok: false,
      message: "database wake failed",
    })
  }
})
// Routes
app.use("/api/auth", require("./routes/auth"))
app.use("/api/users", require("./routes/users"))
app.use("/api/devices", require("./routes/devices"))
app.use("/api/readings", require("./routes/readings"))
app.use("/api/alerts", require("./routes/alerts"))
app.use("/api/notifications", require("./routes/notifications"))
app.use("/api/reports", require("./routes/reports"))
app.use("/api/chat", require("./routes/chat"))
app.use("/test", require("./routes/routesServer"))
app.use("/api/access", require("./routes/access"))
app.use("/api/history", require("./routes/medicalHistory"))
app.use("/api/doctor", require("./routes/doctorRoutes"))
app.use("/api/family", require("./routes/familyRoutes"))

socketService.init(io)
app.set("io", io)
app.set("socketService", socketService)

const PORT = process.env.PORT || 4000
let isShuttingDown = false

// Hàm ghi log JSON line để chuẩn hóa lifecycle của server process.
const logServerEvent = (event, payload = {}) => {
  console.log(
    JSON.stringify({
      event,
      source: "server",
      timestamp: new Date().toISOString(),
      ...payload,
    })
  )
}

// Khởi tạo bridge để lắng nghe sự kiện từ AI queue và emit đến client qua Socket.IO, không phụ thuộc vào worker nên có thể chạy chung trong server process.
/*
* mục đích chính là bridge giữa AI queue và realtime client update, 
đảm bảo khi job AI hoàn thành sẽ có sự kiện cập nhật ngay cho client mà không cần client phải poll hay subscribe trực tiếp vào queue.
* cách hoạt động:
  - lắng nghe sự kiện job completed từ ecgInferenceQueueEvents
  - khi có job completed, lấy thông tin kết quả từ job data
  - xác định userId và readingId từ job data để biết ai là người nhận thông tin cập nhật
  - emit sự kiện qua Socket.IO đến client của user đó với payload chứa kết quả AI mới nhất
  - log sự kiện này để theo dõi lifecycle của job và tương tác realtime
*/
attachAiQueueRealtimeBridge({
  io,
  logEvent: logServerEvent,
})

attachDirectMessageNotificationBridge({
  io,
  logEvent: logServerEvent,
})

// Hàm gửi ACK error nếu xác định được serial từ topic theo quy tắc P3.
const ackErrorIfPossible = async ({ topicSerial, messageId, errorCode, message, topic }) => {
  if (!topicSerial) {
    logServerEvent("MQTT_ACK_ERROR_SKIPPED_NO_SERIAL", {
      topic,
      error_code: errorCode,
      message_id: messageId || null,
    })
    return
  }

  await publishAck(
    topicSerial,
    buildAckPayload({
      messageId,
      status: "error",
      errorCode,
      message,
    })
  )
}

// ACK `ok` giờ mang nghĩa message đã được backend chấp nhận hợp lệ, không chờ ingest xong.
const ackAcceptedMessage = async ({ serialNumber, messageId, duplicate = false, topic }) => {
  await publishAck(
    serialNumber,
    buildAckPayload({
      messageId,
      status: "ok",
      duplicate,
    })
  )

  logServerEvent("MQTT_ACK_ACCEPTED", {
    topic,
    serial_number: serialNumber,
    message_id: messageId,
    duplicate,
  })
}

// Sau khi ACK accepted, ingest chạy nội bộ và chỉ log kết quả.
const runAcceptedTelemetryIngest = ({ payload, topic, dedupeSerial, messageId }) => {
  Promise.resolve(
    ingestTelemetry(payload, {
      source: "mqtt",
      io,
      actorId: null,
      topic,
    })
  )
    .then((ingestResult) => {
      if (ingestResult.ok) {
        logServerEvent("MQTT_INGEST_OK", {
          topic,
          code: ingestResult.code,
          serial_number: ingestResult.data?.serial_number || dedupeSerial,
          reading_id: ingestResult.data?.reading_id || null,
          message_id: messageId,
          alert_count: ingestResult.data?.alert_count || 0,
        })
        return
      }

      logServerEvent("MQTT_INGEST_ERROR", {
        topic,
        code: ingestResult.code,
        message: ingestResult.message,
        serial_number: ingestResult.data?.serial_number || dedupeSerial,
        message_id: messageId,
      })
    })
    .catch((error) => {
      logServerEvent("MQTT_INGEST_EXCEPTION", {
        topic,
        serial_number: dedupeSerial,
        message_id: messageId,
        reason: error?.message || "UNKNOWN",
      })
    })
}

// Hàm đóng tài nguyên an toàn khi server nhận tín hiệu thoát.
const shutdownGracefully = async (signal) => {
  if (isShuttingDown) return
  isShuttingDown = true

  logServerEvent("SERVER_SHUTDOWN_START", { signal })

  try {
    await shutdownMqttTelemetry()
  } catch (error) {
    logServerEvent("MQTT_SHUTDOWN_ERROR", {
      reason: error?.message || "UNKNOWN",
    })
  }

  server.close(async () => {
    try {
      await prisma.$disconnect()
      logServerEvent("SERVER_SHUTDOWN_OK", { signal })
      process.exit(0)
    } catch (error) {
      logServerEvent("SERVER_SHUTDOWN_DB_ERROR", {
        reason: error?.message || "UNKNOWN",
      })
      process.exit(1)
    }
  })

  setTimeout(() => {
    logServerEvent("SERVER_SHUTDOWN_FORCE_EXIT", { signal })
    process.exit(1)
  }, 10000).unref()
}

// Hàm xử lý payload MQTT và chuyển vào ingest service dùng chung với HTTP.
const handleMqttTelemetryMessage = async ({ topic, payloadText, payloadBuffer }) => {
  const topicSerial = extractSerialFromTopic(topic)
  const payloadSize = Number(payloadBuffer?.length || 0)
  const maxPayloadBytes = getMaxPayloadBytes()

  if (payloadSize > maxPayloadBytes) {
    logServerEvent("MQTT_PAYLOAD_TOO_LARGE", {
      topic,
      payload_size: payloadSize,
      max_payload_bytes: maxPayloadBytes,
    })
    await ackErrorIfPossible({
      topicSerial,
      messageId: null,
      errorCode: "PAYLOAD_TOO_LARGE",
      message: "Payload vuot qua gioi han cho phep",
      topic,
    })
    return
  }

  let payload
  try {
    payload = JSON.parse(payloadText || "{}")
  } catch (error) {
    logServerEvent("MQTT_MESSAGE_INVALID_JSON", {
      topic,
      reason: error?.message || "INVALID_JSON",
    })
    await ackErrorIfPossible({
      topicSerial,
      messageId: null,
      errorCode: "INVALID_JSON",
      message: "Payload JSON khong hop le",
      topic,
    })
    return
  }

  const messageId = String(payload?.message_id ?? "").trim()
  const payloadSerial = String(payload?.serial_number ?? payload?.serial ?? "").trim()

  if (!messageId) {
    logServerEvent("MQTT_MISSING_MESSAGE_ID", { topic, topic_serial: topicSerial || null })
    await ackErrorIfPossible({
      topicSerial,
      messageId: null,
      errorCode: "MISSING_MESSAGE_ID",
      message: "message_id la bat buoc",
      topic,
    })
    return
  }

  if (!payloadSerial) {
    logServerEvent("MQTT_MISSING_SERIAL", {
      topic,
      topic_serial: topicSerial || null,
      message_id: messageId,
    })
    await ackErrorIfPossible({
      topicSerial,
      messageId,
      errorCode: "MISSING_SERIAL",
      message: "serial_number la bat buoc",
      topic,
    })
    return
  }

  if (topicSerial && payloadSerial !== topicSerial) {
    logServerEvent("MQTT_SERIAL_MISMATCH", {
      topic,
      topic_serial: topicSerial,
      payload_serial: payloadSerial,
      message_id: messageId,
    })
    await ackErrorIfPossible({
      topicSerial,
      messageId,
      errorCode: "SERIAL_MISMATCH",
      message: "serial trong topic khong khop payload",
      topic,
    })
    return
  }

  if (payload.ecg_signal !== undefined) {
    const signalTypeValid =
      Array.isArray(payload.ecg_signal) || typeof payload.ecg_signal === "string"
    if (!signalTypeValid) {
      logServerEvent("MQTT_INVALID_ECG_SIGNAL_TYPE", {
        topic,
        message_id: messageId,
        serial_number: payloadSerial,
        signal_type: typeof payload.ecg_signal,
      })
      await ackErrorIfPossible({
        topicSerial: topicSerial || payloadSerial,
        messageId,
        errorCode: "INGEST_FAILED",
        message: "ecg_signal phai la array hoac JSON string",
        topic,
      })
      return
    }
  }

  const dedupeSerial = topicSerial || payloadSerial
  if (isDuplicateMessage(dedupeSerial, messageId)) {
    logServerEvent("MQTT_DUPLICATE_MESSAGE", {
      topic,
      serial_number: dedupeSerial,
      message_id: messageId,
    })
    await ackAcceptedMessage({
      serialNumber: dedupeSerial,
      messageId,
      duplicate: true,
      topic,
    })
    return
  }

  // Message hợp lệ và chưa seen, đánh dấu đã seen để các message duplicate sau này nhận biết.
  // đưa data cho ingest xử lý nhưng không chờ kết quả, chỉ ACK đã nhận message hợp lệ trước để giảm độ trễ phản hồi cho thiết bị.
  markMessageSeen(dedupeSerial, messageId)
  await ackAcceptedMessage({ // gửi ACK ngay khi chấp nhận message
    serialNumber: dedupeSerial,
    messageId,
    duplicate: false,
    topic,
  })
  // chạy ingest bất đồng bộ, không chờ kết quả để trả ACK, tránh delay cho thiết bị. Kết quả ingest sẽ được log riêng.
  runAcceptedTelemetryIngest({ payload, topic, dedupeSerial, messageId })
}

// Hàm khởi động backend: DB, MQTT foundation và HTTP server.
const startServer = async () => {
  try {
    await prisma.$connect()
    logServerEvent("DB_CONNECT_OK")

    const mqttState = await initMqttTelemetry({
      onTelemetryMessage: handleMqttTelemetryMessage,
    })
    logServerEvent("MQTT_INIT_RESULT", mqttState)

    server.listen(PORT, () => {
      logServerEvent("SERVER_LISTENING", {
        port: PORT,
        client_url: process.env.CLIENT_URL || null,
      })
    })
  } catch (error) {
    logServerEvent("SERVER_START_FAILED", {
      reason: error?.message || "UNKNOWN",
    })
    process.exit(1)
  }
}

process.on("SIGINT", () => shutdownGracefully("SIGINT"))
process.on("SIGTERM", () => shutdownGracefully("SIGTERM"))

startServer()

