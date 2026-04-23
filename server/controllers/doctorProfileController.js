const { AppointmentStatus, DoctorHireStatus, UserRole } = require("@prisma/client")
const prisma = require("../prismaClient")

const DOCTOR_ROLE_TEXT = "bác sĩ"
const PATIENT_ROLE_TEXT = "bệnh nhân"
const ADMIN_ROLE_TEXT = "admin"

const DEFAULT_REVIEW_LIMIT = 10
const MAX_REVIEW_LIMIT = 30
const MAX_REVIEW_COMMENT_LENGTH = 2000
const MAX_EXPERIENCE_YEARS = 80

const parseId = (value) => {
  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) ? parsed : null
}

const normalizePageLimit = (value, fallback = DEFAULT_REVIEW_LIMIT) => {
  const parsed = parseId(value)
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback
  return Math.min(parsed, MAX_REVIEW_LIMIT)
}

const isDoctorRequest = (req) => req.user?.role === DOCTOR_ROLE_TEXT
const isPatientRequest = (req) => req.user?.role === PATIENT_ROLE_TEXT
const isAdminRequest = (req) => req.user?.role === ADMIN_ROLE_TEXT

const isValidOptionalEmail = (value) => {
  if (value === null || value === undefined || value === "") return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim())
}

const trimOrNull = (value) => {
  if (value === undefined) return undefined
  if (value === null) return null
  const trimmed = String(value).trim()
  return trimmed ? trimmed : null
}

const clampNonNegativeInteger = (value) => {
  if (value === undefined) return undefined
  if (value === null || value === "") return null
  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : NaN
}

const encodeReviewCursor = (review) => {
  const createdAt = review?.created_at ? new Date(review.created_at).toISOString() : null
  const reviewId = parseId(review?.review_id)
  if (!createdAt || !Number.isInteger(reviewId)) return null
  return Buffer.from(JSON.stringify({ created_at: createdAt, review_id: reviewId }), "utf8").toString("base64")
}

const parseReviewCursor = (cursor) => {
  try {
    if (!cursor) return null
    const decoded = JSON.parse(Buffer.from(String(cursor), "base64").toString("utf8"))
    const createdAt = decoded?.created_at ? new Date(decoded.created_at) : null
    const reviewId = parseId(decoded?.review_id)
    if (!(createdAt instanceof Date) || Number.isNaN(createdAt.getTime())) return null
    if (!Number.isInteger(reviewId)) return null
    return { createdAt, reviewId }
  } catch (_error) {
    return null
  }
}

const buildReviewWhereFromCursor = (doctorId, cursor) => {
  if (!cursor) {
    return { doctor_id: doctorId, is_visible: true }
  }

  return {
    doctor_id: doctorId,
    is_visible: true,
    OR: [
      { created_at: { lt: cursor.createdAt } },
      {
        AND: [
          { created_at: cursor.createdAt },
          { review_id: { lt: cursor.reviewId } },
        ],
      },
    ],
  }
}

const maskPatientName = (name) => {
  const parts = String(name || "Bệnh nhân LifeTrack")
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (!parts.length) return "Bệnh nhân LifeTrack"
  if (parts.length === 1) return `${parts[0][0] || "B"}.`

  const [first, ...rest] = parts
  const suffix = rest.map((part) => `${part[0] || ""}.`).join(" ")
  return `${first} ${suffix}`.trim()
}

const mapReviewForResponse = (review) => ({
  review_id: review.review_id,
  doctor_id: review.doctor_id,
  patient_display_name: maskPatientName(review.patient?.name),
  rating: review.rating,
  comment: review.comment,
  created_at: review.created_at,
  updated_at: review.updated_at,
})

const buildViewerState = ({ requesterId, requesterRole, doctorId, doctor, hire }) => ({
  hire_id: hire?.hire_id || null,
  hire_status: hire?.status || null,
  is_hired: hire?.status === DoctorHireStatus.ACTIVE,
  can_message: hire?.status === DoctorHireStatus.ACTIVE,
  can_book: requesterRole === DOCTOR_ROLE_TEXT ? false : Boolean(doctor?.is_active),
  is_owner: requesterId === doctorId,
})

