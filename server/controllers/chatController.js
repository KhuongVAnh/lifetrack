// Controller xử lý chat AI và chat trực tiếp giữa bệnh nhân với bác sĩ.
const axios = require("axios")
const { Prisma, AccessRole, AccessStatus, UserRole } = require("@prisma/client")
const prisma = require("../prismaClient")
const { enqueueDirectMessageNotification } = require("../services/directMessageNotificationQueueService")

const MAX_DIRECT_MESSAGE_LENGTH = 2000 // Giới hạn độ dài tin nhắn để tránh lạm dụng và đảm bảo hiệu suất.
const DEFAULT_DIRECT_PAGE_LIMIT = 50 // số lượng tin nhắn mặc định trả về cho một lần load lịch sử chat
const MAX_DIRECT_PAGE_LIMIT = 100 // giới hạn trên cho limit khi client yêu cầu lấy lịch sử chat

// Hàm xử lý chuyển giá trị id về số nguyên hợp lệ.
const parseId = (value) => {
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}

// Hàm xử lý chuẩn hóa giới hạn phân trang để tránh truy vấn quá nặng.
const normalizePageLimit = (value, fallback = DEFAULT_DIRECT_PAGE_LIMIT) => {
  const parsed = parseId(value)
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback
  return Math.min(parsed, MAX_DIRECT_PAGE_LIMIT)
}

// Hàm xử lý tạo khóa hội thoại duy nhất cho cặp người dùng.
const getConversationKey = (a, b) => {
  const left = Number(a)
  const right = Number(b)
  return left < right ? `${left}_${right}` : `${right}_${left}`
}

// Hàm xử lý kiểm tra role có được phép chat trực tiếp hay không.
const isDirectChatRole = (role) => role === UserRole.BENH_NHAN || role === UserRole.BAC_SI

// Hàm mã hóa cursor phân trang direct message từ cặp created_at + message_id.
const encodeDirectMessageCursor = (message) => {
  const createdAt = message?.created_at ? new Date(message.created_at).toISOString() : null
  const messageId = parseId(message?.message_id)

  if (!createdAt || !Number.isInteger(messageId)) return null

  return Buffer.from(JSON.stringify({ created_at: createdAt, message_id: messageId }), "utf8").toString("base64")
}

// Hàm giải mã cursor phân trang direct message để truy vấn tin nhắn cũ hơn.
const parseDirectMessageCursor = (cursor) => {
  try {
    if (!cursor) return null

    // Cursor được mã hóa base64 từ JSON để tránh lộ cấu trúc query ra ngoài client.
    const decoded = JSON.parse(Buffer.from(String(cursor), "base64").toString("utf8"))
    const createdAt = decoded?.created_at ? new Date(decoded.created_at) : null
    const messageId = parseId(decoded?.message_id)

    if (!(createdAt instanceof Date) || Number.isNaN(createdAt.getTime())) return null
    if (!Number.isInteger(messageId)) return null

    return { createdAt, messageId }
  } catch (_error) {
    return null
  }
}

// Hàm sắp xếp danh sách contact theo hoạt động mới nhất rồi fallback về tên.
const sortDirectContacts = (contacts = []) => {
  return [...contacts].sort((a, b) => {
    if (!a.last_message_at && !b.last_message_at) return a.name.localeCompare(b.name)
    if (!a.last_message_at) return 1
    if (!b.last_message_at) return -1
    return new Date(b.last_message_at) - new Date(a.last_message_at)
  })
}

// Hàm kiểm tra và xác định cặp chat bác sĩ - bệnh nhân hợp lệ.
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

  // Lấy cả hai user trong một query để giảm round-trip lên database.
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

  // Chỉ cho phép chat khi bác sĩ đã được bệnh nhân cấp quyền accepted.
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

// Hàm lấy map unread count theo sender cho current user chỉ bằng một truy vấn aggregate.
const loadUnreadCountsByContact = async (currentUserId, contactIds) => {
  if (!contactIds.length) return new Map()

  const unreadRows = await prisma.directMessage.groupBy({
    by: ["sender_id"],
    where: {
      receiver_id: currentUserId,
      sender_id: { in: contactIds },
      is_read: false,
    },
    _count: { _all: true },
  })

  return new Map(unreadRows.map((row) => [row.sender_id, Number(row._count?._all || 0)]))
}

