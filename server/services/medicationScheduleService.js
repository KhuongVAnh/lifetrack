const { MedicationLogStatus, NotificationType } = require("@prisma/client")
const prisma = require("../prismaClient")
const { createNotification } = require("./notificationService")

const DEFAULT_DAYS_AHEAD = 7
const MISSED_GRACE_MINUTES = 120

/**
 * Chuẩn hóa Date về đầu ngày local để sinh lịch uống thuốc theo từng ngày.
 * Việc clone Date giúp hàm không gây side effect lên tham số đầu vào.
 */
const startOfLocalDay = (date) => {
  // Tạo bản sao để không sửa object Date gốc.
  const result = new Date(date)

  // Đưa giờ về 00:00:00.000 để làm mốc ngày.
  result.setHours(0, 0, 0, 0)
  return result
}

/**
 * Cộng thêm số ngày vào Date và trả về Date mới.
 * Hàm dùng trong vòng lặp sinh log cho hôm nay và các ngày sắp tới.
 */
const addDays = (date, days) => {
  // Clone Date để mỗi bước lặp là một object độc lập.
  const result = new Date(date)

  // setDate xử lý tự động chuyển tháng/năm.
  result.setDate(result.getDate() + days)
  return result
}

/**
 * Kiểm tra chuỗi giờ uống có đúng định dạng HH:mm hay không.
 * Dữ liệu thuốc đang lưu times dạng JSON ["08:00", "20:00"] nên cần validate trước khi sinh log.
 */
const isValidHHMM = (value) => {
  // Chỉ chấp nhận giờ 00-23 và phút 00-59.
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(value || ""))
}

/**
 * Tạo Date cho một ngày cụ thể với giờ phút HH:mm theo timezone local của server.
 * Prisma sẽ lưu Date này vào MySQL dưới dạng DateTime chuẩn.
 */
const buildDateAtHHMM = (dateBase, hhmm) => {
  // Clone ngày để không làm thay đổi ngày đang duyệt.
  const result = new Date(dateBase)
  const [hour, minute] = String(hhmm).split(":").map((part) => Number.parseInt(part, 10))

  // Gán giờ/phút local để tương thích input time của frontend.
  result.setHours(hour, minute, 0, 0)
  return result
}

/**
 * Chuẩn hóa times của thuốc thành mảng HH:mm hợp lệ và không trùng.
 * Hàm giúp server không tạo log rác nếu frontend gửi times lỗi.
 */
const normalizeMedicationTimes = (times) => {
  // Đảm bảo dữ liệu đầu vào là mảng, vì Prisma Json có thể chứa nhiều kiểu khác nhau.
  const rawTimes = Array.isArray(times) ? times : []

  // Lọc format hợp lệ, trim chuỗi và loại trùng bằng Set.
  return [...new Set(rawTimes.map((time) => String(time).trim()).filter(isValidHHMM))]
}

/**
 * Sinh log uống thuốc cho một plan trong khoảng hôm nay đến daysAhead.
 * Hàm idempotent nhờ createMany skipDuplicates và unique key medication_id + scheduled_time.
 */
const generateMedicationLogsForPlan = async ({ planId, daysAhead = DEFAULT_DAYS_AHEAD }) => {
  // Lấy plan kèm danh sách thuốc để có đủ start/end date và times.
  const plan = await prisma.medicationPlan.findUnique({
    where: { plan_id: Number.parseInt(planId, 10) },
    include: { medications: true },
  })

  // Không sinh log nếu plan không tồn tại hoặc đã bị tắt.
  if (!plan || !plan.is_active) {
    return { created: 0 }
  }

  const today = startOfLocalDay(new Date())
  const planStart = startOfLocalDay(plan.start_date)
  const planEnd = plan.end_date ? startOfLocalDay(plan.end_date) : addDays(today, daysAhead)
  const windowStart = planStart > today ? planStart : today
  const windowEndCandidate = addDays(today, daysAhead)
  const windowEnd = planEnd < windowEndCandidate ? planEnd : windowEndCandidate
  const entries = []

  // Nếu ngày bắt đầu sau ngày kết thúc thì không có log cần sinh.
  if (windowStart > windowEnd) {
    return { created: 0 }
  }

  // Duyệt từng ngày trong cửa sổ sinh trước.
  for (let day = windowStart; day <= windowEnd; day = addDays(day, 1)) {
    // Mỗi thuốc có thể có nhiều khung giờ uống trong ngày.
    for (const medication of plan.medications) {
      const times = normalizeMedicationTimes(medication.times)

      // Tạo một log PENDING cho từng khung giờ hợp lệ.
      times.forEach((time) => {
        entries.push({
          user_id: plan.user_id,
          medication_id: medication.medication_id,
          scheduled_time: buildDateAtHHMM(day, time),
          status: MedicationLogStatus.PENDING,
        })
      })
    }
  }

  // Không gọi DB nếu không có entry nào, tránh query không cần thiết.
  if (!entries.length) {
    return { created: 0 }
  }

  // createMany skipDuplicates giúp cron và controller gọi lặp vẫn an toàn.
  const result = await prisma.medicationLog.createMany({
    data: entries,
    skipDuplicates: true,
  })

  return { created: Number(result.count || 0) }
}