const getDoctorCoreById = async (doctorId) => {
  return prisma.user.findFirst({
    where: {
      user_id: doctorId,
      role: UserRole.BAC_SI,
    },
    select: {
      user_id: true,
      name: true,
      email: true,
      is_active: true,
      consultation_fee: true,
      doctorProfile: {
        select: {
          profile_id: true,
          specialty: true,
          title: true,
          hospital: true,
          location: true,
          bio: true,
          avatar_url: true,
          experience_years: true,
          public_contact_email: true,
          hire_price: true,
          is_listed: true,
          created_at: true,
          updated_at: true,
        },
      },
    },
  })
}

const buildDefaultProfileCore = (doctor) => ({
  profile_id: null,
  doctor_id: doctor.user_id,
  specialty: null,
  title: null,
  hospital: null,
  location: null,
  bio: null,
  avatar_url: null,
  experience_years: null,
  public_contact_email: null,
  hire_price: Number(doctor.consultation_fee || 0),
  is_listed: false,
  created_at: null,
  updated_at: null,
})

const getEffectiveProfile = (doctor) => doctor.doctorProfile || buildDefaultProfileCore(doctor)

const canRequesterViewUnlistedDoctor = async ({ requesterId, requesterRole, doctorId }) => {
  if (!requesterId) return false
  if (requesterId === doctorId) return true
  if (requesterRole === ADMIN_ROLE_TEXT) return true
  if (requesterRole !== PATIENT_ROLE_TEXT) return false

  const [hire, appointment] = await Promise.all([
    prisma.doctorHire.findFirst({
      where: {
        patient_id: requesterId,
        doctor_id: doctorId,
      },
      select: { hire_id: true },
    }),
    prisma.appointment.findFirst({
      where: {
        patient_id: requesterId,
        doctor_id: doctorId,
      },
      select: { appointment_id: true },
    }),
  ])

  return Boolean(hire || appointment)
}

const loadProfileSections = async (profileId) => {
  if (!profileId) {
    return {
      educations: [],
      researches: [],
      experiences: [],
    }
  }

  const [educations, researches, experiences] = await Promise.all([
    prisma.doctorProfileEducation.findMany({
      where: { profile_id: profileId },
      select: {
        education_id: true,
        title: true,
        organization: true,
        year_label: true,
        display_order: true,
      },
      orderBy: [{ display_order: "asc" }, { education_id: "asc" }],
    }),
    prisma.doctorProfileResearch.findMany({
      where: { profile_id: profileId },
      select: {
        research_id: true,
        title: true,
        source: true,
        published_year: true,
        display_order: true,
      },
      orderBy: [{ display_order: "asc" }, { research_id: "asc" }],
    }),
    prisma.doctorProfileExperience.findMany({
      where: { profile_id: profileId },
      select: {
        experience_id: true,
        title: true,
        organization: true,
        time_label: true,
        display_order: true,
      },
      orderBy: [{ display_order: "asc" }, { experience_id: "asc" }],
    }),
  ])

  return { educations, researches, experiences }
}

const loadEditableProfileResponse = async (doctorId) => {
  const doctor = await getDoctorCoreById(doctorId)
  if (!doctor) return null

  const profile = getEffectiveProfile(doctor)
  const { educations, researches, experiences } = await loadProfileSections(profile.profile_id)

  return {
    doctor_id: doctor.user_id,
    name: doctor.name,
    email: doctor.email,
    consultation_fee: Number(doctor.consultation_fee || 0),
    profile: {
      profile_id: profile.profile_id,
      title: profile.title,
      specialty: profile.specialty,
      experience_years: profile.experience_years,
      hospital: profile.hospital,
      location: profile.location,
      about: profile.bio,
      avatar_url: profile.avatar_url,
      public_contact_email: profile.public_contact_email,
      hire_price: Number(profile.hire_price ?? doctor.consultation_fee ?? 0),
      is_listed: Boolean(profile.is_listed),
      educations,
      researches,
      experiences,
    },
  }
}

const normalizeEducationItems = (items) => {
  return items.map((item, index) => ({
    title: String(item?.title || "").trim(),
    organization: String(item?.organization || item?.subtitle || "").trim(),
    year_label: trimOrNull(item?.year_label ?? item?.year),
    display_order: index,
  }))
}

