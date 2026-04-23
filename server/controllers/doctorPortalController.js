const { AppointmentStatus, DoctorHireStatus } = require("@prisma/client")
const prisma = require("../prismaClient")
const {
  canDoctorWritePatientDomain,
  canViewPatientDomain,
} = require("../services/patientDoctorAccessService")

const DOCTOR_ROLE = "bác sĩ"
const VALID_DOMAINS = new Set(["all", "ecg", "ehr", "medications"])

const parseId = (value) => {
  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) ? parsed : null
}

const buildConversationKey = (leftUserId, rightUserId) => {
  const left = Number(leftUserId)
  const right = Number(rightUserId)
  return left < right ? `${left}_${right}` : `${right}_${left}`
}

const startOfToday = () => {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

const endOfToday = () => {
  const date = new Date()
  date.setHours(23, 59, 59, 999)
  return date
}

const getPrescriptionText = (value) => {
  if (!value) return ""
  if (typeof value === "string") return value
  if (typeof value === "object") {
    if (typeof value.notes === "string") return value.notes
    if (typeof value.text === "string") return value.text
    return JSON.stringify(value)
  }
  return String(value)
}

const getOrdersFromTests = (value) => {
  if (!value || typeof value !== "object") return []
  if (Array.isArray(value.orders)) return value.orders.map((item) => String(item).trim()).filter(Boolean)
  if (Array.isArray(value.items)) return value.items.map((item) => String(item).trim()).filter(Boolean)
  return []
}

const mapHistoryForResponse = (visit) => ({
  history_id: visit.visit_id,
  visit_date: visit.visit_date,
  created_at: visit.created_at,
  updated_at: visit.updated_at,
  diagnosis: visit.diagnosis,
  doctor_diagnosis: visit.diagnosis_details || visit.diagnosis || "",
  condition: visit.reason || "",
  notes: visit.appointment || "",
  medication: getPrescriptionText(visit.prescription),
  y_lenh: getOrdersFromTests(visit.tests),
  doctor: visit.doctor
    ? {
        user_id: visit.doctor.user_id,
        name: visit.doctor.name,
        email: visit.doctor.email,
      }
    : null,
})

const mapDocumentForResponse = (report) => ({
  document_id: report.report_id,
  report_id: report.report_id,
  title: report.doctor?.name ? `Báo cáo từ ${report.doctor.name}` : "Báo cáo y khoa",
  summary: {
    tom_tat: report.summary || "",
  },
  created_at: report.created_at,
  doctor: report.doctor
    ? {
        user_id: report.doctor.user_id,
        name: report.doctor.name,
        email: report.doctor.email,
      }
    : null,
})

const mapNotificationForResponse = (row) => ({
  notification_id: row.notification.notification_id,
  type: row.notification.type,
  title: row.notification.title,
  message: row.notification.message,
  entity_type: row.notification.entity_type,
  entity_id: row.notification.entity_id,
  payload: row.notification.payload,
  created_at: row.notification.created_at,
  is_read: row.is_read,
  read_at: row.read_at,
})

const getActiveDoctorHires = async (doctorId) => {
  return prisma.doctorHire.findMany({
    where: {
      doctor_id: doctorId,
      status: DoctorHireStatus.ACTIVE,
    },
    include: {
      patient: {
        select: {
          user_id: true,
          name: true,
          email: true,
          is_active: true,
          created_at: true,
        },
      },
    },
    orderBy: { approved_at: "desc" },
  })
}

const listDoctorPortalPatientsInternal = async ({ doctorId, domain = "all" }) => {
  const hires = await getActiveDoctorHires(doctorId)

  const filteredHires = hires.filter((hire) => {
    if (!hire.patient?.is_active) return false
    if (domain === "ecg") return Boolean(hire.can_view_ecg)
    if (domain === "ehr") return Boolean(hire.can_view_ehr)
    if (domain === "medications") return Boolean(hire.can_view_medications)
    return true
  })

  if (!filteredHires.length) {
    return []
  }

  const patientIds = filteredHires.map((hire) => hire.patient_id)
  const conversationKeys = filteredHires.map((hire) => buildConversationKey(doctorId, hire.patient_id))

  const [latestMessages, unreadCounts, devices, unresolvedAlertCounts] = await Promise.all([
    prisma.directMessage.findMany({
      where: {
        conversation_key: { in: conversationKeys },
      },
      select: {
        conversation_key: true,
        message: true,
        created_at: true,
      },
      orderBy: [{ created_at: "desc" }, { message_id: "desc" }],
    }),
    prisma.directMessage.groupBy({
      by: ["sender_id"],
      where: {
        receiver_id: doctorId,
        sender_id: { in: patientIds },
        is_read: false,
      },
      _count: {
        message_id: true,
      },
    }),
    prisma.device.findMany({
      where: {
        user_id: { in: patientIds },
      },
      select: {
        device_id: true,
        user_id: true,
      },
    }),
    prisma.alert.groupBy({
      by: ["user_id"],
      where: {
        user_id: { in: patientIds },
        resolved: false,
      },
      _count: {
        alert_id: true,
      },
    }),
  ])

  const latestMessageByConversation = new Map()
  for (const message of latestMessages) {
    if (!latestMessageByConversation.has(message.conversation_key)) {
      latestMessageByConversation.set(message.conversation_key, message)
    }
  }

  const unreadCountByPatientId = new Map(
    unreadCounts.map((item) => [item.sender_id, Number(item._count.message_id || 0)])
  )

  const unresolvedAlertsByPatientId = new Map(
    unresolvedAlertCounts.map((item) => [item.user_id, Number(item._count.alert_id || 0)])
  )

  const deviceIds = devices.map((device) => device.device_id)
  const deviceUserMap = new Map(devices.map((device) => [device.device_id, device.user_id]))

  const latestReadings = deviceIds.length
    ? await prisma.reading.findMany({
        where: {
          device_id: { in: deviceIds },
        },
        select: {
          device_id: true,
          timestamp: true,
        },
        orderBy: [{ timestamp: "desc" }, { reading_id: "desc" }],
      })
    : []

  const latestReadingByPatientId = new Map()
  for (const reading of latestReadings) {
    const patientId = deviceUserMap.get(reading.device_id)
    if (!patientId || latestReadingByPatientId.has(patientId)) continue
    latestReadingByPatientId.set(patientId, reading.timestamp)
  }

  return filteredHires
    .map((hire) => {
      const conversationKey = buildConversationKey(doctorId, hire.patient_id)
      const latestMessage = latestMessageByConversation.get(conversationKey)

      return {
        hire_id: hire.hire_id,
        patient_id: hire.patient_id,
        patient: hire.patient,
        can_view_ehr: Boolean(hire.can_view_ehr),
        can_view_medications: Boolean(hire.can_view_medications),
        can_view_ecg: Boolean(hire.can_view_ecg),
        last_message: latestMessage?.message || null,
        last_message_at: latestMessage?.created_at || null,
        unread_count: unreadCountByPatientId.get(hire.patient_id) || 0,
        latest_reading_at: latestReadingByPatientId.get(hire.patient_id) || null,
        latest_unresolved_alert_count: hire.can_view_ecg
          ? unresolvedAlertsByPatientId.get(hire.patient_id) || 0
          : 0,
      }
    })
    .sort((left, right) => {
      const leftTime = left.last_message_at ? new Date(left.last_message_at).getTime() : 0
      const rightTime = right.last_message_at ? new Date(right.last_message_at).getTime() : 0

      if (leftTime !== rightTime) {
        return rightTime - leftTime
      }

      return String(left.patient?.name || "").localeCompare(String(right.patient?.name || ""), "vi")
    })
}

const getDoctorPortalDashboard = async (req, res) => {
  try {
    const doctorId = parseId(req.user?.user_id)
    const todayStart = startOfToday()
    const todayEnd = endOfToday()

    const activeHires = await getActiveDoctorHires(doctorId)
    const activePatientIds = activeHires.map((hire) => hire.patient_id)
    const ecgPatientIds = activeHires.filter((hire) => hire.can_view_ecg).map((hire) => hire.patient_id)

    const [
      pendingHireRequests,
      unreadNotificationCount,
      recentNotifications,
      urgentAlerts,
      upcomingAppointments,
      todayAppointmentCount,
    ] = await Promise.all([
      prisma.doctorHire.findMany({
        where: {
          doctor_id: doctorId,
          status: DoctorHireStatus.PENDING_DOCTOR_APPROVAL,
        },
        include: {
          patient: {
            select: {
              user_id: true,
              name: true,
              email: true,
              created_at: true,
            },
          },
        },
        orderBy: { requested_at: "desc" },
        take: 6,
      }),
      prisma.notificationRecipient.count({
        where: {
          user_id: doctorId,
          is_read: false,
        },
      }),
      prisma.notificationRecipient.findMany({
        where: {
          user_id: doctorId,
        },
        include: {
          notification: {
            select: {
              notification_id: true,
              type: true,
              title: true,
              message: true,
              entity_type: true,
              entity_id: true,
              payload: true,
              created_at: true,
            },
          },
        },
        orderBy: { created_at: "desc" },
        take: 6,
      }),
      ecgPatientIds.length
        ? prisma.alert.findMany({
            where: {
              user_id: { in: ecgPatientIds },
              resolved: false,
            },
            include: {
              user: {
                select: {
                  user_id: true,
                  name: true,
                  email: true,
                },
              },
            },
            orderBy: { timestamp: "desc" },
            take: 6,
          })
        : Promise.resolve([]),
      prisma.appointment.findMany({
        where: {
          doctor_id: doctorId,
          start_time: { gte: new Date() },
          status: { in: [AppointmentStatus.PENDING, AppointmentStatus.APPROVED] },
        },
        include: {
          patient: {
            select: {
              user_id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { start_time: "asc" },
        take: 6,
      }),
      prisma.appointment.count({
        where: {
          doctor_id: doctorId,
          start_time: { gte: todayStart },
          end_time: { lte: todayEnd },
          status: {
            in: [AppointmentStatus.PENDING, AppointmentStatus.APPROVED, AppointmentStatus.COMPLETED],
          },
        },
      }),
    ])

    return res.json({
      summary: {
        active_patient_count: activeHires.length,
        ecg_access_patient_count: ecgPatientIds.length,
        today_appointment_count: todayAppointmentCount,
        unread_notification_count: unreadNotificationCount,
      },
      pending_hire_requests: pendingHireRequests,
      urgent_alerts: urgentAlerts.map((alert) => ({
        alert_id: alert.alert_id,
        user_id: alert.user_id,
        reading_id: alert.reading_id,
        alert_type: alert.alert_type,
        message: alert.message,
        resolved: alert.resolved,
        timestamp: alert.timestamp,
        patient: alert.user,
      })),
      upcoming_appointments: upcomingAppointments,
      recent_notifications: recentNotifications.map(mapNotificationForResponse),
      active_patient_ids: activePatientIds,
    })
  } catch (error) {
    console.error("Lỗi lấy dashboard doctor portal:", error)
    return res.status(500).json({ message: "Lỗi server khi lấy dashboard bác sĩ" })
  }
}

const getDoctorPortalPatients = async (req, res) => {
  try {
    const doctorId = parseId(req.user?.user_id)
    const domain = String(req.query.domain || "all").trim().toLowerCase()

    if (!VALID_DOMAINS.has(domain)) {
      return res.status(400).json({ message: "domain không hợp lệ" })
    }

    const patients = await listDoctorPortalPatientsInternal({ doctorId, domain })
    return res.json({ patients })
  } catch (error) {
    console.error("Lỗi lấy danh sách bệnh nhân doctor portal:", error)
    return res.status(500).json({ message: "Lỗi server khi lấy danh sách bệnh nhân" })
  }
}

const getDoctorPortalEmrWorkspace = async (req, res) => {
  try {
    const doctorId = parseId(req.user?.user_id)
    const patientId = parseId(req.params.patientId)

    if (!patientId) {
      return res.status(400).json({ message: "patientId không hợp lệ" })
    }

    const canView = await canViewPatientDomain({
      patientId,
      viewerId: doctorId,
      domain: "ehr",
    })

    if (!canView) {
      return res.status(403).json({ message: "Bạn không có quyền xem EMR của bệnh nhân này" })
    }

    const [patient, overview, histories, reports, medicationPlans] = await Promise.all([
      prisma.user.findUnique({
        where: { user_id: patientId },
        select: {
          user_id: true,
          name: true,
          email: true,
          created_at: true,
        },
      }),
      prisma.phrOverview.findUnique({
        where: { user_id: patientId },
      }),
      prisma.medicalVisit.findMany({
        where: {
          user_id: patientId,
          deleted_at: null,
        },
        include: {
          doctor: {
            select: {
              user_id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { visit_date: "desc" },
      }),
      prisma.report.findMany({
        where: { user_id: patientId },
        include: {
          doctor: {
            select: {
              user_id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { created_at: "desc" },
        take: 10,
      }),
      prisma.medicationPlan.findMany({
        where: {
          user_id: patientId,
        },
        include: {
          medications: true,
          doctor: {
            select: {
              user_id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { created_at: "desc" },
        take: 10,
      }),
    ])

    if (!patient) {
      return res.status(404).json({ message: "Không tìm thấy bệnh nhân" })
    }

    return res.json({
      patient,
      overview: overview || {
        user_id: patientId,
        personal_info: {},
        vitals: {},
        medical_history: {},
        clinical_results: {},
      },
      histories: histories.map(mapHistoryForResponse),
      documents: reports.map(mapDocumentForResponse),
      medication_plans: medicationPlans,
    })
  } catch (error) {
    console.error("Lỗi lấy EMR workspace doctor portal:", error)
    return res.status(500).json({ message: "Lỗi server khi lấy EMR workspace" })
  }
}

const createDoctorPortalConsultation = async (req, res) => {
  try {
    const doctorId = parseId(req.user?.user_id)
    const patientId = parseId(req.body.patient_id)
    const ghiChuLamSang = String(req.body.ghi_chu_lam_sang || "").trim()
    const chanDoan = String(req.body.chan_doan || "").trim()
    const thuocKeDon = String(req.body.thuoc_ke_don || "").trim()
    const tinhTrang = String(req.body.tinh_trang || "").trim()
    const yLenh = Array.isArray(req.body.y_lenh)
      ? req.body.y_lenh.map((item) => String(item || "").trim()).filter(Boolean)
      : []

    if (!patientId) {
      return res.status(400).json({ message: "patient_id không hợp lệ" })
    }

    if (!ghiChuLamSang && !chanDoan && !thuocKeDon && !tinhTrang && !yLenh.length) {
      return res.status(400).json({ message: "Vui lòng nhập ít nhất một nội dung khám bệnh" })
    }

    const canWrite = await canDoctorWritePatientDomain({
      patientId,
      doctorId,
      domain: "ehr",
    })

    if (!canWrite) {
      return res.status(403).json({ message: "Bạn không có quyền cập nhật EMR của bệnh nhân này" })
    }

    const patient = await prisma.user.findUnique({
      where: { user_id: patientId },
      select: { user_id: true, name: true, email: true },
    })

    if (!patient) {
      return res.status(404).json({ message: "Không tìm thấy bệnh nhân" })
    }

    const reportSummaryParts = [
      chanDoan ? `Chẩn đoán: ${chanDoan}` : null,
      tinhTrang ? `Tình trạng: ${tinhTrang}` : null,
      ghiChuLamSang ? `Ghi chú: ${ghiChuLamSang}` : null,
      thuocKeDon ? `Thuốc kê đơn: ${thuocKeDon}` : null,
      yLenh.length ? `Y lệnh: ${yLenh.join(", ")}` : null,
    ].filter(Boolean)

    const combinedNotes = [
      ghiChuLamSang ? `[SOAP] ${ghiChuLamSang}` : null,
      yLenh.length ? `[CPOE] ${yLenh.join(", ")}` : null,
    ].filter(Boolean).join("\n")

    const [visit, report] = await prisma.$transaction([
      prisma.medicalVisit.create({
        data: {
          user_id: patientId,
          doctor_id: doctorId,
          diagnosis: chanDoan || "Ghi chú khám bệnh",
          diagnosis_details: ghiChuLamSang || chanDoan || null,
          reason: tinhTrang || null,
          tests: yLenh.length ? { orders: yLenh } : null,
          prescription: thuocKeDon ? { notes: thuocKeDon } : null,
          appointment: combinedNotes || null,
        },
        include: {
          doctor: {
            select: {
              user_id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.report.create({
        data: {
          user_id: patientId,
          doctor_id: doctorId,
          summary: reportSummaryParts.join("\n"),
        },
        include: {
          doctor: {
            select: {
              user_id: true,
              name: true,
              email: true,
            },
          },
          patient: {
            select: {
              user_id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
    ])

    return res.status(201).json({
      message: `Đã lưu hồ sơ khám cho ${patient.name}`,
      history: mapHistoryForResponse(visit),
      document: mapDocumentForResponse(report),
    })
  } catch (error) {
    console.error("Lỗi lưu consultation doctor portal:", error)
    return res.status(500).json({ message: "Lỗi server khi lưu hồ sơ khám" })
  }
}

module.exports = {
  getDoctorPortalDashboard,
  getDoctorPortalPatients,
  getDoctorPortalEmrWorkspace,
  createDoctorPortalConsultation,
}
