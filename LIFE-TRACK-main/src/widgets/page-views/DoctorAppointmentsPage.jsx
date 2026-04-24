import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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

const CALENDAR_START_HOUR = 7;
const CALENDAR_END_HOUR = 20;
const HOURS = Array.from({ length: CALENDAR_END_HOUR - CALENDAR_START_HOUR + 1 }, (_, i) => i + CALENDAR_START_HOUR);

function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

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

function PatientContextActions({ navigate, patientId }) {
  if (!patientId) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => navigate(`/doctor/messages?patientId=${patientId}`)}
        className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-black text-slate-700 hover:bg-white"
      >
        Nhắn tin
      </button>
      <button
        type="button"
        onClick={() => navigate(`/doctor/live?patientId=${patientId}`)}
        className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-black text-slate-700 hover:bg-white"
      >
        Monitor
      </button>
      <button
        type="button"
        onClick={() => navigate(`/doctor/emr?patientId=${patientId}`)}
        className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-black text-slate-700 hover:bg-white"
      >
        EMR
      </button>
    </div>
  );
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

function createAvailabilityDraftForDay(dayOfWeek, overrides = {}) {
  return {
    ...createAvailabilityDraft(),
    day_of_week: dayOfWeek,
    ...overrides,
  };
}

const AVAILABILITY_PRESETS = {
  morning: [{ start_time: "08:00", end_time: "12:00", slot_minutes: 30 }],
  afternoon: [{ start_time: "13:30", end_time: "17:00", slot_minutes: 30 }],
  full: [{ start_time: "08:00", end_time: "12:00", slot_minutes: 30 }, { start_time: "13:30", end_time: "17:00", slot_minutes: 30 }],
};

function isValidTimeRange(startTime, endTime) {
  return Boolean(startTime && endTime && startTime < endTime);
}

/**
 * Trang lịch hẹn của bác sĩ.
 * Trang hiển thị lịch thật từ backend, yêu cầu chờ duyệt và công cụ cấu hình lịch rảnh.
 */