const normalizeResearchItems = (items) => {
  return items.map((item, index) => ({
    title: String(item?.title || "").trim(),
    source: String(item?.source || "").trim(),
    published_year: clampNonNegativeInteger(item?.published_year),
    display_order: index,
  }))
}

const normalizeExperienceItems = (items) => {
  return items.map((item, index) => ({
    title: String(item?.title || "").trim(),
    organization: String(item?.organization || item?.org || "").trim(),
    time_label: trimOrNull(item?.time_label ?? item?.time),
    display_order: index,
  }))
}

const validateSectionItems = ({ educations, researches, experiences }) => {
  if (educations !== undefined) {
    if (!Array.isArray(educations)) return "educations phải là mảng"
    const invalid = normalizeEducationItems(educations).some((item) => !item.title || !item.organization)
    if (invalid) return "Mỗi education cần title và organization"
  }

  if (researches !== undefined) {
    if (!Array.isArray(researches)) return "researches phải là mảng"
    const normalized = normalizeResearchItems(researches)
    const invalid = normalized.some((item) => !item.title || !item.source || Number.isNaN(item.published_year))
    if (invalid) return "Mỗi research cần title, source và published_year hợp lệ nếu có"
  }

  if (experiences !== undefined) {
    if (!Array.isArray(experiences)) return "experiences phải là mảng"
    const invalid = normalizeExperienceItems(experiences).some((item) => !item.title || !item.organization)
    if (invalid) return "Mỗi experience cần title và organization"
  }

  return null
}

const buildCatalogReviewStatsMap = async (doctorIds) => {
  if (!doctorIds.length) return new Map()

  const reviewStats = await prisma.doctorReview.groupBy({
    by: ["doctor_id"],
    where: {
      doctor_id: { in: doctorIds },
      is_visible: true,
    },
    _avg: { rating: true },
    _count: { review_id: true },
  })

  return new Map(reviewStats.map((item) => [
    item.doctor_id,
    {
      average_rating: item._avg.rating ? Number(item._avg.rating.toFixed(1)) : 0,
      review_count: Number(item._count.review_id || 0),
    },
  ]))
}

const getCatalogDoctors = async ({ keyword, requesterId, requesterRole }) => {
  const doctors = await prisma.user.findMany({
    where: {
      role: UserRole.BAC_SI,
      is_active: true,
      doctorProfile: {
        is: {
          is_listed: true,
        },
      },
      ...(keyword
        ? {
            OR: [
              { name: { contains: keyword } },
              { email: { contains: keyword } },
              { doctorProfile: { is: { specialty: { contains: keyword } } } },
              { doctorProfile: { is: { hospital: { contains: keyword } } } },
            ],
          }
        : {}),
    },
    select: {
      user_id: true,
      name: true,
      email: true,
      consultation_fee: true,
      doctorProfile: {
        select: {
          specialty: true,
          title: true,
          hospital: true,
          location: true,
          bio: true,
          avatar_url: true,
          experience_years: true,
          public_contact_email: true,
          hire_price: true,
          is_listed: true,
        },
      },
    },
    orderBy: { name: "asc" },
  })

  const doctorIds = doctors.map((doctor) => doctor.user_id)
  const [reviewStatsMap, hires] = await Promise.all([
    buildCatalogReviewStatsMap(doctorIds),
    requesterRole === PATIENT_ROLE_TEXT
      ? prisma.doctorHire.findMany({
          where: { patient_id: requesterId },
          select: {
            hire_id: true,
            doctor_id: true,
            status: true,
            can_view_ehr: true,
            can_view_medications: true,
            can_view_ecg: true,
          },
        })
      : Promise.resolve([]),
  ])

  const hireByDoctorId = new Map(hires.map((hire) => [hire.doctor_id, hire]))

  return doctors.map((doctor) => {
    const profile = doctor.doctorProfile || {}
    const hire = hireByDoctorId.get(doctor.user_id)
    const stats = reviewStatsMap.get(doctor.user_id) || {
      average_rating: 0,
      review_count: 0,
    }

    return {
      user_id: doctor.user_id,
      name: doctor.name,
      email: doctor.email,
      consultation_fee: Number(doctor.consultation_fee || 0),
      specialty: profile.specialty || "Tim mạch",
      title: profile.title || doctor.name,
      hospital: profile.hospital || "LifeTrack Care",
      location: profile.location || "Khám trực tuyến",
      bio: profile.bio || "Bác sĩ đang tham gia mạng lưới chăm sóc của LifeTrack.",
      avatar_url: profile.avatar_url || null,
      experience_years: profile.experience_years ?? null,
      public_contact_email: profile.public_contact_email || null,
      hire_price: Number(profile.hire_price ?? doctor.consultation_fee ?? 0),
      average_rating: stats.average_rating,
      review_count: stats.review_count,
      viewer_state: {
        hire_id: hire?.hire_id || null,
        hire_status: hire?.status || null,
        is_hired: hire?.status === DoctorHireStatus.ACTIVE,
      },
      can_view_ehr: hire?.can_view_ehr || false,
      can_view_medications: hire?.can_view_medications || false,
      can_view_ecg: hire?.can_view_ecg || false,
    }
  })
}

