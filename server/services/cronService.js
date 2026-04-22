const cron = require("node-cron")
const { sendEmail } = require("./emailService")
const {
  generateUpcomingMedicationLogsForAllActivePlans,
  markOverdueMedicationLogsMissed,
  sendDueMedicationReminders,
} = require("./medicationScheduleService")

let activeCronTasks = []

/**
 * Khởi tạo các cron job nền cho hệ thống LifeTrack.
 * Hiện tại cron tập trung vào nhắc uống thuốc: sinh lịch trước, gửi nhắc đúng hạn và đánh dấu bỏ lỡ.
 */
const initCronJobs = ({ io } = {}) => {
  if (activeCronTasks.length > 0) {
    console.log("[Cron] Da duoc khoi tao truoc do, bo qua lan khoi tao moi.")
    return
  }

  // Chạy một lượt ngay khi server khởi động để UI có lịch thuốc sắp tới mà không phải chờ cron đầu tiên.
  generateUpcomingMedicationLogsForAllActivePlans()
    .then((result) => {
      if (result.created > 0) {
        console.log(`[Cron] Khoi dong: da sinh ${result.created} lich uong thuoc sap toi.`)
      }
    })
    .catch((error) => {
      console.error("[Cron] Loi khi sinh lich uong thuoc luc khoi dong:", error)
    })

  // Chạy mỗi 10 phút để bảo đảm log sắp tới luôn tồn tại cho UI hiển thị trước.
  const generateLogsTask = cron.schedule("*/10 * * * *", async () => {
    try {
      // Sinh log cho hôm nay và 7 ngày tới; hàm service idempotent nên chạy lặp không tạo trùng.
      const result = await generateUpcomingMedicationLogsForAllActivePlans()

      // Log ngắn gọn để theo dõi cron hoạt động trên môi trường deploy.
      if (result.created > 0) {
        console.log(`[Cron] Da sinh ${result.created} lich uong thuoc sap toi cho ${result.plan_count} don thuoc.`)
      }
    } catch (error) {
      console.error("[Cron] Loi khi sinh lich uong thuoc sap toi:", error)
    }
  })

  // Chạy mỗi phút để gửi nhắc đúng thời điểm đã sinh trong medication_logs.
  const reminderTask = cron.schedule("* * * * *", async () => {
    try {
      // Gửi notification/email cho các log đã đến hạn và chưa từng được nhắc.
      const result = await sendDueMedicationReminders({ io, sendEmail })

      // Ghi log khi có lượt nhắc thực sự được gửi.
      if (result.reminded > 0) {
        console.log(`[Cron] Da gui ${result.reminded} nhac uong thuoc den han.`)
      }
    } catch (error) {
      console.error("[Cron] Loi khi gui nhac uong thuoc:", error)
    }
  })

  // Chạy mỗi 15 phút để chuyển các lượt quá hạn sang MISSED.
  const missedTask = cron.schedule("*/15 * * * *", async () => {
    try {
      // Grace period nằm trong service để cùng logic giữa cron và test.
      const result = await markOverdueMedicationLogsMissed()

      // Log khi có dữ liệu thay đổi để dễ debug tuân thủ thuốc.
      if (result.updated > 0) {
        console.log(`[Cron] Da danh dau ${result.updated} luot uong thuoc la bo lo.`)
      }
    } catch (error) {
      console.error("[Cron] Loi khi danh dau thuoc bo lo:", error)
    }
  })

  activeCronTasks = [generateLogsTask, reminderTask, missedTask]

  console.log("✅ Cron Jobs đã được khởi tạo (nhắc thuốc sinh trước, gửi đúng hạn, đánh dấu bỏ lỡ).")
}

const stopCronJobs = () => {
  if (activeCronTasks.length === 0) {
    return
  }

  for (const task of activeCronTasks) {
    try {
      task.stop()
      if (typeof task.destroy === "function") {
        task.destroy()
      }
    } catch (error) {
      console.error("[Cron] Loi khi dung cron task:", error)
    }
  }

  activeCronTasks = []
  console.log("[Cron] Da dung toan bo cron jobs.")
}

module.exports = {
  initCronJobs,
  stopCronJobs,
}
