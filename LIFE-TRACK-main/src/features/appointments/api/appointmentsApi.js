/**
 * API service cho tính năng Đặt lịch khám (Appointments)
 * - Đóng gói toàn bộ các lời gọi HTTP liên quan đến lịch hẹn.
 * - Dùng httpClient (axios instance có xử lý token refresh tự động).
 */
import httpClient from '@/shared/api/httpClient';

/**
 * Lấy danh sách bác sĩ thật từ backend để bệnh nhân đặt lịch.
 * Tham số q dùng cho tìm kiếm theo tên/email nếu UI truyền vào.
 */
export const getAppointmentDoctors = async (q = "") => {
  // Gửi query q khi có từ khóa, để backend không phải lọc rỗng.
  const { data } = await httpClient.get('/appointments/doctors', {
    params: q ? { q } : {},
  });

  // Luôn trả về mảng để component render an toàn.
  return data.doctors ?? [];
};

/**
 * Lấy slot khả dụng của bác sĩ trong khoảng ngày.
 * Backend sẽ đánh dấu available=false nếu slot đã có lịch, bác sĩ nghỉ hoặc đã qua.
 */
export const getAppointmentSlots = async ({ doctorId, from, to }) => {
  // Truyền doctor_id/from/to theo query để backend sinh slot đúng bác sĩ và khoảng ngày.
  const { data } = await httpClient.get('/appointments/slots', {
    params: {
      doctor_id: doctorId,
      from,
      to,
    },
  });

  // Trả về mảng slot chuẩn cho UI.
  return data.slots ?? [];
};

/**
 * Lấy danh sách lịch hẹn của người dùng đang đăng nhập.
 * Nếu là bệnh nhân → trả về lịch bệnh nhân đã đặt.
 * Nếu là bác sĩ    → trả về lịch bệnh nhân đặt với bác sĩ.
 * @returns {Promise<Array>} appointments - Danh sách lịch hẹn
 */
export const getAppointments = async (params = {}) => {
  // Params cho phép lọc status/from/to ở dashboard hoặc màn bác sĩ.
  const { data } = await httpClient.get('/appointments', { params });
  return data.appointments ?? [];
};

/**
 * Bệnh nhân tạo một lịch hẹn mới với bác sĩ.
 * Logic phí sẽ được tính tự động ở backend dựa trên DoctorHire active.
 * @param {Object} payload - Thông tin lịch hẹn
 * @param {number}  payload.doctor_id      - ID bác sĩ
 * @param {string}  payload.appointment_date - Ngày hẹn (ISO string)
 * @param {string}  payload.start_time     - Giờ bắt đầu (ISO string)
 * @param {string}  payload.end_time       - Giờ kết thúc (ISO string)
 * @param {string}  payload.type           - Loại (ONLINE / OFFLINE)
 * @param {string}  payload.reason         - Lý do khám
 * @returns {Promise<Object>} appointment - Lịch hẹn vừa tạo
 */
export const createAppointment = async (payload) => {
  // Payload giữ nguyên ISO string để backend validate slot chính xác.
  const { data } = await httpClient.post('/appointments', payload);
  return data.appointment;
};

/**
 * Bác sĩ duyệt một lịch hẹn, đồng thời cung cấp link Google Meet (nếu có).
 * @param {number} id          - ID lịch hẹn
 * @param {string} meetingUrl  - Link Google Meet (có thể null nếu OFFLINE)
 * @returns {Promise<Object>}
 */
export const approveAppointment = async (id, meetingUrl = null, doctorNote = null) => {
  // Gửi link meeting và ghi chú nếu bác sĩ nhập.
  const { data } = await httpClient.patch(`/appointments/${id}/approve`, {
    meeting_url: meetingUrl,
    doctor_note: doctorNote,
  });
  return data;
};

/**
 * Cập nhật trạng thái lịch hẹn (Hủy, Từ chối, Hoàn thành).
 * @param {number} id     - ID lịch hẹn
 * @param {string} status - Trạng thái mới: 'CANCELLED' | 'REJECTED' | 'COMPLETED'
 * @returns {Promise<Object>}
 */
export const updateAppointmentStatus = async (id, status, reason = null) => {
  // reason dùng cho hủy/từ chối để phía còn lại hiểu lý do.
  const { data } = await httpClient.patch(`/appointments/${id}/status`, { status, reason });
  return data;
};

/**
 * Bác sĩ lấy cấu hình lịch rảnh và lịch nghỉ của chính mình.
 * Dữ liệu này dùng ở màn lịch hẹn bác sĩ.
 */
export const getDoctorAvailability = async () => {
  // Backend xác định doctor_id từ token nên frontend không cần gửi id.
  const { data } = await httpClient.get('/appointments/doctor/availability');
  return data;
};

/**
 * Bác sĩ thay thế toàn bộ cấu hình lịch rảnh.
 * Mỗi dòng gồm day_of_week, start_time, end_time, slot_minutes và is_active.
 */
export const saveDoctorAvailability = async (availability) => {
  // Dùng PUT replace-all để UI không phải xử lý diff từng dòng.
  const { data } = await httpClient.put('/appointments/doctor/availability', { availability });
  return data.availability ?? [];
};

/**
 * Bác sĩ tạo một khoảng nghỉ/chặn lịch cụ thể.
 * Khoảng này sẽ làm slot giao nhau chuyển sang không khả dụng.
 */
export const createDoctorTimeOff = async (payload) => {
  // Payload gồm start_time, end_time và reason.
  const { data } = await httpClient.post('/appointments/doctor/time-off', payload);
  return data.time_off;
};

/**
 * Bác sĩ xóa một khoảng nghỉ đã tạo.
 * Sau khi xóa, frontend nên tải lại slot/lịch rảnh.
 */
export const deleteDoctorTimeOff = async (id) => {
  // Gọi endpoint DELETE theo id khoảng nghỉ.
  const { data } = await httpClient.delete(`/appointments/doctor/time-off/${id}`);
  return data;
};
