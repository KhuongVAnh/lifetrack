const { DoctorHireStatus, NotificationType, UserRole } = require("@prisma/client")
const prisma = require("../prismaClient")
const { createNotification } = require("../services/notificationService")
const { invalidateRecipientCacheByPatient } = require("../services/telemetryRuntimeCacheService")

const PATIENT_ROLE = "bệnh nhân"
const DOCTOR_ROLE = "bác sĩ"

/**
 * Chuyển một giá trị id về số nguyên hợp lệ để dùng trong controller thuê bác sĩ.
 */
const parseId = (value) => {
  // parseInt giúp chấp nhận id từ params hoặc body ở dạng chuỗi.
  const parsed = Number.parseInt(value, 10)

  // Nếu dữ liệu không phải số nguyên thì trả null để controller trả lỗi rõ ràng.
  return Number.isInteger(parsed) ? parsed : null
}

/**
 * Kiểm tra request hiện tại có thuộc bệnh nhân hay không.
 */
const isPatient = (req) => {
  // JWT đang lưu role dạng tiếng Việt nên so sánh với nhãn role hiện tại.
  return req.user?.role === PATIENT_ROLE
}

/**
 * Kiểm tra request hiện tại có thuộc bác sĩ hay không.
 */
const isDoctor = (req) => {
  // Bác sĩ là người duyệt hoặc từ chối yêu cầu thuê gửi đến chính mình.
  return req.user?.role === DOCTOR_ROLE
}

/**
 * Gửi notification cho một nhóm user về thay đổi trạng thái thuê bác sĩ.
 */
const notifyHireUsers = async ({ req, recipientUserIds, title, message, hire }) => {
  // Lấy io từ app để notification có thể realtime qua Socket.IO.
  const io = req.app.get("io")

  // Lưu notification theo service chung để thống nhất với lịch hẹn và chat.
  await createNotification({
    io,
    type: NotificationType.ACCESS_RESPONSE,
    title,
    message,
    actorId: req.user?.user_id,
    entityType: "doctor_hire",
    entityId: hire.hire_id,
    payload: {
      hire_id: hire.hire_id,
      patient_id: hire.patient_id,
      doctor_id: hire.doctor_id,
      status: hire.status,
    },
    recipientUserIds,
  })
}

/**
 * Chuẩn hóa dữ liệu DoctorHire trả về frontend để UI không phụ thuộc cấu trúc Prisma lồng nhau.
 */
const mapHireForResponse = (hire) => ({
  hire_id: hire.hire_id,
  patient_id: hire.patient_id,
  doctor_id: hire.doctor_id,
  status: hire.status,
  price_snapshot: hire.price_snapshot,
  can_view_ehr: hire.can_view_ehr,
  can_view_medications: hire.can_view_medications,
  can_view_ecg: hire.can_view_ecg,
  requested_at: hire.requested_at,
  approved_at: hire.approved_at,
  rejected_at: hire.rejected_at,
  cancelled_at: hire.cancelled_at,
  doctor: hire.doctor
    ? {
        user_id: hire.doctor.user_id,
        name: hire.doctor.name,
        email: hire.doctor.email,
        consultation_fee: hire.doctor.consultation_fee,
        profile: hire.doctor.doctorProfile || null,
      }
    : null,
  patient: hire.patient
    ? {
        user_id: hire.patient.user_id,
        name: hire.patient.name,
        email: hire.patient.email,
      }
    : null,
})

/**
 * Lấy danh sách bác sĩ do hệ thống quản lý để bệnh nhân chọn thuê.
 */
