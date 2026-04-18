// Controller xử lý tạo và truy vấn báo cáo y khoa.
const prisma = require("../prismaClient")

// Hàm xử lý tạo báo cáo y khoa cho bệnh nhân.
const createReport = async (req, res) => {
  try {
    const { user_id } = req.params
    const { summary } = req.body
    const doctor_id = Number.parseInt(req.user.user_id, 10)
    const userId = Number.parseInt(user_id, 10)

    const patient = await prisma.user.findUnique({ where: { user_id: userId } })
    if (!patient) {
      return res.status(404).json({ message: "Không tìm thấy bệnh nhân" })
    }

    const report = await prisma.report.create({
      data: {
        user_id: userId,
        doctor_id,
        summary,
      },
    })

    const reportWithDetails = await prisma.report.findUnique({
      where: { report_id: report.report_id },
      include: {
        patient: { select: { name: true, email: true } },
        doctor: { select: { name: true, email: true } },
      },
    })

    res.status(201).json({
      message: "Tạo báo cáo thành công",
      report: reportWithDetails,
    })
  } catch (error) {
    console.error("Lỗi tạo báo cáo:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

// Hàm xử lý lấy danh sách báo cáo của bệnh nhân.
const getUserReports = async (req, res) => {
  try {
    const { user_id } = req.params
    const userId = Number.parseInt(user_id, 10)

    const reports = await prisma.report.findMany({
      where: { user_id: userId },
      include: {
        doctor: { select: { name: true, email: true } },
      },
      orderBy: { created_at: "desc" },
    })

    res.json({ reports })
  } catch (error) {
    console.error("Lỗi lấy báo cáo:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

// Hàm xử lý lấy danh sách báo cáo do bác sĩ tạo.
const getDoctorReports = async (req, res) => {
  try {
    const doctor_id = Number.parseInt(req.user.user_id, 10)
    const isAdmin = req.user.role === "admin"

    const reports = await prisma.report.findMany({
      where: isAdmin ? {} : { doctor_id },
      include: {
        patient: { select: { name: true, email: true } },
        doctor: { select: { name: true, email: true } },
      },
      orderBy: { created_at: "desc" },
    })

    res.json({ reports })
  } catch (error) {
    console.error("Lỗi lấy báo cáo bác sĩ:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

module.exports = {
  createReport,
  getUserReports,
  getDoctorReports,
}