/**
 * Sinh log uống thuốc sắp tới cho tất cả plan đang hoạt động.
 * Cron dùng hàm này định kỳ để UI luôn có lịch trước vài ngày.
 */
const generateUpcomingMedicationLogsForAllActivePlans = async ({ daysAhead = DEFAULT_DAYS_AHEAD } = {}) => {
  // Lấy id plan đang hoạt động trong khoảng thời gian còn hiệu lực.
  const now = new Date()
  const plans = await prisma.medicationPlan.findMany({
    where: {
      is_active: true,
      start_date: { lte: addDays(now, daysAhead) },
      OR: [
        { end_date: null },
        { end_date: { gte: startOfLocalDay(now) } },
      ],
    },
    select: { plan_id: true },
  })

  let created = 0

  // Sinh log từng plan để tận dụng logic idempotent chung.
  for (const plan of plans) {
    const result = await generateMedicationLogsForPlan({ planId: plan.plan_id, daysAhead })
    created += result.created
  }

  return { created, plan_count: plans.length }
}

/**
 * Đánh dấu các lượt uống thuốc quá hạn là MISSED.
 * Grace period giúp bệnh nhân vẫn có thời gian xác nhận trễ trước khi hệ thống tính bỏ lỡ.
 */
const markOverdueMedicationLogsMissed = async ({ graceMinutes = MISSED_GRACE_MINUTES } = {}) => {
  // Tính mốc quá hạn bằng thời điểm hiện tại trừ số phút grace.
  const missedBefore = new Date(Date.now() - graceMinutes * 60 * 1000)

  // Chỉ cập nhật các log còn PENDING và đã qua mốc quá hạn.
  const result = await prisma.medicationLog.updateMany({
    where: {
      status: MedicationLogStatus.PENDING,
      scheduled_time: { lt: missedBefore },
    },
    data: {
      status: MedicationLogStatus.MISSED,
    },
  })

  return { updated: Number(result.count || 0) }
}

/**
 * Gửi nhắc thuốc cho các log đã đến giờ nhưng chưa được nhắc.
 * Hàm vừa tạo notification realtime vừa cập nhật reminded_at để không gửi trùng.
 */
const sendDueMedicationReminders = async ({ io, sendEmail } = {}) => {
  const now = new Date()

  // Lấy các log đến hạn, chưa gửi nhắc và còn pending.
  const dueLogs = await prisma.medicationLog.findMany({
    where: {
      status: MedicationLogStatus.PENDING,
      reminded_at: null,
      scheduled_time: { lte: now },
    },
    include: {
      user: {
        select: {
          user_id: true,
          name: true,
          email: true,
        },
      },
      medication: {
        include: {
          plan: {
            select: {
              plan_id: true,
              title: true,
            },
          },
        },
      },
    },
    orderBy: { scheduled_time: "asc" },
    take: 100,
  })

  let reminded = 0

  // Xử lý từng log riêng để nếu email lỗi thì các log khác vẫn tiếp tục.
  for (const log of dueLogs) {
    // Update trước với điều kiện reminded_at null để tránh nhiều cron gửi trùng cùng log.
    const claimed = await prisma.medicationLog.updateMany({
      where: {
        log_id: log.log_id,
        reminded_at: null,
        status: MedicationLogStatus.PENDING,
      },
      data: {
        reminded_at: now,
      },
    })

    // Nếu count bằng 0 nghĩa là worker khác đã xử lý log này.
    if (Number(claimed.count || 0) === 0) {
      continue
    }

    reminded += 1

    // Tạo notification chuẩn của hệ thống và emit Socket.IO nếu có io.
    await createNotification({
      io,
      type: NotificationType.MEDICATION_REMINDER,
      title: "Đến giờ uống thuốc",
      message: `Đã đến giờ uống ${log.medication.name} (${log.medication.dosage}).`,
      entityType: "medication_log",
      entityId: log.log_id,
      payload: {
        log_id: log.log_id,
        plan_id: log.medication.plan.plan_id,
        medication_id: log.medication_id,
        scheduled_time: log.scheduled_time.toISOString(),
      },
      recipientUserIds: [log.user_id],
    })

    // Email chỉ là kênh phụ; lỗi email không được làm hỏng cron.
    if (typeof sendEmail === "function" && log.user.email) {
      try {
        await sendEmail({
          to: log.user.email,
          subject: "LifeTrack - Nhắc nhở uống thuốc",
          text: `Chào ${log.user.name},\n\nĐã đến giờ uống thuốc: ${log.medication.name}\nLiều lượng: ${log.medication.dosage}\n\nVui lòng xác nhận trong ứng dụng sau khi uống.\n\nLifeTrack.`,
        })
      } catch (error) {
        console.error("[MedicationReminder] Loi gui email:", error)
      }
    }
  }

  return { reminded }
}

module.exports = {
  DEFAULT_DAYS_AHEAD,
  MISSED_GRACE_MINUTES,
  normalizeMedicationTimes,
  generateMedicationLogsForPlan,
  generateUpcomingMedicationLogsForAllActivePlans,
  markOverdueMedicationLogsMissed,
  sendDueMedicationReminders,
}
