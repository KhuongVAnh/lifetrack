const express = require("express")
const familyController = require("../controllers/familyController")
const { authenticateToken } = require("../middleware/auth")

const router = express.Router()

router.get("/patients/me", authenticateToken, familyController.getMyAccessiblePatients)
router.get("/patients/:patientId/summary", authenticateToken, familyController.getFamilyPatientSummary)

// Legacy routes kept for compatibility with older clients.
router.get("/patients/:viewer_id", familyController.getAccessiblePatients)
router.get("/history/:patient_id", familyController.getPatientHistory)

module.exports = router
