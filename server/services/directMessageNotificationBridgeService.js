/**
 * Bridge realtime cho queue notification của direct message.
 * Web process lắng nghe completion của queue nền rồi mới emit `notification:new` đến client,
 * nhờ vậy worker không cần biết gì về Socket.IO nhưng UI vẫn nhận được notification realtime.
 */
const { Job } = require("bullmq")
const prisma = require("../prismaClient")
const { emitNotificationToUsers } = require("./notificationService")
const {
  directMessageNotificationQueue,
  directMessageNotificationQueueEvents,
} = require("./directMessageNotificationQueueService")

// Hàm gắn bridge lắng nghe completed/failed từ queue notification direct message.
const attachDirectMessageNotificationBridge = ({ io, logEvent }) => {
  directMessageNotificationQueueEvents.on("completed", async ({ jobId, returnvalue }) => {
    try {
      const payload = returnvalue || {}
      const recipients = Array.isArray(payload.recipients)
        ? payload.recipients.map((id) => Number.parseInt(id, 10)).filter(Number.isInteger)
        : []

      if (!payload.notificationId || recipients.length === 0) {
        return
      }

      // Đọc lại notification đã persist để đảm bảo payload socket luôn theo shape chuẩn hiện tại của hệ thống.
      const notification = await prisma.notification.findUnique({
        where: { notification_id: Number(payload.notificationId) },
      })

      if (!notification) return

      emitNotificationToUsers({
        io,
        recipients,
        notification,
      })

      logEvent("DM_NOTIFY_QUEUE_COMPLETED", {
        job_id: jobId || null,
        notification_id: Number(payload.notificationId),
        message_id: payload.messageId || null,
        receiver_id: recipients[0] || null,
      })
    } catch (error) {
      logEvent("DM_NOTIFY_QUEUE_COMPLETED_BRIDGE_ERROR", {
        job_id: jobId || null,
        reason: error?.message || "UNKNOWN",
      })
    }
  })

  directMessageNotificationQueueEvents.on("failed", async ({ jobId, failedReason }) => {
    try {
      const job = await Job.fromId(directMessageNotificationQueue, jobId)
      const data = job?.data || {}

      logEvent("DM_NOTIFY_QUEUE_FAILED", {
        job_id: jobId || null,
        message_id: data.messageId || null,
        receiver_id: data.receiverId || null,
        reason: failedReason || "UNKNOWN",
      })
    } catch (error) {
      logEvent("DM_NOTIFY_QUEUE_FAILED_BRIDGE_ERROR", {
        job_id: jobId || null,
        reason: error?.message || "UNKNOWN",
      })
    }
  })
}

module.exports = {
  attachDirectMessageNotificationBridge,
}
