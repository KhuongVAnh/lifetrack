"use strict"

const prisma = require("../prismaClient")
const { fromPrismaUserRole } = require("../utils/enumMappings")
const { sanitizeHistoryText, appendHistoryText } = require("../utils/medicalHistory")

// Hàm ép một giá trị id bất kỳ về số nguyên để dùng nhất quán trong controller.
const parseId = (value) => Number.parseInt(value, 10)

// Hàm map lại role của bác sĩ sang text dễ dùng ở frontend, còn nội dung bệnh sử giữ nguyên text thô từ database.
const mapHistoryForResponse = (history) => ({
  ...history,
  doctor: history.doctor
    ? {
      ...history.doctor,
      role: fromPrismaUserRole(history.doctor.role),
    }
    : null,
})

// Hàm lấy ngữ cảnh người gọi hiện tại để xác định role và quyền thao tác bệnh sử.
const getRequesterContext = async (requesterId) => {
  const requester = await prisma.user.findUnique({
    where: { user_id: requesterId },
    select: { user_id: true, role: true },
  })

  if (!requester) return null

  return {
    ...requester,
    roleText: fromPrismaUserRole(requester.role),
  }
}

// Hàm kiểm tra người xem có quyền accepted trên dữ liệu bệnh sử của bệnh nhân hay không.
const hasAcceptedAccess = async (patientId, viewerId) => {
  // Bệnh nhân luôn có quyền xem và thao tác trên dữ liệu của chính mình.
  if (patientId === viewerId) return true

  const access = await prisma.accessPermission.findFirst({
    where: {
      patient_id: patientId,
      viewer_id: viewerId,
      status: "accepted",
    },
    select: { permission_id: true },
  })

  return Boolean(access)
}

// Controller lấy danh sách bệnh sử theo bệnh nhân, chỉ map role bác sĩ và giữ nguyên text thô của các field bệnh sử.
exports.getHistories = async (req, res) => {
  try {
    const requesterId = parseId(req.user.user_id)
    const userId = parseId(req.params.user_id)

    // Chặn truy cập nếu người gọi không phải chủ dữ liệu và cũng chưa được cấp quyền.
    const canView = await hasAcceptedAccess(userId, requesterId)
    if (!canView) {
      return res.status(403).json({ error: "Bạn không có quyền xem bệnh sử này" })
    }

    const histories = await prisma.medicalHistory.findMany({
      where: { user_id: userId, deleted_at: null },
      include: {
        doctor: { select: { user_id: true, name: true, email: true, role: true } },
      },
      orderBy: { created_at: "desc" },
    })

    return res.json(histories.map(mapHistoryForResponse))
  } catch (error) {
    console.error("Error fetching medical histories:", error)
    return res.status(500).json({ error: "Lỗi khi tải bệnh sử" })
  }
}

// Controller tạo mới bệnh sử và lưu trực tiếp các field dưới dạng text thuần.
exports.createHistory = async (req, res) => {
  try {
    const requesterId = parseId(req.user.user_id)
    const requester = await getRequesterContext(requesterId)

    if (!requester) {
      return res.status(401).json({ error: "Không xác thực được người dùng" })
    }

    const isDoctor = requester.roleText === "bác sĩ"
    const isPatient = requester.roleText === "bệnh nhân"

    if (!isDoctor && !isPatient) {
      return res.status(403).json({ error: "Bạn không có quyền tạo bệnh sử" })
    }

    // Bác sĩ ghi cho bệnh nhân theo user_id; bệnh nhân tự tạo thì tự động gắn user_id của chính mình.
    const targetUserId = isDoctor ? parseId(req.body.user_id ?? req.body.patient_id) : requesterId
    if (!Number.isInteger(targetUserId)) {
      return res.status(400).json({ error: "user_id không hợp lệ" })
    }

    if (isDoctor) {
      // Bác sĩ chỉ được tạo bệnh sử khi đã có quyền accepted từ bệnh nhân.
      const canManage = await hasAcceptedAccess(targetUserId, requesterId)
      if (!canManage) {
        return res.status(403).json({ error: "Bạn không có quyền cập nhật bệnh sử cho bệnh nhân này" })
      }
    }

    const newHistory = await prisma.medicalHistory.create({
      data: {
        user_id: targetUserId,
        doctor_id: isDoctor ? requesterId : null,
        doctor_diagnosis: isDoctor ? sanitizeHistoryText(req.body.doctor_diagnosis) : null,
        // Các field bệnh sử được lưu đúng như text người dùng nhập, không ép sang JSON.
        medication: sanitizeHistoryText(req.body.medication),
        symptoms: sanitizeHistoryText(req.body.symptoms),
        condition: sanitizeHistoryText(req.body.condition),
        notes: sanitizeHistoryText(req.body.notes),
      },
      include: {
        doctor: { select: { user_id: true, name: true, email: true, role: true } },
      },
    })

    return res.status(201).json({
      message: "Thêm bệnh sử thành công",
      data: mapHistoryForResponse(newHistory),
    })
  } catch (error) {
    console.error("Error creating medical history:", error)
    return res.status(500).json({ error: "Lỗi khi thêm bệnh sử" })
  }
}