const listDoctorCatalog = async (req, res) => {
  try {
    const keyword = String(req.query.q || "").trim()
    const requesterId = parseId(req.user?.user_id)

    // Lấy danh sách user bác sĩ đang hoạt động, kèm profile hệ thống nếu có.
    const doctors = await prisma.user.findMany({
      where: {
        role: UserRole.BAC_SI,
        is_active: true,
        ...(keyword
          ? {
              OR: [
                { name: { contains: keyword } },
                { email: { contains: keyword } },
                { doctorProfile: { is: { specialty: { contains: keyword } } } },
                { doctorProfile: { is: { hospital: { contains: keyword } } } },
              ],
            }
          : {}),
      },
      include: {
        doctorProfile: true,
      },
      orderBy: { name: "asc" },
    })

    // Nếu requester là bệnh nhân thì lấy trạng thái thuê để render badge/CTA đúng.
    const hires = isPatient(req)
      ? await prisma.doctorHire.findMany({
          where: { patient_id: requesterId },
          select: {
            hire_id: true,
            doctor_id: true,
            status: true,
            can_view_ehr: true,
            can_view_medications: true,
            can_view_ecg: true,
          },
        })
      : []
    const hireByDoctorId = new Map(hires.map((hire) => [hire.doctor_id, hire]))

    // Map về shape phẳng để frontend dùng chung cho trang thuê và lịch hẹn.
    const catalog = doctors
      .filter((doctor) => doctor.doctorProfile?.is_listed !== false)
      .map((doctor) => {
        const hire = hireByDoctorId.get(doctor.user_id)
        const profile = doctor.doctorProfile || {}
        return {
          user_id: doctor.user_id,
          name: doctor.name,
          email: doctor.email,
          consultation_fee: doctor.consultation_fee || 0,
          specialty: profile.specialty || "Tim mạch",
          title: profile.title || doctor.name,
          hospital: profile.hospital || "LifeTrack Care",
          location: profile.location || "Khám trực tuyến",
          bio: profile.bio || "Bác sĩ đang tham gia mạng lưới chăm sóc của LifeTrack.",
          avatar_url: profile.avatar_url || null,
          hire_price: profile.hire_price ?? doctor.consultation_fee ?? 0,
          hire_id: hire?.hire_id || null,
          hire_status: hire?.status || null,
          is_hired: hire?.status === DoctorHireStatus.ACTIVE,
          can_view_ehr: hire?.can_view_ehr || false,
          can_view_medications: hire?.can_view_medications || false,
          can_view_ecg: hire?.can_view_ecg || false,
        }
      })

    return res.json({ doctors: catalog })
  } catch (error) {
    console.error("Lỗi lấy catalog bác sĩ:", error)
    return res.status(500).json({ message: "Lỗi server khi lấy danh sách bác sĩ" })
  }
}

/**
 * Bệnh nhân gửi yêu cầu thuê một bác sĩ trong catalog.
 */
const requestDoctorHire = async (req, res) => {
  try {
    if (!isPatient(req)) {
      return res.status(403).json({ message: "Chỉ bệnh nhân mới được gửi yêu cầu thuê bác sĩ" })
    }

    const patientId = parseId(req.user.user_id)
    const doctorId = parseId(req.body.doctor_id)
    if (!doctorId) {
      return res.status(400).json({ message: "doctor_id không hợp lệ" })
    }

    // Đảm bảo bác sĩ tồn tại, đang hoạt động và thuộc catalog hệ thống.
    const doctor = await prisma.user.findFirst({
      where: { user_id: doctorId, role: UserRole.BAC_SI, is_active: true },
      include: { doctorProfile: true },
    })
    if (!doctor || doctor.doctorProfile?.is_listed === false) {
      return res.status(404).json({ message: "Không tìm thấy bác sĩ có thể thuê" })
    }

    // Chặn bệnh nhân gửi thuê chính tài khoản không hợp lệ hoặc bác sĩ đã có quan hệ active/pending.
    const existing = await prisma.doctorHire.findUnique({
      where: { patient_id_doctor_id: { patient_id: patientId, doctor_id: doctorId } },
    })
    if (existing?.status === DoctorHireStatus.ACTIVE || existing?.status === DoctorHireStatus.PENDING_DOCTOR_APPROVAL) {
      return res.status(409).json({ message: "Yêu cầu thuê bác sĩ này đang tồn tại" })
    }

    const priceSnapshot = Number(doctor.doctorProfile?.hire_price ?? doctor.consultation_fee ?? 0)

    // Upsert để bệnh nhân có thể gửi lại sau khi bị từ chối/hủy.
    const hire = await prisma.doctorHire.upsert({
      where: { patient_id_doctor_id: { patient_id: patientId, doctor_id: doctorId } },
      update: {
        status: DoctorHireStatus.PENDING_DOCTOR_APPROVAL,
        price_snapshot: priceSnapshot,
        can_view_ehr: false,
        can_view_medications: false,
        can_view_ecg: false,
        requested_at: new Date(),
        approved_at: null,
        rejected_at: null,
        cancelled_at: null,
      },
      create: {
        patient_id: patientId,
        doctor_id: doctorId,
        status: DoctorHireStatus.PENDING_DOCTOR_APPROVAL,
        price_snapshot: priceSnapshot,
      },
      include: {
        doctor: { include: { doctorProfile: true } },
        patient: { select: { user_id: true, name: true, email: true } },
      },
    })

    // Báo cho bác sĩ biết có yêu cầu thuê mới cần duyệt.
    await notifyHireUsers({
      req,
      recipientUserIds: [doctorId],
      title: "Yêu cầu thuê bác sĩ mới",
      message: `${hire.patient.name} muốn thuê bạn làm bác sĩ đồng hành.`,
      hire,
    })

    return res.status(201).json({ message: "Đã gửi yêu cầu thuê bác sĩ", hire: mapHireForResponse(hire) })
  } catch (error) {
    console.error("Lỗi gửi yêu cầu thuê bác sĩ:", error)
    return res.status(500).json({ message: "Lỗi server khi gửi yêu cầu thuê bác sĩ" })
  }
}

