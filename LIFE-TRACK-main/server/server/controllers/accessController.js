// Controller xử lý chia sẻ và quản lý quyền truy cập dữ liệu bệnh nhân.
"use strict"

const prisma = require("../prismaClient")
const { NotificationType } = require("@prisma/client")
const {
  toPrismaAccessRole,
  fromPrismaAccessRole,
  fromPrismaUserRole,
} = require("../utils/enumMappings")
const { emitToUsers } = require("../services/socketEmitService")
const { createNotification } = require("../services/notificationService")
const { invalidateRecipientCacheByPatient } = require("../services/telemetryRuntimeCacheService")

// Hàm xử lý gửi yêu cầu chia sẻ dữ liệu bệnh nhân.
exports.shareAccess = async (req, res) => {
  try {
    const { viewer_email, role } = req.body
    const user_id = Number.parseInt(req.user.user_id, 10)
    const io = req.app.get("io")

    const viewer = await prisma.user.findUnique({ where: { email: viewer_email } })
    if (!viewer) {
      return res
        .status(404)
        .json({ error: "Không tìm thấy người dùng theo email này" })
    }

    const existing = await prisma.accessPermission.findFirst({
      where: { patient_id: user_id, viewer_id: viewer.user_id },
    })

    if (existing?.status === "accepted") {
      return res.status(400).json({ error: "Người này đã được cấp quyền truy cập" })
    }

    if (existing?.status === "pending") {
      return res.status(400).json({ error: "Yêu cầu truy cập đang chờ được xử lý" })
    }

    let permissionRecord
    if (existing?.status === "rejected") {
      permissionRecord = await prisma.accessPermission.update({
        where: { permission_id: existing.permission_id },
        data: {
          role: toPrismaAccessRole(role),
          status: "pending",
        },
      })
    } else {
      permissionRecord = await prisma.accessPermission.create({
        data: {
          patient_id: user_id,
          viewer_id: viewer.user_id,
          role: toPrismaAccessRole(role),
          status: "pending",
        },
      })
    }

    const requestPayload = {
      viewer_id: viewer.user_id,
      patient_id: user_id,
      role: fromPrismaAccessRole(permissionRecord.role),
      permission_id: permissionRecord.permission_id,
    }
    emitToUsers(io, [viewer.user_id], "access-request", requestPayload)

    await createNotification({
      type: NotificationType.ACCESS_REQUEST,
      title: "Yêu cầu truy cập mới",
      message: "Bạn vừa nhận một yêu cầu truy cập dữ liệu bệnh nhân.",
      actorId: user_id,
      entityType: "access_permission",
      entityId: permissionRecord.permission_id,
      payload: requestPayload,
      recipientUserIds: [viewer.user_id],
      io,
    })

    return res.status(existing?.status === "rejected" ? 200 : 201).json({
      message:
        existing?.status === "rejected"
          ? "Đã gửi lại yêu cầu chia sẻ quyền truy cập"
          : "Đã gửi yêu cầu chia sẻ quyền truy cập",
      data: {
        ...permissionRecord,
        role: fromPrismaAccessRole(permissionRecord.role),
      },
    })
  } catch (error) {
    console.error("Error sharing access:", error)
    return res.status(500).json({ error: "Lỗi khi chia sẻ quyền truy cập" })
  }
}

// Hàm xử lý phê duyệt hoặc từ chối yêu cầu truy cập.
exports.respondAccess = async (req, res) => {
  try {
    const { id } = req.params
    const { action } = req.body
    const io = req.app.get("io")
    const actorId = Number.parseInt(req.user.user_id, 10)
    const permissionId = Number.parseInt(id, 10)

    const permission = await prisma.accessPermission.findUnique({
      where: { permission_id: permissionId },
    })
    if (!permission) return res.status(404).json({ error: "Không tìm thấy yêu cầu này" })

    const status = action === "accept" ? "accepted" : "rejected"

    const updatedPermission = await prisma.accessPermission.update({
      where: { permission_id: permissionId },
      data: { status },
    })

    // vô hiệu hóa cache người nhận của bệnh nhân để đảm bảo dữ liệu mới sẽ được truy vấn từ database khi có cập nhật về quyền truy cập
    invalidateRecipientCacheByPatient(updatedPermission.patient_id)

    const responsePayload = {
      patient_id: updatedPermission.patient_id,
      viewer_id: updatedPermission.viewer_id,
      status: updatedPermission.status,
      permission_id: updatedPermission.permission_id,
    }
    emitToUsers(io, [updatedPermission.patient_id, updatedPermission.viewer_id], "access-response", responsePayload)

    await createNotification({
      type: NotificationType.ACCESS_RESPONSE,
      title: status === "accepted" ? "Yêu cầu đã được chấp nhận" : "Yêu cầu đã bị từ chối",
      message:
        status === "accepted"
          ? "Yêu cầu truy cập của bạn đã được chấp nhận."
          : "Yêu cầu truy cập của bạn đã bị từ chối.",
      actorId,
      entityType: "access_permission",
      entityId: updatedPermission.permission_id,
      payload: responsePayload,
      recipientUserIds: [updatedPermission.patient_id],
      io,
    })

    return res.json({
      message: `Đã ${action === "accept" ? "chấp nhận" : "từ chối"} quyền truy cập`,
      data: {
        ...updatedPermission,
        role: fromPrismaAccessRole(updatedPermission.role),
      },
    })
  } catch (error) {
    console.error("Error responding access:", error)
    return res.status(500).json({ error: "Lỗi xử lý yêu cầu" })
  }
}

