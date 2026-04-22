const express = require("express")
const { listDoctorCatalog } = require("../controllers/doctorHireController")
const { authenticateToken } = require("../middleware/auth")

const router = express.Router()

/**
 * Các API catalog bác sĩ đều yêu cầu đăng nhập để trả kèm trạng thái thuê theo user hiện tại.
 */
router.use(authenticateToken)

// Lấy danh sách bác sĩ hệ thống cho màn thuê bác sĩ và đặt lịch.
router.get("/catalog", listDoctorCatalog)

module.exports = router