const listDoctorCatalog = async (req, res) => {
  const startedAt = Date.now()

  try {
    const keyword = String(req.query.q || "").trim()
    const requesterId = parseId(req.user?.user_id)
    const doctors = await getCatalogDoctors({
      keyword,
      requesterId,
      requesterRole: req.user?.role,
    })

    console.log(JSON.stringify({
      event: "DOCTOR_PROFILE_CATALOG_TIMING",
      source: "doctor-profile",
      user_id: requesterId,
      doctor_count: doctors.length,
      duration_ms: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    }))

    return res.json({ doctors })
  } catch (error) {
    console.error("Lỗi lấy catalog bác sĩ:", error)
    return res.status(500).json({ message: "Lỗi server khi lấy danh sách bác sĩ" })
  }
}

const getDoctorProfile = async (req, res) => {
  const startedAt = Date.now()

  try {
    const doctorId = parseId(req.params.doctorId)
    const requesterId = parseId(req.user?.user_id)
    if (!doctorId) {
      return res.status(400).json({ message: "doctorId không hợp lệ" })
    }

    const doctor = await getDoctorCoreById(doctorId)
    if (!doctor) {
      return res.status(404).json({ message: "Không tìm thấy bác sĩ" })
    }

    const profile = getEffectiveProfile(doctor)
    const canView = profile.is_listed || await canRequesterViewUnlistedDoctor({
      requesterId,
      requesterRole: req.user?.role,
      doctorId,
    })

    if (!canView) {
      return res.status(403).json({ message: "Hồ sơ bác sĩ hiện không khả dụng" })
    }

    const [sections, weeklySchedule, reviewsPreview, reviewStats, activePatientCount, hire] = await Promise.all([
      loadProfileSections(profile.profile_id),
      prisma.doctorAvailability.findMany({
        where: {
          doctor_id: doctorId,
          is_active: true,
        },
        select: {
          day_of_week: true,
          start_time: true,
          end_time: true,
          slot_minutes: true,
          is_active: true,
        },
        orderBy: [{ day_of_week: "asc" }, { start_time: "asc" }],
      }),
      prisma.doctorReview.findMany({
        where: {
          doctor_id: doctorId,
          is_visible: true,
        },
        select: {
          review_id: true,
          doctor_id: true,
          rating: true,
          comment: true,
          created_at: true,
          updated_at: true,
          patient: {
            select: {
              name: true,
            },
          },
        },
        orderBy: [{ created_at: "desc" }, { review_id: "desc" }],
        take: 4,
      }),
      prisma.doctorReview.aggregate({
        where: {
          doctor_id: doctorId,
          is_visible: true,
        },
        _avg: { rating: true },
        _count: { review_id: true },
      }),
      prisma.doctorHire.count({
        where: {
          doctor_id: doctorId,
          status: DoctorHireStatus.ACTIVE,
        },
      }),
      isPatientRequest(req)
        ? prisma.doctorHire.findFirst({
            where: {
              patient_id: requesterId,
              doctor_id: doctorId,
            },
            select: {
              hire_id: true,
              status: true,
            },
          })
        : Promise.resolve(null),
    ])

    const response = {
      doctor_id: doctor.user_id,
      name: doctor.name,
      title: profile.title,
      specialty: profile.specialty,
      experience_years: profile.experience_years,
      hospital: profile.hospital,
      location: profile.location,
      about: profile.bio,
      avatar_url: profile.avatar_url,
      public_contact_email: profile.public_contact_email,
      consultation_fee: Number(doctor.consultation_fee || 0),
      hire_price: Number(profile.hire_price ?? doctor.consultation_fee ?? 0),
      is_listed: Boolean(profile.is_listed),
      stats: {
        active_patient_count: activePatientCount,
        average_rating: reviewStats._avg.rating ? Number(reviewStats._avg.rating.toFixed(1)) : 0,
        review_count: Number(reviewStats._count.review_id || 0),
      },
      education: sections.educations,
      research: sections.researches,
      career: sections.experiences,
      weekly_schedule: weeklySchedule,
      reviews_preview: reviewsPreview.map(mapReviewForResponse),
      viewer_state: buildViewerState({
        requesterId,
        requesterRole: req.user?.role,
        doctorId,
        doctor,
        hire,
      }),
    }

    console.log(JSON.stringify({
      event: "DOCTOR_PROFILE_TIMING",
      source: "doctor-profile",
      doctor_id: doctorId,
      requester_id: requesterId,
      duration_ms: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    }))

    return res.json({ profile: response })
  } catch (error) {
    console.error("Lỗi lấy hồ sơ bác sĩ:", error)
    return res.status(500).json({ message: "Lỗi server khi lấy hồ sơ bác sĩ" })
  }
}

