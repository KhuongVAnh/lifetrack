const mqtt = require("mqtt")

let mqttClient = null
/*
Tác dụng:
- Quản lý toàn bộ vòng đời MQTT cho telemetry ECG: kết nối, subscribe, dedupe, ACK và shutdown.

Vấn đề file này giải quyết:
- Cần nhận telemetry từ thiết bị qua MQTT một cách an toàn mà không làm hỏng luồng ingest do trùng message, payload lỗi hoặc broker mất kết nối.
- Cách làm: đọc config từ env, chuẩn hóa topic/payload, chống trùng theo TTL, gọi handler ingest chung và publish ACK về thiết bị.

Function chính:
- resolveMqttConfig: đọc và chuẩn hóa cấu hình MQTT từ env.
- initMqttTelemetry: khởi tạo client MQTT, subscribe topic telemetry và gắn handler.
- setTelemetryMessageHandler: đăng ký handler xử lý message telemetry.
- publishAck: gửi ACK về topic của thiết bị.
- extractSerialFromTopic: tách serial từ topic `devices/{serial}/telemetry`.
- buildAckPayload: tạo payload ACK chuẩn.
- isDuplicateMessage, markMessageSeen, pruneExpiredDedupeKeys: quản lý chống trùng message.
- getMqttState, getMaxPayloadBytes: trả về trạng thái và guard runtime.
- shutdownMqttTelemetry: đóng kết nối MQTT an toàn khi server dừng.
*/

let telemetryMessageHandler = null
let activeConfig = null
let dedupeCleanupTimer = null

const dedupeMap = new Map()

const mqttState = {
  enabled: false,
  connected: false,
  subscribed: false,
  topicTelemetry: null,
  brokerUrl: null,
  lastError: null,
}

const DEFAULT_DEDUPE_TTL_MS = 600000
const DEFAULT_DEDUPE_CLEANUP_INTERVAL_MS = 60000
const DEFAULT_MAX_PAYLOAD_BYTES = 262144

// Hàm ghi log JSON line thống nhất cho toàn bộ vòng đời MQTT.
const logMqttEvent = (event, payload = {}) => {
  const record = {
    event: String(event || "MQTT_EVENT"),
    timestamp: new Date().toISOString(),
    source: "mqttTelemetryService",
    ...payload,
  }
  console.log(JSON.stringify(record))
}



// Hàm cắt ngắn payload text để log debug mà không làm phình log.
const toPayloadPreview = (payloadText, maxLen = 220) => {
  const text = String(payloadText || "")
  if (text.length <= maxLen) return text
  return `${text.slice(0, maxLen)}...`
}
// Hàm chuyển chuỗi env về boolean với giá trị mặc định an toàn.
const parseBooleanEnv = (value, defaultValue = false) => {
  if (typeof value === "boolean") return value
  const normalized = String(value || "").trim().toLowerCase()
  if (!normalized) return defaultValue
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on"
}

// Hàm chuyển chuỗi env về số nguyên với fallback mặc định.
const parseIntEnv = (value, fallback) => {
  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) ? parsed : fallback
}

