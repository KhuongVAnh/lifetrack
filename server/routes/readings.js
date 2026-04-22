const express = require("express")
const {
  createFakeReading,
  getDeviceReadings,
  getUserReadingHistory,
  receiveTelemetry,
  getReadingDetail,
} = require("../controllers/readingController")
const { authenticateToken } = require("../middleware/auth")

const router = express.Router()

// Route cho ESP32 gửi dữ liệu
router.post("/telemetry", receiveTelemetry);

// Tạo dữ liệu đọc giả lập
router.post("/fake", authenticateToken, createFakeReading)

// Lấy chi tiết reading theo `reading_id`
router.get("/detail/:reading_id", authenticateToken, getReadingDetail)

// Lấy lịch sử đọc của người dùng
router.get("/history/:user_id", authenticateToken, getUserReadingHistory)

// Lấy dữ liệu đọc của thiết bị
router.get("/:device_id", authenticateToken, getDeviceReadings)

module.exports = router
