const { AppointmentStatus, DoctorHireStatus, UserRole } = require("@prisma/client")
const prisma = require("../prismaClient")

const BOOKED_STATUSES = [AppointmentStatus.PENDING, AppointmentStatus.APPROVED]

/**
 * Chuyển một giá trị bất kỳ về số nguyên hợp lệ để dùng cho id hoặc phút.
 * Hàm trả về null nếu dữ liệu đầu vào không phải số nguyên, giúp controller tránh parse lặp lại.
 */
const parseInteger = (value) => {
  // Ép kiểu bằng Number.parseInt để chấp nhận cả chuỗi số từ query/body.
  const parsed = Number.parseInt(value, 10)

  // Chỉ trả về khi kết quả là số nguyên thật, tránh NaN đi vào truy vấn Prisma.
  return Number.isInteger(parsed) ? parsed : null
}

/**
 * Kiểm tra chuỗi giờ phút có đúng định dạng HH:mm và nằm trong giới hạn 00:00-23:59 hay không.
 * Định dạng này được dùng cho lịch rảnh lặp lại của bác sĩ.
 */
const isValidHHMM = (value) => {
  // Regex đảm bảo giờ có 2 chữ số, phút có 2 chữ số và không nhận các giá trị ngoài ngày.
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(value || ""))
}

/**
 * Chuyển HH:mm thành tổng số phút tính từ 00:00.
 * Cách này giúp so sánh khoảng thời gian trong ngày đơn giản và không phụ thuộc timezone.
 */
const minutesFromHHMM = (value) => {
  // Tách giờ và phút sau khi format đã được validate bằng isValidHHMM.
  const [hour, minute] = String(value).split(":").map((part) => Number.parseInt(part, 10))

  // Tổng phút giúp kiểm tra start < end và sinh các slot liên tiếp.
  return hour * 60 + minute
}

/**
 * Định dạng số phút trong ngày về HH:mm để trả về frontend và lưu vào availability.
 * Hàm luôn pad 2 chữ số để dữ liệu nhất quán với input type="time".
 */
