const { AccessRole, AccessStatus } = require("@prisma/client")
const prisma = require("../prismaClient")
const {
  canViewPatientDomain,
  hasAcceptedFamilyAccess,
} = require("../services/patientDoctorAccessService")

const parseId = (value) => {
  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) ? parsed : null
}

const startOfLocalDay = (value = new Date()) => {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

const endOfLocalDay = (value = new Date()) => {
  const date = new Date(value)
  date.setHours(23, 59, 59, 999)
  return date
}

const mapFamilyRelation = (relation) => ({
  relation_id: relation.relation_id,
  patient_id: relation.member_user_id,
  owner_user_id: relation.owner_user_id,
  relation_label: relation.relation_label,
  display_order: relation.display_order,
  is_active: relation.is_active,
  created_at: relation.created_at,
  updated_at: relation.updated_at,
  patient: relation.member,
  access: {
    can_view_ehr: true,
    can_view_medications: true,
    can_view_history: true,
    can_view_visits: true,
  },
})

const mapLegacyAccess = (permission) => ({
  relation_id: null,
  patient_id: permission.patient_id,
  owner_user_id: permission.viewer_id,
  relation_label: "Thành viên gia đình",
  display_order: 999,
  is_active: true,
  created_at: permission.created_at,
  updated_at: permission.updated_at,
  patient: permission.patient,
  access: {
    can_view_ehr: true,
    can_view_medications: true,
    can_view_history: true,
    can_view_visits: true,
  },
})

const loadAccessiblePatients = async (viewerId) => {
  const [relations, permissions] = await Promise.all([
    prisma.familyRelation.findMany({
      where: {
        owner_user_id: viewerId,
        is_active: true,
      },
      include: {
        member: {
          select: {
            user_id: true,
            name: true,
            email: true,
            created_at: true,
            is_active: true,
          },
        },
      },
      orderBy: [{ display_order: "asc" }, { created_at: "asc" }],
    }),
    prisma.accessPermission.findMany({
      where: {
        viewer_id: viewerId,
        role: AccessRole.GIA_DINH,
        status: AccessStatus.accepted,
      },
      include: {
        patient: {
          select: {
            user_id: true,
            name: true,
            email: true,
            created_at: true,
            is_active: true,
          },
        },
      },
      orderBy: { updated_at: "desc" },
    }),
  ])

  const deduped = new Map()

  relations
    .filter((item) => item.member?.is_active !== false)
    .forEach((item) => {
      deduped.set(item.member_user_id, mapFamilyRelation(item))
    })

  permissions
    .filter((item) => item.patient?.is_active !== false)
    .forEach((item) => {
      if (!deduped.has(item.patient_id)) {
        deduped.set(item.patient_id, mapLegacyAccess(item))
      }
    })

  return Array.from(deduped.values()).sort((left, right) => {
    if (left.display_order !== right.display_order) {
      return left.display_order - right.display_order
    }

    return new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
  })
}

exports.getAccessiblePatients = async (req, res) => {
  try {
    const viewerId = parseId(req.params.viewer_id)
    if (!viewerId) {
      return res.status(400).json({ message: "viewer_id không hợp lệ" })
    }

    const patients = await loadAccessiblePatients(viewerId)
    return res.status(200).json(patients)
  } catch (err) {
    console.error("Lỗi getAccessiblePatients:", err)
    return res.status(500).json({ error: "Lỗi khi lấy danh sách bệnh nhân" })
  }
}

exports.getMyAccessiblePatients = async (req, res) => {
  try {
    const viewerId = parseId(req.user?.user_id)
    if (!viewerId) {
      return res.status(401).json({ message: "Bạn cần đăng nhập để xem danh sách gia đình" })
    }

    const patients = await loadAccessiblePatients(viewerId)
    return res.status(200).json({ patients })
  } catch (err) {
    console.error("Lỗi getMyAccessiblePatients:", err)
    return res.status(500).json({ message: "Lỗi khi lấy danh sách bệnh nhân gia đình" })
  }
}

exports.getPatientHistory = async (req, res) => {
  try {
    const patientId = parseId(req.params.patient_id)

    if (!patientId) {
      return res.status(400).json({ message: "patient_id không hợp lệ" })
    }

    const histories = await prisma.medicalVisit.findMany({
      where: { user_id: patientId, deleted_at: null },
      include: {
        doctor: { select: { user_id: true, name: true, email: true } },
      },
      orderBy: { visit_date: "desc" },
    })

    return res.status(200).json(histories)
  } catch (err) {
    console.error("Lỗi getPatientHistory:", err)
    return res.status(500).json({ error: "Không thể tải bệnh sử" })
  }
}

exports.getFamilyPatientSummary = async (req, res) => {
  try {
    const viewerId = parseId(req.user?.user_id)
    const patientId = parseId(req.params.patientId)

    if (!viewerId) {
      return res.status(401).json({ message: "Bạn cần đăng nhập để xem hồ sơ thành viên" })
    }

    if (!patientId) {
      return res.status(400).json({ message: "patientId không hợp lệ" })
    }

    const canViewFamilyMember = await hasAcceptedFamilyAccess({
      patientId,
      viewerId,
    })

    if (!canViewFamilyMember) {
      return res.status(403).json({ message: "Bạn không có quyền xem hồ sơ thành viên này" })
    }

    const [canViewEhr, canViewMedications] = await Promise.all([
      canViewPatientDomain({ patientId, viewerId, domain: "ehr" }),
      canViewPatientDomain({ patientId, viewerId, domain: "medications" }),
    ])

    const todayStart = startOfLocalDay()
    const todayEnd = endOfLocalDay()

    const [
      relation,
      patient,
      overview,
      visits,
      reports,
      medicationPlans,
      medicationLogs,
      devices,
      alerts,
    ] = await Promise.all([
      prisma.familyRelation.findFirst({
        where: {
          owner_user_id: viewerId,
          member_user_id: patientId,
          is_active: true,
        },
        select: {
          relation_id: true,
          relation_label: true,
          display_order: true,
        },
      }),
      prisma.user.findUnique({
        where: { user_id: patientId },
        select: {
          user_id: true,
          name: true,
          email: true,
          created_at: true,
          is_active: true,
        },
      }),
      canViewEhr
        ? prisma.phrOverview.findUnique({
            where: { user_id: patientId },
          })
        : Promise.resolve(null),
      canViewEhr
        ? prisma.medicalVisit.findMany({
            where: { user_id: patientId, deleted_at: null },
            include: {
              doctor: { select: { user_id: true, name: true, email: true } },
            },
            orderBy: { visit_date: "desc" },
            take: 20,
          })
        : Promise.resolve([]),
      canViewEhr
        ? prisma.report.findMany({
            where: { user_id: patientId },
            include: {
              doctor: { select: { user_id: true, name: true, email: true } },
            },
            orderBy: { created_at: "desc" },
            take: 10,
          })
        : Promise.resolve([]),
      canViewMedications
        ? prisma.medicationPlan.findMany({
            where: { user_id: patientId },
            include: {
              doctor: { select: { user_id: true, name: true, email: true } },
              medications: true,
            },
            orderBy: { created_at: "desc" },
          })
        : Promise.resolve([]),
      canViewMedications
        ? prisma.medicationLog.findMany({
            where: {
              user_id: patientId,
              scheduled_time: {
                gte: todayStart,
                lte: todayEnd,
              },
            },
            include: {
              medication: {
                include: {
                  plan: {
                    select: {
                      plan_id: true,
                      title: true,
                      notes: true,
                    },
                  },
                },
              },
            },
            orderBy: { scheduled_time: "asc" },
          })
        : Promise.resolve([]),
      prisma.device.findMany({
        where: { user_id: patientId },
        select: { device_id: true },
      }),
      prisma.alert.findMany({
        where: {
          user_id: patientId,
          resolved: false,
        },
        orderBy: { timestamp: "desc" },
        take: 10,
      }),
    ])

    if (!patient) {
      return res.status(404).json({ message: "Không tìm thấy thành viên" })
    }

    const deviceIds = devices.map((device) => device.device_id)
    const latestReading = deviceIds.length
      ? await prisma.reading.findFirst({
          where: { device_id: { in: deviceIds } },
          orderBy: [{ timestamp: "desc" }, { reading_id: "desc" }],
        })
      : null

    return res.json({
      relation: relation || null,
      patient,
      access: {
        can_view_ehr: canViewEhr,
        can_view_medications: canViewMedications,
      },
      overview: overview || {
        user_id: patientId,
        personal_info: {},
        vitals: {},
        medical_history: {},
        clinical_results: {},
      },
      visits,
      reports,
      medication_plans: medicationPlans,
      medication_logs_today: medicationLogs,
      latest_reading: latestReading,
      alerts,
    })
  } catch (err) {
    console.error("Lỗi getFamilyPatientSummary:", err)
    return res.status(500).json({ message: "Không thể tải hồ sơ thành viên gia đình" })
  }
}