// Hàm chuẩn hóa broker URL để chấp nhận cả dạng hostname thuần và mqtts://.
const normalizeBrokerUrl = (rawValue) => {
  const value = String(rawValue || "").trim()
  if (!value) return ""
  if (/^mqtts?:\/\//i.test(value)) return value
  return `mqtts://${value}`
}
// Hàm đọc cấu hình MQTT từ env cho backend.
const resolveMqttConfig = () => {
  const enabled = parseBooleanEnv(process.env.MQTT_ENABLE, false)
  const qos = Math.min(Math.max(parseIntEnv(process.env.MQTT_QOS, 1), 0), 2)
  const keepalive = parseIntEnv(process.env.MQTT_KEEPALIVE, 60)
  const connectTimeout = parseIntEnv(process.env.MQTT_CONNECT_TIMEOUT_MS, 10000)
  const reconnectPeriod = parseIntEnv(process.env.MQTT_RECONNECT_PERIOD_MS, 3000)
  const maxInflight = parseIntEnv(process.env.MQTT_MAX_INFLIGHT, 50)

  return {
    enabled,
    brokerUrl: normalizeBrokerUrl(process.env.MQTT_BROKER_URL),
    username: String(process.env.MQTT_USERNAME || "").trim(),
    password: String(process.env.MQTT_PASSWORD || "").trim(),
    clientId: String(process.env.MQTT_CLIENT_ID || "ironman-server-dev").trim(),
    topicTelemetry: String(process.env.MQTT_TOPIC_TELEMETRY || "devices/+/telemetry").trim(),
    topicAckTemplate: String(process.env.MQTT_TOPIC_ACK_TEMPLATE || "devices/{serial}/ack").trim(),
    qos,
    ackEnabled: parseBooleanEnv(process.env.MQTT_ACK_ENABLE, true),
    keepalive,
    connectTimeout,
    reconnectPeriod,
    maxInflight,
    dedupeTtlMs: parseIntEnv(process.env.MQTT_DEDUPE_TTL_MS, DEFAULT_DEDUPE_TTL_MS),
    dedupeCleanupIntervalMs: parseIntEnv(
      process.env.MQTT_DEDUPE_CLEANUP_INTERVAL_MS,
      DEFAULT_DEDUPE_CLEANUP_INTERVAL_MS
    ),
    maxPayloadBytes: parseIntEnv(process.env.MQTT_MAX_PAYLOAD_BYTES, DEFAULT_MAX_PAYLOAD_BYTES),
  }
}

// Hàm trích xuất serial từ topic dạng devices/{serial}/telemetry.
const extractSerialFromTopic = (topic) => {
  const value = String(topic || "").trim()
  const match = value.match(/^devices\/([^/]+)\/telemetry$/i)
  if (!match?.[1]) return null
  try {
    return decodeURIComponent(match[1])
  } catch (error) {
    return match[1]
  }
}

// Hàm tạo topic ACK từ template theo serial thiết bị.
const buildAckTopic = (serial) => {
  const serialValue = encodeURIComponent(String(serial || "").trim())
  const template = activeConfig?.topicAckTemplate || "devices/{serial}/ack"
  return template.replace("{serial}", serialValue)
}

// Hàm tạo topic telemetry publish theo serial để giả lập thiết bị gửi dữ liệu lên broker.
const buildTelemetryTopic = (serial) => {
  const serialValue = encodeURIComponent(String(serial || "").trim())
  const template = String(activeConfig?.topicTelemetry || "devices/+/telemetry").trim()

  if (!template) {
    return `devices/${serialValue}/telemetry`
  }

  if (template.includes("{serial}")) {
    return template.replace("{serial}", serialValue)
  }

  if (template.includes("+")) {
    return template.replace("+", serialValue)
  }

  return `devices/${serialValue}/telemetry`
}

// Hàm tạo payload ACK chuẩn hóa cho cả success/error/duplicate.
const buildAckPayload = ({
  messageId,
  status,
  readingId = null,
  duplicate = false,
  errorCode = null,
  message = null,
}) => {
  const payload = {
    message_id: messageId == null ? null : String(messageId),
    status: String(status || "error"),
    server_time: new Date().toISOString(),
  }

  if (payload.status === "ok") {
    payload.duplicate = Boolean(duplicate)
    if (Number.isInteger(Number(readingId))) {
      payload.reading_id = Number(readingId)
    }
    return payload
  }

  payload.error_code = String(errorCode || "INGEST_FAILED")
  payload.message = String(message || "MQTT ingest failed")
  return payload
}

// Hàm tạo key dedupe theo serial và message_id.
const buildDedupeKey = (serial, messageId) => {
  const serialText = String(serial || "").trim()
  const messageText = String(messageId || "").trim()
  return `${serialText}:${messageText}`
}

// Hàm dọn các key dedupe đã hết hạn để tránh phình bộ nhớ.
const pruneExpiredDedupeKeys = () => {
  const now = Date.now()
  let removed = 0
  for (const [key, expiresAt] of dedupeMap.entries()) {
    if (!Number.isFinite(expiresAt) || expiresAt <= now) {
      dedupeMap.delete(key)
      removed += 1
    }
  }
  if (removed > 0) {
    logMqttEvent("MQTT_DEDUPE_PRUNED", { removed, remaining: dedupeMap.size })
  }
}

// Hàm kiểm tra message có bị trùng trong TTL dedupe hay không.
const isDuplicateMessage = (serial, messageId) => {
  pruneExpiredDedupeKeys()
  const key = buildDedupeKey(serial, messageId)
  const expiresAt = dedupeMap.get(key)
  if (!Number.isFinite(expiresAt)) return false
  return expiresAt > Date.now()
}

// Hàm đánh dấu message đã xử lý thành công để chống lặp dữ liệu QoS1.
const markMessageSeen = (serial, messageId) => {
  const ttlMs = Number(activeConfig?.dedupeTtlMs || DEFAULT_DEDUPE_TTL_MS)
  const key = buildDedupeKey(serial, messageId)
  dedupeMap.set(key, Date.now() + Math.max(1, ttlMs))
}

// Hàm khởi động timer dọn rác dedupe định kỳ.
const startDedupeCleanupTimer = () => {
  if (dedupeCleanupTimer) return
  const intervalMs = Number(activeConfig?.dedupeCleanupIntervalMs || DEFAULT_DEDUPE_CLEANUP_INTERVAL_MS)
  dedupeCleanupTimer = setInterval(pruneExpiredDedupeKeys, Math.max(1000, intervalMs))
  dedupeCleanupTimer.unref()
}

// Hàm dừng timer dọn rác dedupe khi shutdown.
const stopDedupeCleanupTimer = () => {
  if (!dedupeCleanupTimer) return
  clearInterval(dedupeCleanupTimer)
  dedupeCleanupTimer = null
}

// Hàm trả giới hạn kích thước payload MQTT để layer server guard trước khi parse.
const getMaxPayloadBytes = () => {
  const configured = Number(activeConfig?.maxPayloadBytes)
  if (Number.isFinite(configured) && configured > 0) return configured
  return DEFAULT_MAX_PAYLOAD_BYTES
}

// Hàm trả snapshot trạng thái MQTT hiện tại để service/controller quan sát.
const getMqttState = () => ({
  ...mqttState,
})

// Hàm đăng ký callback xử lý message telemetry khi nhận từ broker.
const setTelemetryMessageHandler = (handler) => {
  telemetryMessageHandler = typeof handler === "function" ? handler : null
}

// Hàm khởi tạo kết nối MQTT, subscribe topic telemetry và bật reconnect tự động.
const initMqttTelemetry = async (options = {}) => {
  if (options && typeof options.onTelemetryMessage === "function") {
    setTelemetryMessageHandler(options.onTelemetryMessage)
  }

  activeConfig = resolveMqttConfig()
  mqttState.enabled = activeConfig.enabled
  mqttState.topicTelemetry = activeConfig.topicTelemetry
  mqttState.brokerUrl = activeConfig.brokerUrl

  if (!activeConfig.enabled) {
    logMqttEvent("MQTT_DISABLED", { reason: "MQTT_ENABLE=false" })
    return getMqttState()
  }

  if (!activeConfig.brokerUrl) {
    mqttState.lastError = "MISSING_BROKER_URL"
    logMqttEvent("MQTT_INIT_ERROR", { reason: mqttState.lastError })
    return getMqttState()
  }

  if (mqttClient) {
    logMqttEvent("MQTT_ALREADY_INITIALIZED", {
      connected: mqttState.connected,
      subscribed: mqttState.subscribed,
    })
    return getMqttState()
  }

  startDedupeCleanupTimer()

  try {
    mqttClient = mqtt.connect(activeConfig.brokerUrl, {
      clientId: activeConfig.clientId,
      username: activeConfig.username || undefined,
      password: activeConfig.password || undefined,
      clean: true,
      reconnectPeriod: activeConfig.reconnectPeriod,
      connectTimeout: activeConfig.connectTimeout,
      keepalive: activeConfig.keepalive,
      queueQoSZero: true,
      resubscribe: true,
      protocolVersion: 4,
      properties: {
        maximumPacketSize: 1024 * 1024,
      },
      incomingStore: undefined,
      outgoingStore: undefined,
      maxInflightMessages: activeConfig.maxInflight,
    })

    mqttClient.on("connect", () => {
      mqttState.connected = true
      mqttState.lastError = null
      logMqttEvent("MQTT_CONNECT_OK", {
        broker_url: activeConfig.brokerUrl,
        client_id: activeConfig.clientId,
      })

      mqttClient.subscribe(activeConfig.topicTelemetry, { qos: activeConfig.qos }, (error) => {
        if (error) {
          mqttState.subscribed = false
          mqttState.lastError = error.message
          logMqttEvent("MQTT_SUBSCRIBE_ERROR", {
            topic: activeConfig.topicTelemetry,
            reason: error.message,
          })
          return
        }

        mqttState.subscribed = true
        logMqttEvent("MQTT_SUBSCRIBE_OK", {
          topic: activeConfig.topicTelemetry,
          qos: activeConfig.qos,
        })
      })
    })

    mqttClient.on("reconnect", () => {
      logMqttEvent("MQTT_RECONNECTING", {
        broker_url: activeConfig.brokerUrl,
      })
    })

    mqttClient.on("offline", () => {
      mqttState.connected = false
      mqttState.subscribed = false
      logMqttEvent("MQTT_OFFLINE")
    })

    mqttClient.on("close", () => {
      mqttState.connected = false
      mqttState.subscribed = false
      logMqttEvent("MQTT_CLOSED")
    })

    mqttClient.on("error", (error) => {
      mqttState.lastError = error?.message || "UNKNOWN_ERROR"
      logMqttEvent("MQTT_ERROR", {
        reason: mqttState.lastError,
      })
    })

    mqttClient.on("message", (topic, payloadBuffer) => {
      const payloadText = payloadBuffer?.toString("utf8") || ""
      logMqttEvent("MQTT_MESSAGE_RECEIVED", {
        topic,
        payload_size: payloadBuffer?.length || 0,
        payload_preview: toPayloadPreview(payloadText),
      })
      if (typeof telemetryMessageHandler !== "function") {
        logMqttEvent("MQTT_MESSAGE_SKIPPED", {
          topic,
          reason: "NO_HANDLER",
          payload_size: payloadBuffer?.length || 0,
        })
        return
      }

      Promise.resolve(
        telemetryMessageHandler({
          topic,
          payloadBuffer,
          payloadText,
        })
      ).catch((error) => {
        logMqttEvent("MQTT_HANDLER_ERROR", {
          topic,
          reason: error?.message || "UNKNOWN",
        })
      })
    })

    logMqttEvent("MQTT_INIT_STARTED", {
      broker_url: activeConfig.brokerUrl,
      topic: activeConfig.topicTelemetry,
      qos: activeConfig.qos,
    })
  } catch (error) {
    mqttState.lastError = error?.message || "INIT_FAILED"
    logMqttEvent("MQTT_INIT_ERROR", {
      reason: mqttState.lastError,
    })
  }

  return getMqttState()
}

// Hàm publish ACK lên topic thiết bị để phản hồi trạng thái ingest.
const publishAck = async (serialNumber, ackPayload = {}) => {
  if (!mqttClient || !mqttState.connected || !activeConfig?.ackEnabled) {
    logMqttEvent("MQTT_ACK_SKIPPED", {
      reason: "MQTT_NOT_READY_OR_ACK_DISABLED",
      serial_number: serialNumber,
    })
    return false
  }

  const topic = buildAckTopic(serialNumber)
  const message = JSON.stringify(ackPayload || {})
  logMqttEvent("MQTT_ACK_PUBLISHING", {
    topic,
    serial_number: serialNumber,
    message_id: ackPayload?.message_id || null,
    status: ackPayload?.status || null,
    payload_size: Buffer.byteLength(message, "utf8"),
  })

  return new Promise((resolve) => {
    mqttClient.publish(topic, message, { qos: activeConfig.qos, retain: false }, (error) => {
      if (error) {
        logMqttEvent("MQTT_ACK_ERROR", {
          topic,
          serial_number: serialNumber,
          reason: error.message,
        })
        resolve(false)
        return
      }

      logMqttEvent("MQTT_ACK_OK", {
        topic,
        serial_number: serialNumber,
        message_id: ackPayload?.message_id || null,
        status: ackPayload?.status || null,
      })
      resolve(true)
    })
  })
}

// Hàm publish telemetry test lên broker để reuse toàn bộ luồng MQTT thật của hệ thống.
const publishTelemetryMessage = async ({ serialNumber, payload, qos, retain = false } = {}) => {
  const normalizedSerial = String(serialNumber || "").trim()
  if (!normalizedSerial) {
    return {
      ok: false,
      code: "INVALID_SERIAL",
      message: "serial_number la bat buoc",
      topic: null,
    }
  }

  if (!mqttState.enabled) {
    return {
      ok: false,
      code: "MQTT_DISABLED",
      message: "MQTT dang tat",
      topic: null,
    }
  }

  if (!mqttClient || !mqttState.connected) {
    return {
      ok: false,
      code: "MQTT_NOT_READY",
      message: "MQTT chua san sang de publish telemetry",
      topic: null,
    }
  }

  const topic = buildTelemetryTopic(normalizedSerial)
  const message = JSON.stringify(payload || {})
  const publishQos = Number.isInteger(Number(qos)) ? Number(qos) : activeConfig?.qos || 1

  logMqttEvent("MQTT_TELEMETRY_PUBLISHING", {
    topic,
    serial_number: normalizedSerial,
    qos: publishQos,
    payload_size: Buffer.byteLength(message, "utf8"),
    payload_preview: toPayloadPreview(message),
  })

  return new Promise((resolve) => {
    mqttClient.publish(topic, message, { qos: publishQos, retain: Boolean(retain) }, (error) => {
      if (error) {
        logMqttEvent("MQTT_TELEMETRY_PUBLISH_ERROR", {
          topic,
          serial_number: normalizedSerial,
          reason: error.message,
        })
        resolve({
          ok: false,
          code: "MQTT_PUBLISH_FAILED",
          message: error.message,
          topic,
        })
        return
      }

      logMqttEvent("MQTT_TELEMETRY_PUBLISH_OK", {
        topic,
        serial_number: normalizedSerial,
        qos: publishQos,
      })
      resolve({
        ok: true,
        code: "MQTT_PUBLISH_OK",
        message: "Telemetry da duoc publish",
        topic,
      })
    })
  })
}

// Hàm đóng kết nối MQTT an toàn khi server shutdown.
const shutdownMqttTelemetry = async () => {
  stopDedupeCleanupTimer()
  dedupeMap.clear()

  if (!mqttClient) {
    return
  }

  const closingClient = mqttClient
  mqttClient = null
  mqttState.connected = false
  mqttState.subscribed = false

  await new Promise((resolve) => {
    closingClient.end(true, {}, () => {
      logMqttEvent("MQTT_SHUTDOWN_OK")
      resolve()
    })
  })
}

module.exports = {
  initMqttTelemetry,
  shutdownMqttTelemetry,
  publishAck,
  getMqttState,
  setTelemetryMessageHandler,
  extractSerialFromTopic,
  buildAckPayload,
  isDuplicateMessage,
  markMessageSeen,
  pruneExpiredDedupeKeys,
  getMaxPayloadBytes,
  logMqttEvent,
  publishTelemetryMessage,
}



