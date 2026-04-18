// Controller xử lý đăng ký, đăng nhập và xác thực thông tin người dùng.
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const prisma = require("../prismaClient")
const { toPrismaUserRole, fromPrismaUserRole } = require("../utils/enumMappings")
const { hashPass } = require("../services/authService")
const { createHash, randomBytes } = require("crypto")

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || "15m"
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || "7d"

// Hàm xử lý lưu refresh token đã được hash vào database để quản lý và xác thực khi cần thiết.
const hashToken = (value) => createHash("sha256").update(value).digest("hex")

const parseDurationToMs = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed)
  }

  const match = trimmed.match(/^(\d+)(ms|s|m|h|d)$/i)
  if (!match) {
    return null
  }

  const amount = Number(match[1])
  const unit = match[2].toLowerCase()
  const multipliers = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  }

  return amount * multipliers[unit]
}

const ensureAuthSecretsConfigured = () => {
  if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
    const error = new Error("ACCESS_TOKEN_SECRET hoặc REFRESH_TOKEN_SECRET chưa được cấu hình")
    error.code = "AUTH_CONFIG_MISSING"
    throw error
  }
}

const getRefreshCookieMaxAge = () => {
  return parseDurationToMs(REFRESH_TOKEN_EXPIRES_IN) || 7 * 24 * 60 * 60 * 1000
}

const getRefreshCookieBaseOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production", // true = cookie chỉ được gửi qua HTTPS, false cho phép gửi qua HTTP
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // none = 
  path: "/api/auth", // chỉ gửi cookie này cho các request đến endpoint /api/auth
})

// Hàm xây dựng payload người dùng cho token từ đối tượng user trong database.
const buildUserPayload = (user) => ({
  user_id: user.user_id,
  email: user.email,
  role: fromPrismaUserRole(user.role),
})

// Hàm tạo access token JWT với payload người dùng và thời gian hết hạn.
const generateAccessToken = (user) => {
  ensureAuthSecretsConfigured()
  return jwt.sign(buildUserPayload(user), ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  })
}

// Hàm tạo refresh token JWT với payload người dùng, loại token và nonce để tăng cường bảo mật.
const generateRefreshToken = (user) => {
  ensureAuthSecretsConfigured()
  return jwt.sign(
    {
      ...buildUserPayload(user),
      type: "refresh",
      nonce: randomBytes(16).toString("hex"), // Chuỗi random (32 ký tự hex) => các refresh token cùng user_id sẽ khác nhau, tránh bị trùng lặp token khi đăng nhập nhiều lần và tăng cường bảo mật
    },
    REFRESH_TOKEN_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  )
}

// Hàm lấy options cho cookie refresh token, bao gồm các thuộc tính bảo mật và thời gian hết hạn.
const getRefreshCookieOptions = () => ({
  ...getRefreshCookieBaseOptions(),
  maxAge: getRefreshCookieMaxAge(),
})

const getRefreshCookieClearOptions = () => ({
  ...getRefreshCookieBaseOptions(),
})

// Hàm thiết lập cookie refresh token trong response.
const setRefreshCookie = (res, refreshToken) => {
  res.cookie("refresh_token", refreshToken, getRefreshCookieOptions()) // tên cookie là refresh_token, giá trị là refreshToken
}

// Hàm xóa cookie refresh token khỏi trình duyệt.
const clearRefreshCookie = (res) => {
  res.clearCookie("refresh_token", getRefreshCookieClearOptions())
}

// Hàm lưu refresh token đã được hash vào database
const saveRefreshToken = async (userId, refreshToken) => {
  const decoded = jwt.decode(refreshToken)
  if (!decoded?.exp) {
    throw new Error("Không thể giải mã refresh token")
  }

  await prisma.refreshToken.create({
    data: {
      user_id: userId,
      token_hash: hashToken(refreshToken),
      expires_at: new Date(decoded.exp * 1000),
    },
  })
}

// Hàm xử lý tạo và cấp access token và refresh token cho người dùng sau khi xác thực.
const issueAuthTokens = async (user, res) => {
  const accessToken = generateAccessToken(user)
  const refreshToken = generateRefreshToken(user)

  await saveRefreshToken(user.user_id, refreshToken)
  setRefreshCookie(res, refreshToken)

  return accessToken
}


