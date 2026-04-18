const express = require("express")
const router = express.Router()
const familyController = require("../controllers/familyController")

// Danh sách bệnh nhân được phép xem
router.get("/patients/:viewer_id", familyController.getAccessiblePatients)

// Xem bệnh sử bệnh nhân
router.get("/history/:patient_id", familyController.getPatientHistory)

module.exports = router
