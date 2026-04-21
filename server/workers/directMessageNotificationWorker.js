/*
 * Direct Message Notification Worker
 * Worker này xử lý việc tạo notification cho direct message ở background,
 * giúp request gửi tin nhắn trả nhanh mà vẫn giữ notification đầy đủ trong hệ thống.
 */
const IORedis = require("ioredis")
const { Worker } = require("bullmq")
const { NotificationType } = require("@prisma/client")
const prisma = require("../prismaClient")
const { persistNotification } = require("../services/notificationService")
const { queueName } = require("../services/directMessageNotificationQueueService")

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
})

// Hàm tìm notification direct message đã tồn tại để worker retry không tạo bản ghi trùng.
const findExistingDirectMessageNotification = async (messageId) => {
  return prisma.notification.findFirst({
    where: {
      type: NotificationType.DIRECT_MESSAGE,
      entity_type: "direct_message",
      entity_id: messageId,
    },
    orderBy: { notification_id: "desc" },
  })
}

// Hàm worker chính để persist notification direct message một cách idempotent.
const directMessageNotificationWorker = new Worker(
  queueName,
  async (job) => {
    const startedAt = Date.now()
    const messageId = Number.parseInt(job?.data?.messageId, 10)
    const senderId = Number.parseInt(job?.data?.senderId, 10)
    const receiverId = Number.parseInt(job?.data?.receiverId, 10)
    const conversationKey = String(job?.data?.conversationKey || "").trim() || null

    if (!Number.isInteger(messageId) || !Number.isInteger(senderId) || !Number.isInteger(receiverId)) {
      throw new Error("INVALID_DIRECT_MESSAGE_NOTIFICATION_JOB")
    }

    // Đọc message từ DB để lấy nội dung chuẩn và tránh phụ thuộc vào payload queue nếu sau này shape thay đổi.
    const directMessage = await prisma.directMessage.findUnique({
      where: { message_id: messageId },
    })

    if (!directMessage) {
      throw new Error("DIRECT_MESSAGE_NOT_FOUND")
    }

    const existingNotification = await findExistingDirectMessageNotification(messageId)
    if (existingNotification) {
      console.log(JSON.stringify({
        event: "DM_NOTIFY_WORKER_REUSED_EXISTING",
        source: "dm-notify-worker",
        message_id: messageId,
        notification_id: existingNotification.notification_id,
        duration_ms: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      }))

      return {
        notificationId: existingNotification.notification_id,
        recipients: [receiverId],
        messageId,
        completedAt: new Date().toISOString(),
      }
    }

    const result = await persistNotification({
      type: NotificationType.DIRECT_MESSAGE,
      title: "Tin nhắn mới",
      message: directMessage.message,
      actorId: senderId,
      entityType: "direct_message",
      entityId: directMessage.message_id,
      payload: {
        conversation_key: conversationKey || directMessage.conversation_key,
        sender_id: senderId,
        receiver_id: receiverId,
      },
      recipientUserIds: [receiverId],
    })

    if (!result?.notification) {
      throw new Error("DIRECT_MESSAGE_NOTIFICATION_PERSIST_FAILED")
    }

    console.log(JSON.stringify({
      event: "DM_NOTIFY_WORKER_COMPLETED",
      source: "dm-notify-worker",
      message_id: messageId,
      notification_id: result.notification.notification_id,
      receiver_id: receiverId,
      duration_ms: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    }))

    return {
      notificationId: result.notification.notification_id,
      recipients: result.recipients,
      messageId,
      completedAt: new Date().toISOString(),
    }
  },
  { connection }
)

// Hàm log khi worker gặp lỗi mức process để dễ quan sát SLA của queue chat.
directMessageNotificationWorker.on("failed", (job, error) => {
  console.error(JSON.stringify({
    event: "DM_NOTIFY_WORKER_FAILED",
    source: "dm-notify-worker",
    job_id: job?.id || null,
    message_id: job?.data?.messageId || null,
    reason: error?.message || "UNKNOWN",
    timestamp: new Date().toISOString(),
  }))
})

module.exports = {
  directMessageNotificationWorker,
}
