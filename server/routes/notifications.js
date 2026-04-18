const express = require("express")
const {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} = require("../controllers/notificationController")
const { authenticateToken } = require("../middleware/auth")

const router = express.Router()

router.get("/", authenticateToken, getNotifications)
router.get("/unread-count", authenticateToken, getUnreadCount)
router.put("/read-all", authenticateToken, markAllNotificationsRead)
router.put("/:notification_id/read", authenticateToken, markNotificationRead)

module.exports = router
