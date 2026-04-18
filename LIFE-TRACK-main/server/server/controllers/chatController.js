// Controller xử lý chat AI và chat trực tiếp giữa bệnh nhân với bác sĩ.
const axios = require("axios")
const { AccessRole, AccessStatus, NotificationType, UserRole } = require("@prisma/client")
const prisma = require("../prismaClient")
const { createNotification } = require("../services/notificationService")

const MAX_DIRECT_MESSAGE_LENGTH = 2000

// Hàm xử lý chuyển giá trị id về số nguyên hợp lệ.
const parseId = (value) => {
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}

// Hàm xử lý tạo khóa hội thoại duy nhất cho cặp người dùng.
const getConversationKey = (a, b) => {
  const left = Number(a)
  const right = Number(b)
  return left < right ? `${left}_${right}` : `${right}_${left}`
}

// Hàm xử lý kiểm tra role có được phép chat trực tiếp hay không.
const isDirectChatRole = (role) => role === UserRole.BENH_NHAN || role === UserRole.BAC_SI

// Hàm xử lý lấy tin nhắn mới nhất của một cuộc chat trực tiếp.
const findLastDirectMessage = async (conversationKey) => {
  return prisma.directMessage.findFirst({
    where: { conversation_key: conversationKey },
    orderBy: [{ created_at: "desc" }, { message_id: "desc" }],
  })
}

// Hàm xử lý đếm tin nhắn chưa đọc cho người nhận.
const countUnreadDirectMessages = async (senderId, receiverId) => {
  return prisma.directMessage.count({
    where: {
      sender_id: senderId,
      receiver_id: receiverId,
      is_read: false,
    },
  })
}

// Hàm xử lý kiểm tra và xác định cặp chat bác sĩ - bệnh nhân hợp lệ.
const resolveDirectPair = async (currentUserId, otherUserId) => {
  if (!currentUserId || !otherUserId) {
    const error = new Error("INVALID_USER")
    error.status = 400
    throw error
  }

  if (currentUserId === otherUserId) {
    const error = new Error("SELF_CHAT_NOT_ALLOWED")
    error.status = 400
    throw error
  }

  const users = await prisma.user.findMany({
    where: { user_id: { in: [currentUserId, otherUserId] } },
    select: {
      user_id: true,
      name: true,
      email: true,
      role: true,
      is_active: true,
    },
  })

  if (users.length !== 2) {
    const error = new Error("USER_NOT_FOUND")
    error.status = 404
    throw error
  }

  const currentUser = users.find((item) => item.user_id === currentUserId)
  const otherUser = users.find((item) => item.user_id === otherUserId)

  if (!currentUser?.is_active || !otherUser?.is_active) {
    const error = new Error("INACTIVE_USER")
    error.status = 403
    throw error
  }

  if (!isDirectChatRole(currentUser.role) || !isDirectChatRole(otherUser.role)) {
    const error = new Error("ROLE_NOT_ALLOWED")
    error.status = 403
    throw error
  }

  let patientId = null
  let doctorId = null

  if (currentUser.role === UserRole.BENH_NHAN && otherUser.role === UserRole.BAC_SI) {
    patientId = currentUser.user_id
    doctorId = otherUser.user_id
  } else if (currentUser.role === UserRole.BAC_SI && otherUser.role === UserRole.BENH_NHAN) {
    patientId = otherUser.user_id
    doctorId = currentUser.user_id
  } else {
    const error = new Error("PAIR_NOT_ALLOWED")
    error.status = 403
    throw error
  }

  const permission = await prisma.accessPermission.findFirst({
    where: {
      patient_id: patientId,
      viewer_id: doctorId,
      role: AccessRole.BAC_SI,
      status: AccessStatus.accepted,
    },
    select: { permission_id: true },
  })

  if (!permission) {
    const error = new Error("ACCESS_NOT_GRANTED")
    error.status = 403
    throw error
  }

  return {
    currentUser,
    otherUser,
    conversationKey: getConversationKey(currentUserId, otherUserId),
  }
}

// Hàm xử lý map mã lỗi chat trực tiếp thành response HTTP phù hợp.
const mapDirectError = (error, res) => {
  if (error.message === "INVALID_USER") {
    return res.status(400).json({ message: "Thong tin nguoi dung khong hop le" })
  }
  if (error.message === "SELF_CHAT_NOT_ALLOWED") {
    return res.status(400).json({ message: "Khong the nhan tin cho chinh minh" })
  }
  if (error.message === "USER_NOT_FOUND") {
    return res.status(404).json({ message: "Khong tim thay nguoi dung" })
  }
  if (error.message === "INACTIVE_USER") {
    return res.status(403).json({ message: "Tài khoản chat đã bị vô hiệu hóa" })
  }
  if (error.message === "ROLE_NOT_ALLOWED" || error.message === "PAIR_NOT_ALLOWED") {
    return res.status(403).json({ message: "Chỉ hỗ trợ chat giữa bệnh nhân và bác sĩ" })
  }
  if (error.message === "ACCESS_NOT_GRANTED") {
    return res.status(403).json({ message: "Bác sĩ chưa được bệnh nhân cấp quyền truy cập" })
  }

  const statusCode = error.status || 500
  return res.status(statusCode).json({ message: "Lỗi server nội bộ" })
}