// Hàm xử lý lấy danh sách quyền truy cập của bệnh nhân.
exports.listAccess = async (req, res) => {
  try {
    const { patient_id } = req.params
    const patientId = Number.parseInt(patient_id, 10)

    const list = await prisma.accessPermission.findMany({
      where: { patient_id: patientId },
      include: {
        viewer: { select: { user_id: true, name: true, email: true, role: true } },
      },
      orderBy: { updated_at: "desc" },
    })

    const mapped = list.map((item) => ({
      ...item,
      role: fromPrismaAccessRole(item.role),
      viewer: item.viewer
        ? {
          ...item.viewer,
          role: fromPrismaUserRole(item.viewer.role),
        }
        : null,
    }))

    return res.json(mapped)
  } catch (error) {
    console.error("Error listing access:", error)
    return res.status(500).json({ error: "Lỗi lấy danh sách quyền truy cập" })
  }
}

// Hàm xử lý thu hồi quyền truy cập đã cấp.
exports.revokeAccess = async (req, res) => {
  try {
    const { id } = req.params
    const io = req.app.get("io")
    const actorId = Number.parseInt(req.user.user_id, 10)
    const permissionId = Number.parseInt(id, 10)

    const permission = await prisma.accessPermission.findUnique({
      where: { permission_id: permissionId },
    })
    if (!permission) return res.status(404).json({ error: "Không tìm thấy quyền này" })

    await prisma.accessPermission.delete({ where: { permission_id: permissionId } })

    // vô hiệu hóa cache người nhận của bệnh nhân để đảm bảo dữ liệu mới sẽ được truy vấn từ database khi có cập nhật về quyền truy cập
    invalidateRecipientCacheByPatient(permission.patient_id)

    const revokePayload = {
      viewer_id: permission.viewer_id,
      patient_id: permission.patient_id,
    }
    emitToUsers(io, [permission.patient_id, permission.viewer_id], "access-revoke", revokePayload)

    await createNotification({
      type: NotificationType.ACCESS_REVOKE,
      title: "Quyền truy cập đã bị thu hồi",
      message: "Quyền truy cập dữ liệu bệnh nhân của bạn đã bị thu hồi.",
      actorId,
      entityType: "access_permission",
      entityId: permission.permission_id,
      payload: revokePayload,
      recipientUserIds: [permission.viewer_id],
      io,
    })

    return res.json({ message: "Đã thu hồi quyền truy cập" })
  } catch (error) {
    console.error("Error revoking access:", error)
    return res.status(500).json({ error: "Lỗi khi thu hồi quyền" })
  }
}

// Hàm xử lý lấy các yêu cầu truy cập đang chờ.
exports.getPendingRequests = async (req, res) => {
  try {
    const user_id = Number.parseInt(req.user.user_id, 10)

    const requests = await prisma.accessPermission.findMany({
      where: { viewer_id: user_id, status: "pending" },
      include: {
        patient: { select: { user_id: true, name: true, email: true, role: true } },
      },
    })

    const mapped = requests.map((item) => ({
      ...item,
      role: fromPrismaAccessRole(item.role),
      patient: item.patient
        ? {
          ...item.patient,
          role: fromPrismaUserRole(item.patient.role),
        }
        : null,
    }))

    return res.json(mapped)
  } catch (error) {
    console.error("Error fetching pending access:", error)
    return res.status(500).json({ error: "Lỗi khi lấy danh sách pending" })
  }
}
