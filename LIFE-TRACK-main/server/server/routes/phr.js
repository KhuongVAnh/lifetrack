const express = require("express")
const path = require("path")
const multer = require("multer")
const { authenticateToken } = require("../middleware/auth")
const phrController = require("../controllers/phrController")
const { UPLOAD_DIR } = require("../services/medicalDocumentStoreService")

const router = express.Router()

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, UPLOAD_DIR)
  },
  filename: (_req, file, callback) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".bin"
    const safeName = `doc-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`
    callback(null, safeName)
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    const mimeType = (file.mimetype || "").toLowerCase()
    const isAllowed =
      mimeType.startsWith("image/") ||
      mimeType === "application/pdf"

    if (!isAllowed) {
      const error = new Error("UNSUPPORTED_DOCUMENT_TYPE")
      error.status = 400
      callback(error)
      return
    }

    callback(null, true)
  },
})

router.post("/intake", authenticateToken, phrController.createIntake)
router.get("/intake/latest", authenticateToken, phrController.getLatestIntake)
router.post(
  "/documents/upload",
  authenticateToken,
  (req, res, next) => {
    upload.single("file")(req, res, (error) => {
      if (!error) {
        return next()
      }

      if (error.message === "UNSUPPORTED_DOCUMENT_TYPE") {
        return res.status(400).json({ message: "Chỉ hỗ trợ file PDF hoặc ảnh y tế" })
      }

      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "Dung lượng file vượt quá 20MB" })
      }

      return res.status(400).json({ message: "Không thể tải file tài liệu" })
    })
  },
  phrController.uploadMedicalDocument
)
router.get("/documents", authenticateToken, phrController.getMedicalDocuments)
router.get("/history", authenticateToken, phrController.getPhrHistory)

module.exports = router