// Hàm xử lý hỏi đáp với trợ lý AI.
const chatWithGemini = async (req, res) => {
  try {
    const { message } = req.body
    const user_id = Number.parseInt(req.user.user_id, 10)

    await prisma.chatLog.create({
      data: {
        user_id,
        role: "user",
        message,
      },
    })

    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`

    const response = await axios.post(
      url,
      {
        contents: [
          {
            parts: [{
              text: `
                  Bạn là một trợ lý AI chuyên môn tim mạch, giống như một bác sĩ tim mạch.
                  Hãy luôn trả lời bằng tiếng Việt, ngắn gọn, dễ hiểu, chuyên nghiệp.
                  Khi có triệu chứng nguy hiểm (ví dụ: đau ngực dữ dội, khó thở nặng, ngất xỉu),
                  hãy nhấn mạnh rằng bệnh nhân cần đi khám hoặc gọi cấp cứu ngay lập tức.
                  Không đưa ra chẩn đoán tuyệt đối, luôn khuyên bệnh nhân đi khám bác sĩ chuyên khoa.
                  ---
                  Câu hỏi của bệnh nhân: ${message}
                  `,
            }],
          },
        ],
      },
      { headers: { "Content-Type": "application/json" } }
    )

    const botReply =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Xin loi, toi chua nhan duoc phan hoi tu he thong."

    await prisma.chatLog.create({
      data: {
        user_id,
        role: "bot",
        message: botReply,
      },
    })

    res.json({ response: botReply })
  } catch (error) {
    console.error("Loi chat voi Gemini:", error.response?.data || error.message)

    const defaultReply =
      "Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau."

    await prisma.chatLog.create({
      data: {
        user_id: Number.parseInt(req.user.user_id, 10),
        role: "bot",
        message: defaultReply,
      },
    })

    res.json({ response: defaultReply })
  }
}

// Hàm xử lý lấy lịch sử hỏi đáp với AI.
const getChatHistory = async (req, res) => {
  try {
    const user_id = req.user.user_id

    const chatLogs = await prisma.chatLog.findMany({
      where: { user_id },
      orderBy: { timestamp: "asc" },
    })

    res.json({ history: chatLogs })
  } catch (error) {
    console.error("Loi lay lich su chat:", error)
    res.status(500).json({ message: "Loi server noi bo" })
  }
}

// Hàm xử lý lấy danh sách liên hệ chat trực tiếp.
const getDirectChatContacts = async (req, res) => {
  try {
    const userId = parseId(req.user.user_id)
    const me = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { user_id: true, role: true },
    })

    if (!me) {
      return res.status(404).json({ message: "Khong tim thay nguoi dung" })
    }

    if (!isDirectChatRole(me.role)) {
      return res.status(403).json({ message: "Vai tro hien tai khong ho tro chat truc tiep" })
    }

    let contacts = []

    if (me.role === UserRole.BENH_NHAN) {
      const accessList = await prisma.accessPermission.findMany({
        where: {
          patient_id: userId,
          role: AccessRole.BAC_SI,
          status: AccessStatus.accepted,
        },
        include: {
          viewer: {
            select: {
              user_id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      })

      contacts = accessList.map((item) => item.viewer).filter(Boolean)
    } else {
      const accessList = await prisma.accessPermission.findMany({
        where: {
          viewer_id: userId,
          role: AccessRole.BAC_SI,
          status: AccessStatus.accepted,
        },
        include: {
          patient: {
            select: {
              user_id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      })

      contacts = accessList.map((item) => item.patient).filter(Boolean)
    }

    const contactSummaries = await Promise.all(
      contacts.map(async (contact) => {
        const conversationKey = getConversationKey(userId, contact.user_id)
        const [lastMessage, unreadCount] = await Promise.all([
          findLastDirectMessage(conversationKey),
          countUnreadDirectMessages(contact.user_id, userId),
        ])

        return {
          user_id: contact.user_id,
          name: contact.name,
          email: contact.email,
          role: contact.role,
          conversation_key: conversationKey,
          last_message: lastMessage?.message || null,
          last_message_at: lastMessage?.created_at || null,
          unread_count: unreadCount,
        }
      })
    )

    contactSummaries.sort((a, b) => {
      if (!a.last_message_at && !b.last_message_at) return a.name.localeCompare(b.name)
      if (!a.last_message_at) return 1
      if (!b.last_message_at) return -1
      return new Date(b.last_message_at) - new Date(a.last_message_at)
    })

    return res.json({ contacts: contactSummaries })
  } catch (error) {
    console.error("Loi lay danh sach chat truc tiep:", error)
    return res.status(500).json({ message: "Loi server noi bo" })
  }
}

// Hàm xử lý lấy lịch sử tin nhắn trực tiếp giữa hai người dùng.
const getDirectMessages = async (req, res) => {
  try {
    const currentUserId = parseId(req.user.user_id)
    const otherUserId = parseId(req.params.other_user_id)
    const limit = Math.min(Math.max(parseId(req.query.limit) || 100, 1), 300)
    const offset = Math.max(parseId(req.query.offset) || 0, 0)

    const pair = await resolveDirectPair(currentUserId, otherUserId)

    const messages = await prisma.directMessage.findMany({
      where: { conversation_key: pair.conversationKey },
      orderBy: [{ created_at: "asc" }, { message_id: "asc" }],
      take: limit,
      skip: offset,
    })

    return res.json({
      conversation_key: pair.conversationKey,
      contact: {
        user_id: pair.otherUser.user_id,
        name: pair.otherUser.name,
        email: pair.otherUser.email,
        role: pair.otherUser.role,
      },
      messages,
    })
  } catch (error) {
    console.error("Loi lay tin nhan truc tiep:", error)
    return mapDirectError(error, res)
  }
}

// Hàm xử lý gửi tin nhắn trực tiếp.
const sendDirectMessage = async (req, res) => {
  try {
    const senderId = parseId(req.user.user_id)
    const receiverId = parseId(req.body.receiver_id)
    const rawMessage = typeof req.body.message === "string" ? req.body.message : ""
    const message = rawMessage.trim()

    if (!message) {
      return res.status(400).json({ message: "Noi dung tin nhan khong duoc de trong" })
    }

    if (message.length > MAX_DIRECT_MESSAGE_LENGTH) {
      return res.status(400).json({ message: `Tin nhan toi da ${MAX_DIRECT_MESSAGE_LENGTH} ky tu` })
    }

    const pair = await resolveDirectPair(senderId, receiverId)

    const createdMessage = await prisma.directMessage.create({
      data: {
        conversation_key: pair.conversationKey,
        sender_id: senderId,
        receiver_id: receiverId,
        message,
      },
    })

    const io = req.app.get("io")
    if (io && createdMessage) {
      io.to(`user-${senderId}`).emit("direct-message:new", createdMessage)
      io.to(`user-${receiverId}`).emit("direct-message:new", createdMessage)
    }

    await createNotification({
      type: NotificationType.DIRECT_MESSAGE,
      title: "Tin nhan moi",
      message: createdMessage.message,
      actorId: senderId,
      entityType: "direct_message",
      entityId: createdMessage.message_id,
      payload: {
        conversation_key: createdMessage.conversation_key,
        sender_id: createdMessage.sender_id,
        receiver_id: createdMessage.receiver_id,
      },
      recipientUserIds: [receiverId],
      io,
    })

    return res.status(201).json({
      message: "Gui tin nhan thanh cong",
      data: createdMessage,
    })
  } catch (error) {
    console.error("Loi gui tin nhan truc tiep:", error)
    return mapDirectError(error, res)
  }
}

// Hàm xử lý đánh dấu tin nhắn trực tiếp đã đọc.
const markDirectMessagesRead = async (req, res) => {
  try {
    const currentUserId = parseId(req.user.user_id)
    const otherUserId = parseId(req.params.other_user_id)

    const pair = await resolveDirectPair(currentUserId, otherUserId)

    const updated = await prisma.directMessage.updateMany({
      where: {
        conversation_key: pair.conversationKey,
        receiver_id: currentUserId,
        sender_id: otherUserId,
        is_read: false,
      },
      data: { is_read: true },
    })

    const updatedCount = Number(updated.count || 0)
    const io = req.app.get("io")

    // Unused realtime event for now (no FE consumer): direct-message:read
    // if (io && updatedCount > 0) {
    //   io.to(`user-${otherUserId}`).emit("direct-message:read", {
    //     reader_id: currentUserId,
    //     conversation_key: pair.conversationKey,
    //     read_count: updatedCount,
    //     timestamp: new Date(),
    //   })
    // }

    return res.json({ updated: updatedCount })
  } catch (error) {
    console.error("Loi cap nhat da doc tin nhan:", error)
    return mapDirectError(error, res)
  }
}

module.exports = {
  chatWithGemini,
  getChatHistory,
  getDirectChatContacts,
  getDirectMessages,
  sendDirectMessage,
  markDirectMessagesRead,
}
