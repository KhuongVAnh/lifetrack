const { UserRole, DeviceStatus, AccessRole } = require("@prisma/client")

const USER_ROLE_TO_DB = {
  [UserRole.BENH_NHAN]: "bệnh nhân",
  [UserRole.BAC_SI]: "bác sĩ",
  [UserRole.GIA_DINH]: "gia đình",
  [UserRole.ADMIN]: "admin",
}

const USER_ROLE_TO_PRISMA = {
  "bệnh nhân": UserRole.BENH_NHAN,
  "bác sĩ": UserRole.BAC_SI,
  "gia đình": UserRole.GIA_DINH,
  admin: UserRole.ADMIN,
}

const DEVICE_STATUS_TO_DB = {
  [DeviceStatus.DANG_HOAT_DONG]: "đang hoạt động",
  [DeviceStatus.NGUNG_HOAT_DONG]: "ngừng hoạt động",
}

const DEVICE_STATUS_TO_PRISMA = {
  "đang hoạt động": DeviceStatus.DANG_HOAT_DONG,
  "ngừng hoạt động": DeviceStatus.NGUNG_HOAT_DONG,
}

const ACCESS_ROLE_TO_DB = {
  [AccessRole.BAC_SI]: "bác sĩ",
  [AccessRole.GIA_DINH]: "gia đình",
}

const ACCESS_ROLE_TO_PRISMA = {
  "bác sĩ": AccessRole.BAC_SI,
  "gia đình": AccessRole.GIA_DINH,
}

const isUserRoleEnum = (value) => Object.values(UserRole).includes(value)
const isDeviceStatusEnum = (value) => Object.values(DeviceStatus).includes(value)
const isAccessRoleEnum = (value) => Object.values(AccessRole).includes(value)

const toPrismaUserRole = (role) => {
  if (!role) return UserRole.BENH_NHAN
  if (isUserRoleEnum(role)) return role
  return USER_ROLE_TO_PRISMA[role] || UserRole.BENH_NHAN
}

const fromPrismaUserRole = (role) => USER_ROLE_TO_DB[role] || role

const toPrismaDeviceStatus = (status) => {
  if (!status) return undefined
  if (isDeviceStatusEnum(status)) return status
  return DEVICE_STATUS_TO_PRISMA[status]
}

const fromPrismaDeviceStatus = (status) => DEVICE_STATUS_TO_DB[status] || status

const toPrismaAccessRole = (role) => {
  if (!role) return undefined
  if (isAccessRoleEnum(role)) return role
  return ACCESS_ROLE_TO_PRISMA[role]
}

const fromPrismaAccessRole = (role) => ACCESS_ROLE_TO_DB[role] || role

module.exports = {
  toPrismaUserRole,
  fromPrismaUserRole,
  toPrismaDeviceStatus,
  fromPrismaDeviceStatus,
  toPrismaAccessRole,
  fromPrismaAccessRole,
}
