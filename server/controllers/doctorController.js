// Controller xử lý danh sách bệnh nhân mà bác sĩ được cấp quyền theo dõi.
const prisma = require("../prismaClient")
const { DoctorHireStatus } = require("@prisma/client")
const {
  canDoctorWritePatientDomain,
  canViewPatientDomain,
} = require("../services/patientDoctorAccessService")

// Hàm xử lý lấy danh sách bệnh nhân được phép theo dõi.
exports.getAccessiblePatients = async (req, res) => {
  try {
    const viewer_id = Number.parseInt(req.params.viewer_id, 10)

    // Danh sách bệnh nhân của bác sĩ lấy từ quan hệ thuê active, không còn lấy từ AccessPermission.
    const doctorHires = await prisma.doctorHire.findMany({
      where: { doctor_id: viewer_id, status: DoctorHireStatus.ACTIVE },
      include: {
        patient: {
          select: {
            user_id: true,
            name: true,
            email: true,
            is_active: true,
            created_at: true,
          },
        },
      },
    })

    return res.status(200).json(doctorHires)
  } catch (err) {
    console.error("Lỗi getAccessiblePatients:", err)
    res.status(500).json({ error: "Lỗi khi lấy danh sách bệnh nhân" })
  }
}

// Hàm xử lý lấy bệnh sử của bệnh nhân được cấp quyền.
exports.getPatientHistory = async (req, res) => {
  try {
    const patient_id = Number.parseInt(req.params.patient_id, 10)
    const doctor_id = Number.parseInt(req.user?.user_id || req.query.doctor_id, 10)

    // Bác sĩ chỉ được xem bệnh sử nếu bệnh nhân đang thuê và bật quyền EHR.
    if (Number.isInteger(doctor_id)) {
      const canView = await canViewPatientDomain({ patientId: patient_id, viewerId: doctor_id, domain: "ehr" })
      if (!canView) {
        return res.status(403).json({ error: "Không có quyền xem bệnh sử bệnh nhân" })
      }
    }

    const histories = await prisma.medicalVisit.findMany({
      where: { user_id: patient_id, deleted_at: null },
      include: {
        doctor: { select: { user_id: true, name: true, email: true } },
      },
      orderBy: { visit_date: "desc" },
    })

    return res.status(200).json(histories)
  } catch (err) {
    console.error("Lỗi getPatientHistory:", err)
    res.status(500).json({ error: "Không thể tải bệnh sử" })
  }
}

// Hàm xử lý thêm chẩn đoán mới cho bệnh sử bệnh nhân.
exports.addDiagnosis = async (req, res) => {
  try {
    const { patient_id, doctor_id, doctor_diagnosis, medication, condition, notes, diagnosis } = req.body
    const requesterDoctorId = Number.parseInt(req.user?.user_id || doctor_id, 10)

    // Bác sĩ chỉ được thêm chẩn đoán nếu có quyền ghi EHR cho bệnh nhân.
    const canWrite = await canDoctorWritePatientDomain({
      patientId: Number.parseInt(patient_id, 10),
      doctorId: requesterDoctorId,
      domain: "ehr",
    })
    if (!canWrite) {
      return res.status(403).json({ error: "Không có quyền cập nhật bệnh sử bệnh nhân" })
    }

    const newRecord = await prisma.medicalVisit.create({
      data: {
        user_id: Number.parseInt(patient_id, 10),
        doctor_id: doctor_id ? Number.parseInt(doctor_id, 10) : null,
        diagnosis: diagnosis || "Chẩn đoán y khoa",
        diagnosis_details: doctor_diagnosis,
        prescription: medication ? { notes: medication } : null,
        reason: condition,
        appointment: notes,
      },
    })

    return res
      .status(201)
      .json({ message: "Đã thêm bản ghi bệnh sử", data: newRecord })
  } catch (err) {
    console.error("Lỗi addDiagnosis:", err)
    res.status(500).json({ error: "Không thể thêm bản ghi" })
  }
}

// Hàm xử lý ẩn bản ghi chẩn đoán trong bệnh sử.
exports.deleteDiagnosis = async (req, res) => {
  try {
    const historyId = Number.parseInt(req.params.id, 10)

    await prisma.medicalVisit.update({
      where: { visit_id: historyId },
      data: { deleted_at: new Date() },
    })

    res.json({ message: "Đã xóa bệnh sử" })
  } catch (err) {
    console.error("Lỗi deleteDiagnosis:", err)
    res.status(500).json({ error: "Không thể xóa" })
  }
}

// Hàm xử lý cập nhật nội dung chẩn đoán của bác sĩ.
exports.updateDiagnosis = async (req, res) => {
  try {
    const historyId = Number.parseInt(req.params.id, 10)
    const { doctor_diagnosis, medication, condition, notes, diagnosis } = req.body

    const record = await prisma.medicalVisit.findUnique({
      where: { visit_id: historyId },
    })
    if (!record) {
      return res
        .status(404)
        .json({ error: "Không tìm thấy bệnh sử cần sửa" })
    }

    const updatedRecord = await prisma.medicalVisit.update({
      where: { visit_id: historyId },
      data: {
        diagnosis: diagnosis || record.diagnosis,
        diagnosis_details: doctor_diagnosis,
        prescription: medication ? { notes: medication } : record.prescription,
        reason: condition,
        appointment: notes,
      },
    })

    return res.status(200).json({
      message: "Đã cập nhật bệnh sử thành công",
      data: updatedRecord,
    })
  } catch (err) {
    console.error("Lỗi updateDiagnosis:", err)
    res.status(500).json({ error: "Không thể cập nhật bệnh sử" })
  }
}
