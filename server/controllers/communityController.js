const {
  CommunityContentStatus,
  CommunityQuestionStatus,
  CommunityReactionType,
  NotificationType,
  UserRole,
} = require("@prisma/client")
const prisma = require("../prismaClient")
const { createNotification } = require("../services/notificationService")
const { uploadCommunityFiles, MAX_FILES, MAX_MB } = require("../services/communityUploadService")

const PATIENT_ROLE = "bệnh nhân"
const FAMILY_ROLE = "gia đình"
const DOCTOR_ROLE = "bác sĩ"
const ADMIN_ROLE = "admin"

const DEFAULT_LIMIT = 10
const MAX_LIMIT = 30
const MAX_TITLE_LENGTH = 255
const MAX_BODY_LENGTH = 10000
const MAX_COMMENT_LENGTH = 3000
const MAX_TAGS = 5
const MAX_ATTACHMENTS = 5

const parseId = (value) => {
  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) ? parsed : null
}

const normalizeLimit = (value) => {
  const parsed = parseId(value)
  if (!parsed || parsed <= 0) return DEFAULT_LIMIT
  return Math.min(parsed, MAX_LIMIT)
}

const isDoctorOrAdmin = (req) => req.user?.role === DOCTOR_ROLE || req.user?.role === ADMIN_ROLE
const isPatientOrFamily = (req) => req.user?.role === PATIENT_ROLE || req.user?.role === FAMILY_ROLE
const isAdmin = (req) => req.user?.role === ADMIN_ROLE

const trimOrNull = (value) => {
  if (value === undefined || value === null) return null
  const trimmed = String(value).trim()
  return trimmed || null
}

const normalizeStatus = (value, enumObject, fallback) => {
  const status = String(value || fallback).toUpperCase()
  return Object.values(enumObject).includes(status) ? status : null
}

const normalizeSlug = (value) => {
  const slug = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160)

  return slug || `community-${Date.now()}`
}

const ensureUniqueArticleSlug = async (baseSlug, ignoreArticleId = null) => {
  const normalizedBase = normalizeSlug(baseSlug)
  let candidate = normalizedBase
  let suffix = 2

  while (true) {
    const existing = await prisma.communityArticle.findUnique({
      where: { slug: candidate },
      select: { article_id: true },
    })

    if (!existing || existing.article_id === ignoreArticleId) return candidate

    candidate = `${normalizedBase}-${suffix}`
    suffix += 1
  }
}

const encodeCursor = (row, idField, dateField = "created_at") => {
  const date = row?.[dateField] ? new Date(row[dateField]).toISOString() : null
  const id = parseId(row?.[idField])
  if (!date || !Number.isInteger(id)) return null
  return Buffer.from(JSON.stringify({ date, id }), "utf8").toString("base64")
}

const parseCursor = (cursor) => {
  try {
    if (!cursor) return null
    const decoded = JSON.parse(Buffer.from(String(cursor), "base64").toString("utf8"))
    const date = decoded?.date ? new Date(decoded.date) : null
    const id = parseId(decoded?.id)
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null
    if (!Number.isInteger(id)) return null
    return { date, id }
  } catch (_error) {
    return null
  }
}

