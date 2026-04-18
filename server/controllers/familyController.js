// Controller xử lý danh sách bệnh nhân mà người thân được cấp quyền theo dõi.
const prisma = require("../prismaClient")

// Hàm xử lý lấy danh sách bệnh nhân được phép theo dõi.
exports.getAccessiblePatients = async (req, res) => {
  try {
    const viewer_id = Number.parseInt(req.params.viewer_id, 10)

    const accessPermissions = await prisma.accessPermission.findMany({
      where: { viewer_id, status: "accepted" },
      include: {
        patient: { select: { user_id: true, name: true, email: true } },
      },
    })

    return res.status(200).json(accessPermissions)
  } catch (err) {
    console.error("Lỗi getAccessiblePatients:", err)
    res.status(500).json({ error: "Lỗi khi lấy danh sách bệnh nhân" })
  }
}

// Hàm xử lý lấy bệnh sử của bệnh nhân được cấp quyền.
exports.getPatientHistory = async (req, res) => {
  try {
    const patient_id = Number.parseInt(req.params.patient_id, 10)

    const histories = await prisma.medicalHistory.findMany({
      where: { user_id: patient_id, deleted_at: null },
      include: {
        doctor: { select: { user_id: true, name: true, email: true } },
      },
      orderBy: { created_at: "desc" },
    })

    return res.status(200).json(histories)
  } catch (err) {
    console.error("Lỗi getPatientHistory:", err)
    res.status(500).json({ error: "Không thể tải bệnh sử" })
  }
}
