/*
    * ECG Inference Queue Service
    * Dịch vụ quản lý hàng đợi xử lý inference ECG sử dụng BullMQ và Redis
     - Kết nối đến Redis thông qua IORedis
     - Tạo hàng đợi BullMQ với cấu hình mặc định cho các job
     - Cung cấp hàm enqueueEcgInference để thêm job vào hàng đợi với payload chứa readingId
     - Định nghĩa các sự kiện của hàng đợi để theo dõi trạng thái job
*/
const IORedis = require("ioredis")
const { Queue, QueueEvents } = require("bullmq")

const connection = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null, // vô hạn retry nếu kết nối bị mất
    enableReadyCheck: false, // tắt ready check để kết nối nhanh hơn, phù hợp với môi trường serverless
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

// Tạo đối tượng QueueEvents để theo dõi sự kiện của hàng đợi
const ecgInferenceQueueEvents = new QueueEvents(queueName, { connection })

// Hàm để thêm job vào hàng đợi với payload chứa readingId
const enqueueEcgInference = async (payload) => {
    const readingId = Number.parseInt(payload?.readingId, 10)
    if (!Number.isInteger(readingId)) {
        throw new Error("INVALID_READING_ID_FOR_QUEUE")
    }

    return ecgInferenceQueue.add("ecg-infer", payload, {
        jobId: `reading-${readingId}`, // 1 reading chỉ nên có 1 job inference tương ứng trong hàng đợi, dùng readingId làm jobId để tránh trùng lặp
    })
}

module.exports = {
    connection,
    ecgInferenceQueue,
    ecgInferenceQueueEvents,
    enqueueEcgInference,
    queueName,
}