/**
 * Bệnh nhân lấy danh sách bác sĩ đang thuê hoặc đang chờ duyệt.
 */
const listMyDoctorHires = async (req, res) => {
  try {
    if (!isPatient(req)) {
      return res.status(403).json({ message: "Chỉ bệnh nhân mới xem được danh sách bác sĩ của tôi" })
    }

    const patientId = parseId(req.user.user_id)

    // Trả về cả trạng thái pending/active/rejected/cancelled để UI hiển thị lịch sử gần nhất.
    const hires = await prisma.doctorHire.findMany({
      where: { patient_id: patientId },
      include: {
        doctor: { include: { doctorProfile: true } },
      },
      orderBy: [{ status: "asc" }, { updated_at: "desc" }],
    })

    return res.json({ hires: hires.map(mapHireForResponse) })
  } catch (error) {
    console.error("Lỗi lấy bác sĩ của tôi:", error)
    return res.status(500).json({ message: "Lỗi server khi lấy bác sĩ của tôi" })
  }
}

/**
 * Bác sĩ lấy danh sách yêu cầu thuê được gửi đến mình.
 */
const listDoctorHireRequests = async (req, res) => {
  try {
    if (!isDoctor(req)) {
      return res.status(403).json({ message: "Chỉ bác sĩ mới xem được yêu cầu thuê" })
    }

    const doctorId = parseId(req.user.user_id)
    const status = req.query.status ? String(req.query.status).toUpperCase() : null

    // Nếu có query status thì lọc theo trạng thái, mặc định lấy pending trước để bác sĩ xử lý nhanh.
    const hires = await prisma.doctorHire.findMany({
      where: {
        doctor_id: doctorId,
        ...(status && Object.values(DoctorHireStatus).includes(status) ? { status } : {}),
      },
      include: {
        patient: { select: { user_id: true, name: true, email: true } },
      },
      orderBy: [{ requested_at: "desc" }],
    })

    return res.json({ requests: hires.map(mapHireForResponse) })
  } catch (error) {
    console.error("Lỗi lấy yêu cầu thuê bác sĩ:", error)
    return res.status(500).json({ message: "Lỗi server khi lấy yêu cầu thuê" })
  }
}

/**
 * Bác sĩ duyệt yêu cầu thuê gửi đến chính mình.
 */