const getDoctorReviews = async (req, res) => {
  const startedAt = Date.now()

  try {
    const doctorId = parseId(req.params.doctorId)
    if (!doctorId) {
      return res.status(400).json({ message: "doctorId không hợp lệ" })
    }

    const doctor = await getDoctorCoreById(doctorId)
    if (!doctor) {
      return res.status(404).json({ message: "Không tìm thấy bác sĩ" })
    }

    const profile = getEffectiveProfile(doctor)
    const requesterId = parseId(req.user?.user_id)
    const canView = profile.is_listed || await canRequesterViewUnlistedDoctor({
      requesterId,
      requesterRole: req.user?.role,
      doctorId,
    })

    if (!canView) {
      return res.status(403).json({ message: "Hồ sơ bác sĩ hiện không khả dụng" })
    }

    const limit = normalizePageLimit(req.query.limit)
    const cursor = typeof req.query.cursor === "string" ? req.query.cursor.trim() : ""
    const decodedCursor = parseReviewCursor(cursor)

    const rows = await prisma.doctorReview.findMany({
      where: buildReviewWhereFromCursor(doctorId, decodedCursor),
      select: {
        review_id: true,
        doctor_id: true,
        rating: true,
        comment: true,
        created_at: true,
        updated_at: true,
        patient: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ created_at: "desc" }, { review_id: "desc" }],
      take: limit + 1,
    })

    const hasMore = rows.length > limit
    const pageRows = hasMore ? rows.slice(0, limit) : rows
    const nextCursor = hasMore && pageRows.length > 0 ? encodeReviewCursor(pageRows[pageRows.length - 1]) : null

    console.log(JSON.stringify({
      event: "DOCTOR_PROFILE_REVIEWS_TIMING",
      source: "doctor-profile",
      doctor_id: doctorId,
      requester_id: requesterId,
      review_count: pageRows.length,
      has_more: hasMore,
      duration_ms: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    }))

    return res.json({
      reviews: pageRows.map(mapReviewForResponse),
      next_cursor: nextCursor,
      has_more: hasMore,
    })
  } catch (error) {
    console.error("Lỗi lấy reviews bác sĩ:", error)
    return res.status(500).json({ message: "Lỗi server khi lấy đánh giá bác sĩ" })
  }
}

const getMyDoctorReview = async (req, res) => {
  try {
    if (!isPatientRequest(req)) {
      return res.status(403).json({ message: "Chỉ bệnh nhân mới xem được đánh giá của mình" })
    }

    const doctorId = parseId(req.params.doctorId)
    const patientId = parseId(req.user?.user_id)
    if (!doctorId) {
      return res.status(400).json({ message: "doctorId không hợp lệ" })
    }

    const eligibility = await canPatientReviewDoctor({ patientId, doctorId })
    const review = await prisma.doctorReview.findUnique({
      where: {
        doctor_id_patient_id: {
          doctor_id: doctorId,
          patient_id: patientId,
        },
      },
      select: {
        review_id: true,
        doctor_id: true,
        rating: true,
        comment: true,
        created_at: true,
        updated_at: true,
        is_visible: true,
        patient: {
          select: {
            name: true,
          },
        },
      },
    })

    return res.json({
      can_review: eligibility.allowed,
      review: review ? mapReviewForResponse(review) : null,
    })
  } catch (error) {
    console.error("Lỗi lấy đánh giá của bệnh nhân:", error)
    return res.status(500).json({ message: "Lỗi server khi lấy đánh giá của bạn" })
  }
}

