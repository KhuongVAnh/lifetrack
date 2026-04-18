// Controller xử lý tạo, truy vấn và cập nhật trạng thái cảnh báo tim mạch.
const prisma = require("../prismaClient")
const { fromPrismaUserRole } = require("../utils/enumMappings")
const { AccessStatus, NotificationType } = require("@prisma/client")
const { emitToUsers } = require("../services/socketEmitService")
const { createNotification } = require("../services/notificationService")

// Hàm xử lý tìm các tài khoản cần nhận thông báo cảnh báo.
const getAlertRecipientIds = async (patientId) => {
  const viewers = await prisma.accessPermission.findMany({
    where: {
      patient_id: patientId,
      status: AccessStatus.accepted,
    },
    select: { viewer_id: true },
  })

  return [patientId, ...viewers.map((item) => item.viewer_id)]
}

// Hàm xử lý tạo cảnh báo mới cho bệnh nhân.
const createAlert = async (req, res) => {
  try {
    const { user_id, reading_id, alert_type, message, segment_start_sample, segment_end_sample } = req.body
    const userId = Number.parseInt(user_id, 10)
    const readingId = Number.parseInt(reading_id, 10)
    const segmentStartSample = Number.isInteger(Number(segment_start_sample))
      ? Number(segment_start_sample)
      : null
    const segmentEndSample = Number.isInteger(Number(segment_end_sample))
      ? Number(segment_end_sample)
      : null

    if (!Number.isInteger(userId)) {
      return res.status(400).json({ message: "user_id la bat buoc va phai hop le" })
    }

    if (!Number.isInteger(readingId)) {
      return res.status(400).json({ message: "reading_id la bat buoc va phai hop le" })
    }

    if (!alert_type || !message) {
      return res.status(400).json({ message: "alert_type va message la bat buoc" })
    }

    const user = await prisma.user.findUnique({ where: { user_id: userId } })
    if (!user) {
      return res.status(404).json({ message: "Khong tim thay nguoi dung" })
    }

    const reading = await prisma.reading.findUnique({
      where: { reading_id: readingId },
      include: {
        device: {
          select: { user_id: true },
        },
      },
    })

    if (!reading) {
      return res.status(404).json({ message: "Khong tim thay reading" })
    }

    if (reading.device.user_id !== userId) {
      return res.status(400).json({ message: "reading_id khong thuoc user_id duoc chon" })
    }

    const alert = await prisma.alert.create({
      data: {
        user_id: userId,
        reading_id: readingId,
        alert_type,
        message,
        segment_start_sample: segmentStartSample,
        segment_end_sample: segmentEndSample,
      },
    })

    const io = req.app.get("io")
    const recipients = await getAlertRecipientIds(userId)
    emitToUsers(io, recipients, "alert", {
      reading_id: readingId,
      user_id: userId,
      abnormal_count: 1,
      ai_result_summary: alert_type,
      alert_type,
      message,
      timestamp: alert.timestamp,
      alerts: [
        {
          alert_id: alert.alert_id,
          user_id: userId,
          reading_id: readingId,
          alert_type,
          message,
          segment_start_sample: alert.segment_start_sample,
          segment_end_sample: alert.segment_end_sample,
          timestamp: alert.timestamp,
        },
      ],
    })

    await createNotification({
      type: NotificationType.ALERT,
      title: "Canh bao suc khoe",
      message,
      actorId: req.user?.user_id,
      entityType: "alert",
      entityId: alert.alert_id,
      payload: {
        user_id: userId,
        reading_id: alert.reading_id,
        abnormal_count: 1,
        ai_result_summary: alert_type,
        alerts: [
          {
            alert_id: alert.alert_id,
            alert_type,
            message,
            segment_start_sample: alert.segment_start_sample,
            segment_end_sample: alert.segment_end_sample,
            timestamp: alert.timestamp,
          },
        ],
      },
      recipientUserIds: recipients,
      io,
    })

    res.status(201).json({
      message: "Tạo cảnh báo thành công",
      alert,
    })
  } catch (error) {
    console.error("Lỗi tạo cảnh báo:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

// Hàm xử lý lấy danh sách cảnh báo theo người dùng.
const getUserAlerts = async (req, res) => {
  try {
    const { user_id } = req.params
    const { resolved } = req.query
    const userId = Number.parseInt(user_id, 10)

    const whereClause = { user_id: userId }
    if (resolved !== undefined) {
      whereClause.resolved = resolved === "true"
    }

    const alerts = await prisma.alert.findMany({
      where: whereClause,
      orderBy: { timestamp: "desc" },
    })

    res.json({ alerts })
  } catch (error) {
    console.error("Lỗi lấy cảnh báo:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

// Hàm xử lý đánh dấu cảnh báo đã được xử lý.
const resolveAlert = async (req, res) => {
  try {
    const { id } = req.params
    const alertId = Number.parseInt(id, 10)

    const alert = await prisma.alert.findUnique({ where: { alert_id: alertId } })
    if (!alert) {
      return res.status(404).json({ message: "Không tìm thấy cảnh báo" })
    }

    const updatedAlert = await prisma.alert.update({
      where: { alert_id: alertId },
      data: { resolved: true },
    })

    res.json({
      message: "Đánh dấu cảnh báo đã xử lý thành công",
      alert: updatedAlert,
    })
  } catch (error) {
    console.error("Lỗi xử lý cảnh báo:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

// Hàm xử lý lấy toàn bộ cảnh báo cho quản trị.
const getAllAlerts = async (req, res) => {
  try {
    const { resolved } = req.query

    const whereClause = {}
    if (resolved !== undefined) {
      whereClause.resolved = resolved === "true"
    }

    const alerts = await prisma.alert.findMany({
      where: whereClause,
      include: {
        user: {
          select: { name: true, email: true, role: true },
        },
      },
      orderBy: { timestamp: "desc" },
    })

    const mappedAlerts = alerts.map((alert) => ({
      ...alert,
      user: alert.user
        ? {
            ...alert.user,
            role: fromPrismaUserRole(alert.user.role),
          }
        : null,
    }))

    res.json({ alerts: mappedAlerts })
  } catch (error) {
    console.error("Lỗi lấy tất cả cảnh báo:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

module.exports = {
  createAlert,
  getUserAlerts,
  resolveAlert,
  getAllAlerts,
}
