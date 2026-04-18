const path = require("path")
const prisma = require("../prismaClient")
const { fromPrismaUserRole } = require("../utils/enumMappings")
const { extractMedicalText } = require("../services/ocrService")
const { summarizeMedicalText } = require("../services/medicalAiSummaryService")
const {
  createMedicalDocument,
  listMedicalDocumentsByPatient,
} = require("../services/medicalDocumentStoreService")

const ROLE_DOCTOR = "bác sĩ"
const ROLE_PATIENT = "bệnh nhân"
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

const resolvePatientContext = async (req) => {
  const requesterId = parseId(req.user?.user_id)
  const requester = await getRequester(requesterId)
  if (!requester) {
    const error = new Error("UNAUTHORIZED")
    error.status = 401
    throw error
  }

  const queryPatientId = parseId(req.query.patient_id || req.body.patient_id)

  if (requester.roleText === ROLE_DOCTOR) {
    if (!queryPatientId) {
      const error = new Error("PATIENT_ID_REQUIRED")
      error.status = 400
      throw error
    }

    const canAccess = await hasAcceptedAccess(queryPatientId, requesterId)
    if (!canAccess) {
      const error = new Error("ACCESS_DENIED")
      error.status = 403
      throw error
    }

    return { requester, requesterId, patientId: queryPatientId }
  }

  if (requester.roleText === ROLE_ADMIN) {
    return { requester, requesterId, patientId: queryPatientId || requesterId }
  }

  return { requester, requesterId, patientId: requesterId }
}

const mapHistoryToTimeline = (item) => ({
  id: `history-${item.history_id}`,
  loai: item.notes?.includes("[INTAKE]") ? "Khai báo trước khám" : "Bản ghi bệnh sử",
  thoi_gian: item.created_at,
  tieu_de: item.doctor_diagnosis || item.ai_diagnosis || "Cập nhật hồ sơ y tế",
  mo_ta: item.notes || item.symptoms || item.condition || "Không có mô tả chi tiết",
  nguon: item.doctor?.name ? `Bác sĩ ${item.doctor.name}` : "Người bệnh tự cập nhật",
})

exports.createIntake = async (req, res) => {
  try {
    const { requester, requesterId, patientId } = await resolvePatientContext(req)

    if (requester.roleText !== ROLE_PATIENT && requester.roleText !== ROLE_ADMIN && requester.roleText !== ROLE_DOCTOR) {
      return res.status(403).json({ message: "Bạn không có quyền tạo khai báo" })
    }

    const {
      trieu_chung_chinh,
      thoi_gian_trieu_chung,
      di_ung,
      tien_su,
      thuoc_dang_dung,
      ghi_chu,
    } = req.body

    const symptomText = [
      trieu_chung_chinh ? `Triệu chứng: ${trieu_chung_chinh}` : null,
      thoi_gian_trieu_chung ? `Thời gian: ${thoi_gian_trieu_chung}` : null,
      di_ung ? `Dị ứng: ${di_ung}` : null,
    ]
      .filter(Boolean)
      .join(" | ")

    const history = await prisma.medicalHistory.create({
      data: {
        user_id: patientId,
        doctor_id: requester.roleText === ROLE_DOCTOR ? requesterId : null,
        symptoms: symptomText || null,
        condition: tien_su || null,
        medication: thuoc_dang_dung || null,
        notes: `[INTAKE] ${ghi_chu || "Bệnh nhân khai báo trước khám"}`,
      },
      include: {
        doctor: { select: { user_id: true, name: true, email: true, role: true } },
      },
    })

    return res.status(201).json({
      message: "Đã lưu khai báo trước khám",
      data: history,
    })
  } catch (error) {
    console.error("PHR_CREATE_INTAKE_ERROR", error)
    if (error.message === "PATIENT_ID_REQUIRED") {
      return res.status(400).json({ message: "Bác sĩ phải cung cấp patient_id" })
    }
    if (error.message === "ACCESS_DENIED") {
      return res.status(403).json({ message: "Không có quyền truy cập hồ sơ bệnh nhân này" })
    }
    if (error.status) {
      return res.status(error.status).json({ message: "Không thể xác thực người dùng" })
    }
    return res.status(500).json({ message: "Lỗi khi lưu khai báo trước khám" })
  }
}

exports.getLatestIntake = async (req, res) => {
  try {
    const { patientId } = await resolvePatientContext(req)

    const latestIntake = await prisma.medicalHistory.findFirst({
      where: {
        user_id: patientId,
        deleted_at: null,
        notes: { contains: "[INTAKE]" },
      },
      orderBy: { created_at: "desc" },
    })

    return res.json({ data: latestIntake || null })
  } catch (error) {
    console.error("PHR_GET_LATEST_INTAKE_ERROR", error)
    if (error.message === "PATIENT_ID_REQUIRED") {
      return res.status(400).json({ message: "Bác sĩ phải cung cấp patient_id" })
    }
    if (error.message === "ACCESS_DENIED") {
      return res.status(403).json({ message: "Không có quyền truy cập hồ sơ bệnh nhân này" })
    }
    if (error.status) {
      return res.status(error.status).json({ message: "Không thể xác thực người dùng" })
    }
    return res.status(500).json({ message: "Lỗi khi tải khai báo gần nhất" })
  }
}