// Controller cập nhật bệnh sử và vẫn giữ nguyên các field là text thuần.
exports.updateHistory = async (req, res) => {
  try {
    const requesterId = parseId(req.user.user_id)
    const historyId = parseId(req.params.id)
    const requester = await getRequesterContext(requesterId)

    const history = await prisma.medicalHistory.findUnique({
      where: { history_id: historyId },
      include: {
        doctor: { select: { user_id: true, name: true, email: true, role: true } },
      },
    })

    if (!history) {
      return res.status(404).json({ error: "Không tìm thấy bệnh sử" })
    }

    const isDoctor = requester?.roleText === "bác sĩ"
    const isPatientOwner = history.user_id === requesterId

    if (isDoctor) {
      const canManage = await hasAcceptedAccess(history.user_id, requesterId)
      if (!canManage) {
        return res.status(403).json({ error: "Bạn không có quyền cập nhật bệnh sử này" })
      }
    } else if (!isPatientOwner) {
      return res.status(403).json({ error: "Bạn không có quyền cập nhật bệnh sử này" })
    }

    // Bệnh nhân và bác sĩ đều có thể cập nhật các field nền như triệu chứng, tình trạng và ghi chú dưới dạng text.
    const updateData = {
      symptoms: sanitizeHistoryText(req.body.symptoms),
      condition: sanitizeHistoryText(req.body.condition),
      notes: sanitizeHistoryText(req.body.notes),
    }

    if (isDoctor) {
      // Chỉ bác sĩ mới được sửa chẩn đoán điều trị và phần thuốc/khuyến nghị.
      updateData.doctor_diagnosis = sanitizeHistoryText(req.body.doctor_diagnosis)
      updateData.medication = sanitizeHistoryText(req.body.medication)
      updateData.doctor_id = requesterId
    }

    const updatedHistory = await prisma.medicalHistory.update({
      where: { history_id: historyId },
      data: updateData,
      include: {
        doctor: { select: { user_id: true, name: true, email: true, role: true } },
      },
    })

    return res.json({
      message: "Cập nhật bệnh sử thành công",
      data: mapHistoryForResponse(updatedHistory),
    })
  } catch (error) {
    console.error("Error updating medical history:", error)
    return res.status(500).json({ error: "Lỗi khi cập nhật bệnh sử" })
  }
}

// Controller thêm nhanh một triệu chứng mới bằng cách nối text mới vào cuối field symptoms hiện có.
exports.addSymptom = async (req, res) => {
  try {
    const historyId = parseId(req.params.id)
    const { symptom } = req.body

    const history = await prisma.medicalHistory.findUnique({
      where: { history_id: historyId },
      include: {
        doctor: { select: { user_id: true, name: true, email: true, role: true } },
      },
    })

    if (!history) {
      return res.status(404).json({ error: "Không tìm thấy bệnh sử" })
    }

    const updatedHistory = await prisma.medicalHistory.update({
      where: { history_id: historyId },
      data: { symptoms: appendHistoryText(history.symptoms, symptom) },
      include: {
        doctor: { select: { user_id: true, name: true, email: true, role: true } },
      },
    })

    return res.json({
      message: "Đã thêm triệu chứng",
      data: mapHistoryForResponse(updatedHistory),
    })
  } catch (error) {
    console.error("Error adding symptom:", error)
    return res.status(500).json({ error: "Lỗi khi thêm triệu chứng" })
  }
}

// Controller cập nhật phần chẩn đoán AI cho một bản ghi bệnh sử cụ thể.
exports.updateAIResult = async (req, res) => {
  try {
    const historyId = parseId(req.params.id)
    const { ai_diagnosis } = req.body

    const history = await prisma.medicalHistory.findUnique({
      where: { history_id: historyId },
      include: {
        doctor: { select: { user_id: true, name: true, email: true, role: true } },
      },
    })

    if (!history) {
      return res.status(404).json({ error: "Không tìm thấy bệnh sử" })
    }

    const updatedHistory = await prisma.medicalHistory.update({
      where: { history_id: historyId },
      data: { ai_diagnosis: sanitizeHistoryText(ai_diagnosis) },
      include: {
        doctor: { select: { user_id: true, name: true, email: true, role: true } },
      },
    })

    return res.json({
      message: "Đã cập nhật chẩn đoán AI",
      data: mapHistoryForResponse(updatedHistory),
    })
  } catch (error) {
    console.error("Error updating AI diagnosis:", error)
    return res.status(500).json({ error: "Lỗi khi cập nhật AI diagnosis" })
  }
}

// Controller xóa mềm bệnh sử để giữ lịch sử trong database nhưng ẩn khỏi giao diện.
exports.deleteHistory = async (req, res) => {
  try {
    const requesterId = parseId(req.user.user_id)
    const historyId = parseId(req.params.id)
    const requester = await getRequesterContext(requesterId)

    const history = await prisma.medicalHistory.findUnique({
      where: { history_id: historyId },
    })

    if (!history) {
      return res.status(404).json({ error: "Không tìm thấy bản ghi" })
    }

    const isDoctor = requester?.roleText === "bác sĩ"
    const isPatientOwner = history.user_id === requesterId

    if (isDoctor) {
      const canManage = await hasAcceptedAccess(history.user_id, requesterId)
      if (!canManage) {
        return res.status(403).json({ error: "Không có quyền xóa bệnh sử này" })
      }
    } else if (!isPatientOwner) {
      return res.status(403).json({ error: "Không có quyền xóa bệnh sử này" })
    }

    // Chỉ đánh dấu deleted_at để vẫn bảo toàn dữ liệu bệnh sử cho mục đích truy vết nội bộ.
    await prisma.medicalHistory.update({
      where: { history_id: historyId },
      data: { deleted_at: new Date() },
    })

    return res.json({ message: "Đã xóa (ẩn) bệnh sử" })
  } catch (error) {
    console.error("Error deleting history:", error)
    return res.status(500).json({ error: "Lỗi khi xóa bệnh sử" })
  }
}
