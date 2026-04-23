const express = require("express")
const {
  listDoctorCatalog,
  getDoctorProfile,
  getDoctorReviews,
  getMyDoctorReview,
  getMyDoctorProfile,
  upsertMyDoctorProfile,
  createMyDoctorReview,
  updateMyDoctorReview,
  deleteMyDoctorReview,
} = require("../controllers/doctorProfileController")
const { authenticateToken } = require("../middleware/auth")

const router = express.Router()

/**
 * Các API catalog bác sĩ đều yêu cầu đăng nhập để trả kèm trạng thái thuê theo user hiện tại.
 */
router.use(authenticateToken)

// Lấy danh sách bác sĩ hệ thống cho màn thuê bác sĩ và đặt lịch.
router.get("/catalog", listDoctorCatalog)
router.get("/me/profile", getMyDoctorProfile)
router.put("/me/profile", upsertMyDoctorProfile)
router.get("/:doctorId/reviews", getDoctorReviews)
router.get("/:doctorId/reviews/me", getMyDoctorReview)
router.post("/:doctorId/reviews/me", createMyDoctorReview)
router.patch("/:doctorId/reviews/me", updateMyDoctorReview)
router.delete("/:doctorId/reviews/me", deleteMyDoctorReview)
router.get("/:doctorId/profile", getDoctorProfile)

module.exports = router