const approveDoctorHire = async (req, res) => {
  try {
    if (!isDoctor(req)) {
      return res.status(403).json({ message: "Chỉ bác sĩ mới được duyệt yêu cầu thuê" })
    }

    const doctorId = parseId(req.user.user_id)
    const hireId = parseId(req.params.id)

    // Chỉ bác sĩ được thuê mới có quyền duyệt yêu cầu này.
    const hire = await prisma.doctorHire.findFirst({
      where: {
        hire_id: hireId,
        doctor_id: doctorId,
        status: DoctorHireStatus.PENDING_DOCTOR_APPROVAL,
      },
      include: {
        patient: { select: { user_id: true, name: true, email: true } },
        doctor: { include: { doctorProfile: true } },
      },
    })
    if (!hire) {
      return res.status(404).json({ message: "Không tìm thấy yêu cầu thuê đang chờ duyệt" })
    }

    // Duyệt thuê nhưng vẫn giữ quyền xem hồ sơ ở false để bệnh nhân tự bật từng mục.
    const updated = await prisma.doctorHire.update({
      where: { hire_id: hireId },
      data: {
        status: DoctorHireStatus.ACTIVE,
        approved_at: new Date(),
        rejected_at: null,
        cancelled_at: null,
      },
      include: {
        patient: { select: { user_id: true, name: true, email: true } },
        doctor: { include: { doctorProfile: true } },
      },
    })

    // Báo cho bệnh nhân biết bác sĩ đã duyệt yêu cầu thuê.
    await notifyHireUsers({
      req,
      recipientUserIds: [updated.patient_id],
      title: "Bác sĩ đã duyệt yêu cầu thuê",
      message: `${updated.doctor.name} đã đồng ý trở thành bác sĩ đồng hành của bạn.`,
      hire: updated,
    })

    return res.json({ message: "Đã duyệt yêu cầu thuê bác sĩ", hire: mapHireForResponse(updated) })
  } catch (error) {
    console.error("Lỗi duyệt yêu cầu thuê bác sĩ:", error)
    return res.status(500).json({ message: "Lỗi server khi duyệt yêu cầu thuê" })
  }
}

/**
 * Bác sĩ từ chối yêu cầu thuê gửi đến chính mình.
 */
const rejectDoctorHire = async (req, res) => {
  try {
    if (!isDoctor(req)) {
      return res.status(403).json({ message: "Chỉ bác sĩ mới được từ chối yêu cầu thuê" })
    }

    const doctorId = parseId(req.user.user_id)
    const hireId = parseId(req.params.id)

    // Tìm đúng yêu cầu pending của bác sĩ hiện tại để tránh bác sĩ duyệt hộ nhau.
    const hire = await prisma.doctorHire.findFirst({
      where: {
        hire_id: hireId,
        doctor_id: doctorId,
        status: DoctorHireStatus.PENDING_DOCTOR_APPROVAL,
      },
      include: {
        patient: { select: { user_id: true, name: true, email: true } },
        doctor: { include: { doctorProfile: true } },
      },
    })
    if (!hire) {
      return res.status(404).json({ message: "Không tìm thấy yêu cầu thuê đang chờ duyệt" })
    }

    // Từ chối sẽ tắt toàn bộ quyền xem để dữ liệu bệnh nhân không bị mở nhầm.
    const updated = await prisma.doctorHire.update({
      where: { hire_id: hireId },
      data: {
        status: DoctorHireStatus.REJECTED,
        rejected_at: new Date(),
        can_view_ehr: false,
        can_view_medications: false,
        can_view_ecg: false,
      },
      include: {
        patient: { select: { user_id: true, name: true, email: true } },
        doctor: { include: { doctorProfile: true } },
      },
    })

    // Báo cho bệnh nhân biết yêu cầu không được bác sĩ nhận.
    await notifyHireUsers({
      req,
      recipientUserIds: [updated.patient_id],
      title: "Bác sĩ đã từ chối yêu cầu thuê",
      message: `${updated.doctor.name} chưa thể nhận yêu cầu đồng hành của bạn.`,
      hire: updated,
    })

    return res.json({ message: "Đã từ chối yêu cầu thuê bác sĩ", hire: mapHireForResponse(updated) })
  } catch (error) {
    console.error("Lỗi từ chối yêu cầu thuê bác sĩ:", error)
    return res.status(500).json({ message: "Lỗi server khi từ chối yêu cầu thuê" })
  }
}

/**
 * Bệnh nhân bật hoặc tắt quyền bác sĩ xem từng nhóm hồ sơ.
 */
