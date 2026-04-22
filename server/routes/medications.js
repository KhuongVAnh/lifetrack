const express = require("express")
const {
  createMedicationPlan,
  getMedicationLogs,
  getMedicationPlans,
  updateMedicationPlan,
  archiveMedicationPlan,
  markAsTaken,
  markAsSkipped,
} = require("../controllers/medicationController")
const { authenticateToken } = require("../middleware/auth")

const router = express.Router()

/**
 * Tất cả API đơn thuốc và nhắc thuốc đều yêu cầu đăng nhập.
 * Người dùng chỉ thao tác được dữ liệu gắn với user_id của token.
 */
router.use(authenticateToken)

// Tạo và lấy danh sách đơn thuốc.
router.post("/plans", createMedicationPlan)
router.get("/plans", getMedicationPlans)

// Cập nhật hoặc ngưng một đơn thuốc hiện có.
router.put("/plans/:plan_id", updateMedicationPlan)
router.patch("/plans/:plan_id/archive", archiveMedicationPlan)

// Lấy lịch uống thuốc theo khoảng ngày và thao tác từng lượt nhắc.
router.get("/logs", getMedicationLogs)
router.patch("/logs/:log_id/take", markAsTaken)
router.patch("/logs/:log_id/skip", markAsSkipped)

module.exports = router