export function DoctorAppointmentsPage() {
  const navigate = useNavigate();
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

  const [currentWeekStart, setCurrentWeekStart] = useState(getStartOfWeek(new Date()));
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const previousWeek = () => setCurrentWeekStart(addDays(currentWeekStart, -7));
  const nextWeek = () => setCurrentWeekStart(addDays(currentWeekStart, 7));
  const todayWeek = () => setCurrentWeekStart(getStartOfWeek(new Date()));

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

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
        .filter((appointment) => ["PENDING", "APPROVED", "COMPLETED", "REJECTED"].includes(appointment.status))
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

  const getAvailabilityRowsForDay = (dayOfWeek) =>
    availability
      .map((item, index) => ({ ...item, __index: index }))
      .filter((item) => Number(item.day_of_week) === Number(dayOfWeek));

  const addAvailabilityForDay = (dayOfWeek) => {
    setAvailability((current) => [
      ...current,
      createAvailabilityDraftForDay(dayOfWeek),
    ]);
  };

  const removeAvailabilityRow = (index) => {
    setAvailability((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const setDayPreset = (dayOfWeek, presetKey) => {
    const preset = AVAILABILITY_PRESETS[presetKey] || [];
    setAvailability((current) => [
      ...current.filter((item) => Number(item.day_of_week) !== Number(dayOfWeek)),
      ...preset.map((item) => createAvailabilityDraftForDay(dayOfWeek, item)),
    ]);
  };

  const toggleDayActive = (dayOfWeek, active) => {
    const rows = getAvailabilityRowsForDay(dayOfWeek);
    if (!active) {
      setAvailability((current) => current.filter((item) => Number(item.day_of_week) !== Number(dayOfWeek)));
      return;
    }

    if (!rows.length) {
      addAvailabilityForDay(dayOfWeek);
      return;
    }

    setAvailability((current) =>
      current.map((item) =>
        Number(item.day_of_week) === Number(dayOfWeek) ? { ...item, is_active: true } : item,
      ),
    );
  };

  const copyDaySchedule = (sourceDay, targetMode) => {
    const sourceRows = getAvailabilityRowsForDay(sourceDay).filter((item) => item.is_active !== false);
    if (!sourceRows.length) {
      toast.warn("Ngày nguồn chưa có khung giờ để sao chép.");
      return;
    }

    const targetDays =
      targetMode === "weekdays"
        ? [1, 2, 3, 4, 5]
        : WEEKDAYS.map((day) => day.id).filter((dayId) => dayId !== sourceDay);

    setAvailability((current) => [
      ...current.filter((item) => !targetDays.includes(Number(item.day_of_week))),
      ...targetDays.flatMap((dayOfWeek) =>
        sourceRows.map((row) =>
          createAvailabilityDraftForDay(dayOfWeek, {
            start_time: row.start_time,
            end_time: row.end_time,
            slot_minutes: row.slot_minutes,
            is_active: true,
          }),
        ),
      ),
    ]);
  };

  /**
   * Lưu cấu hình lịch rảnh lên backend.
   * Backend dùng replace-all nên payload là toàn bộ danh sách hiện tại.
   */
  const handleSaveAvailability = async () => {
    setSavingAvailability(true);
    try {
      // Chuẩn hóa slot_minutes về số trước khi gửi API.
      const payload = availability
        .filter((item) => item.is_active !== false)
        .map((item) => ({
          day_of_week: Number(item.day_of_week),
          start_time: item.start_time,
          end_time: item.end_time,
          slot_minutes: Number(item.slot_minutes || 30),
          is_active: true,
        }));

      const invalidRow = payload.find(
        (item) =>
          !isValidTimeRange(item.start_time, item.end_time) ||
          ![15, 20, 30, 45, 60].includes(Number(item.slot_minutes)),
      );

      if (invalidRow) {
        toast.warn("Vui lòng kiểm tra lại khung giờ: giờ bắt đầu phải nhỏ hơn giờ kết thúc và slot phải hợp lệ.");
        return;
      }

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
    <div className="space-y-6">
      <section className="space-y-6">
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

        <div className="rounded-2xl border border-slate-100 bg-white p-0 shadow-sm overflow-hidden flex flex-col h-auto min-h-[500px]">
          <div className="flex items-center justify-between border-b border-slate-100 p-5 bg-slate-50/40">
            <div>
              <h2 className="text-lg font-black text-slate-800">Lịch tuần này</h2>
              <p className="text-xs font-medium text-slate-500 mt-1">
                {currentWeekStart.toLocaleDateString("vi-VN")} - {addDays(currentWeekStart, 6).toLocaleDateString("vi-VN")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                type="button" 
                onClick={previousWeek} 
                className="flex items-center justify-center p-2 hover:bg-slate-100 rounded-lg border border-transparent hover:border-slate-200 transition-all text-slate-600"
              >
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              <button 
                type="button" 
                onClick={todayWeek} 
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-50 text-slate-700 transition-colors shadow-sm"
              >
                Hôm nay
              </button>
              <button 
                type="button" 
                onClick={nextWeek} 
                className="flex items-center justify-center p-2 hover:bg-slate-100 rounded-lg border border-transparent hover:border-slate-200 transition-all text-slate-600"
              >
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto relative bg-white">
            <div className="flex min-w-[700px]">
              {/* Time Column (Y axis) */}
              <div className="w-16 flex-shrink-0 border-r border-slate-100 bg-white sticky left-0 z-20">
                <div className="h-12 border-b border-slate-100 bg-white sticky top-0 z-30"></div>
                {HOURS.map(hour => (
                  <div key={hour} className="h-[40px] relative">
                    <span className="absolute -top-2 right-2 text-[10px] font-bold text-slate-400">{hour}:00</span>
                  </div>
                ))}
              </div>

              {/* Days Columns */}
              <div className="flex-1 flex">
                {weekDays.map(day => {
                  const isToday = day.toDateString() === new Date().toDateString();
                  const dayAppointments = activeAppointments.filter(app => {
                    const d = new Date(app.start_time);
                    return d.toDateString() === day.toDateString();
                  });

                  return (
                    <div key={day.toISOString()} className="flex-1 min-w-[100px] border-r border-slate-100 relative">
                      {/* Day Header */}
                      <div className={`h-12 flex flex-col items-center justify-center border-b border-slate-100 sticky top-0 z-10 bg-white/95 backdrop-blur ${isToday ? 'bg-primary/5' : ''}`}>
                        <span className={`text-[10px] font-black uppercase ${isToday ? 'text-primary' : 'text-slate-500'}`}>
                          {day.toLocaleDateString("vi-VN", { weekday: "short" })}
                        </span>
                        <span className={`text-lg font-black leading-none mt-0.5 ${isToday ? 'text-primary' : 'text-slate-800'}`}>
                          {day.getDate()}
                        </span>
                      </div>

                      {/* Day Cells (Background Grid) */}
                      <div className="relative">
                        {HOURS.map(hour => (
                          <div key={hour} className="h-[40px] border-b border-slate-50"></div>
                        ))}

                        {/* Events Overlay */}
                        {dayAppointments.map(appointment => {
                          const start = new Date(appointment.start_time);
                          const end = new Date(appointment.end_time);
                          const topMinutes = (start.getHours() - CALENDAR_START_HOUR) * 60 + start.getMinutes();
                          const heightMinutes = (end.getTime() - start.getTime()) / 60000;
                          
                          if (start.getHours() < CALENDAR_START_HOUR || start.getHours() > CALENDAR_END_HOUR) return null;

                          return (
                            <div 
                              key={appointment.appointment_id}
                              onClick={() => setSelectedAppointment(appointment)}
                              className={`absolute left-1 right-1 rounded-lg border p-1.5 cursor-pointer shadow-sm transition-all overflow-hidden animate-fade-in group ${
                                appointment.status === 'APPROVED' ? 'bg-emerald-50/90 border-emerald-300 hover:bg-emerald-100 hover:shadow-md' : 
                                appointment.status === 'PENDING' ? 'bg-amber-50/90 border-amber-300 hover:bg-amber-100 hover:shadow-md' :
                                appointment.status === 'REJECTED' ? 'bg-rose-50/90 border-rose-300 hover:bg-rose-100 hover:shadow-md' :
                                'bg-emerald-50/60 border-emerald-200 opacity-60 hover:opacity-100'
                              }`}
                              style={{ top: `${topMinutes * 40 / 60}px`, height: `${Math.max(20, heightMinutes * 40 / 60)}px` }}
                            >
                              <div className={`text-[10px] font-black uppercase tracking-wider ${
                                appointment.status === 'APPROVED' ? 'text-emerald-700' : 
                                appointment.status === 'PENDING' ? 'text-amber-700' :
                                appointment.status === 'REJECTED' ? 'text-rose-700' :
                                'text-emerald-700'
                              }`}>
                                {start.toLocaleTimeString("vi-VN", { hour: "2-digit", minute:"2-digit" })}
                              </div>
                              <div className={`text-[11px] font-bold leading-tight truncate mt-0.5 ${
                                appointment.status === 'COMPLETED' ? 'text-emerald-900 line-through' : 'text-slate-800'
                              }`}>
                                {appointment.patient?.name || "Bệnh nhân"}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        <aside className="space-y-6 lg:col-span-8">
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-primary">Lịch rảnh</p>
                <h2 className="text-lg font-black text-slate-800">Lịch làm việc lặp lại</h2>
              </div>
              <button
                type="button"
                disabled={savingAvailability}
                onClick={handleSaveAvailability}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-black text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {savingAvailability ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>

            <div className="mb-4 rounded-xl bg-sky-50 p-3 text-xs font-medium text-sky-800">
              Lịch rảnh được áp dụng tuần tự. Nhấn công tắc để mở khung giờ ngày chẵn/lẻ.
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left text-sm whitespace-nowrap min-w-[600px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="py-3 px-4 text-slate-500 font-bold w-24 border-b border-slate-100">Ngày</th>
                    <th className="py-3 px-4 text-slate-500 font-bold w-16 text-center border-b border-slate-100">Nghỉ / Làm</th>
                    <th className="py-3 px-4 text-slate-500 font-bold border-b border-slate-100">Khung giờ</th>
                    <th className="py-3 px-4 text-slate-500 font-bold text-right border-b border-slate-100">Sao chép nhanh</th>
                  </tr>
                </thead>
                <tbody>
                  {WEEKDAYS.map((day) => {
                    const rows = getAvailabilityRowsForDay(day.id);
                    const enabled = rows.some((row) => row.is_active !== false);

                    return (
                      <tr key={day.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-4 font-black text-slate-700">{day.label}</td>
                        <td className="py-4 px-4 text-center">
                           <label className="relative inline-flex items-center cursor-pointer">
                              <input type="checkbox" checked={enabled} onChange={e => toggleDayActive(day.id, e.target.checked)} className="sr-only peer" />
                              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                           </label>
                        </td>
                        <td className="py-4 px-4">
                          {enabled ? (
                            <div className="space-y-2">
                              {rows.map(item => (
                                <div key={item.availability_id ?? item.__index} className="flex gap-2 items-center">
                                   <input type="time" value={item.start_time} onChange={e => updateAvailabilityRow(item.__index, "start_time", e.target.value)} className="bg-white border border-slate-200 rounded-md px-2 py-1 flex-1 min-w-[80px] text-xs font-bold shadow-sm outline-none focus:border-primary"/> 
                                   <span className="text-slate-400 font-black">-</span>
                                   <input type="time" value={item.end_time} onChange={e => updateAvailabilityRow(item.__index, "end_time", e.target.value)} className="bg-white border border-slate-200 rounded-md px-2 py-1 flex-1 min-w-[80px] text-xs font-bold shadow-sm outline-none focus:border-primary"/>
                                   <select value={item.slot_minutes} onChange={e => updateAvailabilityRow(item.__index, "slot_minutes", Number(e.target.value))} className="bg-white border border-slate-200 rounded-md px-2 py-1 text-xs font-bold shadow-sm outline-none focus:border-primary">
                                      {[15,20,30,45,60].map(m => <option key={m} value={m}>{m}p</option>)}
                                   </select>
                                   <button onClick={() => removeAvailabilityRow(item.__index)} className="text-rose-500 hover:bg-rose-50 hover:text-rose-600 border border-transparent hover:border-rose-100 rounded p-1 transition-colors"><span className="material-symbols-outlined text-[16px] block">close</span></button>
                                </div>
                              ))}
                              <button onClick={() => addAvailabilityForDay(day.id)} className="text-[11px] text-primary font-bold hover:underline mt-1">+ Thêm khung giờ</button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium italic select-none">Nghỉ làm việc</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex flex-wrap gap-1 justify-end">
                            {enabled && (
                              <>
                                <button onClick={() => setDayPreset(day.id, 'morning')} className="text-[10px] bg-white border border-slate-200 px-2 py-1 rounded hover:bg-slate-50 font-bold transition-colors">Sáng</button>
                                <button onClick={() => setDayPreset(day.id, 'afternoon')} className="text-[10px] bg-white border border-slate-200 px-2 py-1 rounded hover:bg-slate-50 font-bold transition-colors">Chiều</button>
                                <button onClick={() => setDayPreset(day.id, 'full')} className="text-[10px] bg-white border border-slate-200 px-2 py-1 rounded hover:bg-slate-50 font-bold transition-colors">Cả ngày</button>
                                <button onClick={() => copyDaySchedule(day.id, 'weekdays')} className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-1 rounded font-bold hover:bg-emerald-100 transition-colors">Copy T2-T6</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </aside>

        <aside className="space-y-6 lg:col-span-4">
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

      {/* Appointment Detail Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedAppointment(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-scale-up border border-slate-100" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
               <div>
                  <h3 className="text-xl font-black text-slate-900">{selectedAppointment.patient?.name || "Bệnh nhân"}</h3>
                  <p className="text-sm font-bold text-slate-500 mt-1">{formatDateTime(selectedAppointment.start_time)}</p>
               </div>
               <StatusBadge status={selectedAppointment.status} />
            </div>
            
            <div className="rounded-xl bg-slate-50 p-4 mb-5 border border-slate-100 space-y-2">
               <p className="text-sm font-medium text-slate-700"><span className="font-bold text-slate-900">Hình thức:</span> {selectedAppointment.type === "ONLINE" ? "Trực tuyến" : "Trực tiếp"}</p>
               <p className="text-sm font-medium text-slate-700"><span className="font-bold text-slate-900">Lý do khám:</span> {selectedAppointment.reason}</p>
            </div>

            <div className="border-t border-slate-100 pt-5">
               <p className="text-[11px] font-black uppercase text-slate-400 mb-3 tracking-widest">Hành động</p>
               <div className="flex flex-col gap-2">
                 <PatientContextActions navigate={navigate} patientId={selectedAppointment.patient?.user_id} />
                 
                 {selectedAppointment.status === "PENDING" && (
                    <div className="mt-2 flex flex-col gap-3">
                      <input
                        value={meetingUrls[selectedAppointment.appointment_id] || ""}
                        onChange={(event) =>
                          setMeetingUrls((current) => ({
                            ...current,
                            [selectedAppointment.appointment_id]: event.target.value,
                          }))
                        }
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                        placeholder="Thêm link meeting (nếu khám online)"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                             handleApprove(selectedAppointment.appointment_id);
                             setSelectedAppointment(null);
                          }}
                          className="rounded-xl bg-primary px-4 py-2 text-sm font-black text-white hover:bg-primary/90 transition-colors"
                        >
                          Xác nhận
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                             handleStatusUpdate(selectedAppointment.appointment_id, "REJECTED");
                             setSelectedAppointment(null);
                          }}
                          className="rounded-xl border border-rose-100 px-4 py-2 text-sm font-black text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          Từ chối
                        </button>
                      </div>
                    </div>
                 )}

                 {selectedAppointment.status === "APPROVED" && (
                    <button
                      type="button"
                      onClick={() => {
                         handleStatusUpdate(selectedAppointment.appointment_id, "COMPLETED");
                         setSelectedAppointment(null);
                      }}
                      className="mt-2 w-full rounded-xl bg-primary px-4 py-3 text-sm font-black text-white hover:bg-primary/90 transition-colors"
                    >
                      Đánh dấu hoàn tất
                    </button>
                 )}
               </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 text-right">
              <button 
                type="button"
                onClick={() => setSelectedAppointment(null)} 
                className="px-5 py-2 rounded-xl bg-slate-100 font-bold text-slate-600 hover:bg-slate-200 text-sm transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
