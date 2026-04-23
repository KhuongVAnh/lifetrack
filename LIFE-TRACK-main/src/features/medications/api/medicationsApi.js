/**
 * API service cho tính năng Nhắc uống thuốc (Medications)
 * - Đóng gói toàn bộ các lời gọi HTTP liên quan đến đơn thuốc và lịch uống.
 * - Dùng httpClient (axios instance có xử lý token refresh tự động).
 */
import httpClient from '@/shared/api/httpClient';

/**
 * Lấy danh sách tất cả các đơn thuốc của user đang đăng nhập.
 * Mỗi đơn sẽ kèm theo danh sách các loại thuốc bên trong.
 * @returns {Promise<Array>} plans - Danh sách đơn thuốc
 */
export const getMedicationPlans = async (params = {}) => {
  // Backend trả tất cả đơn thuốc của user hiện tại kèm thuốc con và bác sĩ kê đơn nếu có.
  const { data } = await httpClient.get('/medications/plans', { params });
  return data.plans ?? [];
};

/**
 * Tạo một đơn thuốc mới cùng các loại thuốc đi kèm (nested create).
 * @param {Object}   payload              - Thông tin đơn thuốc
 * @param {string}   payload.title        - Tên đơn thuốc (vd: "Đơn trị viêm họng")
 * @param {string}   payload.start_date   - Ngày bắt đầu (ISO string)
 * @param {string}   [payload.end_date]   - Ngày kết thúc (ISO string, có thể null)
 * @param {string}   [payload.notes]      - Ghi chú cho đơn
 * @param {Array}    payload.medications  - Mảng thuốc: [{name, dosage, times}]
 * @returns {Promise<Object>} plan - Đơn thuốc vừa tạo
 */
export const createMedicationPlan = async (payload) => {
  // Khi tạo xong, backend sẽ sinh sẵn log hôm nay và 7 ngày tới.
  const { data } = await httpClient.post('/medications/plans', payload);
  return data.plan;
};

/**
 * Cập nhật một đơn thuốc hiện có.
 * Backend thay thế danh sách thuốc con và sinh lại log sắp tới theo cấu hình mới.
 */
export const updateMedicationPlan = async (planId, payload) => {
  // Dùng PUT để cập nhật đầy đủ thông tin plan.
  const { data } = await httpClient.put(`/medications/plans/${planId}`, payload);
  return data.plan;
};

/**
 * Ngưng một đơn thuốc mà không xóa lịch sử uống thuốc.
 * UI dùng cho hành động lưu trữ/ngừng điều trị.
 */
export const archiveMedicationPlan = async (planId) => {
  // Backend chỉ chuyển is_active=false.
  const { data } = await httpClient.patch(`/medications/plans/${planId}/archive`);
  return data;
};

/**
 * Lấy lịch sử uống thuốc (MedicationLog) của user.
 * @returns {Promise<Array>} logs - Danh sách log uống thuốc
 */
export const getMedicationLogs = async (params = {}) => {
  // params hỗ trợ from/to/status để hiển thị hôm nay hoặc tuần này.
  const { data } = await httpClient.get('/medications/logs', { params });
  return data.logs ?? [];
};

/**
 * Bệnh nhân bấm "Đã uống" để xác nhận một lượt nhắc thuốc.
 * @param {number} logId - ID của MedicationLog cần xác nhận
 * @returns {Promise<Object>}
 */
export const markMedicationTaken = async (logId, params = {}) => {
  // Backend kiểm tra log thuộc user hiện tại trước khi cập nhật.
  // Tránh gửi JSON literal `null` vì backend đang strict JSON object/array.
  const { data } = await httpClient.patch(`/medications/logs/${logId}/take`, {}, { params });
  return data;
};

/**
 * Bệnh nhân bỏ qua một lượt uống thuốc.
 * Trạng thái SKIPPED khác với MISSED do hệ thống tự đánh dấu quá hạn.
 */
export const skipMedicationLog = async (logId, params = {}) => {
  // Gọi endpoint skip để giữ lịch sử tuân thủ thuốc rõ ràng.
  // Tránh gửi JSON literal `null` vì backend đang strict JSON object/array.
  const { data } = await httpClient.patch(`/medications/logs/${logId}/skip`, {}, { params });
  return data;
};
