const express = require("express")
const {
  chatWithGemini,
  getChatHistory,
  getDirectChatContacts,
  getDirectMessages,
  sendDirectMessage,
  markDirectMessagesRead,
} = require("../controllers/chatController")
const { authenticateToken } = require("../middleware/auth")

const router = express.Router()

// Chat với Gemini AI
router.post("/", authenticateToken, chatWithGemini)

// Lấy lịch sử chat AI
router.get("/history", authenticateToken, getChatHistory)

// Danh sách contact direct chat bác sĩ - bệnh nhân
router.get("/contacts", authenticateToken, getDirectChatContacts)

// Lấy lịch sử chat direct với 1 user cụ thể
router.get("/direct/:other_user_id", authenticateToken, getDirectMessages)

// Gửi tin nhắn direct
router.post("/direct", authenticateToken, sendDirectMessage)

// Đánh dấu đọc tin nhắn direct từ 1 user
router.put("/direct/:other_user_id/read", authenticateToken, markDirectMessagesRead)

module.exports = router
