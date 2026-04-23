import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  createAppointment,
  getAppointmentDoctors,
  getAppointmentSlots,
  getAppointments,
  updateAppointmentStatus,
} from "@/features/appointments/api/appointmentsApi";

const STATUS_META = {
  PENDING: { label: "Chờ xác nhận", className: "bg-amber-100 text-amber-700", icon: "pending_actions" },
  APPROVED: { label: "Đã xác nhận", className: "bg-emerald-100 text-emerald-700", icon: "event_available" },
  REJECTED: { label: "Từ chối", className: "bg-rose-100 text-rose-700", icon: "event_busy" },
  CANCELLED: { label: "Đã hủy", className: "bg-slate-100 text-slate-500", icon: "cancel" },
  COMPLETED: { label: "Hoàn tất", className: "bg-sky-100 text-sky-700", icon: "task_alt" },
};

/**
 * Format ngày giờ theo tiếng Việt để UI lịch khám dễ đọc.
 * Hàm dùng chung cho slot và danh sách lịch hẹn.
 */
function formatDateTime(value, options = {}) {
  // Tạo Date từ ISO string backend trả về.
  const date = new Date(value);

  // Trả chuỗi rỗng nếu dữ liệu không hợp lệ để tránh UI hiện Invalid Date.
  if (Number.isNaN(date.getTime())) return "";

  // Ghép cấu hình mặc định với override từ caller.
  return date.toLocaleString("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    ...options,
  });
}

/**
 * Format tiền khám theo VND.
 * Nếu phí bằng 0 thì hiển thị miễn phí để bệnh nhân hiểu trạng thái thanh toán.
 */
function formatFee(value) {
  // Chuyển phí về số để xử lý cả null/undefined.
  const fee = Number(value || 0);

  // Phí 0 tương ứng lịch miễn phí do đã thuê bác sĩ hoặc bác sĩ không đặt phí.
  if (fee <= 0) return "Miễn phí";

  // Dùng Intl để format tiền Việt Nam nhất quán.
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(fee);
}

function toDateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildDateStrip(days = 14) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + index);
    return {
      key: toDateKey(date),
      dayName: date.toLocaleDateString("vi-VN", { weekday: "short" }),
      dayNumber: date.getDate(),
      month: date.toLocaleDateString("vi-VN", { month: "2-digit" }),
      isToday: index === 0,
    };
  });
}

