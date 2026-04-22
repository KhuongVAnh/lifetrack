const { AppointmentStatus, AppointmentType, NotificationType } = require("@prisma/client")
const prisma = require("../prismaClient")
const { createNotification } = require("../services/notificationService")
const {
  parseInteger,
  normalizeAvailabilityInput,
  getActiveDoctorById,
  listDoctors,
  listAvailableSlots,
  validateBookableSlot,
} = require("../services/appointmentSchedulingService")
const { hasActiveDoctorHire } = require("../services/patientDoctorAccessService")

const PATIENT_ROLE = "bệnh nhân"
const DOCTOR_ROLE = "bác sĩ"
const ALLOWED_STATUS_UPDATES = [
  AppointmentStatus.REJECTED,
  AppointmentStatus.CANCELLED,
  AppointmentStatus.COMPLETED,
]

/**
 * Chuẩn hóa một Date từ body/query và trả về null nếu dữ liệu không hợp lệ.
 * Controller dùng hàm này để tránh new Date("bad") đi vào Prisma.
 */
const parseDate = (value) => {
  // Tạo Date từ chuỗi ISO hoặc timestamp mà frontend gửi lên.
  const date = new Date(value)

  // Date không hợp lệ sẽ có timestamp NaN.
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Kiểm tra role hiện tại có phải bệnh nhân hay không.
 * JWT trong dự án đang lưu role dạng tiếng Việt nên không so với enum Prisma ở đây.
 */
const isPatient = (req) => {
  // So sánh trực tiếp chuỗi role đã được authController map từ enum.
  return req.user?.role === PATIENT_ROLE
}

/**
 * Kiểm tra role hiện tại có phải bác sĩ hay không.
 * Hàm giúp các endpoint dành riêng cho bác sĩ có response 403 nhất quán.
 */
const isDoctor = (req) => {
  // So sánh trực tiếp role tiếng Việt từ JWT.
  return req.user?.role === DOCTOR_ROLE
}

/**
 * Tạo notification cập nhật lịch khám cho một hoặc nhiều người nhận.
 * Hàm bọc notificationService để payload lịch khám luôn cùng shape.
 */
const notifyAppointmentUsers = async ({ req, appointment, recipientUserIds, title, message }) => {
  // Lấy io từ Express app để notification có thể emit realtime qua Socket.IO.
  const io = req.app.get("io")

  // Gọi service chung để vừa persist DB vừa emit đến phòng user-{id}.
  await createNotification({
    io,
    type: NotificationType.APPOINTMENT_UPDATE,
    title,
    message,
    actorId: req.user?.user_id,
    entityType: "appointment",
    entityId: appointment.appointment_id,
    payload: {
      appointment_id: appointment.appointment_id,
      status: appointment.status,
      start_time: appointment.start_time.toISOString(),
      end_time: appointment.end_time.toISOString(),
      type: appointment.type,
    },
    recipientUserIds,
  })
}

/**
 * Lấy danh sách bác sĩ thật để bệnh nhân đặt lịch.
 * API này thay thế dữ liệu mock ở frontend bằng danh sách user role bác sĩ trong database.
 */
const getDoctorsForBooking = async (req, res) => {
  try {
    // Query q là tùy chọn, dùng cho ô tìm kiếm bác sĩ/chuyên khoa ở UI.
    const doctors = await listDoctors({
      q: req.query.q,
      patientId: isPatient(req) ? parseInteger(req.user.user_id) : null,
    })

    // Trả về shape đơn giản để frontend render card bác sĩ.
    return res.json({ doctors })
  } catch (error) {
    console.error("Lỗi lấy danh sách bác sĩ đặt lịch:", error)
    return res.status(500).json({ message: "Lỗi server khi lấy danh sách bác sĩ" })
  }
}

/**
 * Lấy danh sách slot khả dụng của một bác sĩ trong khoảng ngày.
 * API ghép lịch rảnh, lịch nghỉ và lịch hẹn đã giữ chỗ để frontend chỉ cho chọn slot hợp lệ.
 */
const getAvailableSlots = async (req, res) => {
  try {
    // doctor_id là bắt buộc vì slot luôn gắn với một bác sĩ cụ thể.
    const doctorId = parseInteger(req.query.doctor_id)
    if (!doctorId) {
      return res.status(400).json({ message: "doctor_id khong hop le" })
    }

    // Đảm bảo doctor_id là tài khoản bác sĩ đang hoạt động.
    const doctor = await getActiveDoctorById(doctorId)
    if (!doctor) {
      return res.status(404).json({ message: "Khong tim thay bac si" })
    }

    // Service chịu trách nhiệm sinh slot và đánh dấu trạng thái available.
    const slots = await listAvailableSlots({
      doctorId,
      from: req.query.from,
      to: req.query.to,
    })

    return res.json({ slots })
  } catch (error) {
    console.error("Lỗi lấy slot đặt lịch:", error)
    return res.status(500).json({ message: "Lỗi server khi lấy slot đặt lịch" })
  }
}

/**
 * Bệnh nhân tạo lịch khám mới với bác sĩ.
 * Hàm validate quyền, dữ liệu đầu vào, slot thuộc lịch rảnh và chống trùng lịch trước khi ghi DB.
 */
const createAppointment = async (req, res) => {
  try {
    // Chỉ bệnh nhân được chủ động tạo lịch khám từ portal bệnh nhân.
    if (!isPatient(req)) {
      return res.status(403).json({ message: "Chi benh nhan moi duoc dat lich kham" })
    }

    const patientId = parseInteger(req.user.user_id)
    const doctorId = parseInteger(req.body.doctor_id)
    const startTime = parseDate(req.body.start_time)
    const endTime = parseDate(req.body.end_time)
    const appointmentDate = parseDate(req.body.appointment_date || req.body.start_time)
    const type = String(req.body.type || "").toUpperCase()
    const reason = String(req.body.reason || "").trim()
    const patientAttachmentUrl = req.body.patient_attachment_url
      ? String(req.body.patient_attachment_url).trim()
      : null

    // Validate các field bắt buộc trước khi query DB.
    if (!doctorId || !startTime || !endTime || !appointmentDate || !reason) {
      return res.status(400).json({ message: "Vui long nhap day du bac si, thoi gian va ly do kham" })
    }

    // Chỉ nhận type thuộc enum để Prisma không ném lỗi runtime.
    if (!Object.values(AppointmentType).includes(type)) {
      return res.status(400).json({ message: "Hinh thuc kham khong hop le" })
    }

    // Đảm bảo người được chọn thật sự là bác sĩ.
    const doctor = await getActiveDoctorById(doctorId)
    if (!doctor) {
      return res.status(404).json({ message: "Khong tim thay bac si" })
    }

    // Kiểm tra slot có nằm trong lịch rảnh, không nghỉ và không trùng lịch đã đặt.
    const slotValidation = await validateBookableSlot({ doctorId, startTime, endTime })
    if (!slotValidation.ok) {
      return res.status(409).json({ message: slotValidation.message })
    }

    // Kiểm tra bệnh nhân đã thuê bác sĩ active hay chưa để quyết định phí khám.
    const hired = await hasActiveDoctorHire({ patientId, doctorId })

    // Nếu đã thuê bác sĩ thì miễn phí, nếu chưa thì lấy consultation_fee của bác sĩ.
    const fee = hired ? 0 : Number(doctor.consultation_fee || 0)
    const paymentStatus = fee > 0 ? "PENDING" : "FREE"

    // Tạo lịch hẹn sau khi toàn bộ validation đã qua.
    const appointment = await prisma.appointment.create({
      data: {
        patient_id: patientId,
        doctor_id: doctorId,
        appointment_date: appointmentDate,
        start_time: startTime,
        end_time: endTime,
        type,
        reason,
        patient_attachment_url: patientAttachmentUrl,
        fee,
        payment_status: paymentStatus,
      },
      include: {
        doctor: { select: { user_id: true, name: true, email: true } },
        patient: { select: { user_id: true, name: true, email: true } },
      },
    })

    // Báo cho bác sĩ biết có yêu cầu đặt lịch mới.
    await notifyAppointmentUsers({
      req,
      appointment,
      recipientUserIds: [doctorId],
      title: "Yêu cầu đặt lịch mới",
      message: `${appointment.patient.name} đã gửi yêu cầu đặt lịch khám.`,
    })

    return res.status(201).json({
      message: "Đặt lịch khám thành công, đang chờ bác sĩ xác nhận.",
      appointment,
    })
  } catch (error) {
    console.error("Lỗi khi tạo lịch khám:", error)
    return res.status(500).json({ message: "Lỗi server khi tạo lịch khám" })
  }
}

/**
 * Lấy danh sách lịch khám theo role hiện tại.
 * Bệnh nhân thấy lịch của mình; bác sĩ thấy lịch bệnh nhân đặt với mình.
 */
const getAppointments = async (req, res) => {
  try {
    const userId = parseInteger(req.user.user_id)
    const status = req.query.status ? String(req.query.status).toUpperCase() : null
    const from = req.query.from ? parseDate(req.query.from) : null
    const to = req.query.to ? parseDate(req.query.to) : null

    // Validate status filter nếu frontend truyền vào.
    if (status && !Object.values(AppointmentStatus).includes(status)) {
      return res.status(400).json({ message: "status khong hop le" })
    }

    // Tạo điều kiện theo role để người dùng không xem lịch của người khác.
    const ownerWhere = isPatient(req)
      ? { patient_id: userId }
      : isDoctor(req)
        ? { doctor_id: userId }
        : null

    if (!ownerWhere) {
      return res.status(403).json({ message: "Khong co quyen xem lich kham" })
    }

    // Ghép filter thời gian nếu có from/to.
    const appointments = await prisma.appointment.findMany({
      where: {
        ...ownerWhere,
        ...(status ? { status } : {}),
        ...(from ? { start_time: { gte: from } } : {}),
        ...(to ? { end_time: { lte: to } } : {}),
      },
      include: {
        doctor: { select: { user_id: true, name: true, email: true } },
        patient: { select: { user_id: true, name: true, email: true } },
      },
      orderBy: { start_time: "asc" },
    })

    return res.json({ appointments })
  } catch (error) {
    console.error("Lỗi khi lấy danh sách lịch khám:", error)
    return res.status(500).json({ message: "Lỗi server khi lấy lịch khám" })
  }
}

/**
 * Bác sĩ duyệt lịch khám và có thể cung cấp link meeting/ghi chú.
 * Chỉ bác sĩ phụ trách lịch hẹn mới được duyệt.
 */
const approveAppointment = async (req, res) => {
  try {
    if (!isDoctor(req)) {
      return res.status(403).json({ message: "Chi bac si moi duoc duyet lich kham" })
    }

    const appointmentId = parseInteger(req.params.id)
    const doctorId = parseInteger(req.user.user_id)
    const meetingUrl = req.body.meeting_url ? String(req.body.meeting_url).trim() : null
    const doctorNote = req.body.doctor_note ? String(req.body.doctor_note).trim() : null

    // Cập nhật có điều kiện để tránh duyệt lịch không thuộc bác sĩ hoặc không còn pending.
    const updated = await prisma.appointment.updateMany({
      where: {
        appointment_id: appointmentId,
        doctor_id: doctorId,
        status: AppointmentStatus.PENDING,
      },
      data: {
        status: AppointmentStatus.APPROVED,
        meeting_url: meetingUrl,
        doctor_note: doctorNote,
        status_reason: null,
      },
    })

    if (Number(updated.count || 0) === 0) {
      return res.status(404).json({ message: "Lịch hẹn không tồn tại hoặc đã được xử lý." })
    }

    // Đọc lại lịch hẹn đầy đủ để trả UI và gửi notification.
    const appointment = await prisma.appointment.findUnique({
      where: { appointment_id: appointmentId },
      include: {
        doctor: { select: { user_id: true, name: true, email: true } },
        patient: { select: { user_id: true, name: true, email: true } },
      },
    })

    // Báo cho bệnh nhân biết lịch đã được xác nhận.
    await notifyAppointmentUsers({
      req,
      appointment,
      recipientUserIds: [appointment.patient_id],
      title: "Lịch khám đã được xác nhận",
      message: `${appointment.doctor.name} đã xác nhận lịch khám của bạn.`,
    })

    return res.json({ message: "Đã duyệt lịch hẹn thành công.", appointment })
  } catch (error) {
    console.error("Lỗi khi duyệt lịch khám:", error)
    return res.status(500).json({ message: "Lỗi server khi duyệt lịch khám" })
  }
}

/**
 * Cập nhật trạng thái lịch khám: hủy, từ chối hoặc hoàn tất.
 * Hàm kiểm tra quyền theo role để bệnh nhân chỉ hủy lịch của mình, bác sĩ xử lý lịch của mình.
 */
const updateStatus = async (req, res) => {
  try {
    const appointmentId = parseInteger(req.params.id)
    const userId = parseInteger(req.user.user_id)
    const status = String(req.body.status || "").toUpperCase()
    const reason = req.body.reason ? String(req.body.reason).trim() : null

    // Chỉ cho phép các trạng thái có ý nghĩa qua endpoint này.
    if (!ALLOWED_STATUS_UPDATES.includes(status)) {
      return res.status(400).json({ message: "Trang thai cap nhat khong hop le" })
    }

    // Đọc lịch hiện tại để kiểm tra quyền và trạng thái.
    const existing = await prisma.appointment.findUnique({
      where: { appointment_id: appointmentId },
      include: {
        doctor: { select: { user_id: true, name: true, email: true } },
        patient: { select: { user_id: true, name: true, email: true } },
      },
    })

    if (!existing) {
      return res.status(404).json({ message: "Khong tim thay lich hen" })
    }

    // Bệnh nhân chỉ được hủy lịch của chính mình.
    if (isPatient(req) && existing.patient_id !== userId) {
      return res.status(403).json({ message: "Khong co quyen cap nhat lich hen nay" })
    }

    // Bác sĩ chỉ được xử lý lịch hẹn của mình.
    if (isDoctor(req) && existing.doctor_id !== userId) {
      return res.status(403).json({ message: "Khong co quyen cap nhat lich hen nay" })
    }

    // Bệnh nhân không được tự chuyển sang COMPLETED hoặc REJECTED.
    if (isPatient(req) && status !== AppointmentStatus.CANCELLED) {
      return res.status(403).json({ message: "Benh nhan chi duoc huy lich hen" })
    }

    // Cập nhật trạng thái và lưu lý do nếu có.
    const appointment = await prisma.appointment.update({
      where: { appointment_id: appointmentId },
      data: {
        status,
        status_reason: reason,
      },
      include: {
        doctor: { select: { user_id: true, name: true, email: true } },
        patient: { select: { user_id: true, name: true, email: true } },
      },
    })

    // Gửi notification cho phía còn lại để UI realtime cập nhật.
    const recipientUserIds = isDoctor(req) ? [appointment.patient_id] : [appointment.doctor_id]
    const statusLabel = status === AppointmentStatus.CANCELLED
      ? "đã bị hủy"
      : status === AppointmentStatus.REJECTED
        ? "đã bị từ chối"
        : "đã hoàn tất"

    await notifyAppointmentUsers({
      req,
      appointment,
      recipientUserIds,
      title: "Cập nhật lịch khám",
      message: `Lịch khám ${statusLabel}.`,
    })

    return res.json({ message: "Đã cập nhật trạng thái lịch hẹn.", appointment })
  } catch (error) {
    console.error("Lỗi khi cập nhật trạng thái:", error)
    return res.status(500).json({ message: "Lỗi server khi cập nhật trạng thái" })
  }
}

/**
 * Bác sĩ lấy cấu hình lịch rảnh và khoảng nghỉ của chính mình.
 * Dữ liệu này phục vụ màn cấu hình lịch làm việc trong DoctorAppointmentsPage.
 */
const getDoctorAvailability = async (req, res) => {
  try {
    if (!isDoctor(req)) {
      return res.status(403).json({ message: "Chi bac si moi duoc xem lich ranh" })
    }

    const doctorId = parseInteger(req.user.user_id)

    // Lấy song song lịch rảnh lặp lại và các khoảng nghỉ cụ thể.
    const [availability, timeOffs] = await Promise.all([
      prisma.doctorAvailability.findMany({
        where: { doctor_id: doctorId },
        orderBy: [{ day_of_week: "asc" }, { start_time: "asc" }],
      }),
      prisma.doctorTimeOff.findMany({
        where: { doctor_id: doctorId },
        orderBy: { start_time: "asc" },
      }),
    ])

    return res.json({ availability, time_offs: timeOffs })
  } catch (error) {
    console.error("Lỗi lấy lịch rảnh bác sĩ:", error)
    return res.status(500).json({ message: "Lỗi server khi lấy lịch rảnh" })
  }
}

/**
 * Bác sĩ thay thế toàn bộ cấu hình lịch rảnh của mình.
 * Cách replace-all giúp UI cấu hình đơn giản và tránh đồng bộ từng dòng phức tạp.
 */
const replaceDoctorAvailability = async (req, res) => {
  try {
    if (!isDoctor(req)) {
      return res.status(403).json({ message: "Chi bac si moi duoc cau hinh lich ranh" })
    }

    const doctorId = parseInteger(req.user.user_id)
    const items = Array.isArray(req.body.availability) ? req.body.availability : []

    // Chuẩn hóa từng dòng trước khi mở transaction.
    const normalized = []
    for (const item of items) {
      const result = normalizeAvailabilityInput(item)
      if (result.error) {
        return res.status(400).json({ message: result.error })
      }
      normalized.push(result.value)
    }

    // Xóa lịch rảnh cũ và tạo mới trong transaction để không có trạng thái nửa vời.
    const availability = await prisma.$transaction(async (tx) => {
      await tx.doctorAvailability.deleteMany({ where: { doctor_id: doctorId } })

      if (normalized.length) {
        await tx.doctorAvailability.createMany({
          data: normalized.map((item) => ({
            ...item,
            doctor_id: doctorId,
          })),
        })
      }

      return tx.doctorAvailability.findMany({
        where: { doctor_id: doctorId },
        orderBy: [{ day_of_week: "asc" }, { start_time: "asc" }],
      })
    })

    return res.json({ message: "Đã cập nhật lịch rảnh", availability })
  } catch (error) {
    console.error("Lỗi cập nhật lịch rảnh:", error)
    return res.status(500).json({ message: "Lỗi server khi cập nhật lịch rảnh" })
  }
}

/**
 * Bác sĩ thêm một khoảng nghỉ/chặn lịch cụ thể.
 * Khoảng nghỉ sẽ làm các slot giao nhau chuyển sang trạng thái không khả dụng.
 */
const createDoctorTimeOff = async (req, res) => {
  try {
    if (!isDoctor(req)) {
      return res.status(403).json({ message: "Chi bac si moi duoc them lich nghi" })
    }

    const doctorId = parseInteger(req.user.user_id)
    const startTime = parseDate(req.body.start_time)
    const endTime = parseDate(req.body.end_time)
    const reason = req.body.reason ? String(req.body.reason).trim() : null

    // Validate khoảng nghỉ có đủ start/end và start nhỏ hơn end.
    if (!startTime || !endTime || startTime >= endTime) {
      return res.status(400).json({ message: "Khoang thoi gian nghi khong hop le" })
    }

    // Tạo khoảng nghỉ sau khi validate.
    const timeOff = await prisma.doctorTimeOff.create({
      data: {
        doctor_id: doctorId,
        start_time: startTime,
        end_time: endTime,
        reason,
      },
    })

    return res.status(201).json({ message: "Đã thêm lịch nghỉ", time_off: timeOff })
  } catch (error) {
    console.error("Lỗi thêm lịch nghỉ:", error)
    return res.status(500).json({ message: "Lỗi server khi thêm lịch nghỉ" })
  }
}

/**
 * Bác sĩ xóa một khoảng nghỉ của chính mình.
 * Endpoint này giúp bác sĩ mở lại slot nếu thay đổi kế hoạch làm việc.
 */
const deleteDoctorTimeOff = async (req, res) => {
  try {
    if (!isDoctor(req)) {
      return res.status(403).json({ message: "Chi bac si moi duoc xoa lich nghi" })
    }

    const doctorId = parseInteger(req.user.user_id)
    const timeOffId = parseInteger(req.params.id)

    // Xóa có điều kiện doctor_id để bác sĩ không xóa lịch nghỉ của người khác.
    const deleted = await prisma.doctorTimeOff.deleteMany({
      where: {
        time_off_id: timeOffId,
        doctor_id: doctorId,
      },
    })

    if (Number(deleted.count || 0) === 0) {
      return res.status(404).json({ message: "Khong tim thay lich nghi" })
    }

    return res.json({ message: "Đã xóa lịch nghỉ" })
  } catch (error) {
    console.error("Lỗi xóa lịch nghỉ:", error)
    return res.status(500).json({ message: "Lỗi server khi xóa lịch nghỉ" })
  }
}

module.exports = {
  getDoctorsForBooking,
  getAvailableSlots,
  createAppointment,
  getAppointments,
  approveAppointment,
  updateStatus,
  getDoctorAvailability,
  replaceDoctorAvailability,
  createDoctorTimeOff,
  deleteDoctorTimeOff,
}
