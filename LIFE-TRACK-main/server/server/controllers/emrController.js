const prisma = require("../prismaClient")
const { listMedicalDocumentsByPatient } = require("../services/medicalDocumentStoreService")
const { fromPrismaUserRole } = require("../utils/enumMappings")

const ROLE_DOCTOR = "bác sĩ"
const ROLE_ADMIN = "admin"

const parseId = (value) => {
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}

const getRequester = async (requesterId) => {
  if (!requesterId) return null

  const user = await prisma.user.findUnique({
    where: { user_id: requesterId },
    select: { user_id: true, role: true, name: true, email: true },
  })

  if (!user) return null

  return {
    ...user,
    roleText: fromPrismaUserRole(user.role),
  }
}

const ensureDoctorRole = async (req) => {
  const requesterId = parseId(req.user?.user_id)
  const requester = await getRequester(requesterId)

  if (!requester) {
    const error = new Error("UNAUTHORIZED")
    error.status = 401
    throw error
  }

  if (requester.roleText !== ROLE_DOCTOR && requester.roleText !== ROLE_ADMIN) {
    const error = new Error("FORBIDDEN")
    error.status = 403
    throw error
  }

  return { requesterId, requester }
}

const hasAcceptedAccess = async (patientId, viewerId) => {
  if (Number(patientId) === Number(viewerId)) return true

  const permission = await prisma.accessPermission.findFirst({
    where: {
      patient_id: Number(patientId),
      viewer_id: Number(viewerId),
      status: "accepted",
    },
    select: { permission_id: true },
  })

  return Boolean(permission)
}

const loadWorkspace = async (patientId) => {
  const [patient, histories, documents] = await Promise.all([
    prisma.user.findUnique({
      where: { user_id: Number(patientId) },
      select: { user_id: true, name: true, email: true, is_active: true, created_at: true },
    }),
    prisma.medicalHistory.findMany({
      where: { user_id: Number(patientId), deleted_at: null },
      include: {
        doctor: { select: { user_id: true, name: true, email: true, role: true } },
      },
      orderBy: { created_at: "desc" },
      take: 20,
    }),
    listMedicalDocumentsByPatient(patientId),
  ])

  return {
    patient,
    histories,
    documents,
  }
}

exports.getWorkspace = async (req, res) => {
  try {
    const { requesterId } = await ensureDoctorRole(req)
    const patientId = parseId(req.params.patient_id)

    if (!patientId) {
      return res.status(400).json({ message: "patient_id không hợp lệ" })
    }

    const canAccess = await hasAcceptedAccess(patientId, requesterId)
    if (!canAccess) {
      return res.status(403).json({ message: "Bác sĩ chưa được cấp quyền hồ sơ bệnh nhân này" })
    }

    const workspace = await loadWorkspace(patientId)
    if (!workspace.patient) {
      return res.status(404).json({ message: "Không tìm thấy bệnh nhân" })
    }

    return res.json({ data: workspace })
  } catch (error) {
    console.error("EMR_GET_WORKSPACE_ERROR", error)
    if (error.message === "FORBIDDEN") {
      return res.status(403).json({ message: "Không có quyền truy cập EMR" })
    }
    if (error.status) {
      return res.status(error.status).json({ message: "Không thể xác thực người dùng" })
    }
    return res.status(500).json({ message: "Lỗi khi tải Consultation Workspace" })
  }
}

exports.createConsultation = async (req, res) => {
  try {
    const { requesterId } = await ensureDoctorRole(req)
    const patientId = parseId(req.body.patient_id)

    if (!patientId) {
      return res.status(400).json({ message: "patient_id không hợp lệ" })
    }

    const canAccess = await hasAcceptedAccess(patientId, requesterId)
    if (!canAccess) {
      return res.status(403).json({ message: "Bác sĩ chưa được cấp quyền hồ sơ bệnh nhân này" })
    }

    const {
      ghi_chu_lam_sang,
      chan_doan,
      thuoc_ke_don,
      tinh_trang,
      y_lenh,
    } = req.body

    const normalizedOrders = Array.isArray(y_lenh) ? y_lenh.filter(Boolean) : []

    const created = await prisma.medicalHistory.create({
      data: {
        user_id: patientId,
        doctor_id: requesterId,
        doctor_diagnosis: chan_doan || null,
        medication: thuoc_ke_don || null,
        condition: tinh_trang || null,
        notes: [
          "[SOAP]",
          ghi_chu_lam_sang || "",
          "[CPOE]",
          normalizedOrders.join("; "),
        ].join("\n").trim(),
      },
      include: {
        doctor: { select: { user_id: true, name: true, email: true, role: true } },
      },
    })

    return res.status(201).json({
      message: "Đã lưu hồ sơ khám EMR",
      data: created,
    })
  } catch (error) {
    console.error("EMR_CREATE_CONSULTATION_ERROR", error)
    if (error.message === "FORBIDDEN") {
      return res.status(403).json({ message: "Không có quyền truy cập EMR" })
    }
    if (error.status) {
      return res.status(error.status).json({ message: "Không thể xác thực người dùng" })
    }
    return res.status(500).json({ message: "Lỗi khi lưu hồ sơ khám" })
  }
}

exports.getPatientChart = async (req, res) => {
  try {
    const { requesterId } = await ensureDoctorRole(req)
    const patientId = parseId(req.params.patient_id)

    if (!patientId) {
      return res.status(400).json({ message: "patient_id không hợp lệ" })
    }

    const canAccess = await hasAcceptedAccess(patientId, requesterId)
    if (!canAccess) {
      return res.status(403).json({ message: "Bác sĩ chưa được cấp quyền hồ sơ bệnh nhân này" })
    }

    const workspace = await loadWorkspace(patientId)
    if (!workspace.patient) {
      return res.status(404).json({ message: "Không tìm thấy bệnh nhân" })
    }

    return res.json({
      data: {
        patient: workspace.patient,
        histories: workspace.histories,
        documents: workspace.documents,
      },
    })
  } catch (error) {
    console.error("EMR_GET_CHART_ERROR", error)
    if (error.message === "FORBIDDEN") {
      return res.status(403).json({ message: "Không có quyền truy cập EMR" })
    }
    if (error.status) {
      return res.status(error.status).json({ message: "Không thể xác thực người dùng" })
    }
    return res.status(500).json({ message: "Lỗi khi tải Patient Chart" })
  }
}
