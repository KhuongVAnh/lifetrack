const jwt = require("jsonwebtoken")

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || typeof authHeader !== "string") {
    return res.status(401).json({ message: "Thieu token xac thuc" })
  }

  const [scheme, token] = authHeader.split(" ")
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return res.status(401).json({ message: "Token khong hop le" })
  }

  if (!ACCESS_TOKEN_SECRET) {
    console.error("ACCESS_TOKEN_SECRET chua duoc cau hinh")
    return res.status(500).json({ message: "Loi cau hinh he thong" })
  }

  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET)
    if (!decoded?.user_id) {
      return res.status(401).json({ message: "Token khong hop le" })
    }

    req.user = {
      user_id: decoded.user_id,
      email: decoded.email,
      role: decoded.role,
    }
    return next()
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token da het han" })
    }
    return res.status(401).json({ message: "Token khong hop le" })
  }
}

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Chưa xác thực" })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Không có quyền truy cập" })
    }

    next()
  }
}

module.exports = {
  authenticateToken,
  authorizeRoles,
}
