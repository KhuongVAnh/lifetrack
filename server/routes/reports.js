const express = require("express")
const { createReport, getUserReports, getDoctorReports } = require("../controllers/reportController")
const { authenticateToken, authorizeRoles } = require("../middleware/auth")

const DOCTOR_ROLE = "bác sĩ"

const router = express.Router()

// Tạo báo cáo cho bệnh nhân (chỉ bác sĩ)
router.post("/:user_id", authenticateToken, authorizeRoles(DOCTOR_ROLE), createReport)

// Lấy báo cáo của một bệnh nhân
router.get("/:user_id", authenticateToken, getUserReports)

// Lấy báo cáo do bác sĩ tạo, hoặc toàn bộ báo cáo nếu là admin
router.get("/doctor/my-reports", authenticateToken, authorizeRoles(DOCTOR_ROLE, "admin"), getDoctorReports)

module.exports = router
