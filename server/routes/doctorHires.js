const express = require("express")
const {
  approveDoctorHire,
  cancelDoctorHire,
  listDoctorHireRequests,
  listMyDoctorHires,
  rejectDoctorHire,
  requestDoctorHire,
  updateDoctorHireAccess,
} = require("../controllers/doctorHireController")
const { authenticateToken } = require("../middleware/auth")

const router = express.Router()

/**
 * Tất cả API thuê bác sĩ yêu cầu đăng nhập để xác định bệnh nhân hoặc bác sĩ hiện tại.
 */
router.use(authenticateToken)

// Bệnh nhân lấy danh sách bác sĩ đã gửi thuê hoặc đang active.
router.get("/my", listMyDoctorHires)

// Bác sĩ lấy danh sách yêu cầu thuê gửi đến mình.
router.get("/requests", listDoctorHireRequests)

// Bệnh nhân gửi yêu cầu thuê bác sĩ.
router.post("/", requestDoctorHire)

// Bệnh nhân bật/tắt quyền xem hồ sơ cho bác sĩ đang thuê.
router.patch("/:id/access", updateDoctorHireAccess)

// Bệnh nhân hủy yêu cầu thuê hoặc quan hệ đang active.
router.patch("/:id/cancel", cancelDoctorHire)

// Bác sĩ duyệt hoặc từ chối yêu cầu thuê.
router.patch("/:id/approve", approveDoctorHire)
router.patch("/:id/reject", rejectDoctorHire)

module.exports = router
