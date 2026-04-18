/**
 * lắng nghe completed/failed
 * đọc DB nếu cần
 * emit reading-ai-updated, alert, notification:new
 */

const { Job } = require("bullmq")
const prisma = require("../prismaClient")
const { ecgInferenceQueue, ecgInferenceQueueEvents } = require("./ecgInferenceQueueService")
const { emitNotificationToUsers } = require("./notificationService")
const { emitToUsers } = require("./socketEmitService")
const { getRecipientIdsByPatientCached } = require("./telemetryRuntimeCacheService")

// Dịch vụ này đóng vai trò là cầu nối giữa hàng đợi xử lý AI (ecgInferenceQueue) và hệ thống realtime của server,
// lắng nghe sự kiện hoàn thành hoặc thất bại của các job trong hàng đợi,
// sau đó truy vấn database nếu cần thiết để lấy thông tin chi tiết và phát ra các sự kiện realtime đến client thông qua Socket.IO,
// bao gồm cập nhật kết quả AI cho reading, phát cảnh báo mới nếu có bất thường được phát hiện, và gửi notification đến người dùng liên quan.
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
                heart_rate: Number.isInteger(Number(payload.heartRate)) ? Number(payload.heartRate) : 0,
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
            const recipients = Number.isInteger(Number(data.userId))
                ? await getRecipientIdsByPatientCached(Number(data.userId))
                : []

            emitToUsers(io, recipients, "reading-ai-updated", {
                reading_id: data.readingId || null,
                user_id: data.userId || null,
                serial_number: data.serialNumber || null,
                ai_status: "FAILED",
                ai_result: null,
                abnormal_detected: false,
                heart_rate: 0,
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
