/*
Tac dung:
- La loi ingest telemetry dung chung cho ca HTTP va MQTT.
- Hot path chi validate, normalize, tao reading PENDING va enqueue job AI.
*/

const prisma = require("../prismaClient")
const { emitToUsers } = require("./socketEmitService")
const { enqueueEcgInference } = require("./ecgInferenceQueueService")
const { filterReadingSignal } = require("./ecgCnnPreprocessService")
const { generateFallbackECGSignal } = require("./fakeReadingDataService")
const {
  normalizeEcgSignal,
  toHeartRate,
  resolveTelemetrySampleRate,
  buildRealtimeEcgMeta,
} = require("./telemetrySignalService")
const {
  getDeviceBySerialCached,
  getRecipientIdsByPatientCached,
} = require("./telemetryRuntimeCacheService")

const logTelemetryIngestEvent = (event, payload = {}) => {
  const normalizedEvent = String(event || "TELEMETRY_INGEST_EVENT").trim() || "TELEMETRY_INGEST_EVENT"
  console.log(
    JSON.stringify({
      event: normalizedEvent,
      timestamp: new Date().toISOString(),
      source: "telemetryIngestService",
      ...payload,
    })
  )
}

const buildIngestResult = (overrides = {}) => {
  return {
    ok: false,
    statusCode: 500,
    code: "INGEST_FAILED",
    message: "Lỗi server nội bộ",
    reading: null,
    data: {
      reading_id: null,
      device_id: null,
      user_id: null,
      serial_number: null,
      heart_rate: null,
      abnormal_detected: false,
      ai_result: null,
      ai_status: null,
      alert_count: 0,
    },
    alerts: [],
    recipients: [],
    error: null,
    ...overrides,
  }
}

// Hàm lọc tín hiệu để lưu DB; nếu lọc lỗi thì fallback về tín hiệu gốc nhưng không fail nghiệp vụ.
const filterSignalForStorage = (ecgSignal, context) => {
  const filteredResult = filterReadingSignal(ecgSignal, { context })
  if (filteredResult?.skipped) {
    logTelemetryIngestEvent("AI_FILTER_SKIP", {
      context,
      reason: filteredResult.reason || "UNKNOWN",
      input_len: filteredResult.input_len ?? 0,
      fallback_applied: true,
    })
  }

  const filteredSignal = Array.isArray(filteredResult?.filtered_signal)
    ? filteredResult.filtered_signal
    : []

  if (filteredSignal.length > 0) {
    return filteredSignal
  }

  return Array.isArray(ecgSignal) ? ecgSignal : []
}

