const express = require("express")
const { register, login, getMe, refresh, logout } = require("../controllers/authController")
const { authenticateToken } = require("../middleware/auth")

const router = express.Router()

// Đăng ký
router.post("/register", register)

// Đăng nhập
router.post("/login", login)

// Làm mới token
router.post("/refresh", refresh)

// Đăng xuất
router.post("/logout", logout)

// Lấy thông tin người dùng hiện tại
router.get("/me", authenticateToken, getMe)

module.exports = router
