const express = require("express")
const { registerDevice, getUserDevices, updateDeviceStatus, getAllDevices } = require("../controllers/deviceController")
const { authenticateToken, authorizeRoles } = require("../middleware/auth")

const router = express.Router()

// Đăng ký thiết bị mới
router.post("/register", authenticateToken, authorizeRoles("admin", "bệnh nhân"), registerDevice)

// Lấy thiết bị của người dùng
router.get("/:user_id", authenticateToken, getUserDevices)

// Cập nhật trạng thái thiết bị
router.put("/:id/status", authenticateToken, authorizeRoles("admin", "bệnh nhân"), updateDeviceStatus)

// Lấy tất cả thiết bị (admin)
router.get("/", authenticateToken, authorizeRoles("admin"), getAllDevices)

module.exports = router