// Hàm xử lý nghiệp vụ ingest telemetry dùng chung cho cả HTTP route và MQTT consumer.
const ingestTelemetry = async (payload, context = {}) => {

  const source = String(context?.source || "unknown")
  const io = context?.io || null

  try {
    const serialNumber = String(payload?.serial_number ?? payload?.serial ?? "").trim()
    if (!serialNumber) {
      return buildIngestResult({
        statusCode: 400,
        code: "MISSING_SERIAL",
        message: "serial_number la bat buoc",
        data: { ...buildIngestResult().data, serial_number: null },
        error: { reason: "MISSING_SERIAL" },
      })
    }

    const device = await getDeviceBySerialCached(serialNumber)

    if (!device) {
      return buildIngestResult({
        statusCode: 404,
        code: "DEVICE_NOT_FOUND",
        message: "Không tìm thấy thiết bị",
        data: { ...buildIngestResult().data, serial_number: serialNumber },
        error: { reason: "DEVICE_NOT_FOUND" },
      })
    }

    const normalizedEcg = normalizeEcgSignal(payload?.ecg_signal)
    const rawEcg = normalizedEcg.length > 0 ? normalizedEcg : generateFallbackECGSignal()
    if (!Array.isArray(rawEcg) || rawEcg.length === 0) {
      if (source === "mqtt") {
        logTelemetryIngestEvent("MQTT_INVALID_PAYLOAD", {
          reason: "INVALID_PAYLOAD",
          serial_number: serialNumber,
        })
      }

      return buildIngestResult({
        statusCode: 400,
        code: "INVALID_PAYLOAD",
        message: "ecg_signal không hợp lệ",
        data: {
          ...buildIngestResult().data,
          serial_number: serialNumber,
          device_id: device.device_id,
          user_id: device.user_id,
        },
        error: { reason: "INVALID_PAYLOAD" },
      })
    }

    const ecgToStore = filterSignalForStorage(rawEcg, `${source}:store`)
    const sampleRateHz = resolveTelemetrySampleRate(payload)
    const resolvedHeartRate = toHeartRate(payload?.heart_rate) ?? 0
    const realtimeEcgMeta = buildRealtimeEcgMeta({
      payload,
      ecgSignal: ecgToStore,
      fallbackSampleRate: sampleRateHz,
    })

    const reading = await prisma.reading.create({
      data: {
        device_id: device.device_id,
        heart_rate: resolvedHeartRate,
        ecg_signal: ecgToStore,
        abnormal_detected: false,
        ai_result: null,
        ai_status: "PENDING",
        ai_error: null,
        ai_completed_at: null,
        timestamp: new Date(),
      },
    })

    // Emit event realtime cho các tài khoản liên quan của bệnh nhân và bệnh nhân khi có reading mới
    const recipients = await getRecipientIdsByPatientCached(device.user_id)

    try {
      // đưa job vào queue để xử lý AI bất đồng bộ, tránh blocking luồng chính của ingest và giảm thiểu độ trễ trong phản hồi HTTP/MQTT
      await enqueueEcgInference({
        readingId: reading.reading_id,
        deviceId: device.device_id,
        userId: device.user_id,
        serialNumber: device.serial_number,
        ecgSignal: rawEcg,
        sampleRateHz: realtimeEcgMeta.sample_rate_hz || null,
        providedHeartRate: resolvedHeartRate,
        recipients: recipients,
        source,
      })
    } catch (error) {
      await prisma.reading.update({
        where: { reading_id: reading.reading_id },
        data: {
          ai_status: "FAILED",
          ai_error: error?.message || "QUEUE_ENQUEUE_FAILED",
          ai_completed_at: null,
        },
      })

      logTelemetryIngestEvent("QUEUE_ENQUEUE_FAILED", {
        source,
        serial_number: serialNumber,
        reading_id: reading.reading_id,
        message: error?.message || "UNKNOWN",
      })

      return buildIngestResult({
        statusCode: 500,
        code: "QUEUE_ENQUEUE_FAILED",
        message: "Không thể đưa job vào queue AI",
        reading: {
          ...reading,
          ai_status: "FAILED",
          ai_error: error?.message || "QUEUE_ENQUEUE_FAILED",
        },
        data: {
          reading_id: reading.reading_id,
          device_id: device.device_id,
          user_id: device.user_id,
          serial_number: device.serial_number,
          heart_rate: reading.heart_rate,
          abnormal_detected: false,
          ai_result: null,
          ai_status: "FAILED",
          alert_count: 0,
        },
        recipients,
        error: {
          reason: "QUEUE_ENQUEUE_FAILED",
          detail: error?.message || "UNKNOWN",
        },
      })
    }

    // Phát event realtime cho client ngay khi tạo reading mới, dù job AI chưa được xử lý, để cập nhật giao diện người dùng nhanh chóng
    emitToUsers(io, recipients, "reading-update", {
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
    })

    return buildIngestResult({
      ok: true,
      statusCode: 201,
      code: "INGEST_OK",
      message: "Nhận telemetry thành công",
      reading,
      data: {
        reading_id: reading.reading_id,
        device_id: reading.device_id,
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
  } catch (error) {
    logTelemetryIngestEvent("INGEST_FAILED", {
      source,
      reason: "INGEST_FAILED",
      message: error?.message || "UNKNOWN",
    })
    return buildIngestResult({
      statusCode: 500,
      code: "INGEST_FAILED",
      message: "Failed to receive telemetry",
      error: {
        reason: "INGEST_FAILED",
        detail: error?.message || "UNKNOWN",
      },
    })
  }
}

module.exports = {
  ingestTelemetry,
}