// Hàm xử lý đăng ký tài khoản mới.
const register = async (req, res) => {
  try {
    const { name, email, password, role = "bệnh nhân" } = req.body

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return res.status(400).json({ message: "Email đã được sử dụng" })
    }

    const password_hash = await hashPass(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password_hash,
        role: toPrismaUserRole(role),
      },
    })

    const token = await issueAuthTokens(user, res)

    res.status(201).json({
      message: "Đăng ký thành công",
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: fromPrismaUserRole(user.role),
      },
    })
  } catch (error) {
    console.error("Lỗi đăng ký:", error)
    if (error.code === "AUTH_CONFIG_MISSING") {
      return res.status(500).json({ message: "lỗi cấu hình hệ thống" })
    }
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

// Hàm xử lý đăng nhập và cấp token xác thực.
const login = async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" })
    }

    if (!user.is_active) {
      return res.status(401).json({ message: "Tài khoản đã bị vô hiệu hóa" })
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    if (!isValidPassword) {
      return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" })
    }

    const token = await issueAuthTokens(user, res)

    res.json({
      message: "Đăng nhập thành công",
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: fromPrismaUserRole(user.role),
      },
    })
  } catch (error) {
    console.error("Lỗi đăng nhập:", error)
    if (error.code === "AUTH_CONFIG_MISSING") {
      return res.status(500).json({ message: "Loi cau hinh he thong" })
    }
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

// Hàm xử lý làm mới access token bằng refresh token.
const refresh = async (req, res) => {
  try {
    ensureAuthSecretsConfigured()

    const refreshToken = req.cookies?.refresh_token
    if (!refreshToken) {
      return res.status(401).json({ message: "Khong co refresh token" })
    }

    let decoded
    try {
      decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET)
    } catch (_error) {
      clearRefreshCookie(res)
      return res.status(401).json({ message: "Refresh token khong hop le" })
    }

    if (decoded?.type !== "refresh") {
      clearRefreshCookie(res)
      return res.status(401).json({ message: "Refresh token khong hop le" })
    }

    const savedToken = await prisma.refreshToken.findUnique({
      where: { token_hash: hashToken(refreshToken) },
    })

    if (!savedToken || savedToken.revoked_at || savedToken.expires_at < new Date()) {
      clearRefreshCookie(res)
      return res.status(401).json({ message: "Refresh token da het han hoac da bi thu hoi" })
    }

    const user = await prisma.user.findUnique({
      where: { user_id: Number(decoded.user_id) },
    })

    if (!user || !user.is_active) {
      clearRefreshCookie(res)
      return res.status(401).json({ message: "Nguoi dung khong hop le" })
    }

    // thu hồi refresh token cũ rồi cấp refresh token 7 ngày mới => dưới 7 ngày dùng web 1 lần thì ko bao giờ phải đăng nhập
    await prisma.refreshToken.update({
      where: { token_id: savedToken.token_id },
      data: { revoked_at: new Date() },
    })

    const token = await issueAuthTokens(user, res)

    return res.json({
      message: "Lam moi token thanh cong",
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: fromPrismaUserRole(user.role),
      },
    })
  } catch (error) {
    console.error("Loi refresh token:", error)
    if (error.code === "AUTH_CONFIG_MISSING") {
      return res.status(500).json({ message: "Loi cau hinh he thong" })
    }
    return res.status(500).json({ message: "Loi server noi bo" })
  }
}

const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refresh_token

    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: {
          token_hash: hashToken(refreshToken),
          revoked_at: null,
        },
        data: { revoked_at: new Date() },
      })
    }

    clearRefreshCookie(res)
    return res.json({ message: "Đăng xuất thành công" })
  } catch (error) {
    console.error("Lỗi đăng xuất:", error)
    return res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

// Hàm xử lý lấy thông tin tài khoản đang đăng nhập.
const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { user_id: Number.parseInt(req.user.user_id, 10) },
      select: {
        user_id: true,
        name: true,
        email: true,
        role: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
    })

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" })
    }

    res.json({
      user: {
        ...user,
        role: fromPrismaUserRole(user.role),
      },
    })
  } catch (error) {
    console.error("Lỗi lấy thông tin người dùng:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

module.exports = {
  register,
  login,
  getMe,
  refresh,
  logout,
}
