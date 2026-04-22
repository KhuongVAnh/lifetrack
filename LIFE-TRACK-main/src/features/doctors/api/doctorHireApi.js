import { httpClient } from "@/shared/api";

/**
 * Lấy catalog bác sĩ hệ thống kèm trạng thái thuê của bệnh nhân hiện tại.
 */
export const getDoctorCatalog = async (q = "") => {
  // Truyền q khi người dùng tìm kiếm để backend lọc theo tên/chuyên khoa/bệnh viện.
  const { data } = await httpClient.get("/doctors/catalog", {
    params: q ? { q } : {},
  });

  // Luôn trả mảng để component render an toàn khi API không có dữ liệu.
  return data.doctors ?? [];
};

/**
 * Bệnh nhân gửi yêu cầu thuê một bác sĩ.
 */
export const requestDoctorHire = async (doctorId) => {
  // Backend tự lấy patient_id từ token nên frontend chỉ gửi doctor_id.
  const { data } = await httpClient.post("/doctor-hires", {
    doctor_id: doctorId,
  });

  // Trả về quan hệ thuê vừa tạo để UI cập nhật trạng thái ngay.
  return data.hire;
};

/**
 * Bệnh nhân lấy danh sách bác sĩ của tôi gồm active, pending, rejected hoặc cancelled.
 */
export const getMyDoctorHires = async () => {
  // Endpoint này chỉ dành cho bệnh nhân và backend sẽ lọc theo token.
  const { data } = await httpClient.get("/doctor-hires/my");
  return data.hires ?? [];
};

/**
 * Bệnh nhân bật/tắt quyền xem hồ sơ cho bác sĩ đang thuê.
 */
export const updateDoctorHireAccess = async (hireId, payload) => {
  // Payload chỉ nên chứa các cờ can_view_ehr/can_view_medications/can_view_ecg.
  const { data } = await httpClient.patch(`/doctor-hires/${hireId}/access`, payload);
  return data.hire;
};

/**
 * Bệnh nhân hủy yêu cầu thuê hoặc hủy quan hệ bác sĩ đang active.
 */
export const cancelDoctorHire = async (hireId) => {
  // Backend kiểm tra hire này thuộc bệnh nhân hiện tại trước khi hủy.
  const { data } = await httpClient.patch(`/doctor-hires/${hireId}/cancel`);
  return data.hire;
};

/**
 * Bác sĩ lấy danh sách yêu cầu thuê gửi đến mình.
 */
export const getDoctorHireRequests = async (status = "") => {
  // Có thể truyền status để lọc pending/active/rejected, mặc định backend trả danh sách theo thời gian.
  const { data } = await httpClient.get("/doctor-hires/requests", {
    params: status ? { status } : {},
  });
  return data.requests ?? [];
};

/**
 * Bác sĩ duyệt yêu cầu thuê của bệnh nhân.
 */
export const approveDoctorHire = async (hireId) => {
  // Chỉ bác sĩ nhận yêu cầu mới có quyền duyệt.
  const { data } = await httpClient.patch(`/doctor-hires/${hireId}/approve`);
  return data.hire;
};

/**
 * Bác sĩ từ chối yêu cầu thuê của bệnh nhân.
 */
export const rejectDoctorHire = async (hireId) => {
  // Chỉ bác sĩ nhận yêu cầu mới có quyền từ chối.
  const { data } = await httpClient.patch(`/doctor-hires/${hireId}/reject`);
  return data.hire;
};