// Hàm lấy tin nhắn cuối cùng của từng conversation trong một truy vấn gộp để tránh N+1 query.
const loadLastMessagesByConversation = async (conversationKeys) => {
  if (!conversationKeys.length) return new Map()

  // Dùng window function để chọn đúng một bản ghi mới nhất cho mỗi conversation_key.
  const rows = await prisma.$queryRaw(
    Prisma.sql`
      SELECT ranked.message_id, ranked.conversation_key, ranked.message, ranked.created_at
      FROM (
        SELECT
          dm.message_id,
          dm.conversation_key,
          dm.message,
          dm.created_at,
          ROW_NUMBER() OVER (
            PARTITION BY dm.conversation_key
            ORDER BY dm.created_at DESC, dm.message_id DESC
          ) AS row_num
        FROM direct_messages dm
        WHERE dm.conversation_key IN (${Prisma.join(conversationKeys)})
      ) AS ranked
      WHERE ranked.row_num = 1
    `
  )

  return new Map(rows.map((row) => [row.conversation_key, row]))
}

// Hàm dựng danh sách contact chat trực tiếp kèm tin nhắn cuối và unread count.
const buildDirectContactSummaries = async (currentUserId, contacts) => {
  if (!contacts.length) return []

  // Chuẩn bị sẵn thông tin contact và conversation_key để các bước sau chỉ cần merge kết quả aggregate.
  const contactSummaries = contacts.map((contact) => ({
    user_id: contact.user_id,
    name: contact.name,
    email: contact.email,
    role: contact.role,
    conversation_key: getConversationKey(currentUserId, contact.user_id),
  }))

  const conversationKeys = contactSummaries.map((item) => item.conversation_key)
  const contactIds = contactSummaries.map((item) => item.user_id)
  const [lastMessageMap, unreadCountMap] = await Promise.all([
    loadLastMessagesByConversation(conversationKeys),
    loadUnreadCountsByContact(currentUserId, contactIds),
  ])

  const merged = contactSummaries.map((contact) => {
    const lastMessage = lastMessageMap.get(contact.conversation_key)
    return {
      ...contact,
      last_message: lastMessage?.message || null,
      last_message_at: lastMessage?.created_at || null,
      unread_count: unreadCountMap.get(contact.user_id) || 0,
    }
  })

  return sortDirectContacts(merged)
}

// Hàm map mã lỗi chat trực tiếp thành response HTTP phù hợp.
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

// Hàm đẩy notification direct message vào queue nền để request gửi tin nhắn không phải chờ lưu notification.
const enqueueDirectMessageNotificationInBackground = (directMessage) => {
  Promise.resolve(
    enqueueDirectMessageNotification({
      messageId: directMessage.message_id,
      senderId: directMessage.sender_id,
      receiverId: directMessage.receiver_id,
      conversationKey: directMessage.conversation_key,
    })
  ).catch((error) => {
    console.error("Loi enqueue notification direct message:", error)
  })
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

// Hàm xử lý lấy danh sách liên hệ chat trực tiếp với truy vấn gộp để tránh N+1 query.
const getDirectChatContacts = async (req, res) => {
  const startedAt = Date.now()

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

    const contactSummaries = await buildDirectContactSummaries(userId, contacts)

    console.log(JSON.stringify({
      event: "DIRECT_CHAT_CONTACTS_TIMING",
      source: "chat",
      user_id: userId,
      contact_count: contactSummaries.length,
      duration_ms: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    }))

    return res.json({ contacts: contactSummaries })
  } catch (error) {
    console.error("Loi lay danh sach chat truc tiep:", error)
    return res.status(500).json({ message: "Loi server noi bo" })
  }
}

