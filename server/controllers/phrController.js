"use strict"

const prisma = require("../prismaClient")
const { fromPrismaUserRole } = require("../utils/enumMappings")

const parseId = (value) => Number.parseInt(value, 10)

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

const hasAcceptedAccess = async (patientId, viewerId) => {
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

// ============================================
// PHR OVERVIEW (Khám sức khỏe tổng quát)
// ============================================

exports.getOverview = async (req, res) => {
  try {
    const requesterId = parseId(req.user.user_id)
    const userId = parseId(req.params.user_id)

    const canView = await hasAcceptedAccess(userId, requesterId)
    if (!canView) {
      return res.status(403).json({ error: "Bạn không có quyền xem hồ sơ sức khỏe này" })
    }

    const overview = await prisma.phrOverview.findUnique({
      where: { user_id: userId }
    })

    if (!overview) {
       // Return empty framework if none exists
       return res.json({
         user_id: userId,
         personal_info: {},
         vitals: {},
         medical_history: {},
         clinical_results: {}
       })
    }

    return res.json(overview)
  } catch (error) {
    console.error("Error fetching PHR Overview:", error)
    return res.status(500).json({ error: "Lỗi khi tải tổng quan sức khỏe" })
  }
}

exports.upsertOverview = async (req, res) => {
  try {
    const requesterId = parseId(req.user.user_id)
    const userId = parseId(req.params.user_id)
    const requester = await getRequesterContext(requesterId)

    const canManage = await hasAcceptedAccess(userId, requesterId)
    // For now, let's allow patients and doctors with accepted access to edit.
    if (!canManage) {
      return res.status(403).json({ error: "Bạn không có quyền cập nhật hồ sơ sức khỏe này" })
    }

    const { personal_info, vitals, medical_history, clinical_results } = req.body

    const upsertedOverview = await prisma.phrOverview.upsert({
      where: { user_id: userId },
      update: {
        personal_info: personal_info || undefined,
        vitals: vitals || undefined,
        medical_history: medical_history || undefined,
        clinical_results: clinical_results || undefined,
      },
      create: {
        user_id: userId,
        personal_info: personal_info || {},
        vitals: vitals || {},
        medical_history: medical_history || {},
        clinical_results: clinical_results || {}
      }
    })

    return res.json({
      message: "Cập nhật tổng quan bệnh án thành công",
      data: upsertedOverview,
    })
  } catch (error) {
    console.error("Error upserting PHR Overview:", error)
    return res.status(500).json({ error: "Lỗi khi cập nhật tổng quan sức khỏe" })
  }
}

// ============================================
// MEDICAL VISITS (Lịch sử khám bệnh)
// ============================================

const mapVisitForResponse = (visit) => ({
  ...visit,
  doctor: visit.doctor
    ? {
      ...visit.doctor,
      role: fromPrismaUserRole(visit.doctor.role),
    }
    : null,
})

exports.getVisits = async (req, res) => {
  try {
    const requesterId = parseId(req.user.user_id)
    const userId = parseId(req.params.user_id)

    const canView = await hasAcceptedAccess(userId, requesterId)
    if (!canView) {
      return res.status(403).json({ error: "Bạn không có quyền xem lịch sử khám này" })
    }

    const visits = await prisma.medicalVisit.findMany({
      where: { user_id: userId, deleted_at: null },
      include: {
        doctor: { select: { user_id: true, name: true, email: true, role: true } },
      },
      orderBy: { visit_date: "desc" },
    })

    return res.json(visits.map(mapVisitForResponse))
  } catch (error) {
    console.error("Error fetching medical visits:", error)
    return res.status(500).json({ error: "Lỗi khi tải lịch sử khám" })
  }
}

exports.createVisit = async (req, res) => {
  try {
    const requesterId = parseId(req.user.user_id)
    const requester = await getRequesterContext(requesterId)
    if (!requester) return res.status(401).json({ error: "Không xác thực được người dùng" })

    const targetUserId = req.body.user_id ? parseId(req.body.user_id) : parseId(req.body.patient_id) || requesterId
    if (!Number.isInteger(targetUserId)) {
      return res.status(400).json({ error: "user_id không hợp lệ" })
    }

    const isDoctor = requester.roleText === "bác sĩ"
    if (isDoctor) {
      const canManage = await hasAcceptedAccess(targetUserId, requesterId)
      if (!canManage) {
        return res.status(403).json({ error: "Bạn không có quyền cập nhật bệnh sử cho bệnh nhân này" })
      }
    } else if (targetUserId !== requesterId) {
      return res.status(403).json({ error: "Bạn chỉ được cập nhật bệnh sử của chính mình" })
    }

    const {
      facility,
      doctor_name,
      visit_date,
      diagnosis,
      reason,
      diagnosis_details,
      tests,
      prescription,
      appointment
    } = req.body

    if (!diagnosis) {
       return res.status(400).json({ error: "Tên chẩn đoán (diagnosis) là bắt buộc" })
    }

    const newVisit = await prisma.medicalVisit.create({
      data: {
        user_id: targetUserId,
        doctor_id: isDoctor ? requesterId : null,
        facility,
        doctor_name,
        visit_date: visit_date ? new Date(visit_date) : new Date(),
        diagnosis,
        reason,
        diagnosis_details,
        tests: tests || null,
        prescription: prescription || null,
        appointment
      },
      include: {
        doctor: { select: { user_id: true, name: true, email: true, role: true } },
      },
    })

    return res.status(201).json({
      message: "Thêm lịch sử khám thành công",
      data: mapVisitForResponse(newVisit),
    })
  } catch (error) {
    console.error("Error creating medical visit:", error)
    return res.status(500).json({ error: "Lỗi khi thêm lịch sử khám" })
  }
}

exports.updateVisit = async (req, res) => {
  try {
    const requesterId = parseId(req.user.user_id)
    const visitId = parseId(req.params.visit_id)
    const requester = await getRequesterContext(requesterId)

    const visit = await prisma.medicalVisit.findUnique({
      where: { visit_id: visitId }
    })

    if (!visit) {
      return res.status(404).json({ error: "Không tìm thấy lịch sử khám" })
    }

    const isDoctor = requester?.roleText === "bác sĩ"
    const isPatientOwner = visit.user_id === requesterId

    if (isDoctor) {
      const canManage = await hasAcceptedAccess(visit.user_id, requesterId)
      if (!canManage) {
        return res.status(403).json({ error: "Bạn không có quyền cập nhật lịch sử khám này" })
      }
    } else if (!isPatientOwner) {
      return res.status(403).json({ error: "Bạn không có quyền cập nhật lịch sử khám này" })
    }

    const {
      facility,
      doctor_name,
      visit_date,
      diagnosis,
      reason,
      diagnosis_details,
      tests,
      prescription,
      appointment
    } = req.body

    const updatedVisit = await prisma.medicalVisit.update({
      where: { visit_id: visitId },
      data: {
        facility,
        doctor_name,
        visit_date: visit_date ? new Date(visit_date) : undefined,
        diagnosis,
        reason,
        diagnosis_details,
        tests: tests || undefined,
        prescription: prescription || undefined,
        appointment
      },
      include: {
        doctor: { select: { user_id: true, name: true, email: true, role: true } },
      },
    })

    return res.json({
      message: "Cập nhật lịch sử khám thành công",
      data: mapVisitForResponse(updatedVisit),
    })
  } catch (error) {
    console.error("Error updating medical visit:", error)
    return res.status(500).json({ error: "Lỗi khi cập nhật lịch sử khám" })
  }
}

exports.deleteVisit = async (req, res) => {
  try {
    const requesterId = parseId(req.user.user_id)
    const visitId = parseId(req.params.visit_id)
    const requester = await getRequesterContext(requesterId)

    const visit = await prisma.medicalVisit.findUnique({
      where: { visit_id: visitId },
    })

    if (!visit) {
      return res.status(404).json({ error: "Không tìm thấy bản ghi" })
    }

    const isDoctor = requester?.roleText === "bác sĩ"
    const isPatientOwner = visit.user_id === requesterId

    if (isDoctor) {
      const canManage = await hasAcceptedAccess(visit.user_id, requesterId)
      if (!canManage) {
        return res.status(403).json({ error: "Không có quyền xóa lịch sử này" })
      }
    } else if (!isPatientOwner) {
      return res.status(403).json({ error: "Không có quyền xóa lịch sử này" })
    }

    await prisma.medicalVisit.update({
      where: { visit_id: visitId },
      data: { deleted_at: new Date() },
    })

    return res.json({ message: "Đã xóa (ẩn) lịch sử khám" })
  } catch (error) {
    console.error("Error deleting medical visit:", error)
    return res.status(500).json({ error: "Lỗi khi xóa lịch sử khám" })
  }
}