const normalizeTags = (value) => {
  const rawTags = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : []

  const tags = []
  for (const item of rawTags) {
    const normalized = String(item || "")
      .trim()
      .replace(/^#+/, "")
      .replace(/\s+/g, "")

    if (!normalized) continue
    const tag = `#${normalized}`
    if (!tags.some((existing) => existing.toLowerCase() === tag.toLowerCase())) {
      tags.push(tag)
    }
    if (tags.length >= MAX_TAGS) break
  }

  return tags
}

const normalizeTagForCompare = (value) => String(value || "").trim().replace(/^#+/, "").toLowerCase()

const questionHasTag = (question, tag) => {
  const target = normalizeTagForCompare(tag)
  if (!target) return true
  const tags = Array.isArray(question.tags) ? question.tags : []
  return tags.some((item) => normalizeTagForCompare(item) === target)
}

const normalizeAttachments = (value) => {
  const attachments = Array.isArray(value) ? value : []
  return attachments
    .slice(0, MAX_ATTACHMENTS)
    .map((item) => ({
      url: trimOrNull(item?.url || item?.secure_url),
      secure_url: trimOrNull(item?.secure_url),
      public_id: trimOrNull(item?.public_id),
      resource_type: trimOrNull(item?.resource_type),
      format: trimOrNull(item?.format),
      bytes: item?.bytes == null ? null : parseId(item.bytes),
      original_name: trimOrNull(item?.original_name || item?.name),
    }))
    .filter((item) => item.url)
}

const maskUserName = (name) => {
  const parts = String(name || "Người dùng LifeTrack").trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return "Người dùng LifeTrack"
  if (parts.length === 1) return `${parts[0][0] || "N"}.`
  return `${parts[0]} ${parts.slice(1).map((part) => `${part[0] || ""}.`).join(" ")}`
}

const getUserAvatar = (user) => user?.doctorProfile?.avatar_url || null

const mapUserSummary = (user, { anonymous = false } = {}) => {
  if (anonymous) {
    return {
      user_id: null,
      name: "Bệnh nhân Ẩn danh",
      display_name: "Bệnh nhân Ẩn danh",
      role: null,
      avatar_url: null,
    }
  }

  return {
    user_id: user?.user_id || null,
    name: user?.name || "Người dùng LifeTrack",
    display_name: user?.name || "Người dùng LifeTrack",
    role: user?.role || null,
    avatar_url: getUserAvatar(user),
  }
}

const mapAttachment = (attachment) => ({
  attachment_id: attachment.attachment_id,
  url: attachment.secure_url || attachment.url,
  secure_url: attachment.secure_url,
  public_id: attachment.public_id,
  resource_type: attachment.resource_type,
  format: attachment.format,
  bytes: attachment.bytes,
  original_name: attachment.original_name,
  created_at: attachment.created_at,
})

const mapAnswer = (answer) => ({
  answer_id: answer.answer_id,
  question_id: answer.question_id,
  body: answer.body,
  is_preferred: answer.is_preferred,
  created_at: answer.created_at,
  updated_at: answer.updated_at,
  author: mapUserSummary(answer.author),
})

const mapComment = (comment) => ({
  comment_id: comment.comment_id,
  question_id: comment.question_id,
  body: comment.body,
  created_at: comment.created_at,
  updated_at: comment.updated_at,
  author: mapUserSummary(comment.author, { anonymous: false }),
})

const loadQuestionStats = async (questionIds) => {
  if (!questionIds.length) return new Map()

  const [reactionRows, commentRows, answerRows] = await Promise.all([
    prisma.communityQuestionReaction.groupBy({
      by: ["question_id", "type"],
      where: { question_id: { in: questionIds } },
      _count: { _all: true },
    }),
    prisma.communityComment.groupBy({
      by: ["question_id"],
      where: { question_id: { in: questionIds } },
      _count: { _all: true },
    }),
    prisma.communityAnswer.groupBy({
      by: ["question_id"],
      where: { question_id: { in: questionIds } },
      _count: { _all: true },
    }),
  ])

  const stats = new Map(questionIds.map((id) => [id, {
    likes: 0,
    dislikes: 0,
    comments: 0,
    answers: 0,
  }]))

  reactionRows.forEach((row) => {
    const item = stats.get(row.question_id)
    if (!item) return
    if (row.type === CommunityReactionType.LIKE) item.likes = Number(row._count?._all || 0)
    if (row.type === CommunityReactionType.DISLIKE) item.dislikes = Number(row._count?._all || 0)
  })

  commentRows.forEach((row) => {
    const item = stats.get(row.question_id)
    if (item) item.comments = Number(row._count?._all || 0)
  })

  answerRows.forEach((row) => {
    const item = stats.get(row.question_id)
    if (item) item.answers = Number(row._count?._all || 0)
  })

  return stats
}

const loadMyReactions = async (questionIds, userId) => {
  if (!questionIds.length || !userId) return new Map()

  const rows = await prisma.communityQuestionReaction.findMany({
    where: {
      question_id: { in: questionIds },
      user_id: userId,
    },
    select: {
      question_id: true,
      type: true,
    },
  })

  return new Map(rows.map((row) => [row.question_id, row.type]))
}

const mapQuestion = (question, { stats, myReaction } = {}) => ({
  question_id: question.question_id,
  title: question.title,
  body: question.body,
  tags: Array.isArray(question.tags) ? question.tags : [],
  is_anonymous: question.is_anonymous,
  status: question.status,
  share_count: question.share_count,
  created_at: question.created_at,
  updated_at: question.updated_at,
  author: mapUserSummary(question.author, { anonymous: question.is_anonymous }),
  author_display_name: question.is_anonymous ? "Bệnh nhân Ẩn danh" : question.author?.name,
  author_masked_name: question.is_anonymous ? "Bệnh nhân Ẩn danh" : maskUserName(question.author?.name),
  preferred_answer: question.answers?.[0] ? mapAnswer(question.answers[0]) : null,
  answers: question.answers?.map(mapAnswer),
  comments: question.comments?.map(mapComment),
  attachments: question.attachments?.map(mapAttachment) || [],
  stats: {
    likes: stats?.likes || 0,
    dislikes: stats?.dislikes || 0,
    comments: stats?.comments || 0,
    answers: stats?.answers || 0,
    shares: question.share_count,
  },
  my_reaction: myReaction || null,
})

const mapArticle = (article) => ({
  article_id: article.article_id,
  slug: article.slug,
  title: article.title,
  category: article.category,
  excerpt: article.excerpt,
  content: article.content,
  cover_image_url: article.cover_image_url,
  read_time: article.read_time,
  status: article.status,
  published_at: article.published_at,
  created_at: article.created_at,
  updated_at: article.updated_at,
  author: mapUserSummary(article.author),
})

const validateTextInput = ({ title, body, bodyLabel = "Nội dung" }) => {
  if (!title || title.length > MAX_TITLE_LENGTH) {
    return `Tiêu đề là bắt buộc và tối đa ${MAX_TITLE_LENGTH} ký tự`
  }

  if (!body || body.length > MAX_BODY_LENGTH) {
    return `${bodyLabel} là bắt buộc và tối đa ${MAX_BODY_LENGTH} ký tự`
  }

  return null
}

const getArticleCursorWhere = (cursor) => {
  if (!cursor) return {}

  return {
    OR: [
      { published_at: { lt: cursor.date } },
      {
        AND: [
          { published_at: cursor.date },
          { article_id: { lt: cursor.id } },
        ],
      },
    ],
  }
}

const getQuestionCursorWhere = (cursor) => {
  if (!cursor) return {}

  return {
    OR: [
      { created_at: { lt: cursor.date } },
      {
        AND: [
          { created_at: cursor.date },
          { question_id: { lt: cursor.id } },
        ],
      },
    ],
  }
}

const getArticleAuthor = async (authorId) => {
  return prisma.user.findFirst({
    where: {
      user_id: authorId,
      role: { in: [UserRole.BAC_SI, UserRole.ADMIN] },
      is_active: true,
    },
    select: { user_id: true },
  })
}

const getQuestionAuthor = async (authorId) => {
  return prisma.user.findFirst({
    where: {
      user_id: authorId,
      role: { in: [UserRole.BENH_NHAN, UserRole.GIA_DINH] },
      is_active: true,
    },
    select: { user_id: true },
  })
}

const listArticles = async (req, res) => {
  try {
    const limit = normalizeLimit(req.query.limit)
    const keyword = trimOrNull(req.query.q)
    const category = trimOrNull(req.query.category)
    const cursor = parseCursor(req.query.cursor)

    const articles = await prisma.communityArticle.findMany({
      where: {
        status: CommunityContentStatus.PUBLISHED,
        published_at: { not: null },
        ...(category ? { category } : {}),
        ...(keyword
          ? {
              OR: [
                { title: { contains: keyword } },
                { excerpt: { contains: keyword } },
                { content: { contains: keyword } },
              ],
            }
          : {}),
        ...getArticleCursorWhere(cursor),
      },
      include: {
        author: {
          select: {
            user_id: true,
            name: true,
            role: true,
            doctorProfile: { select: { avatar_url: true } },
          },
        },
      },
      orderBy: [{ published_at: "desc" }, { article_id: "desc" }],
      take: limit + 1,
    })

    const hasMore = articles.length > limit
    const pageRows = hasMore ? articles.slice(0, limit) : articles
    const nextCursor = hasMore && pageRows.length ? encodeCursor(pageRows[pageRows.length - 1], "article_id", "published_at") : null

    return res.json({
      articles: pageRows.map(mapArticle),
      next_cursor: nextCursor,
      has_more: hasMore,
    })
  } catch (error) {
    console.error("Lỗi lấy bài viết cộng đồng:", error)
    return res.status(500).json({ message: "Lỗi server khi lấy bài viết cộng đồng" })
  }
}

const getArticle = async (req, res) => {
  try {
    const slug = String(req.params.slug || "").trim()
    const article = await prisma.communityArticle.findFirst({
      where: {
        slug,
        status: CommunityContentStatus.PUBLISHED,
      },
      include: {
        author: {
          select: {
            user_id: true,
            name: true,
            role: true,
            doctorProfile: { select: { avatar_url: true } },
          },
        },
      },
    })

    if (!article) {
      return res.status(404).json({ message: "Không tìm thấy bài viết" })
    }

    return res.json({ article: mapArticle(article) })
  } catch (error) {
    console.error("Lỗi lấy chi tiết bài viết cộng đồng:", error)
    return res.status(500).json({ message: "Lỗi server khi lấy chi tiết bài viết" })
  }
}

const createArticle = async (req, res) => {
  try {
    if (!isDoctorOrAdmin(req)) {
      return res.status(403).json({ message: "Chỉ bác sĩ hoặc admin mới được tạo bài viết" })
    }

    const authorId = parseId(req.user.user_id)
    const author = await getArticleAuthor(authorId)
    if (!author) {
      return res.status(403).json({ message: "Tài khoản không đủ quyền tạo bài viết" })
    }

    const title = trimOrNull(req.body.title)
    const category = trimOrNull(req.body.category)
    const excerpt = trimOrNull(req.body.excerpt)
    const content = trimOrNull(req.body.content)
    const status = normalizeStatus(req.body.status, CommunityContentStatus, CommunityContentStatus.PUBLISHED)

    const textError = validateTextInput({ title, body: content, bodyLabel: "Nội dung bài viết" })
    if (textError) return res.status(400).json({ message: textError })
    if (!category || !excerpt) return res.status(400).json({ message: "category và excerpt là bắt buộc" })
    if (!status) return res.status(400).json({ message: "status bài viết không hợp lệ" })

    const slug = await ensureUniqueArticleSlug(req.body.slug || title)
    const now = new Date()

    const article = await prisma.communityArticle.create({
      data: {
        author_id: authorId,
        slug,
        title,
        category,
        excerpt,
        content,
        cover_image_url: trimOrNull(req.body.cover_image_url),
        read_time: trimOrNull(req.body.read_time),
        status,
        published_at: status === CommunityContentStatus.PUBLISHED ? (req.body.published_at ? new Date(req.body.published_at) : now) : null,
      },
      include: {
        author: {
          select: {
            user_id: true,
            name: true,
            role: true,
            doctorProfile: { select: { avatar_url: true } },
          },
        },
      },
    })

    return res.status(201).json({
      message: "Đã tạo bài viết cộng đồng",
      article: mapArticle(article),
    })
  } catch (error) {
    console.error("Lỗi tạo bài viết cộng đồng:", error)
    return res.status(500).json({ message: "Lỗi server khi tạo bài viết" })
  }
}

const updateArticle = async (req, res) => {
  try {
    if (!isDoctorOrAdmin(req)) {
      return res.status(403).json({ message: "Chỉ bác sĩ hoặc admin mới được cập nhật bài viết" })
    }

    const articleId = parseId(req.params.id)
    if (!articleId) return res.status(400).json({ message: "article_id không hợp lệ" })

    const existing = await prisma.communityArticle.findUnique({
      where: { article_id: articleId },
      select: { article_id: true, author_id: true, title: true, status: true, published_at: true },
    })

    if (!existing) return res.status(404).json({ message: "Không tìm thấy bài viết" })
    if (!isAdmin(req) && existing.author_id !== parseId(req.user.user_id)) {
      return res.status(403).json({ message: "Bạn chỉ được sửa bài viết của mình" })
    }

    const data = {}
    if (req.body.title !== undefined) data.title = trimOrNull(req.body.title)
    if (req.body.category !== undefined) data.category = trimOrNull(req.body.category)
    if (req.body.excerpt !== undefined) data.excerpt = trimOrNull(req.body.excerpt)
    if (req.body.content !== undefined) data.content = trimOrNull(req.body.content)
    if (req.body.cover_image_url !== undefined) data.cover_image_url = trimOrNull(req.body.cover_image_url)
    if (req.body.read_time !== undefined) data.read_time = trimOrNull(req.body.read_time)

    if (req.body.status !== undefined) {
      const status = normalizeStatus(req.body.status, CommunityContentStatus, existing.status)
      if (!status) return res.status(400).json({ message: "status bài viết không hợp lệ" })
      data.status = status
      data.published_at = status === CommunityContentStatus.PUBLISHED
        ? existing.published_at || new Date()
        : null
    }

    if (req.body.slug !== undefined || req.body.title !== undefined) {
      data.slug = await ensureUniqueArticleSlug(req.body.slug || data.title || existing.title, articleId)
    }

    const article = await prisma.communityArticle.update({
      where: { article_id: articleId },
      data,
      include: {
        author: {
          select: {
            user_id: true,
            name: true,
            role: true,
            doctorProfile: { select: { avatar_url: true } },
          },
        },
      },
    })

    return res.json({
      message: "Đã cập nhật bài viết cộng đồng",
      article: mapArticle(article),
    })
  } catch (error) {
    console.error("Lỗi cập nhật bài viết cộng đồng:", error)
    return res.status(500).json({ message: "Lỗi server khi cập nhật bài viết" })
  }
}

const deleteArticle = async (req, res) => {
  try {
    if (!isDoctorOrAdmin(req)) {
      return res.status(403).json({ message: "Chỉ bác sĩ hoặc admin mới được ẩn bài viết" })
    }

    const articleId = parseId(req.params.id)
    if (!articleId) return res.status(400).json({ message: "article_id không hợp lệ" })

    const existing = await prisma.communityArticle.findUnique({
      where: { article_id: articleId },
      select: { article_id: true, author_id: true },
    })

    if (!existing) return res.status(404).json({ message: "Không tìm thấy bài viết" })
    if (!isAdmin(req) && existing.author_id !== parseId(req.user.user_id)) {
      return res.status(403).json({ message: "Bạn chỉ được ẩn bài viết của mình" })
    }

    await prisma.communityArticle.update({
      where: { article_id: articleId },
      data: {
        status: CommunityContentStatus.HIDDEN,
        published_at: null,
      },
    })

    return res.json({ message: "Đã ẩn bài viết cộng đồng" })
  } catch (error) {
    console.error("Lỗi ẩn bài viết cộng đồng:", error)
    return res.status(500).json({ message: "Lỗi server khi ẩn bài viết" })
  }
}

const listQuestions = async (req, res) => {
  try {
    const limit = normalizeLimit(req.query.limit)
    const keyword = trimOrNull(req.query.q)
    const tag = trimOrNull(req.query.tag)
    const cursor = parseCursor(req.query.cursor)
    const take = tag ? Math.min((limit + 1) * 5, 100) : limit + 1

    const rows = await prisma.communityQuestion.findMany({
      where: {
        status: { not: CommunityQuestionStatus.HIDDEN },
        ...(keyword
          ? {
              OR: [
                { title: { contains: keyword } },
                { body: { contains: keyword } },
              ],
            }
          : {}),
        ...getQuestionCursorWhere(cursor),
      },
      include: {
        author: {
          select: {
            user_id: true,
            name: true,
            role: true,
            doctorProfile: { select: { avatar_url: true } },
          },
        },
        answers: {
          include: {
            author: {
              select: {
                user_id: true,
                name: true,
                role: true,
                doctorProfile: { select: { avatar_url: true } },
              },
            },
          },
          orderBy: [{ is_preferred: "desc" }, { created_at: "asc" }, { answer_id: "asc" }],
          take: 1,
        },
        attachments: true,
        comments: {
          include: {
            author: {
              select: {
                user_id: true,
                name: true,
                role: true,
                doctorProfile: { select: { avatar_url: true } },
              },
            },
          },
          orderBy: [{ created_at: "asc" }, { comment_id: "asc" }],
          take: 5,
        },
      },
      orderBy: [{ created_at: "desc" }, { question_id: "desc" }],
      take,
    })

    const filteredRows = tag ? rows.filter((question) => questionHasTag(question, tag)) : rows
    const hasMore = filteredRows.length > limit
    const pageRows = hasMore ? filteredRows.slice(0, limit) : filteredRows
    const questionIds = pageRows.map((question) => question.question_id)
    const [statsMap, myReactionMap] = await Promise.all([
      loadQuestionStats(questionIds),
      loadMyReactions(questionIds, parseId(req.user?.user_id)),
    ])
    const nextCursor = hasMore && pageRows.length ? encodeCursor(pageRows[pageRows.length - 1], "question_id") : null

    return res.json({
      questions: pageRows.map((question) => mapQuestion(question, {
        stats: statsMap.get(question.question_id),
        myReaction: myReactionMap.get(question.question_id),
      })),
      next_cursor: nextCursor,
      has_more: hasMore,
    })
  } catch (error) {
    console.error("Lỗi lấy câu hỏi cộng đồng:", error)
    return res.status(500).json({ message: "Lỗi server khi lấy câu hỏi cộng đồng" })
  }
}

const getQuestion = async (req, res) => {
  try {
    const questionId = parseId(req.params.id)
    if (!questionId) return res.status(400).json({ message: "question_id không hợp lệ" })

    const question = await prisma.communityQuestion.findFirst({
      where: {
        question_id: questionId,
        status: { not: CommunityQuestionStatus.HIDDEN },
      },
      include: {
        author: {
          select: {
            user_id: true,
            name: true,
            role: true,
            doctorProfile: { select: { avatar_url: true } },
          },
        },
        answers: {
          include: {
            author: {
              select: {
                user_id: true,
                name: true,
                role: true,
                doctorProfile: { select: { avatar_url: true } },
              },
            },
          },
          orderBy: [{ is_preferred: "desc" }, { created_at: "asc" }, { answer_id: "asc" }],
        },
        comments: {
          include: {
            author: {
              select: {
                user_id: true,
                name: true,
                role: true,
                doctorProfile: { select: { avatar_url: true } },
              },
            },
          },
          orderBy: [{ created_at: "asc" }, { comment_id: "asc" }],
        },
        attachments: true,
      },
    })

    if (!question) return res.status(404).json({ message: "Không tìm thấy câu hỏi" })

    const [statsMap, myReactionMap] = await Promise.all([
      loadQuestionStats([questionId]),
      loadMyReactions([questionId], parseId(req.user?.user_id)),
    ])

    return res.json({
      question: mapQuestion(question, {
        stats: statsMap.get(questionId),
        myReaction: myReactionMap.get(questionId),
      }),
    })
  } catch (error) {
    console.error("Lỗi lấy chi tiết câu hỏi cộng đồng:", error)
    return res.status(500).json({ message: "Lỗi server khi lấy chi tiết câu hỏi" })
  }
}

const createQuestion = async (req, res) => {
  try {
    if (!isPatientOrFamily(req)) {
      return res.status(403).json({ message: "Chỉ bệnh nhân hoặc người nhà mới được đặt câu hỏi" })
    }

    const authorId = parseId(req.user.user_id)
    const author = await getQuestionAuthor(authorId)
    if (!author) {
      return res.status(403).json({ message: "Tài khoản không đủ quyền đặt câu hỏi" })
    }

    const title = trimOrNull(req.body.title)
    const body = trimOrNull(req.body.body)
    const textError = validateTextInput({ title, body, bodyLabel: "Nội dung câu hỏi" })
    if (textError) return res.status(400).json({ message: textError })

    const tags = normalizeTags(req.body.tags)
    const attachments = normalizeAttachments(req.body.attachments)

    const question = await prisma.communityQuestion.create({
      data: {
        author_id: authorId,
        title,
        body,
        tags,
        is_anonymous: Boolean(req.body.is_anonymous),
        attachments: attachments.length ? { create: attachments } : undefined,
      },
      include: {
        author: {
          select: {
            user_id: true,
            name: true,
            role: true,
            doctorProfile: { select: { avatar_url: true } },
          },
        },
        answers: true,
        attachments: true,
      },
    })

    return res.status(201).json({
      message: "Đã đăng câu hỏi cộng đồng",
      question: mapQuestion(question),
    })
  } catch (error) {
    console.error("Lỗi tạo câu hỏi cộng đồng:", error)
    return res.status(500).json({ message: "Lỗi server khi tạo câu hỏi" })
  }
}

const createAnswer = async (req, res) => {
  try {
    if (!isDoctorOrAdmin(req)) {
      return res.status(403).json({ message: "Chỉ bác sĩ hoặc admin mới được trả lời câu hỏi" })
    }

    const questionId = parseId(req.params.id)
    const authorId = parseId(req.user.user_id)
    const body = trimOrNull(req.body.body)
    if (!questionId) return res.status(400).json({ message: "question_id không hợp lệ" })
    if (!body || body.length > MAX_BODY_LENGTH) {
      return res.status(400).json({ message: `Câu trả lời là bắt buộc và tối đa ${MAX_BODY_LENGTH} ký tự` })
    }

    const question = await prisma.communityQuestion.findFirst({
      where: {
        question_id: questionId,
        status: { not: CommunityQuestionStatus.HIDDEN },
      },
      include: {
        author: { select: { user_id: true, name: true } },
      },
    })

    if (!question) return res.status(404).json({ message: "Không tìm thấy câu hỏi" })

    const answer = await prisma.$transaction(async (tx) => {
      const answerCount = await tx.communityAnswer.count({ where: { question_id: questionId } })
      const shouldPrefer = req.body.is_preferred === true || answerCount === 0

      if (shouldPrefer) {
        await tx.communityAnswer.updateMany({
          where: { question_id: questionId, is_preferred: true },
          data: { is_preferred: false },
        })
      }

      const created = await tx.communityAnswer.create({
        data: {
          question_id: questionId,
          author_id: authorId,
          body,
          is_preferred: shouldPrefer,
        },
        include: {
          author: {
            select: {
              user_id: true,
              name: true,
              role: true,
              doctorProfile: { select: { avatar_url: true } },
            },
          },
        },
      })

      await tx.communityQuestion.update({
        where: { question_id: questionId },
        data: { status: CommunityQuestionStatus.ANSWERED },
      })

      return created
    })

    await createNotification({
      io: req.app.get("io"),
      type: NotificationType.COMMUNITY_ANSWER,
      title: "Câu hỏi của bạn có câu trả lời mới",
      message: `${answer.author.name} đã trả lời câu hỏi "${question.title}".`,
      actorId: authorId,
      entityType: "community_question",
      entityId: questionId,
      payload: {
        question_id: questionId,
        answer_id: answer.answer_id,
      },
      recipientUserIds: [question.author_id],
    })

    return res.status(201).json({
      message: "Đã trả lời câu hỏi",
      answer: mapAnswer(answer),
    })
  } catch (error) {
    console.error("Lỗi tạo câu trả lời cộng đồng:", error)
    return res.status(500).json({ message: "Lỗi server khi tạo câu trả lời" })
  }
}

const createComment = async (req, res) => {
  try {
    const questionId = parseId(req.params.id)
    const authorId = parseId(req.user.user_id)
    const body = trimOrNull(req.body.body)
    if (!questionId) return res.status(400).json({ message: "question_id không hợp lệ" })
    if (!body || body.length > MAX_COMMENT_LENGTH) {
      return res.status(400).json({ message: `Bình luận là bắt buộc và tối đa ${MAX_COMMENT_LENGTH} ký tự` })
    }

    const question = await prisma.communityQuestion.findFirst({
      where: {
        question_id: questionId,
        status: { not: CommunityQuestionStatus.HIDDEN },
      },
      select: {
        question_id: true,
        author_id: true,
        title: true,
      },
    })

    if (!question) return res.status(404).json({ message: "Không tìm thấy câu hỏi" })

    const comment = await prisma.communityComment.create({
      data: {
        question_id: questionId,
        author_id: authorId,
        body,
      },
      include: {
        author: {
          select: {
            user_id: true,
            name: true,
            role: true,
            doctorProfile: { select: { avatar_url: true } },
          },
        },
      },
    })

    if (question.author_id !== authorId) {
      await createNotification({
        io: req.app.get("io"),
        type: NotificationType.COMMUNITY_COMMENT,
        title: "Câu hỏi của bạn có bình luận mới",
        message: `${comment.author.name} đã bình luận trong câu hỏi "${question.title}".`,
        actorId: authorId,
        entityType: "community_question",
        entityId: questionId,
        payload: {
          question_id: questionId,
          comment_id: comment.comment_id,
        },
        recipientUserIds: [question.author_id],
      })
    }

    return res.status(201).json({
      message: "Đã gửi bình luận",
      comment: mapComment(comment),
    })
  } catch (error) {
    console.error("Lỗi tạo bình luận cộng đồng:", error)
    return res.status(500).json({ message: "Lỗi server khi tạo bình luận" })
  }
}

const updateReaction = async (req, res) => {
  try {
    const questionId = parseId(req.params.id)
    const userId = parseId(req.user.user_id)
    const type = req.body.type === null || req.body.type === undefined
      ? null
      : String(req.body.type).toUpperCase()

    if (!questionId) return res.status(400).json({ message: "question_id không hợp lệ" })
    if (type !== null && !Object.values(CommunityReactionType).includes(type)) {
      return res.status(400).json({ message: "type reaction không hợp lệ" })
    }

    const question = await prisma.communityQuestion.findFirst({
      where: {
        question_id: questionId,
        status: { not: CommunityQuestionStatus.HIDDEN },
      },
      select: { question_id: true, share_count: true },
    })
    if (!question) return res.status(404).json({ message: "Không tìm thấy câu hỏi" })

    if (type === null) {
      await prisma.communityQuestionReaction.deleteMany({
        where: { question_id: questionId, user_id: userId },
      })
    } else {
      const updated = await prisma.communityQuestionReaction.updateMany({
        where: { question_id: questionId, user_id: userId },
        data: { type },
      })

      if (!Number(updated.count || 0)) {
        try {
          await prisma.communityQuestionReaction.create({
            data: {
              question_id: questionId,
              user_id: userId,
              type,
            },
          })
        } catch (error) {
          if (error?.code !== "P2002") throw error
          await prisma.communityQuestionReaction.updateMany({
            where: { question_id: questionId, user_id: userId },
            data: { type },
          })
        }
      }
    }

    const statsMap = await loadQuestionStats([questionId])
    return res.json({
      message: "Đã cập nhật reaction",
      my_reaction: type,
      stats: {
        ...statsMap.get(questionId),
        shares: question.share_count,
      },
    })
  } catch (error) {
    console.error("Lỗi cập nhật reaction cộng đồng:", error)
    return res.status(500).json({ message: "Lỗi server khi cập nhật reaction" })
  }
}

const shareQuestion = async (req, res) => {
  try {
    const questionId = parseId(req.params.id)
    if (!questionId) return res.status(400).json({ message: "question_id không hợp lệ" })

    const updated = await prisma.communityQuestion.updateMany({
      where: {
        question_id: questionId,
        status: { not: CommunityQuestionStatus.HIDDEN },
      },
      data: { share_count: { increment: 1 } },
    })

    if (!Number(updated.count || 0)) {
      return res.status(404).json({ message: "Không tìm thấy câu hỏi" })
    }

    const question = await prisma.communityQuestion.findUnique({
      where: { question_id: questionId },
      select: { share_count: true },
    })

    const statsMap = await loadQuestionStats([questionId])
    const stats = statsMap.get(questionId) || {}

    return res.json({
      message: "Đã ghi nhận chia sẻ",
      stats: {
        likes: stats.likes || 0,
        dislikes: stats.dislikes || 0,
        comments: stats.comments || 0,
        answers: stats.answers || 0,
        shares: question.share_count,
      },
    })
  } catch (error) {
    if (error?.code === "P2025") {
      return res.status(404).json({ message: "Không tìm thấy câu hỏi" })
    }
    console.error("Lỗi ghi nhận chia sẻ cộng đồng:", error)
    return res.status(500).json({ message: "Lỗi server khi ghi nhận chia sẻ" })
  }
}

const uploadFiles = async (req, res) => {
  try {
    if (req.uploadError) {
      throw req.uploadError
    }

    const files = req.files || []
    if (!files.length) {
      return res.status(400).json({ message: "Vui lòng chọn file để upload" })
    }

    const attachments = await uploadCommunityFiles(files)
    return res.status(201).json({
      message: "Upload file cộng đồng thành công",
      attachments,
    })
  } catch (error) {
    if (error.message === "CLOUDINARY_NOT_CONFIGURED") {
      return res.status(503).json({ message: "Cloudinary chưa được cấu hình" })
    }
    if (error.message === "UNSUPPORTED_FILE_TYPE") {
      return res.status(400).json({ message: "Chỉ hỗ trợ ảnh JPEG/PNG/WebP/GIF hoặc PDF" })
    }
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: `Mỗi file tối đa ${MAX_MB}MB` })
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({ message: `Tối đa ${MAX_FILES} file mỗi lần upload` })
    }

    console.error("Lỗi upload file cộng đồng:", error)
    return res.status(500).json({ message: "Lỗi server khi upload file cộng đồng" })
  }
}

module.exports = {
  listArticles,
  getArticle,
  createArticle,
  updateArticle,
  deleteArticle,
  listQuestions,
  getQuestion,
  createQuestion,
  createAnswer,
  createComment,
  updateReaction,
  shareQuestion,
  uploadFiles,
}
