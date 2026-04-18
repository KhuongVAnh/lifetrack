const express = require("express")
const { authenticateToken } = require("../middleware/auth")
const emrController = require("../controllers/emrController")

const router = express.Router()

router.get("/workspace/:patient_id", authenticateToken, emrController.getWorkspace)
router.get("/patient-chart/:patient_id", authenticateToken, emrController.getPatientChart)
router.post("/consultations", authenticateToken, emrController.createConsultation)

module.exports = router