const getMyDoctorProfile = async (req, res) => {
  try {
    if (!isDoctorRequest(req)) {
      return res.status(403).json({ message: "Chỉ bác sĩ mới xem được hồ sơ chỉnh sửa của mình" })
    }

    const doctorId = parseId(req.user?.user_id)
    const profile = await loadEditableProfileResponse(doctorId)
    if (!profile) {
      return res.status(404).json({ message: "Không tìm thấy tài khoản bác sĩ" })
    }

    return res.json(profile)
  } catch (error) {
    console.error("Lỗi lấy hồ sơ chỉnh sửa bác sĩ:", error)
    return res.status(500).json({ message: "Lỗi server khi lấy hồ sơ chỉnh sửa" })
  }
}

const upsertMyDoctorProfile = async (req, res) => {
  const startedAt = Date.now()

  try {
    if (!isDoctorRequest(req)) {
      return res.status(403).json({ message: "Chỉ bác sĩ mới được cập nhật hồ sơ" })
    }

    const doctorId = parseId(req.user?.user_id)
    const doctor = await prisma.user.findFirst({
      where: {
        user_id: doctorId,
        role: UserRole.BAC_SI,
      },
      select: {
        user_id: true,
        consultation_fee: true,
      },
    })

    if (!doctor) {
      return res.status(404).json({ message: "Không tìm thấy tài khoản bác sĩ" })
    }

    const experienceYears = clampNonNegativeInteger(req.body.experience_years)
    const hirePrice = clampNonNegativeInteger(req.body.hire_price)

    if (Number.isNaN(experienceYears) || experienceYears > MAX_EXPERIENCE_YEARS) {
      return res.status(400).json({ message: `experience_years phải nằm trong khoảng 0-${MAX_EXPERIENCE_YEARS}` })
    }

    if (Number.isNaN(hirePrice)) {
      return res.status(400).json({ message: "hire_price phải là số nguyên không âm" })
    }

    if (!isValidOptionalEmail(req.body.public_contact_email)) {
      return res.status(400).json({ message: "public_contact_email không hợp lệ" })
    }

    const sectionError = validateSectionItems({
      educations: req.body.educations,
      researches: req.body.researches,
      experiences: req.body.experiences,
    })
    if (sectionError) {
      return res.status(400).json({ message: sectionError })
    }

    const coreData = {}
    if (req.body.title !== undefined) coreData.title = trimOrNull(req.body.title)
    if (req.body.specialty !== undefined) coreData.specialty = trimOrNull(req.body.specialty)
    if (req.body.experience_years !== undefined) coreData.experience_years = experienceYears
    if (req.body.hospital !== undefined) coreData.hospital = trimOrNull(req.body.hospital)
    if (req.body.location !== undefined) coreData.location = trimOrNull(req.body.location)
    if (req.body.about !== undefined) coreData.bio = trimOrNull(req.body.about)
    if (req.body.avatar_url !== undefined) coreData.avatar_url = trimOrNull(req.body.avatar_url)
    if (req.body.public_contact_email !== undefined) coreData.public_contact_email = trimOrNull(req.body.public_contact_email)
    if (req.body.hire_price !== undefined) coreData.hire_price = hirePrice
    if (req.body.is_listed !== undefined) coreData.is_listed = Boolean(req.body.is_listed)

    await prisma.$transaction(async (tx) => {
      const profile = await tx.doctorProfile.upsert({
        where: { doctor_id: doctorId },
        update: coreData,
        create: {
          doctor_id: doctorId,
          hire_price: Number(doctor.consultation_fee || 0),
          ...coreData,
        },
        select: {
          profile_id: true,
        },
      })

      if (req.body.educations !== undefined) {
        await tx.doctorProfileEducation.deleteMany({
          where: { profile_id: profile.profile_id },
        })
        const rows = normalizeEducationItems(req.body.educations)
        if (rows.length > 0) {
          await tx.doctorProfileEducation.createMany({
            data: rows.map((item) => ({
              profile_id: profile.profile_id,
              ...item,
            })),
          })
        }
      }

      if (req.body.researches !== undefined) {
        await tx.doctorProfileResearch.deleteMany({
          where: { profile_id: profile.profile_id },
        })
        const rows = normalizeResearchItems(req.body.researches)
        if (rows.length > 0) {
          await tx.doctorProfileResearch.createMany({
            data: rows.map((item) => ({
              profile_id: profile.profile_id,
              ...item,
            })),
          })
        }
      }

      if (req.body.experiences !== undefined) {
        await tx.doctorProfileExperience.deleteMany({
          where: { profile_id: profile.profile_id },
        })
        const rows = normalizeExperienceItems(req.body.experiences)
        if (rows.length > 0) {
          await tx.doctorProfileExperience.createMany({
            data: rows.map((item) => ({
              profile_id: profile.profile_id,
              ...item,
            })),
          })
        }
      }
    })

    const profile = await loadEditableProfileResponse(doctorId)

    console.log(JSON.stringify({
      event: "DOCTOR_PROFILE_UPSERT_TIMING",
      source: "doctor-profile",
      doctor_id: doctorId,
      duration_ms: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    }))

    return res.json({
      message: "Đã cập nhật hồ sơ bác sĩ",
      ...profile,
    })
  } catch (error) {
    console.error("Lỗi cập nhật hồ sơ bác sĩ:", error)
    return res.status(500).json({ message: "Lỗi server khi cập nhật hồ sơ bác sĩ" })
  }
}

