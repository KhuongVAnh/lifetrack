const express = require("express");
const router = express.Router();
const phrController = require("../controllers/phrController");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");

// ==== PHR Overview (Tổng quan sức khỏe) ====
// Xem tổng quan
router.get("/overview/:user_id", authenticateToken, phrController.getOverview);
// Sửa/Tạo tổng quan
router.put("/overview/:user_id", authenticateToken, phrController.upsertOverview);

// ==== PHR Visits (Lịch sử khám bệnh) ====
// Xem danh sách khám
router.get("/visits/:user_id", authenticateToken, phrController.getVisits);
// Bác sĩ / Bệnh nhân thêm lịch sử khám mới
router.post("/visits", authenticateToken, phrController.createVisit);
// Cập nhật chi tiết lịch sử khám
router.put("/visits/:visit_id", authenticateToken, phrController.updateVisit);
// Xóa (ẩn) lịch sử khám
router.delete("/visits/:visit_id", authenticateToken, phrController.deleteVisit);

module.exports = router;
