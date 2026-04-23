const express = require("express")
const {
  getDoctorPortalDashboard,
  getDoctorPortalPatients,
  getDoctorPortalEmrWorkspace,
  createDoctorPortalConsultation,
} = require("../controllers/doctorPortalController")
const { authenticateToken, authorizeRoles } = require("../middleware/auth")

const router = express.Router()

router.use(authenticateToken)
router.use(authorizeRoles("bác sĩ"))

router.get("/dashboard", getDoctorPortalDashboard)
router.get("/patients", getDoctorPortalPatients)
router.get("/emr/workspace/:patientId", getDoctorPortalEmrWorkspace)
router.post("/emr/consultations", createDoctorPortalConsultation)

module.exports = router