exports.uploadMedicalDocument = async (req, res) => {
  try {
    const { requesterId, patientId } = await resolvePatientContext(req)

    if (!req.file) {
      return res.status(400).json({ message: "Thiếu file tài liệu" })
    }

    const ocrText = await extractMedicalText({
      filePath: req.file.path,
      mimeType: req.file.mimetype,
    })

    const summary = await summarizeMedicalText(ocrText)

    const documentRecord = await createMedicalDocument({
      patient_id: patientId,
      uploader_id: requesterId,
      title: req.body.tieu_de || req.file.originalname,
      file_name: req.file.filename,
      original_name: req.file.originalname,
      mime_type: req.file.mimetype,
      size_bytes: req.file.size,
      relative_path: path.posix.join("uploads", "medical-documents", req.file.filename),
      ocr_text: ocrText,
      summary,
    })

    return res.status(201).json({
      message: "Tải tài liệu và OCR thành công",
      data: documentRecord,
    })
  } catch (error) {
    console.error("PHR_UPLOAD_DOCUMENT_ERROR", error)
    if (error.message === "UNSUPPORTED_DOCUMENT_TYPE") {
      return res.status(400).json({ message: "Loại tài liệu không được hỗ trợ" })
    }
    if (error.message === "PATIENT_ID_REQUIRED") {
      return res.status(400).json({ message: "Bác sĩ phải cung cấp patient_id" })
    }
    if (error.message === "ACCESS_DENIED") {
      return res.status(403).json({ message: "Không có quyền truy cập hồ sơ bệnh nhân này" })
    }
    if (error.status) {
      return res.status(error.status).json({ message: "Không thể xác thực người dùng" })
    }
    return res.status(500).json({ message: "Lỗi khi OCR tài liệu y tế" })
  }
}

exports.getMedicalDocuments = async (req, res) => {
  try {
    const { patientId } = await resolvePatientContext(req)
    const documents = await listMedicalDocumentsByPatient(patientId)

    return res.json({ data: documents })
  } catch (error) {
    console.error("PHR_GET_DOCUMENTS_ERROR", error)
    if (error.message === "PATIENT_ID_REQUIRED") {
      return res.status(400).json({ message: "Bác sĩ phải cung cấp patient_id" })
    }
    if (error.message === "ACCESS_DENIED") {
      return res.status(403).json({ message: "Không có quyền truy cập hồ sơ bệnh nhân này" })
    }
    if (error.status) {
      return res.status(error.status).json({ message: "Không thể xác thực người dùng" })
    }
    return res.status(500).json({ message: "Lỗi khi tải tài liệu y tế" })
  }
}

exports.getPhrHistory = async (req, res) => {
  try {
    const { patientId } = await resolvePatientContext(req)

    const [histories, documents] = await Promise.all([
      prisma.medicalHistory.findMany({
        where: { user_id: patientId, deleted_at: null },
        include: {
          doctor: { select: { user_id: true, name: true, email: true, role: true } },
        },
        orderBy: { created_at: "desc" },
      }),
      listMedicalDocumentsByPatient(patientId),
    ])

    const timelineFromHistories = histories.map(mapHistoryToTimeline)
    const timelineFromDocuments = documents.map((doc) => ({
      id: doc.document_id,
      loai: "Tài liệu OCR",
      thoi_gian: doc.created_at,
      tieu_de: doc.title,
      mo_ta: doc.summary?.tom_tat || "Đã tải lên tài liệu y tế",
      nguon: "Medical Records Upload",
    }))

    const mergedTimeline = [...timelineFromHistories, ...timelineFromDocuments].sort(
      (a, b) => new Date(b.thoi_gian).getTime() - new Date(a.thoi_gian).getTime()
    )

    return res.json({ data: mergedTimeline })
  } catch (error) {
    console.error("PHR_GET_HISTORY_ERROR", error)
    if (error.message === "PATIENT_ID_REQUIRED") {
      return res.status(400).json({ message: "Bác sĩ phải cung cấp patient_id" })
    }
    if (error.message === "ACCESS_DENIED") {
      return res.status(403).json({ message: "Không có quyền truy cập hồ sơ bệnh nhân này" })
    }
    if (error.status) {
      return res.status(error.status).json({ message: "Không thể xác thực người dùng" })
    }
    return res.status(500).json({ message: "Lỗi khi tải lịch sử PHR" })
  }
}
