const prisma = require("../prismaClient")
const { NotificationType } = require("@prisma/client")
const { emitToUsers } = require("./socketEmitService")

const parseOptionalInt = (value) => {
  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) ? parsed : null
}

// Hàm để chuẩn hóa và lọc danh sách userId, đảm bảo chỉ còn các số nguyên duy nhất
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

// Hàm chính để tạo notification, lưu vào DB và emit đến client
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

  // Tạo các bản ghi trong notification_recipient để liên kết notification với từng user nhận
  await prisma.notificationRecipient.createMany({
    data: recipients.map((userId) => ({
      notification_id: notification.notification_id,
      user_id: userId,
    })),
    skipDuplicates: true,
  })

  return { notification, recipients }
}

// Hàm để emit notification mới đến các client của user nhận thông qua Socket.IO
const emitNotificationToUsers = ({ io, recipients, notification }) => {
  if (!io || !notification) return
  emitToUsers(io, recipients, "notification:new", buildSocketPayload(notification))
}

// Hàm tổng hợp để tạo notification và emit đến client
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