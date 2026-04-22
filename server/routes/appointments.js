const express = require("express")
const {
  getDoctorsForBooking,
  getAvailableSlots,
  createAppointment,
  getAppointments,
  approveAppointment,
  updateStatus,
  getDoctorAvailability,
  replaceDoctorAvailability,
  createDoctorTimeOff,
  deleteDoctorTimeOff,
} = require("../controllers/appointmentController")
const { authenticateToken } = require("../middleware/auth")

const router = express.Router()

/**
 * Tất cả API lịch khám đều yêu cầu đăng nhập.
 * Route cụ thể phải đặt trước route có params để tránh /doctors bị hiểu nhầm là /:id.
 */
router.use(authenticateToken)

// Lấy danh sách bác sĩ thật để bệnh nhân chọn khi đặt lịch.
router.get("/doctors", getDoctorsForBooking)

// Lấy slot khả dụng của bác sĩ theo khoảng ngày.
router.get("/slots", getAvailableSlots)

// Bác sĩ lấy và thay thế cấu hình lịch rảnh lặp lại của chính mình.
router.get("/doctor/availability", getDoctorAvailability)
router.put("/doctor/availability", replaceDoctorAvailability)

// Bác sĩ tạo/xóa khoảng nghỉ hoặc thời gian chặn lịch cụ thể.
router.post("/doctor/time-off", createDoctorTimeOff)
router.delete("/doctor/time-off/:id", deleteDoctorTimeOff)

// Bệnh nhân tạo lịch khám mới.
router.post("/", createAppointment)

// Bệnh nhân/bác sĩ lấy danh sách lịch hẹn theo role hiện tại.
router.get("/", getAppointments)

// Bác sĩ duyệt lịch và cung cấp thông tin cuộc hẹn.
router.patch("/:id/approve", approveAppointment)

// Bệnh nhân/bác sĩ cập nhật trạng thái hợp lệ của lịch hẹn.
router.patch("/:id/status", updateStatus)

module.exports = router
