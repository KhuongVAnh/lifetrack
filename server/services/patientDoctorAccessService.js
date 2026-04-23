const { AccessRole, AccessStatus, DoctorHireStatus, UserRole } = require("@prisma/client")
const prisma = require("../prismaClient")

const PROFILE_ACCESS_FIELDS = {
  ehr: "can_view_ehr",
  medications: "can_view_medications",
  ecg: "can_view_ecg",
}

/**
 * Chuẩn hóa một giá trị id về số nguyên để các hàm quyền không truy vấn với dữ liệu sai kiểu.
 */
const parseId = (value) => {
  // Number.parseInt chấp nhận cả id dạng chuỗi từ params/query.
  const parsed = Number.parseInt(value, 10)

  // Chỉ trả về số nguyên hợp lệ, các giá trị NaN sẽ được xem như không có quyền.
  return Number.isInteger(parsed) ? parsed : null
}

/**
 * Lấy hợp đồng thuê active giữa bệnh nhân và bác sĩ.
 */
const getActiveDoctorHire = async ({ patientId, doctorId }) => {
  // Chuẩn hóa id để tránh Prisma nhận NaN hoặc chuỗi rỗng.
  const normalizedPatientId = parseId(patientId)
  const normalizedDoctorId = parseId(doctorId)

  // Nếu thiếu một trong hai id thì chắc chắn không có quan hệ thuê hợp lệ.
  if (!normalizedPatientId || !normalizedDoctorId) return null

  // Quan hệ thuê chỉ được xem là hợp lệ khi bác sĩ đã duyệt và status là ACTIVE.
  return prisma.doctorHire.findFirst({
    where: {
      patient_id: normalizedPatientId,
      doctor_id: normalizedDoctorId,
      status: DoctorHireStatus.ACTIVE,
    },
  })
}

/**
 * Kiểm tra bệnh nhân có đang thuê bác sĩ hay không.
 */
const hasActiveDoctorHire = async ({ patientId, doctorId }) => {
  // Chỉ cần select hire_id để giảm dữ liệu đọc từ database.
  const hire = await prisma.doctorHire.findFirst({
    where: {
      patient_id: parseId(patientId) || -1,
      doctor_id: parseId(doctorId) || -1,
      status: DoctorHireStatus.ACTIVE,
    },
    select: { hire_id: true },
  })

  // Boolean hóa kết quả để controller dùng trực tiếp trong điều kiện.
  return Boolean(hire)
}

/**
 * Kiểm tra người thân có quyền xem hồ sơ bệnh nhân qua AccessPermission cũ hay không.
 */
const hasAcceptedFamilyAccess = async ({ patientId, viewerId }) => {
  const normalizedPatientId = parseId(patientId)
  const normalizedViewerId = parseId(viewerId)

  if (!normalizedPatientId || !normalizedViewerId) return false

  // Ưu tiên nguồn dữ liệu mới family_relations cho dashboard/member detail.
  const relation = await prisma.familyRelation.findFirst({
    where: {
      owner_user_id: normalizedViewerId,
      member_user_id: normalizedPatientId,
      is_active: true,
    },
    select: { relation_id: true },
  })

  if (relation) return true

  // Fallback cho dữ liệu legacy còn đang dùng AccessPermission.
  const access = await prisma.accessPermission.findFirst({
    where: {
      patient_id: normalizedPatientId,
      viewer_id: normalizedViewerId,
      role: AccessRole.GIA_DINH,
      status: AccessStatus.accepted,
    },
    select: { permission_id: true },
  })

  return Boolean(access)
}

/**
 * Kiểm tra một viewer có được xem nhóm dữ liệu cụ thể của bệnh nhân hay không.
 */
const canViewPatientDomain = async ({ patientId, viewerId, domain }) => {
  // Chủ sở hữu luôn được xem dữ liệu của chính mình.
  const normalizedPatientId = parseId(patientId)
  const normalizedViewerId = parseId(viewerId)
  if (!normalizedPatientId || !normalizedViewerId) return false
  if (normalizedPatientId === normalizedViewerId) return true

  // Lấy role viewer để tách nhánh bác sĩ thuê và người thân được chia sẻ.
  const viewer = await prisma.user.findUnique({
    where: { user_id: normalizedViewerId },
    select: { role: true, is_active: true },
  })
  if (!viewer?.is_active) return false

  // Family relation cho phép cả tài khoản gia đình lẫn bệnh nhân xem thành viên khác trong gia đình.
  if (viewer.role === UserRole.GIA_DINH || viewer.role === UserRole.BENH_NHAN) {
    return hasAcceptedFamilyAccess({ patientId: normalizedPatientId, viewerId: normalizedViewerId })
  }

  // Bác sĩ phải có hợp đồng active và bệnh nhân bật đúng nhóm dữ liệu.
  if (viewer.role === UserRole.BAC_SI) {
    const accessField = PROFILE_ACCESS_FIELDS[domain]
    if (!accessField) return false

    const hire = await getActiveDoctorHire({
      patientId: normalizedPatientId,
      doctorId: normalizedViewerId,
    })

    return Boolean(hire?.[accessField])
  }

  // Các role khác không được xem hồ sơ bệnh nhân qua service này.
  return false
}

/**
 * Kiểm tra bác sĩ có được ghi dữ liệu y khoa theo nhóm đã được bệnh nhân bật hay không.
 */
const canDoctorWritePatientDomain = async ({ patientId, doctorId, domain }) => {
  // Quyền ghi của bác sĩ đi theo cùng quyền xem từng nhóm để tránh mở quyền quá rộng.
  return canViewPatientDomain({ patientId, viewerId: doctorId, domain })
}

/**
 * Lấy danh sách người nhận cảnh báo realtime theo quyền ECG hiện tại.
 */
const getTelemetryRecipientIds = async (patientId) => {
  const normalizedPatientId = parseId(patientId)
  if (!normalizedPatientId) return []

  // Lấy người thân còn quyền chia sẻ và bác sĩ thuê đang được bật quyền ECG song song.
  const [familyRelations, legacyFamilyAccesses, doctorHires] = await Promise.all([
    prisma.familyRelation.findMany({
      where: {
        member_user_id: normalizedPatientId,
        is_active: true,
      },
      select: { owner_user_id: true },
    }),
    prisma.accessPermission.findMany({
      where: {
        patient_id: normalizedPatientId,
        role: AccessRole.GIA_DINH,
        status: AccessStatus.accepted,
      },
      select: { viewer_id: true },
    }),
    prisma.doctorHire.findMany({
      where: {
        patient_id: normalizedPatientId,
        status: DoctorHireStatus.ACTIVE,
        can_view_ecg: true,
      },
      select: { doctor_id: true },
    }),
  ])

  // Dùng Set để tránh trùng người nhận khi dữ liệu legacy có record lặp.
  return [
    ...new Set([
      normalizedPatientId,
      ...familyRelations.map((item) => item.owner_user_id),
      ...legacyFamilyAccesses.map((item) => item.viewer_id),
      ...doctorHires.map((item) => item.doctor_id),
    ]),
  ]
}

module.exports = {
  PROFILE_ACCESS_FIELDS,
  canDoctorWritePatientDomain,
  canViewPatientDomain,
  getActiveDoctorHire,
  getTelemetryRecipientIds,
  hasActiveDoctorHire,
  hasAcceptedFamilyAccess,
}
