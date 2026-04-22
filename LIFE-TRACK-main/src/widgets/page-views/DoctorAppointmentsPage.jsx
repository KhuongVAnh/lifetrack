import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  approveAppointment,
  createDoctorTimeOff,
  deleteDoctorTimeOff,
  getAppointments,
  getDoctorAvailability,
  saveDoctorAvailability,
  updateAppointmentStatus,
} from "@/features/appointments/api/appointmentsApi";

const WEEKDAYS = [
  { id: 1, label: "Thứ 2" },
  { id: 2, label: "Thứ 3" },
  { id: 3, label: "Thứ 4" },
  { id: 4, label: "Thứ 5" },
  { id: 5, label: "Thứ 6" },
  { id: 6, label: "Thứ 7" },
  { id: 0, label: "Chủ nhật" },
];

const STATUS_META = {
  PENDING: { label: "Chờ duyệt", className: "bg-amber-100 text-amber-700" },
  APPROVED: { label: "Đã xác nhận", className: "bg-emerald-100 text-emerald-700" },
  REJECTED: { label: "Từ chối", className: "bg-rose-100 text-rose-700" },
  CANCELLED: { label: "Đã hủy", className: "bg-slate-100 text-slate-500" },
  COMPLETED: { label: "Hoàn tất", className: "bg-sky-100 text-sky-700" },
};

/**
 * Format ngày giờ lịch khám theo tiếng Việt.
 * Hàm trả chuỗi ngắn để dùng trong card và lịch tuần.
 */