const ensureReviewInput = (body) => {
  const rating = parseId(body?.rating)
  const rawComment = body?.comment
  const comment = rawComment === undefined ? undefined : trimOrNull(rawComment)

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "rating phải từ 1 đến 5" }
  }

  if (comment && comment.length > MAX_REVIEW_COMMENT_LENGTH) {
    return { error: `comment tối đa ${MAX_REVIEW_COMMENT_LENGTH} ký tự` }
  }

  return {
    value: {
      rating,
      comment: comment ?? null,
    },
  }
}

const canPatientReviewDoctor = async ({ patientId, doctorId }) => {
  const [hire, appointment] = await Promise.all([
    prisma.doctorHire.findFirst({
      where: {
        patient_id: patientId,
        doctor_id: doctorId,
        status: {
          in: [
            DoctorHireStatus.ACTIVE,
            DoctorHireStatus.CANCELLED,
            DoctorHireStatus.EXPIRED,
          ],
        },
      },
      select: {
        hire_id: true,
      },
    }),
    prisma.appointment.findFirst({
      where: {
        patient_id: patientId,
        doctor_id: doctorId,
        status: AppointmentStatus.COMPLETED,
      },
      select: {
        appointment_id: true,
      },
    }),
  ])

  return {
    allowed: Boolean(hire || appointment),
    sourceHireId: hire?.hire_id || null,
    sourceAppointmentId: appointment?.appointment_id || null,
  }
}

