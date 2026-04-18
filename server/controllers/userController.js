// Controller xử lý quản lý tài khoản người dùng và thông tin hồ sơ.
const bcrypt = require("bcrypt")
const prisma = require("../prismaClient")
const { toPrismaUserRole, fromPrismaUserRole } = require("../utils/enumMappings")

// Hàm xử lý lấy danh sách người dùng trong hệ thống.
const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { created_at: "desc" },
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

    const mappedUsers = users.map((user) => ({
      ...user,
      role: fromPrismaUserRole(user.role),
    }))

    res.json({ users: mappedUsers })
  } catch (error) {
    console.error("Lỗi lấy danh sách người dùng:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

// Hàm xử lý cập nhật thông tin người dùng.
const updateUser = async (req, res) => {
  try {
    const { id } = req.params
    const { name, email, role, is_active } = req.body
    const userId = Number.parseInt(id, 10)

    const user = await prisma.user.findUnique({ where: { user_id: userId } })
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" })
    }

    if (email && email != user.email) {
      const existingUser = await prisma.user.findUnique({ where: { email } })
      if (existingUser) {
        return res.status(400).json({ message: "Email đã được sử dụng" })
      }
    }

    const data = {}
    if (name !== undefined) data.name = name
    if (email !== undefined) data.email = email
    if (role !== undefined) data.role = toPrismaUserRole(role)
    if (is_active !== undefined) data.is_active = is_active

    const updatedUser = await prisma.user.update({
      where: { user_id: userId },
      data,
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

    res.json({
      message: "Cập nhật người dùng thành công",
      user: {
        ...updatedUser,
        role: fromPrismaUserRole(updatedUser.role),
      },
    })
  } catch (error) {
    console.error("Lỗi cập nhật người dùng:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

// Hàm xử lý xóa tài khoản người dùng.
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params
    const userId = Number.parseInt(id, 10)

    const user = await prisma.user.findUnique({ where: { user_id: userId } })
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" })
    }

    if (user.user_id === Number.parseInt(req.user.user_id, 10)) {
      return res.status(400).json({ message: "Không thể xóa chính mình" })
    }

    await prisma.user.delete({ where: { user_id: userId } })

    res.json({ message: "Xóa người dùng thành công" })
  } catch (error) {
    console.error("Lỗi xóa người dùng:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

// Hàm xử lý đổi mật khẩu người dùng.
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    const userId = Number.parseInt(req.user.user_id, 10)

    const user = await prisma.user.findUnique({ where: { user_id: userId } })
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" })
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash)
    if (!isValidPassword) {
      return res.status(400).json({ message: "Mật khẩu hiện tại không đúng" })
    }

    const saltRounds = 10
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds)

    await prisma.user.update({
      where: { user_id: userId },
      data: { password_hash: newPasswordHash },
    })

    res.json({ message: "Đổi mật khẩu thành công" })
  } catch (error) {
    console.error("Lỗi đổi mật khẩu:", error)
    res.status(500).json({ message: "Lỗi server nội bộ" })
  }
}

module.exports = {
  getAllUsers,
  updateUser,
  deleteUser,
  changePassword,
}