const hhmmFromMinutes = (minutes) => {
  // Tính giờ nguyên và phút dư từ tổng số phút.
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60

  // Pad chuỗi để frontend có thể đưa thẳng vào input time.
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

/**
 * Tạo Date tại cùng ngày với dateBase nhưng dùng giờ phút HH:mm theo timezone local của server.
 * Dự án hiện lưu DateTime UTC trong DB, còn thao tác lịch dùng giờ Việt Nam từ UI.
 */
const buildDateAtHHMM = (dateBase, hhmm) => {
  // Clone ngày để không làm thay đổi object Date gốc đang dùng ở vòng lặp.
  const result = new Date(dateBase)
  const [hour, minute] = String(hhmm).split(":").map((part) => Number.parseInt(part, 10))

  // Gán giờ/phút local; Prisma sẽ serialize Date này về UTC khi ghi hoặc query.
  result.setHours(hour, minute, 0, 0)
  return result
}

/**
 * Chuẩn hóa một Date về đầu ngày local để duyệt từng ngày trong khoảng from-to.
 * Hàm này giúp slot query không bị lệch khi query truyền ISO có giờ khác 00:00.
 */
const startOfLocalDay = (date) => {
  // Clone để giữ nguyên tham số truyền vào.
  const result = new Date(date)

  // Đưa giờ về 00:00:00.000 để tạo mốc duyệt ngày.
  result.setHours(0, 0, 0, 0)
  return result
}

/**
 * Cộng thêm số ngày vào một Date và trả về object mới.
 * Hàm dùng cho vòng lặp sinh danh sách ngày mà không mutate ngày hiện tại.
 */
const addDays = (date, days) => {
  // Clone Date để tránh side effect giữa các vòng lặp.
  const result = new Date(date)

  // setDate tự xử lý chuyển tháng/năm khi cộng ngày.
  result.setDate(result.getDate() + days)
  return result
}

/**
 * Kiểm tra hai khoảng thời gian Date có giao nhau hay không.
 * Quy tắc start < otherEnd và end > otherStart cho phép slot kết thúc đúng lúc slot khác bắt đầu.
 */
const rangesOverlap = (startA, endA, startB, endB) => {
  // So sánh bằng timestamp để tránh khác biệt object Date.
  return startA.getTime() < endB.getTime() && endA.getTime() > startB.getTime()
}

/**
 * Lấy thông tin bác sĩ thật từ bảng users và đảm bảo user đó đang hoạt động.
 * Controller dùng hàm này để tránh đặt lịch với tài khoản không phải bác sĩ.
 */
const getActiveDoctorById = async (doctorId) => {
  // Truy vấn đúng role enum Prisma, không dùng chuỗi tiếng Việt trong DB layer.
  return prisma.user.findFirst({
    where: {
      user_id: doctorId,
      role: UserRole.BAC_SI,
      is_active: true,
    },
    select: {
      user_id: true,
      name: true,
      email: true,
      consultation_fee: true,
    },
  })
}

/**
 * Chuẩn hóa một dòng availability gửi từ frontend trước khi lưu.
 * Hàm trả về object sạch hoặc lỗi cụ thể để controller trả 400 rõ ràng.
 */
const normalizeAvailabilityInput = (item) => {
  // Parse day_of_week theo chuẩn JavaScript: 0 là Chủ nhật, 1-6 là Thứ 2-Thứ 7.
  const dayOfWeek = parseInteger(item?.day_of_week)
  const slotMinutes = parseInteger(item?.slot_minutes) || 30
  const startTime = String(item?.start_time || "").trim()
  const endTime = String(item?.end_time || "").trim()

  // Kiểm tra thứ trong tuần nằm đúng khoảng 0-6.
  if (dayOfWeek === null || dayOfWeek < 0 || dayOfWeek > 6) {
    return { error: "day_of_week phai nam trong khoang 0-6" }
  }

  // Kiểm tra format giờ để tránh dữ liệu không thể sinh slot.
  if (!isValidHHMM(startTime) || !isValidHHMM(endTime)) {
    return { error: "start_time va end_time phai co dinh dang HH:mm" }
  }

  // Đảm bảo khoảng rảnh có start nhỏ hơn end.
  if (minutesFromHHMM(startTime) >= minutesFromHHMM(endTime)) {
    return { error: "start_time phai nho hon end_time" }
  }

  // Slot quá ngắn hoặc quá dài đều tạo UX khó dùng nên giới hạn ở mức thực tế.
  if (![15, 20, 30, 45, 60, 90, 120].includes(slotMinutes)) {
    return { error: "slot_minutes chi chap nhan 15, 20, 30, 45, 60, 90 hoac 120" }
  }

  // Trả về dữ liệu đã chuẩn hóa đúng field Prisma.
  return {
    value: {
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      slot_minutes: slotMinutes,
      is_active: item?.is_active !== false,
    },
  }
}

/**
 * Lấy danh sách bác sĩ thật để frontend đặt lịch.
 * Có hỗ trợ tìm kiếm đơn giản theo tên/email để thay thế danh sách bác sĩ mock.
 */
const listDoctors = async ({ q, patientId } = {}) => {
  // Chuẩn hóa keyword để query rỗng không tạo điều kiện contains vô nghĩa.
  const keyword = String(q || "").trim()

  // Query chỉ lấy user role bác sĩ đang hoạt động và giới hạn field cần cho UI.
  const doctors = await prisma.user.findMany({
    where: {
      role: UserRole.BAC_SI,
      is_active: true,
      ...(keyword
        ? {
            OR: [
              { name: { contains: keyword } },
              { email: { contains: keyword } },
            ],
          }
        : {}),
    },
    select: {
      user_id: true,
      name: true,
      email: true,
      consultation_fee: true,
      doctorProfile: true,
    },
    orderBy: { name: "asc" },
  })

  // Nếu bệnh nhân đang đặt lịch thì lấy trạng thái thuê để chia nhóm miễn phí/trả phí.
  const hires = patientId
    ? await prisma.doctorHire.findMany({
        where: { patient_id: patientId },
        select: {
          hire_id: true,
          doctor_id: true,
          status: true,
          can_view_ehr: true,
          can_view_medications: true,
          can_view_ecg: true,
        },
      })
    : []
  const hireByDoctorId = new Map(hires.map((hire) => [hire.doctor_id, hire]))

  // Gắn metadata thuê và profile để frontend lịch hẹn dùng cùng shape với catalog bác sĩ.
  return doctors.map((doctor) => {
    const hire = hireByDoctorId.get(doctor.user_id)
    const profile = doctor.doctorProfile || {}
    return {
      user_id: doctor.user_id,
      name: doctor.name,
      email: doctor.email,
      consultation_fee: doctor.consultation_fee || 0,
      specialty: profile.specialty || "Tim mạch",
      title: profile.title || doctor.name,
      hospital: profile.hospital || "LifeTrack Care",
      hire_price: profile.hire_price ?? doctor.consultation_fee ?? 0,
      hire_id: hire?.hire_id || null,
      hire_status: hire?.status || null,
      access_status: hire?.status === DoctorHireStatus.ACTIVE ? "accepted" : hire?.status || null,
      is_hired: hire?.status === DoctorHireStatus.ACTIVE,
      can_view_ehr: hire?.can_view_ehr || false,
      can_view_medications: hire?.can_view_medications || false,
      can_view_ecg: hire?.can_view_ecg || false,
    }
  })
}

/**
 * Tạo slot khả dụng của một bác sĩ trong khoảng ngày from-to.
 * Hàm ghép lịch rảnh, khoảng nghỉ và lịch hẹn đã đặt để trả ra slot available/unavailable cho frontend.
 */
const listAvailableSlots = async ({ doctorId, from, to }) => {
  // Chuẩn hóa khoảng ngày query; mặc định lấy 14 ngày tới để UI có dữ liệu ngay.
  const rangeStart = startOfLocalDay(from ? new Date(from) : new Date())
  const rangeEnd = startOfLocalDay(to ? new Date(to) : addDays(rangeStart, 14))
  rangeEnd.setHours(23, 59, 59, 999)

  // Lấy lịch rảnh đang bật của bác sĩ.
  const availabilities = await prisma.doctorAvailability.findMany({
    where: {
      doctor_id: doctorId,
      is_active: true,
    },
    orderBy: [
      { day_of_week: "asc" },
      { start_time: "asc" },
    ],
  })

  // Lấy các lịch hẹn đã giữ chỗ để đánh dấu slot bận.
  const appointments = await prisma.appointment.findMany({
    where: {
      doctor_id: doctorId,
      status: { in: BOOKED_STATUSES },
      start_time: { lt: rangeEnd },
      end_time: { gt: rangeStart },
    },
    select: {
      appointment_id: true,
      start_time: true,
      end_time: true,
      status: true,
    },
  })

  // Lấy các khoảng bác sĩ nghỉ hoặc chặn lịch cụ thể.
  const timeOffs = await prisma.doctorTimeOff.findMany({
    where: {
      doctor_id: doctorId,
      start_time: { lt: rangeEnd },
      end_time: { gt: rangeStart },
    },
    select: {
      time_off_id: true,
      start_time: true,
      end_time: true,
      reason: true,
    },
  })

  const slots = []
  const now = new Date()

  // Duyệt từng ngày trong khoảng query để áp lịch rảnh theo day_of_week.
  for (let day = startOfLocalDay(rangeStart); day <= rangeEnd; day = addDays(day, 1)) {
    const weekday = day.getDay()
    const dayAvailabilities = availabilities.filter((item) => item.day_of_week === weekday)

    // Mỗi availability có thể sinh nhiều slot nhỏ theo slot_minutes.
    dayAvailabilities.forEach((availability) => {
      const startMinute = minutesFromHHMM(availability.start_time)
      const endMinute = minutesFromHHMM(availability.end_time)
      const slotMinutes = availability.slot_minutes || 30

      // Tạo slot liên tiếp cho đến khi slot tiếp theo vượt quá giờ kết thúc.
      for (let minute = startMinute; minute + slotMinutes <= endMinute; minute += slotMinutes) {
        const slotStart = buildDateAtHHMM(day, hhmmFromMinutes(minute))
        const slotEnd = buildDateAtHHMM(day, hhmmFromMinutes(minute + slotMinutes))

        // Không trả slot ngoài khoảng query thật nếu from/to có giờ cụ thể.
        if (slotStart < rangeStart || slotEnd > rangeEnd) {
          continue
        }

        const blockedByAppointment = appointments.find((appointment) =>
          rangesOverlap(slotStart, slotEnd, appointment.start_time, appointment.end_time)
        )
        const blockedByTimeOff = timeOffs.find((timeOff) =>
          rangesOverlap(slotStart, slotEnd, timeOff.start_time, timeOff.end_time)
        )
        const isPast = slotStart <= now

        // Đẩy đủ metadata để frontend hiển thị lý do slot không chọn được.
        slots.push({
          doctor_id: doctorId,
          start_time: slotStart.toISOString(),
          end_time: slotEnd.toISOString(),
          label: `${hhmmFromMinutes(minute)} - ${hhmmFromMinutes(minute + slotMinutes)}`,
          available: !blockedByAppointment && !blockedByTimeOff && !isPast,
          unavailable_reason: blockedByAppointment
            ? "BOOKED"
            : blockedByTimeOff
              ? "TIME_OFF"
              : isPast
                ? "PAST"
                : null,
        })
      }
    })
  }

  // Sắp xếp theo thời gian tăng dần để UI render lịch ổn định.
  return slots.sort((left, right) => new Date(left.start_time) - new Date(right.start_time))
}

/**
 * Kiểm tra một khoảng đặt lịch có thuộc lịch rảnh và không bị trùng hay không.
 * Controller gọi hàm này ngay trước khi create appointment để chống race cơ bản.
 */
const validateBookableSlot = async ({ doctorId, startTime, endTime }) => {
  // Không cho đặt lịch trong quá khứ hoặc khoảng thời gian không hợp lệ.
  if (!(startTime instanceof Date) || !(endTime instanceof Date) || startTime >= endTime) {
    return { ok: false, message: "Thoi gian kham khong hop le" }
  }

  // Slot trong quá khứ gây nhầm lẫn và không thể xử lý thực tế.
  if (startTime <= new Date()) {
    return { ok: false, message: "Khong the dat lich trong qua khu" }
  }

  const weekday = startTime.getDay()
  const startHHMM = `${String(startTime.getHours()).padStart(2, "0")}:${String(startTime.getMinutes()).padStart(2, "0")}`
  const endHHMM = `${String(endTime.getHours()).padStart(2, "0")}:${String(endTime.getMinutes()).padStart(2, "0")}`
  const startMinute = minutesFromHHMM(startHHMM)
  const endMinute = minutesFromHHMM(endHHMM)

  // Lấy các khoảng rảnh cùng thứ để kiểm tra slot bệnh nhân chọn có nằm trọn trong lịch rảnh.
  const availabilities = await prisma.doctorAvailability.findMany({
    where: {
      doctor_id: doctorId,
      day_of_week: weekday,
      is_active: true,
    },
  })

  const coveredByAvailability = availabilities.some((availability) => {
    const availabilityStart = minutesFromHHMM(availability.start_time)
    const availabilityEnd = minutesFromHHMM(availability.end_time)

    // Slot hợp lệ khi nằm trọn trong khoảng rảnh và độ dài khớp một block slot_minutes.
    return startMinute >= availabilityStart &&
      endMinute <= availabilityEnd &&
      (endMinute - startMinute) === (availability.slot_minutes || 30)
  })

  if (!coveredByAvailability) {
    return { ok: false, message: "Khung gio nay khong nam trong lich ranh cua bac si" }
  }

  // Kiểm tra khoảng nghỉ của bác sĩ.
  const timeOffCount = await prisma.doctorTimeOff.count({
    where: {
      doctor_id: doctorId,
      start_time: { lt: endTime },
      end_time: { gt: startTime },
    },
  })

  if (timeOffCount > 0) {
    return { ok: false, message: "Bac si khong nhan lich trong khung gio nay" }
  }

  // Kiểm tra lịch hẹn PENDING/APPROVED đang giữ slot.
  const overlapCount = await prisma.appointment.count({
    where: {
      doctor_id: doctorId,
      status: { in: BOOKED_STATUSES },
      start_time: { lt: endTime },
      end_time: { gt: startTime },
    },
  })

  if (overlapCount > 0) {
    return { ok: false, message: "Khung gio nay da co lich hen khac" }
  }

  // Nếu không có lỗi nào, slot có thể đặt.
  return { ok: true }
}

module.exports = {
  BOOKED_STATUSES,
  parseInteger,
  isValidHHMM,
  normalizeAvailabilityInput,
  getActiveDoctorById,
  listDoctors,
  listAvailableSlots,
  validateBookableSlot,
}