const createMyDoctorReview = async (req, res) => {
  try {
    if (!isPatientRequest(req)) {
      return res.status(403).json({ message: "Chỉ bệnh nhân mới được đánh giá bác sĩ" })
    }

    const doctorId = parseId(req.params.doctorId)
    const patientId = parseId(req.user?.user_id)
    if (!doctorId) {
      return res.status(400).json({ message: "doctorId không hợp lệ" })
    }

    const doctor = await prisma.user.findFirst({
      where: {
        user_id: doctorId,
        role: UserRole.BAC_SI,
      },
      select: { user_id: true },
    })
    if (!doctor) {
      return res.status(404).json({ message: "Không tìm thấy bác sĩ" })
    }

    const reviewInput = ensureReviewInput(req.body)
    if (reviewInput.error) {
      return res.status(400).json({ message: reviewInput.error })
    }

    const eligibility = await canPatientReviewDoctor({ patientId, doctorId })
    if (!eligibility.allowed) {
      return res.status(403).json({ message: "Bạn chưa đủ điều kiện để đánh giá bác sĩ này" })
    }

    try {
      const review = await prisma.doctorReview.create({
        data: {
          doctor_id: doctorId,
          patient_id: patientId,
          source_hire_id: eligibility.sourceHireId,
          source_appointment_id: eligibility.sourceAppointmentId,
          rating: reviewInput.value.rating,
          comment: reviewInput.value.comment,
          is_visible: true,
        },
        select: {
          review_id: true,
          doctor_id: true,
          rating: true,
          comment: true,
          created_at: true,
          updated_at: true,
          patient: {
            select: {
              name: true,
            },
          },
        },
      })

      return res.status(201).json({
        message: "Đã gửi đánh giá bác sĩ",
        review: mapReviewForResponse(review),
      })
    } catch (error) {
      if (error?.code === "P2002") {
        return res.status(409).json({ message: "Bạn đã đánh giá bác sĩ này trước đó" })
      }
      throw error
    }
  } catch (error) {
    console.error("Lỗi tạo review bác sĩ:", error)
    return res.status(500).json({ message: "Lỗi server khi tạo đánh giá bác sĩ" })
  }
}

const updateMyDoctorReview = async (req, res) => {
  try {
    if (!isPatientRequest(req)) {
      return res.status(403).json({ message: "Chỉ bệnh nhân mới được sửa đánh giá bác sĩ" })
    }

    const doctorId = parseId(req.params.doctorId)
    const patientId = parseId(req.user?.user_id)
    if (!doctorId) {
      return res.status(400).json({ message: "doctorId không hợp lệ" })
    }

    const reviewInput = ensureReviewInput(req.body)
    if (reviewInput.error) {
      return res.status(400).json({ message: reviewInput.error })
    }

    const existing = await prisma.doctorReview.findUnique({
      where: {
        doctor_id_patient_id: {
          doctor_id: doctorId,
          patient_id: patientId,
        },
      },
      select: { review_id: true },
    })

    if (!existing) {
      return res.status(404).json({ message: "Không tìm thấy đánh giá cần cập nhật" })
    }

    const updated = await prisma.doctorReview.update({
      where: {
        doctor_id_patient_id: {
          doctor_id: doctorId,
          patient_id: patientId,
        },
      },
      data: {
        rating: reviewInput.value.rating,
        comment: reviewInput.value.comment,
        is_visible: true,
      },
      select: {
        review_id: true,
        doctor_id: true,
        rating: true,
        comment: true,
        created_at: true,
        updated_at: true,
        patient: {
          select: {
            name: true,
          },
        },
      },
    })

    return res.json({
      message: "Đã cập nhật đánh giá bác sĩ",
      review: mapReviewForResponse(updated),
    })
  } catch (error) {
    console.error("Lỗi cập nhật review bác sĩ:", error)
    return res.status(500).json({ message: "Lỗi server khi cập nhật đánh giá bác sĩ" })
  }
}

const deleteMyDoctorReview = async (req, res) => {
  try {
    if (!isPatientRequest(req)) {
      return res.status(403).json({ message: "Chỉ bệnh nhân mới được xóa đánh giá bác sĩ" })
    }

    const doctorId = parseId(req.params.doctorId)
    const patientId = parseId(req.user?.user_id)
    if (!doctorId) {
      return res.status(400).json({ message: "doctorId không hợp lệ" })
    }

    const updated = await prisma.doctorReview.updateMany({
      where: {
        doctor_id: doctorId,
        patient_id: patientId,
      },
      data: {
        is_visible: false,
      },
    })

    if (!Number(updated.count || 0)) {
      return res.status(404).json({ message: "Không tìm thấy đánh giá cần xóa" })
    }

    return res.json({ message: "Đã ẩn đánh giá bác sĩ" })
  } catch (error) {
    console.error("Lỗi xóa review bác sĩ:", error)
    return res.status(500).json({ message: "Lỗi server khi xóa đánh giá bác sĩ" })
  }
}

module.exports = {
  listDoctorCatalog,
  getDoctorProfile,
  getDoctorReviews,
  getMyDoctorReview,
  getMyDoctorProfile,
  upsertMyDoctorProfile,
  createMyDoctorReview,
  updateMyDoctorReview,
  deleteMyDoctorReview,
}