function getSlotPeriod(slot) {
  const hour = new Date(slot.start_time).getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

function getUnavailableReason(slot) {
  const reason = slot.unavailable_reason || slot.reason || "";
  const normalized = reason.toLowerCase();
  if (normalized.includes("past") || normalized.includes("qua")) return "Đã qua";
  if (normalized.includes("time_off") || normalized.includes("ngh")) return "Bác sĩ nghỉ";
  if (normalized.includes("book") || normalized.includes("đặt")) return "Đã đặt";
  return reason || "Không khả dụng";
}

function getDoctorSearchText(doctor) {
  return [
    doctor?.name,
    doctor?.email,
    doctor?.specialty,
    doctor?.doctorProfile?.specialty,
    doctor?.profile?.specialty,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/**
 * Badge trạng thái lịch hẹn.
 * Component nhỏ này giúp danh sách lịch hẹn và summary dùng chung visual.
 */
function AppointmentStatusBadge({ status }) {
  // Lấy metadata theo status, fallback về PENDING nếu backend trả status lạ.
  const meta = STATUS_META[status] ?? STATUS_META.PENDING;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black ${meta.className}`}>
      <span className="material-symbols-outlined text-[14px]">{meta.icon}</span>
      {meta.label}
    </span>
  );
}

/**
 * Kiểm tra bác sĩ có phải bác sĩ bệnh nhân đã thuê/đang đồng hành hay không.
 * Tạm thời UI hỗ trợ nhiều tên field để sau này backend chỉ cần trả một trong các cờ này.
 */
function isHiredDoctor(doctor) {
  // Các field này đều biểu thị quan hệ đã thuê hoặc quyền truy cập accepted từ backend.
  return Boolean(
    doctor?.is_hired ||
    doctor?.hired ||
    doctor?.isHired ||
    doctor?.access_status === "accepted" ||
    doctor?.accessStatus === "accepted",
  );
}

/**
 * Lấy phí đặt lịch hiển thị cho bác sĩ.
 * Bác sĩ đã thuê luôn miễn phí; bác sĩ ngoài dùng giá bác sĩ đã setting.
 */
function getDoctorBookingFee(doctor) {
  // Bác sĩ đã thuê không tính phí từng lịch hẹn.
  if (isHiredDoctor(doctor)) return 0;

  // Nếu API có effective_fee thì ưu tiên dùng, nếu không dùng consultation_fee hiện tại.
  return Number(doctor?.effective_fee ?? doctor?.consultation_fee ?? 0);
}

/**
 * Card chọn bác sĩ cho màn đặt lịch.
 * Component dùng chung cho nhóm bác sĩ đã thuê và nhóm bác sĩ gợi ý bên ngoài.
 */
function DoctorChoiceCard({ doctor, selected, variant = "external", onSelect }) {
  const hired = variant === "hired" || isHiredDoctor(doctor);
  const fee = getDoctorBookingFee(doctor);

  return (
    <button
      type="button"
      onClick={() => onSelect(doctor.user_id)}
      className={[
        "flex min-h-[116px] items-start gap-4 rounded-xl border p-4 text-left transition-all",
        selected ? "border-primary bg-primary/5 shadow-sm" : "border-slate-100 bg-white hover:border-primary/30",
      ].join(" ")}
    >
      <div className={hired ? "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700" : "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-primary"}>
        <span className="material-symbols-outlined">{hired ? "verified" : "stethoscope"}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="break-words font-black leading-5 text-slate-800">{doctor.name}</p>
          {hired && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-700">
              Đã thuê
            </span>
          )}
        </div>
        <p className="mt-1 break-words text-xs text-slate-500">{doctor.email}</p>
        <p className={hired ? "mt-2 text-xs font-black text-emerald-700" : "mt-2 text-xs font-black text-secondary"}>
          {hired ? "Miễn phí khi đặt lịch" : `${formatFee(fee)} / lượt`}
        </p>
      </div>

      {selected && <span className="material-symbols-outlined shrink-0 text-primary">check_circle</span>}
    </button>
  );
}

/**
 * Trang đặt lịch khám của bệnh nhân.
 * Trang dùng dữ liệu thật từ backend: danh sách bác sĩ, slot khả dụng và lịch hẹn hiện tại.
 */
export function AppointmentsPage() {
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [slots, setSlots] = useState([]);
  const [doctorId, setDoctorId] = useState(null);
  const [doctorSearch, setDoctorSearch] = useState("");
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [selectedSlotKey, setSelectedSlotKey] = useState("");
  const [selectedDateKey, setSelectedDateKey] = useState(toDateKey(new Date()));
  const [showUnavailableSlots, setShowUnavailableSlots] = useState(false);
  const [appointmentType, setAppointmentType] = useState("ONLINE");
  const [reason, setReason] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [highlightedAppointmentId, setHighlightedAppointmentId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /**
   * Tải dữ liệu ban đầu cho trang đặt lịch.
   * Hàm lấy bác sĩ thật và danh sách lịch hẹn của bệnh nhân hiện tại.
   */
  const fetchInitialData = async () => {
    try {
      // Gọi song song để giảm thời gian chờ khi mở trang.
      const [doctorData, appointmentData] = await Promise.all([
        getAppointmentDoctors(),
        getAppointments(),
      ]);

      // Lưu danh sách bác sĩ và ưu tiên tự chọn bác sĩ đã thuê nếu API trả cờ is_hired/access_status.
      setDoctors(doctorData);
      setDoctorId((current) => current ?? doctorData.find((doctor) => isHiredDoctor(doctor))?.user_id ?? doctorData[0]?.user_id ?? null);

      // Lưu lịch hẹn hiện tại để sidebar hiển thị trạng thái mới nhất.
      setAppointments(appointmentData);
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể tải dữ liệu đặt lịch.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Tải slot khả dụng theo bác sĩ đang chọn.
   * Backend trả cả slot không khả dụng để UI có thể giải thích lý do.
   */
  const fetchSlots = async (nextDoctorId) => {
    if (!nextDoctorId) {
      setSlots([]);
      return;
    }

    setSlotsLoading(true);
    try {
      // Lấy slot từ hôm nay đến 14 ngày tới.
      const from = new Date();
      const to = new Date();
      to.setDate(to.getDate() + 14);

      // Gọi API slot thật theo doctor_id.
      const slotData = await getAppointmentSlots({
        doctorId: nextDoctorId,
        from: from.toISOString(),
        to: to.toISOString(),
      });

      // Reset slot đang chọn nếu slot cũ không còn trong danh sách mới.
      setSlots(slotData);
      setSelectedDateKey((current) => {
        if (slotData.some((slot) => toDateKey(slot.start_time) === current)) return current;
        return slotData.find((slot) => slot.available)?.start_time
          ? toDateKey(slotData.find((slot) => slot.available).start_time)
          : toDateKey(new Date());
      });
      setSelectedSlotKey((current) => {
        const stillExists = slotData.some((slot) => `${slot.start_time}|${slot.end_time}` === current && slot.available);
        return stillExists ? current : "";
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể tải khung giờ bác sĩ.");
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  // Tải dữ liệu ban đầu khi component mount.
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Tải lại slot mỗi khi người dùng chọn bác sĩ khác.
  useEffect(() => {
    fetchSlots(doctorId);
  }, [doctorId]);

  const selectedDoctor = useMemo(
    () => doctors.find((doctor) => doctor.user_id === doctorId) ?? null,
    [doctors, doctorId],
  );

  const filteredDoctors = useMemo(() => {
    const search = doctorSearch.trim().toLowerCase();
    return doctors.filter((doctor) => {
      const hired = isHiredDoctor(doctor);
      const fee = getDoctorBookingFee(doctor);
      const profileSpecialty = doctor?.specialty || doctor?.doctorProfile?.specialty || doctor?.profile?.specialty || "";
      const matchSearch = !search || getDoctorSearchText(doctor).includes(search);
      const matchFilter =
        doctorFilter === "all" ||
        (doctorFilter === "hired" && hired) ||
        (doctorFilter === "external" && !hired) ||
        (doctorFilter === "free" && fee <= 0) ||
        (doctorFilter === "paid" && fee > 0) ||
        (doctorFilter !== "all" &&
          !["hired", "external", "free", "paid"].includes(doctorFilter) &&
          profileSpecialty === doctorFilter);

      return matchSearch && matchFilter;
    });
  }, [doctorFilter, doctorSearch, doctors]);

  const specialtyOptions = useMemo(
    () =>
      Array.from(
        new Set(
          doctors
            .map((doctor) => doctor?.specialty || doctor?.doctorProfile?.specialty || doctor?.profile?.specialty)
            .filter(Boolean),
        ),
      ),
    [doctors],
  );

  const selectedSlot = useMemo(
    () => slots.find((slot) => `${slot.start_time}|${slot.end_time}` === selectedSlotKey) ?? null,
    [slots, selectedSlotKey],
  );

  const upcomingAppointments = useMemo(
    () =>
      appointments
        .filter((appointment) => ["PENDING", "APPROVED"].includes(appointment.status))
        .sort((left, right) => new Date(left.start_time) - new Date(right.start_time)),
    [appointments],
  );

  const dateStrip = useMemo(() => buildDateStrip(14), []);

  const selectedDateSlots = useMemo(
    () =>
      slots
        .filter((slot) => toDateKey(slot.start_time) === selectedDateKey)
        .filter((slot) => showUnavailableSlots || slot.available)
        .sort((left, right) => new Date(left.start_time) - new Date(right.start_time)),
    [selectedDateKey, showUnavailableSlots, slots],
  );

  const groupedSlots = useMemo(() => {
    const groups = { morning: [], afternoon: [], evening: [] };
    selectedDateSlots.forEach((slot) => {
      groups[getSlotPeriod(slot)].push(slot);
    });
    return groups;
  }, [selectedDateSlots]);

  const canSubmit = Boolean(selectedDoctor && selectedSlot && reason.trim() && !submitting);

  /**
   * Gửi yêu cầu đặt lịch khám.
   * Hàm build payload từ bác sĩ, slot và thông tin bệnh nhân nhập.
   */
  const handleCreateAppointment = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      // Gửi dữ liệu ISO string để backend validate đúng slot đã sinh.
      const appointment = await createAppointment({
        doctor_id: selectedDoctor.user_id,
        appointment_date: selectedSlot.start_time,
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
        type: appointmentType,
        reason: reason.trim(),
        patient_attachment_url: attachmentUrl.trim() || null,
      });

      // Cập nhật UI local để người dùng thấy lịch vừa đặt ngay.
      setAppointments((current) => [appointment, ...current]);
      setHighlightedAppointmentId(appointment.appointment_id);
      setReason("");
      setAttachmentUrl("");
      setSelectedSlotKey("");

      // Tải lại slot để slot vừa đặt chuyển sang trạng thái bận.
      await fetchSlots(selectedDoctor.user_id);
      toast.success("Đặt lịch khám thành công, đang chờ bác sĩ xác nhận.");
      window.setTimeout(() => {
        document.getElementById(`appointment-${appointment.appointment_id}`)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể đặt lịch, vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Hủy một lịch hẹn còn chờ hoặc đã xác nhận.
   * Hàm gọi API status và cập nhật lại state local.
   */
  const handleCancelAppointment = async (appointmentId) => {
    try {
      const result = await updateAppointmentStatus(appointmentId, "CANCELLED", "Bệnh nhân hủy lịch từ ứng dụng.");
      setAppointments((current) =>
        current.map((appointment) =>
          appointment.appointment_id === appointmentId ? result.appointment : appointment,
        ),
      );
      if (doctorId) await fetchSlots(doctorId);
      toast.success("Đã hủy lịch hẹn.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể hủy lịch hẹn.");
    }
  };

  if (loading) {
    return <div className="py-16 text-center text-sm font-bold text-slate-400">Đang tải chức năng đặt lịch...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-primary">Đặt lịch khám</p>
            <h1 className="mt-1 text-2xl font-black text-slate-900">Chọn bác sĩ và khung giờ phù hợp</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Khung giờ được lấy từ lịch rảnh bác sĩ
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
            {upcomingAppointments.length} lịch đang theo dõi
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">clinical_notes</span>
              <h2 className="text-lg font-black text-slate-800">1. Chọn bác sĩ</h2>
            </div>

            {doctors.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm font-bold text-slate-400">
                Chưa có bác sĩ hoạt động trong hệ thống.
              </div>
            ) : (
              <div className="space-y-5">
                {/* Search & filter */}
                <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                  <div className="relative">
                    <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">search</span>
                    <input
                      value={doctorSearch}
                      onChange={(event) => setDoctorSearch(event.target.value)}
                      className="w-full rounded-xl border border-slate-100 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-primary"
                      placeholder="Tìm theo tên, email hoặc chuyên khoa"
                    />
                  </div>
                  <select
                    value={doctorFilter}
                    onChange={(event) => setDoctorFilter(event.target.value)}
                    className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600 outline-none focus:border-primary"
                  >
                    <option value="all">Tất cả bác sĩ</option>
                    <option value="hired">Đã thuê</option>
                    <option value="external">Bác sĩ ngoài</option>
                    <option value="free">Miễn phí</option>
                    <option value="paid">Có phí</option>
                    {specialtyOptions.map((specialty) => (
                      <option key={specialty} value={specialty}>{specialty}</option>
                    ))}
                  </select>
                </div>

                {/* ── Bác sĩ đang đồng hành (đã thuê) ── */}
                {(() => {
                  const hiredDoctors = filteredDoctors.filter((d) => isHiredDoctor(d));
                  return (
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                          <span className="material-symbols-outlined text-[16px]">verified</span>
                        </span>
                        <h3 className="text-sm font-bold text-slate-700">Bác sĩ đang đồng hành</h3>
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                          {hiredDoctors.length}
                        </span>
                      </div>
                      {hiredDoctors.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-emerald-100 bg-emerald-50/30 p-5 text-center text-sm text-slate-400">
                          <span className="material-symbols-outlined mb-1 block text-[24px] text-emerald-300">group_off</span>
                          Chưa có bác sĩ đồng hành. Bạn có thể thuê bác sĩ từ danh sách gợi ý bên dưới.
                        </div>
                      ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                          {hiredDoctors.map((doctor) => (
                            <DoctorChoiceCard
                              key={doctor.user_id}
                              doctor={doctor}
                              selected={doctor.user_id === doctorId}
                              variant="hired"
                              onSelect={setDoctorId}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-100" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">hoặc</span>
                  <div className="h-px flex-1 bg-slate-100" />
                </div>

                {/* ── Bác sĩ gợi ý ── */}
                {(() => {
                  const suggestedDoctors = filteredDoctors.filter((d) => !isHiredDoctor(d));
                  return (
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-primary">
                          <span className="material-symbols-outlined text-[16px]">stethoscope</span>
                        </span>
                        <h3 className="text-sm font-bold text-slate-700">Bác sĩ gợi ý</h3>
                        <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-primary">
                          {suggestedDoctors.length}
                        </span>
                      </div>
                      {suggestedDoctors.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-sky-100 bg-sky-50/30 p-5 text-center text-sm text-slate-400">
                          <span className="material-symbols-outlined mb-1 block text-[24px] text-sky-300">person_search</span>
                          Không tìm thấy bác sĩ gợi ý phù hợp bộ lọc.
                        </div>
                      ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                          {suggestedDoctors.map((doctor) => (
                            <DoctorChoiceCard
                              key={doctor.user_id}
                              doctor={doctor}
                              selected={doctor.user_id === doctorId}
                              variant="external"
                              onSelect={setDoctorId}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </section>


          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">event_available</span>
                <h2 className="text-lg font-black text-slate-800">2. Chọn khung giờ</h2>
              </div>
              {slotsLoading && <span className="text-xs font-bold text-slate-400">Đang tải slot...</span>}
            </div>

            <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
              {dateStrip.map((date) => {
                const availableCount = slots.filter((slot) => toDateKey(slot.start_time) === date.key && slot.available).length;
                const selected = selectedDateKey === date.key;
                return (
                  <button
                    key={date.key}
                    type="button"
                    onClick={() => {
                      setSelectedDateKey(date.key);
                      setSelectedSlotKey("");
                    }}
                    className={[
                      "min-w-[92px] rounded-2xl border px-3 py-3 text-center transition-all",
                      selected ? "border-primary bg-primary text-white shadow-md" : "border-slate-100 bg-slate-50 text-slate-600 hover:border-primary/30",
                    ].join(" ")}
                  >
                    <p className="text-[11px] font-black uppercase">{date.isToday ? "Hôm nay" : date.dayName}</p>
                    <p className="mt-1 text-2xl font-black">{date.dayNumber}</p>
                    <p className={selected ? "text-[10px] font-bold text-white/75" : "text-[10px] font-bold text-slate-400"}>Tháng {date.month}</p>
                    <p className={selected ? "mt-1 text-[10px] font-bold text-white/80" : "mt-1 text-[10px] font-bold text-emerald-600"}>{availableCount} giờ trống</p>
                  </button>
                );
              })}
            </div>

            <label className="mb-4 flex items-center justify-end gap-2 text-xs font-bold text-slate-500">
              <input
                type="checkbox"
                checked={showUnavailableSlots}
                onChange={(event) => setShowUnavailableSlots(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Hiện giờ bận
            </label>

            <div className="space-y-4">
              {slots.length === 0 && !slotsLoading ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm font-bold text-slate-400">
                  Bác sĩ chưa cấu hình lịch rảnh trong 14 ngày tới.
                </div>
              ) : (
                [
                  { key: "morning", label: "Sáng", icon: "wb_sunny" },
                  { key: "afternoon", label: "Chiều", icon: "partly_cloudy_day" },
                  { key: "evening", label: "Tối", icon: "bedtime" },
                ].map((period) => (
                  <div key={period.key} className="rounded-2xl bg-slate-50 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-primary">{period.icon}</span>
                      <p className="text-sm font-black text-slate-800">{period.label}</p>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-slate-400">
                        {groupedSlots[period.key].length}
                      </span>
                    </div>
                    {groupedSlots[period.key].length === 0 ? (
                      <p className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-center text-xs font-bold text-slate-400">
                        Không có slot {period.label.toLowerCase()} cho ngày này.
                      </p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {groupedSlots[period.key].map((slot) => {
                          const key = `${slot.start_time}|${slot.end_time}`;
                          const selected = key === selectedSlotKey;
                          const start = new Date(slot.start_time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
                          const end = new Date(slot.end_time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

                          return (
                            <button
                              key={key}
                              type="button"
                              disabled={!slot.available}
                              onClick={() => setSelectedSlotKey(key)}
                              className={[
                                "rounded-xl border p-3 text-left transition-all",
                                selected
                                  ? "border-primary bg-primary text-white shadow-md"
                                  : slot.available
                                    ? "border-slate-100 bg-white hover:border-primary/40 hover:bg-sky-50"
                                    : "cursor-not-allowed border-slate-100 bg-white/60 text-slate-300",
                              ].join(" ")}
                            >
                              <p className="text-sm font-black">{start} - {end}</p>
                              <p className={selected ? "mt-1 text-xs text-white/80" : "mt-1 text-xs text-slate-500"}>{slot.available ? slot.label : getUnavailableReason(slot)}</p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">assignment</span>
              <h2 className="text-lg font-black text-slate-800">3. Thông tin cuộc hẹn</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400">Hình thức khám</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: "ONLINE", label: "Online", icon: "videocam" },
                    { id: "OFFLINE", label: "Trực tiếp", icon: "local_hospital" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setAppointmentType(item.id)}
                      className={[
                        "flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-black",
                        appointmentType === item.id ? "border-primary bg-primary/5 text-primary" : "border-slate-100 text-slate-500",
                      ].join(" ")}
                    >
                      <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400">Lý do khám *</label>
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className="min-h-28 w-full rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm outline-none focus:border-primary"
                  placeholder="Mô tả triệu chứng, nhu cầu tư vấn hoặc nội dung tái khám..."
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400">Tài liệu đính kèm</label>
                <input
                  value={attachmentUrl}
                  onChange={(event) => setAttachmentUrl(event.target.value)}
                  className="w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-primary"
                  placeholder="Dán URL ảnh xét nghiệm hoặc hồ sơ liên quan"
                />
              </div>

              <button
                type="button"
                disabled={!canSubmit}
                onClick={handleCreateAppointment}
                className={[
                  "flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black text-white transition-colors",
                  canSubmit ? "bg-primary hover:bg-primary/90" : "cursor-not-allowed bg-slate-300",
                ].join(" ")}
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
                {submitting ? "Đang gửi yêu cầu..." : "Gửi yêu cầu đặt lịch"}
              </button>
            </div>
          </section>
        </div>

        <aside className="space-y-6 lg:col-span-4">
          <section className="sticky top-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-widest text-primary">Tóm tắt</p>
            <h2 className="mt-1 text-xl font-black text-slate-900">Lịch đang chọn</h2>
            <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4 text-sm">
              <p><span className="font-bold text-slate-500">Bác sĩ:</span> {selectedDoctor?.name || "Chưa chọn"}</p>
              <p><span className="font-bold text-slate-500">Thời gian:</span> {selectedSlot ? formatDateTime(selectedSlot.start_time) : "Chưa chọn"}</p>
              <p><span className="font-bold text-slate-500">Hình thức:</span> {appointmentType === "ONLINE" ? "Online" : "Trực tiếp"}</p>
              <p><span className="font-bold text-slate-500">Phí:</span> {formatFee(getDoctorBookingFee(selectedDoctor))}</p>
              <p><span className="font-bold text-slate-500">Lý do:</span> {reason.trim() || "Chưa nhập"}</p>
            </div>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={handleCreateAppointment}
              className={[
                "mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black text-white transition-colors",
                canSubmit ? "bg-primary hover:bg-primary/90" : "cursor-not-allowed bg-slate-300",
              ].join(" ")}
            >
              <span className="material-symbols-outlined text-[18px]">event_available</span>
              {submitting ? "Đang đặt lịch..." : "Đặt lịch"}
            </button>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-800">Lịch sắp tới</h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-500">{upcomingAppointments.length}</span>
            </div>

            <div className="space-y-3">
              {upcomingAppointments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm font-bold text-slate-400">
                  Chưa có lịch hẹn đang hoạt động.
                </div>
              ) : (
                upcomingAppointments.slice(0, 6).map((appointment) => (
                  <div
                    key={appointment.appointment_id}
                    id={`appointment-${appointment.appointment_id}`}
                    className={[
                      "rounded-xl border p-4 transition-all",
                      highlightedAppointmentId === appointment.appointment_id
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-slate-100 bg-slate-50",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-black text-slate-800">{appointment.doctor?.name || "Bác sĩ"}</p>
                        <p className="mt-1 text-xs font-bold text-slate-500">{formatDateTime(appointment.start_time)}</p>
                      </div>
                      <AppointmentStatusBadge status={appointment.status} />
                    </div>
                    <p className="mt-3 line-clamp-2 text-xs text-slate-500">{appointment.reason}</p>
                    {appointment.status !== "CANCELLED" && appointment.status !== "COMPLETED" && (
                      <button
                        type="button"
                        onClick={() => handleCancelAppointment(appointment.appointment_id)}
                        className="mt-3 rounded-lg border border-rose-100 px-3 py-2 text-xs font-black text-rose-600 hover:bg-rose-50"
                      >
                        Hủy lịch
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
