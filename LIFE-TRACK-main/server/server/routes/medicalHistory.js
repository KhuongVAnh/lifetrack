const express = require("express");
const router = express.Router();
const historyController = require("../controllers/medicalHistoryController");
const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/auth");


// Xem toàn bộ bệnh sử của 1 bệnh nhân
router.get("/:user_id", authenticateToken, historyController.getHistories);

// Bác sĩ thêm bệnh sử
router.post("/", authenticateToken, historyController.createHistory);

// Cập nhật bệnh sử
router.put("/:id", authenticateToken, historyController.updateHistory);

// Bệnh nhân thêm triệu chứng
router.post("/:id/symptom", authenticateToken, historyController.addSymptom);

// AI cập nhật chẩn đoán
router.patch("/:id/ai", historyController.updateAIResult);

// Xóa bệnh sử (soft delete)
router.delete("/:id", authenticateToken, historyController.deleteHistory);

module.exports = router;