function formatDateTime(value) {
  // Chuyển ISO string từ backend thành Date.
  const date = new Date(value);

  // Bảo vệ UI khỏi dữ liệu ngày không hợp lệ.
  if (Number.isNaN(date.getTime())) return "";

  // Hiển thị cả ngày và giờ để bác sĩ dễ quét lịch.
  return date.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

/**
 * Format giờ bắt đầu - kết thúc của lịch hẹn.
 * Hàm dùng trong card lịch tuần để tránh lặp logic.
 */
function formatTimeRange(appointment) {
  // Format riêng giờ bắt đầu và kết thúc.
  const start = new Date(appointment.start_time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const end = new Date(appointment.end_time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

  // Ghép thành chuỗi khoảng giờ.
  return `${start} - ${end}`;
}

/**
 * Badge trạng thái lịch hẹn cho bác sĩ.
 * Component giúp lịch tuần và danh sách yêu cầu dùng chung style.
 */
function StatusBadge({ status }) {
  // Fallback về PENDING nếu status chưa có trong map.
  const meta = STATUS_META[status] ?? STATUS_META.PENDING;

  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${meta.className}`}>{meta.label}</span>;
}

/**
 * Tạo một dòng lịch rảnh mặc định cho form cấu hình.
 * Hàm dùng khi bác sĩ bấm thêm khung giờ.
 */
function createAvailabilityDraft() {
  // Mặc định tạo khung sáng thứ 2, slot 30 phút.
  return {
    day_of_week: 1,
    start_time: "08:00",
    end_time: "11:00",
    slot_minutes: 30,
    is_active: true,
  };
}

/**
 * Trang lịch hẹn của bác sĩ.
 * Trang hiển thị lịch thật từ backend, yêu cầu chờ duyệt và công cụ cấu hình lịch rảnh.
 */
export function DoctorAppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [timeOffs, setTimeOffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [meetingUrls, setMeetingUrls] = useState({});
  const [timeOffDraft, setTimeOffDraft] = useState({
    start_time: "",
    end_time: "",
    reason: "",
  });

  /**
   * Tải toàn bộ dữ liệu cần cho màn lịch bác sĩ.
   * Hàm lấy lịch hẹn, lịch rảnh và lịch nghỉ trong cùng một lần refresh.
   */
  const fetchData = async () => {
    try {
      // Gọi song song để màn bác sĩ tải nhanh hơn.
      const [appointmentData, availabilityData] = await Promise.all([
        getAppointments(),
        getDoctorAvailability(),
      ]);

      // Lưu lịch hẹn thật từ backend.
      setAppointments(appointmentData);

      // Nếu bác sĩ chưa có lịch rảnh, gợi ý một dòng mặc định để họ cấu hình nhanh.
      setAvailability((availabilityData.availability ?? []).length ? availabilityData.availability : [createAvailabilityDraft()]);
      setTimeOffs(availabilityData.time_offs ?? []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể tải lịch hẹn bác sĩ.");
    } finally {
      setLoading(false);
    }
  };

  // Tải dữ liệu khi mở trang.
  useEffect(() => {
    fetchData();
  }, []);

  const pendingAppointments = useMemo(
    () => appointments.filter((appointment) => appointment.status === "PENDING"),
    [appointments],
  );

  const activeAppointments = useMemo(
    () =>
      appointments
        .filter((appointment) => ["PENDING", "APPROVED"].includes(appointment.status))
        .sort((left, right) => new Date(left.start_time) - new Date(right.start_time)),
    [appointments],
  );

  /**
   * Cập nhật một field trong dòng lịch rảnh.
   * Hàm giữ immutable state để React render đúng.
   */
  const updateAvailabilityRow = (index, field, value) => {
    // Map qua từng dòng và chỉ thay đổi dòng có index tương ứng.
    setAvailability((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  /**
   * Lưu cấu hình lịch rảnh lên backend.
   * Backend dùng replace-all nên payload là toàn bộ danh sách hiện tại.
   */
  const handleSaveAvailability = async () => {
    setSavingAvailability(true);
    try {
      // Chuẩn hóa slot_minutes về số trước khi gửi API.
      const payload = availability.map((item) => ({
        day_of_week: Number(item.day_of_week),
        start_time: item.start_time,
        end_time: item.end_time,
        slot_minutes: Number(item.slot_minutes || 30),
        is_active: item.is_active !== false,
      }));

      // Lưu và cập nhật lại state bằng dữ liệu backend trả về.
      const saved = await saveDoctorAvailability(payload);
      setAvailability(saved.length ? saved : [createAvailabilityDraft()]);
      toast.success("Đã cập nhật lịch rảnh.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể lưu lịch rảnh.");
    } finally {
      setSavingAvailability(false);
    }
  };

  /**
   * Duyệt một yêu cầu lịch hẹn.
   * Hàm gửi link meeting nếu bác sĩ đã nhập ở card yêu cầu.
   */
  const handleApprove = async (appointmentId) => {
    try {
      // Lấy meeting URL theo appointment_id từ state form.
      const meetingUrl = meetingUrls[appointmentId] || null;
      const result = await approveAppointment(appointmentId, meetingUrl);

      // Cập nhật item vừa duyệt trong danh sách hiện tại.
      setAppointments((current) =>
        current.map((appointment) =>
          appointment.appointment_id === appointmentId ? result.appointment : appointment,
        ),
      );
      toast.success("Đã xác nhận lịch hẹn.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể xác nhận lịch hẹn.");
    }
  };

  /**
   * Cập nhật trạng thái lịch hẹn từ phía bác sĩ.
   * Hàm dùng cho từ chối và hoàn tất lịch khám.
   */
  const handleStatusUpdate = async (appointmentId, status) => {
    try {
      // Gửi reason mặc định để notification có ngữ cảnh cơ bản.
      const result = await updateAppointmentStatus(
        appointmentId,
        status,
        status === "REJECTED" ? "Bác sĩ từ chối yêu cầu đặt lịch." : "Bác sĩ đánh dấu hoàn tất buổi khám.",
      );

      // Cập nhật lịch hẹn trong state local.
      setAppointments((current) =>
        current.map((appointment) =>
          appointment.appointment_id === appointmentId ? result.appointment : appointment,
        ),
      );
      toast.success("Đã cập nhật lịch hẹn.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể cập nhật lịch hẹn.");
    }
  };

  /**
   * Tạo khoảng nghỉ/chặn lịch cho bác sĩ.
   * Sau khi tạo xong, state timeOffs được cập nhật để UI thấy ngay.
   */
  const handleCreateTimeOff = async () => {
    try {
      // Chuyển datetime-local thành ISO string để backend parse chính xác.
      const payload = {
        start_time: new Date(timeOffDraft.start_time).toISOString(),
        end_time: new Date(timeOffDraft.end_time).toISOString(),
        reason: timeOffDraft.reason,
      };

      // Gọi API tạo khoảng nghỉ.
      const created = await createDoctorTimeOff(payload);
      setTimeOffs((current) => [...current, created]);
      setTimeOffDraft({ start_time: "", end_time: "", reason: "" });
      toast.success("Đã thêm lịch nghỉ.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể thêm lịch nghỉ.");
    }
  };

  /**
   * Xóa khoảng nghỉ/chặn lịch đã tạo.
   * Hàm cập nhật state local sau khi backend xóa thành công.
   */
  const handleDeleteTimeOff = async (timeOffId) => {
    try {
      // Gọi DELETE theo id khoảng nghỉ.
      await deleteDoctorTimeOff(timeOffId);

      // Loại bỏ item khỏi danh sách hiện tại.
      setTimeOffs((current) => current.filter((item) => item.time_off_id !== timeOffId));
      toast.success("Đã xóa lịch nghỉ.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể xóa lịch nghỉ.");
    }
  };

  if (loading) {
    return <div className="py-16 text-center text-sm font-bold text-slate-400">Đang tải lịch hẹn...</div>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <section className="space-y-6 lg:col-span-8">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-primary">Lịch khám</p>
              <h1 className="mt-1 text-2xl font-black text-slate-900">Quản lý lịch hẹn bệnh nhân</h1>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-amber-50 px-4 py-3">
                <p className="text-xl font-black text-amber-700">{pendingAppointments.length}</p>
                <p className="text-[10px] font-black uppercase text-amber-600">Chờ duyệt</p>
              </div>
              <div className="rounded-xl bg-emerald-50 px-4 py-3">
                <p className="text-xl font-black text-emerald-700">{activeAppointments.length}</p>
                <p className="text-[10px] font-black uppercase text-emerald-600">Đang mở</p>
              </div>
              <div className="rounded-xl bg-sky-50 px-4 py-3">
                <p className="text-xl font-black text-sky-700">{appointments.length}</p>
                <p className="text-[10px] font-black uppercase text-sky-600">Tổng</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-800">Lịch sắp tới</h2>
            <span className="text-xs font-bold text-slate-400">{activeAppointments.length} lịch</span>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {activeAppointments.length === 0 ? (
              <div className="col-span-full rounded-xl border border-dashed border-slate-200 p-10 text-center text-sm font-bold text-slate-400">
                Chưa có lịch hẹn đang hoạt động.
              </div>
            ) : (
              activeAppointments.map((appointment) => (
                <article key={appointment.appointment_id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-black text-slate-800">{appointment.patient?.name || "Bệnh nhân"}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">{formatDateTime(appointment.start_time)}</p>
                    </div>
                    <StatusBadge status={appointment.status} />
                  </div>
                  <div className="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-600">
                    {formatTimeRange(appointment)} · {appointment.type === "ONLINE" ? "Online" : "Trực tiếp"}
                  </div>
                  <p className="mt-3 line-clamp-2 text-xs text-slate-500">{appointment.reason}</p>
                  {appointment.status === "APPROVED" && (
                    <button
                      type="button"
                      onClick={() => handleStatusUpdate(appointment.appointment_id, "COMPLETED")}
                      className="mt-3 rounded-lg bg-primary px-3 py-2 text-xs font-black text-white hover:bg-primary/90"
                    >
                      Đánh dấu hoàn tất
                    </button>
                  )}
                </article>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-800">Yêu cầu chờ duyệt</h2>
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-black text-amber-700">{pendingAppointments.length}</span>
          </div>

          <div className="space-y-3">
            {pendingAppointments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm font-bold text-slate-400">
                Chưa có yêu cầu đặt lịch mới.
              </div>
            ) : (
              pendingAppointments.map((appointment) => (
                <article key={appointment.appointment_id} className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-black text-slate-800">{appointment.patient?.name || "Bệnh nhân"}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">{formatDateTime(appointment.start_time)}</p>
                      <p className="mt-2 text-sm text-slate-600">{appointment.reason}</p>
                    </div>
                    <StatusBadge status={appointment.status} />
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
                    <input
                      value={meetingUrls[appointment.appointment_id] || ""}
                      onChange={(event) =>
                        setMeetingUrls((current) => ({
                          ...current,
                          [appointment.appointment_id]: event.target.value,
                        }))
                      }
                      className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                      placeholder="Link meeting nếu khám online"
                    />
                    <button
                      type="button"
                      onClick={() => handleApprove(appointment.appointment_id)}
                      className="rounded-xl bg-primary px-4 py-2 text-sm font-black text-white hover:bg-primary/90"
                    >
                      Xác nhận
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusUpdate(appointment.appointment_id, "REJECTED")}
                      className="rounded-xl border border-rose-100 px-4 py-2 text-sm font-black text-rose-600 hover:bg-rose-50"
                    >
                      Từ chối
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      <aside className="space-y-6 lg:col-span-4">
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-primary">Lịch rảnh</p>
              <h2 className="text-lg font-black text-slate-800">Khung giờ nhận lịch</h2>
            </div>
            <button
              type="button"
              onClick={() => setAvailability((current) => [...current, createAvailabilityDraft()])}
              className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-200"
            >
              + Thêm
            </button>
          </div>

          <div className="space-y-3">
            {availability.map((item, index) => (
              <div key={item.availability_id ?? index} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={item.day_of_week}
                    onChange={(event) => updateAvailabilityRow(index, "day_of_week", Number(event.target.value))}
                    className="rounded-lg border border-slate-100 bg-white px-2 py-2 text-xs font-bold outline-none"
                  >
                    {WEEKDAYS.map((day) => (
                      <option key={day.id} value={day.id}>{day.label}</option>
                    ))}
                  </select>
                  <select
                    value={item.slot_minutes}
                    onChange={(event) => updateAvailabilityRow(index, "slot_minutes", Number(event.target.value))}
                    className="rounded-lg border border-slate-100 bg-white px-2 py-2 text-xs font-bold outline-none"
                  >
                    {[15, 20, 30, 45, 60].map((minute) => (
                      <option key={minute} value={minute}>{minute} phút</option>
                    ))}
                  </select>
                  <input
                    type="time"
                    value={item.start_time}
                    onChange={(event) => updateAvailabilityRow(index, "start_time", event.target.value)}
                    className="rounded-lg border border-slate-100 bg-white px-2 py-2 text-xs font-bold outline-none"
                  />
                  <input
                    type="time"
                    value={item.end_time}
                    onChange={(event) => updateAvailabilityRow(index, "end_time", event.target.value)}
                    className="rounded-lg border border-slate-100 bg-white px-2 py-2 text-xs font-bold outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setAvailability((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  className="mt-2 text-xs font-black text-rose-500 hover:underline"
                >
                  Xóa khung này
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            disabled={savingAvailability}
            onClick={handleSaveAvailability}
            className="mt-4 w-full rounded-xl bg-primary px-4 py-3 text-sm font-black text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {savingAvailability ? "Đang lưu..." : "Lưu lịch rảnh"}
          </button>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <p className="text-[11px] font-black uppercase tracking-widest text-primary">Lịch nghỉ</p>
            <h2 className="text-lg font-black text-slate-800">Chặn slot cụ thể</h2>
          </div>

          <div className="space-y-3">
            <input
              type="datetime-local"
              value={timeOffDraft.start_time}
              onChange={(event) => setTimeOffDraft((current) => ({ ...current, start_time: event.target.value }))}
              className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm outline-none"
            />
            <input
              type="datetime-local"
              value={timeOffDraft.end_time}
              onChange={(event) => setTimeOffDraft((current) => ({ ...current, end_time: event.target.value }))}
              className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm outline-none"
            />
            <input
              value={timeOffDraft.reason}
              onChange={(event) => setTimeOffDraft((current) => ({ ...current, reason: event.target.value }))}
              className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm outline-none"
              placeholder="Lý do nghỉ"
            />
            <button
              type="button"
              onClick={handleCreateTimeOff}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white hover:bg-slate-800"
            >
              Thêm lịch nghỉ
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {timeOffs.map((timeOff) => (
              <div key={timeOff.time_off_id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-black text-slate-700">{formatDateTime(timeOff.start_time)}</p>
                  <p className="truncate text-[11px] text-slate-400">{timeOff.reason || "Không có lý do"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteTimeOff(timeOff.time_off_id)}
                  className="text-rose-500 hover:text-rose-700"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}
