/**
 * để tránh truy vấn db nhiều khi ingest dữ liệu telemetry
 * tạo cache runtime lưu trữ thông tin thiết bị và người nhận cảnh báo dựa trên patient_id
 * Ưu tiên lấy dữ liệu từ cache, nếu không có hoặc đã hết hạn mới truy vấn database và cập nhật cache
 * khi db có cập nhật về thiết bị hoặc quyền truy cập của bệnh nhân thì sẽ vô hiệu hóa cache 
 * tương ứng để đảm bảo dữ liệu mới sẽ được truy vấn từ database khi cần thiết
 */
const prisma = require("../prismaClient")
const { AccessStatus } = require("@prisma/client")

// deviceCache: lưu trữ thông tin thiết bị theo serial_number để tránh phải truy vấn database nhiều lần trong quá trình xử lý telemetry data
// deviceObject: { device_id, user_id, serial_number, status }
const deviceCache = new Map() // key: serial_number, value: { value: deviceObject, expiresAt: timestamp }
// recipientCache: lưu trữ danh sách viewer_id có quyền truy cập dữ liệu của bệnh nhân để tránh phải truy vấn database nhiều lần khi cần xác định người nhận cảnh báo
const recipientCache = new Map() // key: patient_id, value: { value: [viewer_id1, viewer_id2, ...], expiresAt: timestamp }

// TTL để xác định thời gian hợp lệ của dữ liệu trong cache, sau thời gian này dữ liệu sẽ bị coi là hết hạn và bị xóa khỏi cache khi truy cập
const DEVICE_TTL_MS = Number.parseInt(process.env.TELEMETRY_DEVICE_CACHE_TTL_MS || "300000", 10)
const RECIPIENT_TTL_MS = Number.parseInt(process.env.TELEMETRY_RECIPIENT_CACHE_TTL_MS || "60000", 10)

const now = () => Date.now()

// Hàm lấy giá trị hợp lệ từ cache, nếu không tồn tại hoặc đã hết hạn sẽ trả về null
const getValidCachedValue = (store, key) => {
    const item = store.get(key)
    if (!item) return null
    if (!Number.isFinite(item.expiresAt) || item.expiresAt <= now()) {
        store.delete(key)
        return null
    }
    return item.value
}

// Hàm lưu giá trị vào cache với key và TTL xác định, trả về giá trị đã lưu
const setCachedValue = (store, key, value, ttlMs) => {
    store.set(key, {
        value,
        expiresAt: now() + Math.max(1000, ttlMs),
    })
    return value
}

// Hàm lấy thông tin thiết bị từ cache hoặc database dựa trên serial number, nếu không tìm thấy sẽ trả về null
const getDeviceBySerialCached = async (serialNumber) => {
    const key = String(serialNumber || "").trim()
    if (!key) return null

    const cached = getValidCachedValue(deviceCache, key)
    if (cached) return cached

    // Nếu không có trong cache hoặc đã hết hạn, truy vấn database để lấy thông tin thiết bị và cập nhật cache
    const device = await prisma.device.findUnique({
        where: { serial_number: key },
        select: {
            device_id: true,
            user_id: true,
            serial_number: true,
            status: true,
        },
    })

    if (!device) return null
    return setCachedValue(deviceCache, key, device, DEVICE_TTL_MS)
}

// Hàm lấy danh sách viewer_id có quyền truy cập dữ liệu của bệnh nhân từ cache hoặc database, nếu không tìm thấy sẽ trả về mảng rỗng
const getRecipientIdsByPatientCached = async (patientId) => {
    const key = Number(patientId)
    if (!Number.isInteger(key)) return []

    const cached = getValidCachedValue(recipientCache, key)
    if (cached) return cached   

    const viewers = await prisma.accessPermission.findMany({
        where: {
            patient_id: key,
            status: AccessStatus.accepted,
        },
        select: { viewer_id: true },
    })

    const recipients = [key, ...viewers.map((item) => item.viewer_id)]
    return setCachedValue(recipientCache, key, recipients, RECIPIENT_TTL_MS)
}

// Hàm xóa cache thiết bị dựa trên serial number, thường được gọi khi có cập nhật về thiết bị để đảm bảo dữ liệu mới sẽ được truy vấn từ database
const invalidateDeviceCacheBySerial = (serialNumber) => {
    const key = String(serialNumber || "").trim()
    if (key) deviceCache.delete(key)
}

// Hàm xóa cache người nhận dựa trên patient_id, thường được gọi khi có cập nhật về quyền truy cập của bệnh nhân để đảm bảo dữ liệu mới sẽ được truy vấn từ database
const invalidateRecipientCacheByPatient = (patientId) => {
    const key = Number(patientId)
    if (Number.isInteger(key)) recipientCache.delete(key)
}

// Hàm xóa toàn bộ cache của thiết bị và người nhận, thường được gọi khi cần dọn dẹp bộ nhớ hoặc khi có sự kiện lớn ảnh hưởng đến nhiều dữ liệu
const clearTelemetryRuntimeCaches = () => {
    deviceCache.clear()
    recipientCache.clear()
}

module.exports = {
    getDeviceBySerialCached,
    getRecipientIdsByPatientCached,
    invalidateDeviceCacheBySerial,
    invalidateRecipientCacheByPatient,
    clearTelemetryRuntimeCaches,
}
