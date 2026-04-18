const express = require("express")
const { createAlert, getUserAlerts, resolveAlert, getAllAlerts } = require("../controllers/alertController")
const { authenticateToken, authorizeRoles } = require("../middleware/auth")

const router = express.Router()

// Tạo cảnh báo mới
router.post("/", authenticateToken, authorizeRoles("admin", "bác sĩ"), createAlert)

// Lấy cảnh báo của người dùng
router.get("/:user_id", authenticateToken, getUserAlerts)

// Đánh dấu cảnh báo đã xử lý
router.put("/:id/resolve", authenticateToken, resolveAlert)

// Lấy tất cả cảnh báo (admin, bác sĩ)
router.get("/", authenticateToken, authorizeRoles("admin", "bác sĩ"), getAllAlerts)

module.exports = router
