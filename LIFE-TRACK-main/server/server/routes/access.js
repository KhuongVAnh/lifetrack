const express = require("express");
const router = express.Router();
const accessController = require("../controllers/accessController");
const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/auth"); 

// Bệnh nhân gửi yêu cầu chia sẻ quyền
router.post("/share", authenticateToken, accessController.shareAccess);

// Viewer phản hồi (accept/reject)
router.put("/respond/:id", authenticateToken, accessController.respondAccess);

// Bệnh nhân xem danh sách người có quyền
router.get("/list/:patient_id", authenticateToken, accessController.listAccess);

// Thu hồi quyền
router.delete("/:id", authenticateToken, accessController.revokeAccess);

// Lấy danh sách yêu cầu đang chờ xử lý
router.get("/pending", authenticateToken, accessController.getPendingRequests)

module.exports = router;