const updateDoctorHireAccess = async (req, res) => {
  try {
    if (!isPatient(req)) {
      return res.status(403).json({ message: "Chỉ bệnh nhân mới được cập nhật quyền hồ sơ" })
    }

    const patientId = parseId(req.user.user_id)
    const hireId = parseId(req.params.id)

    // Chỉ cho cập nhật quyền trên quan hệ thuê active của chính bệnh nhân.
    const hire = await prisma.doctorHire.findFirst({
      where: {
        hire_id: hireId,
        patient_id: patientId,
        status: DoctorHireStatus.ACTIVE,
      },
    })
    if (!hire) {
      return res.status(404).json({ message: "Không tìm thấy quan hệ thuê đang hoạt động" })
    }

    // Chỉ nhận các field boolean được phép để tránh update nhầm cột khác.
    const data = {}
    ;["can_view_ehr", "can_view_medications", "can_view_ecg"].forEach((field) => {
      if (typeof req.body[field] === "boolean") {
        data[field] = req.body[field]
      }
    })

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: "Không có quyền hồ sơ hợp lệ để cập nhật" })
    }

    const updated = await prisma.doctorHire.update({
      where: { hire_id: hireId },
      data,
      include: {
        doctor: { include: { doctorProfile: true } },
        patient: { select: { user_id: true, name: true, email: true } },
      },
    })

    // Quyền ECG có thể thay đổi người nhận cảnh báo realtime nên cần xóa cache người nhận.
    invalidateRecipientCacheByPatient(updated.patient_id)

    return res.json({ message: "Đã cập nhật quyền hồ sơ", hire: mapHireForResponse(updated) })
  } catch (error) {
    console.error("Lỗi cập nhật quyền hồ sơ bác sĩ thuê:", error)
    return res.status(500).json({ message: "Lỗi server khi cập nhật quyền hồ sơ" })
  }
}

/**
 * Bệnh nhân hủy quan hệ thuê bác sĩ.
 */
const cancelDoctorHire = async (req, res) => {
  try {
    if (!isPatient(req)) {
      return res.status(403).json({ message: "Chỉ bệnh nhân mới được hủy thuê bác sĩ" })
    }

    const patientId = parseId(req.user.user_id)
    const hireId = parseId(req.params.id)

    // Chỉ bệnh nhân sở hữu yêu cầu mới được hủy.
    const hire = await prisma.doctorHire.findFirst({
      where: {
        hire_id: hireId,
        patient_id: patientId,
        status: { in: [DoctorHireStatus.ACTIVE, DoctorHireStatus.PENDING_DOCTOR_APPROVAL] },
      },
    })
    if (!hire) {
      return res.status(404).json({ message: "Không tìm thấy yêu cầu thuê có thể hủy" })
    }

    // Hủy thuê đồng thời tắt toàn bộ quyền xem hồ sơ.
    const updated = await prisma.doctorHire.update({
      where: { hire_id: hireId },
      data: {
        status: DoctorHireStatus.CANCELLED,
        cancelled_at: new Date(),
        can_view_ehr: false,
        can_view_medications: false,
        can_view_ecg: false,
      },
      include: {
        doctor: { include: { doctorProfile: true } },
        patient: { select: { user_id: true, name: true, email: true } },
      },
    })

    // Hủy thuê sẽ tắt quyền ECG nên cache người nhận cảnh báo phải được làm mới.
    invalidateRecipientCacheByPatient(updated.patient_id)

    // Báo cho bác sĩ biết bệnh nhân đã hủy quan hệ thuê.
    await notifyHireUsers({
      req,
      recipientUserIds: [updated.doctor_id],
      title: "Bệnh nhân đã hủy thuê bác sĩ",
      message: `${updated.patient.name} đã hủy quan hệ bác sĩ đồng hành.`,
      hire: updated,
    })

    return res.json({ message: "Đã hủy thuê bác sĩ", hire: mapHireForResponse(updated) })
  } catch (error) {
    console.error("Lỗi hủy thuê bác sĩ:", error)
    return res.status(500).json({ message: "Lỗi server khi hủy thuê bác sĩ" })
  }
}

module.exports = {
  approveDoctorHire,
  cancelDoctorHire,
  listDoctorCatalog,
  listDoctorHireRequests,
  listMyDoctorHires,
  rejectDoctorHire,
  requestDoctorHire,
  updateDoctorHireAccess,
}
