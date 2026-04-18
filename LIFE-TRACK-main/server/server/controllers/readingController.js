// Controller xử lý telemetry, dữ liệu ECG và lịch sử chỉ số tim mạch.
const prisma = require("../prismaClient")
const { randomUUID } = require("crypto")
const { AccessRole, AccessStatus } = require("@prisma/client")
const {
  BASELINE_SAMPLE_RATE,
  generateFakeECGData,
} = require("../services/fakeReadingDataService")
const { publishTelemetryMessage } = require("../services/mqttTelemetryService")
const { ingestTelemetry } = require("../services/telemetryIngestService")
const { resolveAiCodeFromLabel, getAiLabelFromCode } = require("../strings/ecgAiStrings")

// Hàm xử lý chuẩn hóa device_id về số nguyên hợp lệ.
const toDeviceId = (value) => {
  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) ? parsed : null
}

const toReadingId = (value) => {
  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) ? parsed : null
}

// Hàm xử lý tạo dữ liệu ECG giả lập để test.
const createFakeReading = async (req, res) => {
  try {
    const deviceId = toDeviceId(req.body?.device_id)
    if (deviceId === null) {
      return res.status(400).json({ message: "device_id không hợp lệ" })
    }

    const device = await prisma.device.findUnique({ where: { device_id: deviceId } })
    if (!device) {
      return res.status(404).json({ message: "Không tìm thấy thiết bị" })
    }

    const messageId = randomUUID()
    const telemetryPayload = {
      message_id: messageId,
      serial_number: device.serial_number,
      source: "fake-mqtt",
      heart_rate: 60,
      sample_rate_hz: BASELINE_SAMPLE_RATE,
      ecg_signal: generateFakeECGData(),
      timestamp: new Date().toISOString(),
    }

    const publishResult = await publishTelemetryMessage({
      serialNumber: device.serial_number,
      payload: telemetryPayload,
    })

    if (!publishResult.ok) {
      const statusCode =
        publishResult.code === "MQTT_DISABLED" || publishResult.code === "MQTT_NOT_READY" ? 503 : 500

      return res.status(statusCode).json({
        message: publishResult.message || "Không thể publish fake telemetry lên MQTT",
        code: publishResult.code || "MQTT_PUBLISH_FAILED",
      })
    }

    return res.status(202).json({
      message: "Đã publish fake telemetry vào MQTT",
      data: {
        device_id: device.device_id,
        serial_number: device.serial_number,
        topic: publishResult.topic,
        message_id: messageId,
      },
    })
  } catch (error) {
    console.error("Lỗi tạo dữ liệu đọc:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

// Hàm xử lý lấy dữ liệu đọc theo thiết bị.
const getDeviceReadings = async (req, res) => {
  try {
    const deviceId = toDeviceId(req.params.device_id)
    const { limit = 50, offset = 0 } = req.query

    if (deviceId === null) {
      return res.status(400).json({ message: "device_id khong hop le" })
    }

    const readings = await prisma.reading.findMany({
      where: { device_id: deviceId },
      orderBy: { timestamp: "desc" },
      take: Number.parseInt(limit, 10),
      skip: Number.parseInt(offset, 10),
    })

    res.json({ readings })
  } catch (error) {
    console.error("Lỗi lấy dữ liệu đọc:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

// Hàm xử lý lấy lịch sử dữ liệu tim mạch theo người dùng.
const getUserReadingHistory = async (req, res) => {
  try {
    const { user_id } = req.params
    const { limit = 100, offset = 0 } = req.query
    const userId = Number.parseInt(user_id, 10)

    const readings = await prisma.reading.findMany({
      where: {
        device: { user_id: userId },
      },
      include: {
        device: {
          select: { device_id: true, serial_number: true },
        },
      },
      orderBy: { timestamp: "desc" },
      take: Number.parseInt(limit, 10),
      skip: Number.parseInt(offset, 10),
    })

    res.json({ readings })
  } catch (error) {
    console.error("Lỗi lấy lịch sử đọc:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

// Hàm xử lý nhận telemetry từ thiết bị qua serial và chuyển vào ingest service dùng chung.
const receiveTelemetry = async (req, res) => {
  try {
    const ingestResult = await ingestTelemetry(req.body, {
      source: "http",
      io: req.app.get("io"),
      actorId: null,
    })

    if (!ingestResult.ok) {
      return res.status(ingestResult.statusCode).json({ message: ingestResult.message })
    }

    return res.status(201).json({
      message: "Telemetry data received",
      data: ingestResult.reading,
    })
  } catch (error) {
    console.error("Error receiving telemetry:", error)
    return res.status(500).json({ message: "Failed to receive telemetry" })
  }
}

// Hàm xử lý lấy chi tiết reading để hiển thị đồ thị ECG.
const getReadingDetail = async (req, res) => {
  try {
    const readingId = toReadingId(req.params.reading_id)
    const requesterId = Number.parseInt(req.user.user_id, 10)

    if (readingId === null) {
      return res.status(400).json({ message: "reading_id khong hop le" })
    }

    const reading = await prisma.reading.findUnique({
      where: { reading_id: readingId },
      include: {
        device: {
          select: {
            device_id: true,
            serial_number: true,
            user_id: true,
            user: {
              select: { user_id: true, name: true, email: true },
            },
          },
        },
        alerts: {
          where: {
            segment_start_sample: { not: null },
            segment_end_sample: { not: null },
          },
          orderBy: [
            { segment_start_sample: "asc" },
            { timestamp: "asc" },
          ],
          select: {
            alert_id: true,
            alert_type: true,
            segment_start_sample: true,
            segment_end_sample: true,
            timestamp: true,
            resolved: true,
          },
        },
      },
    })

    if (!reading) {
      return res.status(404).json({ message: "Khong tim thay reading" })
    }

    const patientId = reading.device.user_id
    if (requesterId !== patientId) {
      const viewerAccess = await prisma.accessPermission.findFirst({
        where: {
          patient_id: patientId,
          viewer_id: requesterId,
          role: { in: [AccessRole.BAC_SI, AccessRole.GIA_DINH] },
          status: AccessStatus.accepted,
        },
        select: { permission_id: true },
      })

      if (!viewerAccess) {
        return res.status(403).json({ message: "Bạn không có quyền xem reading này" })
      }
    }

    const mappedAlerts = reading.alerts
      .map((alert) => {
        const labelCode = resolveAiCodeFromLabel(alert.alert_type)
        const labelText = getAiLabelFromCode(labelCode || alert.alert_type)
        return {
          alert_id: alert.alert_id,
          alert_type: alert.alert_type,
          label_code: labelCode,
          label_text: labelText,
          segment_start_sample: alert.segment_start_sample,
          segment_end_sample: alert.segment_end_sample,
          timestamp: alert.timestamp,
          resolved: alert.resolved,
        }
      })
      .filter((alert) =>
        Number.isInteger(Number(alert.segment_start_sample)) &&
        Number.isInteger(Number(alert.segment_end_sample))
      )

    return res.json({
      reading: {
        reading_id: reading.reading_id,
        timestamp: reading.timestamp,
        heart_rate: reading.heart_rate,
        ecg_signal: reading.ecg_signal,
        abnormal_detected: reading.abnormal_detected,
        ai_result: reading.ai_result,
        ai_status: reading.ai_status,
        ai_error: reading.ai_error,
        ai_completed_at: reading.ai_completed_at,
        device: {
          device_id: reading.device.device_id,
          serial_number: reading.device.serial_number,
        },
        patient: reading.device.user,
        alerts: mappedAlerts,
      },
    })
  } catch (error) {
    console.error("Lỗi lấy chi tiết reading:", error)
    return res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

module.exports = {
  createFakeReading,
  getDeviceReadings,
  getUserReadingHistory,
  receiveTelemetry,
  getReadingDetail,
}
