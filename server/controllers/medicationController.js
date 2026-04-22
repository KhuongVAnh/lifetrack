const { MedicationLogStatus } = require("@prisma/client")
const prisma = require("../prismaClient")
const {
  normalizeMedicationTimes,
  generateMedicationLogsForPlan,
} = require("../services/medicationScheduleService")
const {
  canDoctorWritePatientDomain,
  canViewPatientDomain,
} = require("../services/patientDoctorAccessService")

/**
 * Chuyển một giá trị bất kỳ về số nguyên hợp lệ.
 * Hàm giúp controller kiểm tra id/log_id/plan_id trước khi đưa vào Prisma.
 */
const parseInteger = (value) => {
  // parseInt chấp nhận cả chuỗi số từ params/query.
  const parsed = Number.parseInt(value, 10)

  // Trả về null nếu kết quả không phải số nguyên.
  return Number.isInteger(parsed) ? parsed : null
}

/**
 * Parse Date an toàn từ body/query.
 * Date không hợp lệ sẽ trả null để controller trả lỗi 400 thay vì lỗi DB.
 */
const parseDate = (value) => {
  // Tạo Date từ chuỗi ISO hoặc yyyy-MM-dd của frontend.
  const date = new Date(value)

  // Kiểm tra timestamp NaN để nhận biết Date invalid.
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Chuẩn hóa ngày bắt đầu khoảng lọc về đầu ngày local.
 * API logs dùng hàm này để trả đủ các lượt trong ngày.
 */
const startOfLocalDay = (date) => {
  // Clone để không mutate Date gốc.
  const result = new Date(date)

  // Đưa giờ về 00:00:00.000.
  result.setHours(0, 0, 0, 0)
  return result
}

/**
 * Chuẩn hóa ngày kết thúc khoảng lọc về cuối ngày local.
 * Cách này giúp query ?to=2026-04-22 lấy đủ cả ngày 22.
 */
const endOfLocalDay = (date) => {
  // Clone Date để thao tác an toàn.
  const result = new Date(date)

  // Đưa giờ về cuối ngày.
  result.setHours(23, 59, 59, 999)
  return result
}

/**
 * Cộng thêm số ngày vào Date và trả về object mới.
 * Hàm dùng cho mặc định query logs từ hôm nay đến 7 ngày tới.
 */
const addDays = (date, days) => {
  // Clone để không làm thay đổi tham số đầu vào.
  const result = new Date(date)

  // setDate tự xử lý chuyển tháng/năm.
  result.setDate(result.getDate() + days)
  return result
}

/**
 * Chuẩn hóa danh sách thuốc từ body trước khi tạo/sửa plan.
 * Hàm đảm bảo mỗi thuốc có tên, liều và ít nhất một giờ uống hợp lệ.
 */
const normalizeMedicationInput = (medications) => {
  // Body phải là mảng thuốc để nested create/update hoạt động.
  if (!Array.isArray(medications) || medications.length === 0) {
    return { error: "Vui long nhap it nhat mot loai thuoc" }
  }

  const normalized = []

  // Duyệt từng dòng thuốc để validate dữ liệu bắt buộc.
  for (const medication of medications) {
    const name = String(medication?.name || "").trim()
    const dosage = String(medication?.dosage || "").trim()
    const times = normalizeMedicationTimes(medication?.times)

    // Tên thuốc là bắt buộc vì UI và thông báo cần hiển thị rõ.
    if (!name) {
      return { error: "Ten thuoc la bat buoc" }
    }

    // Liều dùng là bắt buộc để nhắc thuốc có ý nghĩa.
    if (!dosage) {
      return { error: "Lieu dung la bat buoc" }
    }

    // Mỗi thuốc cần ít nhất một giờ uống hợp lệ.
    if (!times.length) {
      return { error: "Moi thuoc can it nhat mot gio uong hop le" }
    }

    normalized.push({ name, dosage, times })
  }

  return { value: normalized }
}

/**
 * Kiểm tra user hiện tại có được xem hoặc ghi tủ thuốc của bệnh nhân mục tiêu hay không.
 */
const canUseMedicationDomain = async ({ req, targetUserId, write = false }) => {
  // Bệnh nhân luôn được thao tác tủ thuốc của chính mình.
  const currentUserId = parseInteger(req.user.user_id)
  if (currentUserId === targetUserId) return true

  // Bác sĩ chỉ được ghi khi được thuê active và bệnh nhân bật quyền tủ thuốc.
  if (write && req.user.role === "bác sĩ") {
    return canDoctorWritePatientDomain({ patientId: targetUserId, doctorId: currentUserId, domain: "medications" })
  }

  // Quyền xem dùng service chung để hỗ trợ cả người nhà và bác sĩ thuê.
  if (!write) {
    return canViewPatientDomain({ patientId: targetUserId, viewerId: currentUserId, domain: "medications" })
  }

  // Người nhà không được ghi tủ thuốc.
  return false
}

/**
 * Tạo một đơn thuốc mới và sinh log uống thuốc trước 7 ngày.
 * Người dùng hiện tại là chủ sở hữu plan; nếu bác sĩ kê hộ có thể truyền user_id bệnh nhân.
 */
const createMedicationPlan = async (req, res) => {
  try {
    const currentUserId = parseInteger(req.user.user_id)
    const targetUserId = parseInteger(req.body.user_id) || currentUserId
    const title = String(req.body.title || "").trim()
    const startDate = parseDate(req.body.start_date)
    const endDate = req.body.end_date ? parseDate(req.body.end_date) : null
    const notes = req.body.notes ? String(req.body.notes).trim() : null
    const normalizedMeds = normalizeMedicationInput(req.body.medications)

    // Validate dữ liệu plan cơ bản trước khi ghi DB.
    if (!title || !startDate || normalizedMeds.error) {
      return res.status(400).json({ message: normalizedMeds.error || "Vui long nhap ten don va ngay bat dau" })
    }

    // Ngày kết thúc nếu có phải sau hoặc bằng ngày bắt đầu.
    if (endDate && endDate < startDate) {
      return res.status(400).json({ message: "Ngay ket thuc phai sau ngay bat dau" })
    }

    // Nếu tạo đơn cho bệnh nhân khác thì bác sĩ phải được bật quyền tủ thuốc.
    const canCreate = await canUseMedicationDomain({ req, targetUserId, write: targetUserId !== currentUserId })
    if (!canCreate) {
      return res.status(403).json({ message: "Bạn không có quyền cập nhật tủ thuốc của bệnh nhân này" })
    }

    // Tạo plan và medications con trong một thao tác nested create.
    const plan = await prisma.medicationPlan.create({
      data: {
        user_id: targetUserId,
        doctor_id: req.user.role === "bác sĩ" ? currentUserId : null,
        title,
        start_date: startDate,
        end_date: endDate,
        notes,
        medications: {
          create: normalizedMeds.value,
        },
      },
      include: {
        doctor: { select: { user_id: true, name: true, email: true } },
        medications: true,
      },
    })

    // Sinh log trước để UI hiển thị lịch hôm nay/tuần này ngay sau khi lưu.
    await generateMedicationLogsForPlan({ planId: plan.plan_id })

    return res.status(201).json({ message: "Tạo đơn thuốc thành công.", plan })
  } catch (error) {
    console.error("Lỗi khi tạo đơn thuốc:", error)
    return res.status(500).json({ message: "Lỗi server khi tạo đơn thuốc" })
  }
}

/**
 * Lấy danh sách các đơn thuốc của người dùng hiện tại.
 * API trả kèm danh sách thuốc và thông tin bác sĩ kê đơn nếu có.
 */
const getMedicationPlans = async (req, res) => {
  try {
    const currentUserId = parseInteger(req.user.user_id)
    const targetUserId = parseInteger(req.query.user_id) || currentUserId

    // Cho phép bác sĩ/người nhà xem tủ thuốc khi có quyền domain medications.
    const canView = await canUseMedicationDomain({ req, targetUserId, write: false })
    if (!canView) {
      return res.status(403).json({ message: "Bạn không có quyền xem tủ thuốc này" })
    }

    // Lấy các plan của user hiện tại, mới nhất trước.
    const plans = await prisma.medicationPlan.findMany({
      where: { user_id: targetUserId },
      include: {
        doctor: { select: { user_id: true, name: true, email: true } },
        medications: true,
      },
      orderBy: { created_at: "desc" },
    })

    return res.json({ plans })
  } catch (error) {
    console.error("Lỗi khi lấy danh sách đơn thuốc:", error)
    return res.status(500).json({ message: "Lỗi server" })
  }
}

/**
 * Cập nhật đơn thuốc và sinh lại log sắp tới cho plan.
 * Hàm dùng chiến lược thay thế toàn bộ danh sách thuốc để UI form đơn giản, rõ ràng.
 */
const updateMedicationPlan = async (req, res) => {
  try {
    const currentUserId = parseInteger(req.user.user_id)
    const planId = parseInteger(req.params.plan_id)
    const title = String(req.body.title || "").trim()
    const startDate = parseDate(req.body.start_date)
    const endDate = req.body.end_date ? parseDate(req.body.end_date) : null
    const notes = req.body.notes ? String(req.body.notes).trim() : null
    const isActive = req.body.is_active !== false
    const normalizedMeds = normalizeMedicationInput(req.body.medications)

    // Validate các field chính trước khi mở transaction.
    if (!planId || !title || !startDate || normalizedMeds.error) {
      return res.status(400).json({ message: normalizedMeds.error || "Du lieu don thuoc khong hop le" })
    }

    // Lấy plan hiện tại để xác định chủ sở hữu trước khi kiểm tra quyền ghi.
    const existing = await prisma.medicationPlan.findFirst({
      where: { plan_id: planId },
    })

    if (!existing) {
      return res.status(404).json({ message: "Khong tim thay don thuoc" })
    }

    // Bệnh nhân hoặc bác sĩ thuê được bật quyền tủ thuốc mới được cập nhật đơn.
    const canUpdate = await canUseMedicationDomain({
      req,
      targetUserId: existing.user_id,
      write: existing.user_id !== currentUserId,
    })
    if (!canUpdate) {
      return res.status(403).json({ message: "Bạn không có quyền cập nhật đơn thuốc này" })
    }

    // Transaction xóa thuốc cũ, tạo thuốc mới và cập nhật metadata plan.
    const plan = await prisma.$transaction(async (tx) => {
      await tx.medication.deleteMany({ where: { plan_id: planId } })

      return tx.medicationPlan.update({
        where: { plan_id: planId },
        data: {
          title,
          start_date: startDate,
          end_date: endDate,
          notes,
          is_active: isActive,
          medications: {
            create: normalizedMeds.value,
          },
        },
        include: {
          doctor: { select: { user_id: true, name: true, email: true } },
          medications: true,
        },
      })
    })

    // Sinh log cho thuốc mới; skipDuplicates bảo vệ khi giờ uống cũ trùng giờ mới.
    await generateMedicationLogsForPlan({ planId })

    return res.json({ message: "Cập nhật đơn thuốc thành công.", plan })
  } catch (error) {
    console.error("Lỗi khi cập nhật đơn thuốc:", error)
    return res.status(500).json({ message: "Lỗi server khi cập nhật đơn thuốc" })
  }
}

/**
 * Tắt một đơn thuốc mà không xóa dữ liệu lịch sử uống thuốc.
 * UI dùng endpoint này cho hành động lưu trữ/ngưng đơn thuốc.
 */
const archiveMedicationPlan = async (req, res) => {
  try {
    const currentUserId = parseInteger(req.user.user_id)
    const planId = parseInteger(req.params.plan_id)

    // Lấy plan trước để kiểm tra quyền ghi theo chủ sở hữu tủ thuốc.
    const existing = await prisma.medicationPlan.findUnique({
      where: { plan_id: planId },
    })

    if (!existing) {
      return res.status(404).json({ message: "Khong tim thay don thuoc" })
    }

    const canArchive = await canUseMedicationDomain({
      req,
      targetUserId: existing.user_id,
      write: existing.user_id !== currentUserId,
    })
    if (!canArchive) {
      return res.status(403).json({ message: "Bạn không có quyền ngưng đơn thuốc này" })
    }

    // Cập nhật trạng thái active sau khi quyền đã hợp lệ.
    await prisma.medicationPlan.update({
      where: { plan_id: planId },
      data: { is_active: false },
    })

    return res.json({ message: "Đã ngưng đơn thuốc" })
  } catch (error) {
    console.error("Lỗi khi ngưng đơn thuốc:", error)
    return res.status(500).json({ message: "Lỗi server khi ngưng đơn thuốc" })
  }
}

/**
 * Xác nhận một lượt nhắc thuốc đã được uống.
 * Endpoint chỉ cho phép user chủ sở hữu log cập nhật log của chính mình.
 */
const markAsTaken = async (req, res) => {
  try {
    const logId = parseInteger(req.params.log_id)
    const currentUserId = parseInteger(req.user.user_id)
    const targetUserId = parseInteger(req.query.user_id) || currentUserId

    // Cập nhật log nếu thuộc user và chưa bị đánh dấu trạng thái cuối khác.
    const updatedLog = await prisma.medicationLog.updateMany({
      where: {
        log_id: logId,
        user_id: currentUserId,
        status: { in: [MedicationLogStatus.PENDING, MedicationLogStatus.MISSED] },
      },
      data: {
        status: MedicationLogStatus.TAKEN,
        taken_at: new Date(),
      },
    })

    if (Number(updatedLog.count || 0) === 0) {
      return res.status(404).json({ message: "Không tìm thấy lượt nhắc uống thuốc này." })
    }

    return res.json({ message: "Đã xác nhận uống thuốc." })
  } catch (error) {
    console.error("Lỗi khi xác nhận uống thuốc:", error)
    return res.status(500).json({ message: "Lỗi server" })
  }
}

/**
 * Bỏ qua một lượt uống thuốc.
 * Trạng thái SKIPPED giúp phân biệt với MISSED do quá hạn tự động.
 */
const markAsSkipped = async (req, res) => {
  try {
    const logId = parseInteger(req.params.log_id)
    const userId = parseInteger(req.user.user_id)

    // Chỉ cho phép bỏ qua log còn pending.
    const updatedLog = await prisma.medicationLog.updateMany({
      where: {
        log_id: logId,
        user_id: userId,
        status: MedicationLogStatus.PENDING,
      },
      data: {
        status: MedicationLogStatus.SKIPPED,
      },
    })

    if (Number(updatedLog.count || 0) === 0) {
      return res.status(404).json({ message: "Không tìm thấy lượt nhắc có thể bỏ qua." })
    }

    return res.json({ message: "Đã bỏ qua lượt uống thuốc." })
  } catch (error) {
    console.error("Lỗi khi bỏ qua lượt uống thuốc:", error)
    return res.status(500).json({ message: "Lỗi server" })
  }
}

/**
 * Lấy lịch sử/lịch sắp tới uống thuốc theo khoảng ngày.
 * Mặc định trả hôm nay đến 7 ngày tới để UI có timeline đầy đủ.
 */
const getMedicationLogs = async (req, res) => {
  try {
    const currentUserId = parseInteger(req.user.user_id)
    const targetUserId = parseInteger(req.query.user_id) || currentUserId
    const parsedFrom = req.query.from ? parseDate(req.query.from) : new Date()
    const parsedTo = req.query.to ? parseDate(req.query.to) : addDays(new Date(), 7)
    const from = parsedFrom ? startOfLocalDay(parsedFrom) : null
    const to = parsedTo ? endOfLocalDay(parsedTo) : null
    const status = req.query.status ? String(req.query.status).toUpperCase() : null

    // Validate query date để tránh Invalid Date vào Prisma.
    if (!from || !to || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return res.status(400).json({ message: "Khoang thoi gian khong hop le" })
    }

    // Validate status filter nếu frontend truyền.
    if (status && !Object.values(MedicationLogStatus).includes(status)) {
      return res.status(400).json({ message: "status khong hop le" })
    }

    // Lịch uống thuốc chỉ được xem khi có quyền medications.
    const canView = await canUseMedicationDomain({ req, targetUserId, write: false })
    if (!canView) {
      return res.status(403).json({ message: "Bạn không có quyền xem lịch uống thuốc này" })
    }

    // Query logs theo user, khoảng ngày và trạng thái nếu có.
    const logs = await prisma.medicationLog.findMany({
      where: {
        user_id: targetUserId,
        scheduled_time: {
          gte: from,
          lte: to,
        },
        ...(status ? { status } : {}),
      },
      include: {
        medication: {
          include: {
            plan: {
              select: {
                plan_id: true,
                title: true,
                notes: true,
              },
            },
          },
        },
      },
      orderBy: { scheduled_time: "asc" },
    })

    return res.json({ logs })
  } catch (error) {
    console.error("Lỗi khi lấy lịch sử uống thuốc:", error)
    return res.status(500).json({ message: "Lỗi server" })
  }
}

module.exports = {
  createMedicationPlan,
  getMedicationPlans,
  updateMedicationPlan,
  archiveMedicationPlan,
  getMedicationLogs,
  markAsTaken,
  markAsSkipped,
}
