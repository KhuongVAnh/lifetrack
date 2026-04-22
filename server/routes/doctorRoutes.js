const express = require("express")
const router = express.Router()
const doctorController = require("../controllers/doctorController")
const { authenticateToken, authorizeRoles } = require("../middleware/auth")

/**
 * API portal bác sĩ cần token để controller kiểm tra đúng bác sĩ hiện tại.
 */
router.use(authenticateToken)

// Lấy danh sách bệnh nhân được phép xem
router.get("/patients/:viewer_id", doctorController.getAccessiblePatients)

// Lấy bệnh sử của 1 bệnh nhân
router.get("/history/:patient_id", doctorController.getPatientHistory)

// Thêm bản ghi bệnh sử mới
router.post("/history", doctorController.addDiagnosis)

// Xóa bản ghi bệnh sử
router.delete("/history/:id", doctorController.deleteDiagnosis)

// Cập nhật bản ghi bệnh sử
router.put("/history/:id", doctorController.updateDiagnosis)


module.exports = router