// Hàm xử lý lấy lịch sử tin nhắn trực tiếp, hỗ trợ cả offset cũ và cursor pagination mới.
const getDirectMessages = async (req, res) => {
  const startedAt = Date.now()

  try {
    const currentUserId = parseId(req.user.user_id)
    const otherUserId = parseId(req.params.other_user_id)
    const limit = normalizePageLimit(req.query.limit)
    const offset = Math.max(parseId(req.query.offset) || 0, 0)
    const cursor = typeof req.query.cursor === "string" ? req.query.cursor.trim() : ""

    const pair = await resolveDirectPair(currentUserId, otherUserId)

    // Giữ tương thích additive: nếu client cũ truyền offset thì dùng flow cũ, nếu không thì ưu tiên cursor/latest page.
    if (!cursor && req.query.offset !== undefined) {
      const messages = await prisma.directMessage.findMany({
        where: { conversation_key: pair.conversationKey },
        orderBy: [{ created_at: "asc" }, { message_id: "asc" }],
        take: limit,
        skip: offset,
      })

      console.log(JSON.stringify({
        event: "DIRECT_CHAT_HISTORY_TIMING",
        source: "chat",
        mode: "offset",
        user_id: currentUserId,
        other_user_id: otherUserId,
        message_count: messages.length,
        duration_ms: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      }))

      return res.json({
        conversation_key: pair.conversationKey,
        contact: {
          user_id: pair.otherUser.user_id,
          name: pair.otherUser.name,
          email: pair.otherUser.email,
          role: pair.otherUser.role,
        },
        messages,
        next_cursor: null,
        has_more: messages.length === limit,
      })
    }

    const decodedCursor = parseDirectMessageCursor(cursor)
    const paginationWhere = decodedCursor
      ? {
          conversation_key: pair.conversationKey,
          OR: [
            { created_at: { lt: decodedCursor.createdAt } },
            {
              AND: [
                { created_at: decodedCursor.createdAt },
                { message_id: { lt: decodedCursor.messageId } },
              ],
            },
          ],
        }
      : { conversation_key: pair.conversationKey }

    // Truy vấn descending để lấy các message mới nhất hoặc cũ hơn cursor với cost ổn định, sau đó reverse lại cho UI.
    const rows = await prisma.directMessage.findMany({
      where: paginationWhere,
      orderBy: [{ created_at: "desc" }, { message_id: "desc" }],
      take: limit + 1, // lấy thừa 1 bản ghi để xác định hasMore
    })

    const hasMore = rows.length > limit // số bản ghi lấy được lớn hơn cần lấy tức là còn bản ghi để phân trang
    const pageRows = hasMore ? rows.slice(0, limit) : rows // 
    const messages = [...pageRows].reverse() // đảo ngược lại thứ tự cho UI hiển thị từ cũ đến mới
    // Tạo cursor cho bản ghi cuối cùng của page hiện tại để client có thể load tiếp nếu cần.
    const nextCursor = hasMore && messages.length > 0 ? encodeDirectMessageCursor(messages[0]) : null 

    console.log(JSON.stringify({
      event: "DIRECT_CHAT_HISTORY_TIMING",
      source: "chat",
      mode: cursor ? "cursor" : "latest",
      user_id: currentUserId,
      other_user_id: otherUserId,
      message_count: messages.length,
      has_more: hasMore,
      duration_ms: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    }))

    return res.json({
      conversation_key: pair.conversationKey,
      contact: {
        user_id: pair.otherUser.user_id,
        name: pair.otherUser.name,
        email: pair.otherUser.email,
        role: pair.otherUser.role,
      },
      messages,
      next_cursor: nextCursor,
      has_more: hasMore,
    })
  } catch (error) {
    console.error("Loi lay tin nhan truc tiep:", error)
    return mapDirectError(error, res)
  }
}

// Hàm xử lý gửi tin nhắn trực tiếp với đường đi request ngắn, phần notification được đẩy ra queue nền.
const sendDirectMessage = async (req, res) => {
  const startedAt = Date.now()

  try {
    const senderId = parseId(req.user.user_id)
    const receiverId = parseId(req.body.receiver_id)
    const rawMessage = typeof req.body.message === "string" ? req.body.message : ""
    const message = rawMessage.trim()

    if (!message) {
      return res.status(400).json({ message: "Nội dung không được để trống" })
    }

    if (message.length > MAX_DIRECT_MESSAGE_LENGTH) {
      return res.status(400).json({ message: `Tin nhắn tối đa ${MAX_DIRECT_MESSAGE_LENGTH} ký tự` })
    }

    const pair = await resolveDirectPair(senderId, receiverId)

    // Chỉ giữ việc tạo message trong request path để giảm latency cảm nhận cho người dùng.
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

    // Đẩy notification sang queue nền để request gửi tin nhắn không phải chờ thao tác DB phụ.
    enqueueDirectMessageNotificationInBackground(createdMessage)

    console.log(JSON.stringify({
      event: "DIRECT_CHAT_SEND_TIMING",
      source: "chat",
      sender_id: senderId,
      receiver_id: receiverId,
      message_id: createdMessage.message_id,
      duration_ms: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    }))

    return res.status(201).json({
      message: "Gửi tin nhắn thành công",
      data: createdMessage,
    })
  } catch (error) {
    console.error("Lỗi gửi tin nhắn:", error)
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

    return res.json({ updated: Number(updated.count || 0) })
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
