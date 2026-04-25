import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { approveDoctorHire, rejectDoctorHire } from "@/features/doctors";
import {
  getDoctorNotificationIcon,
  getDoctorPortalDashboard,
  resolveDoctorNotificationLink,
} from "@/features/doctor-portal";

function formatDateTime(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatTimeRange(startValue, endValue) {
  const start = new Date(startValue);
  const end = new Date(endValue);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "";
  }

  return `${start.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  })} - ${end.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function formatRelativeTime(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);

  if (Math.abs(diffMinutes) < 60) {
    const suffix = diffMinutes >= 0 ? "nữa" : "trước";
    return `${Math.abs(diffMinutes)} phút ${suffix}`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    const suffix = diffHours >= 0 ? "nữa" : "trước";
    return `${Math.abs(diffHours)} giờ ${suffix}`;
  }

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });
}

function getHireRequestStatusLabel(status) {
  switch (status) {
    case "PENDING_DOCTOR_APPROVAL":
      return "Chờ duyệt";
    case "ACTIVE":
      return "Đã duyệt";
    case "REJECTED":
      return "Đã từ chối";
    default:
      return status || "Không rõ";
  }
}

function getAppointmentTypeLabel(type) {
  return type === "ONLINE" ? "Trực tuyến" : "Trực tiếp";
}

function getSummaryCards(summary) {
  return [
    {
      key: "activePatients",
      label: "Bệnh nhân đang thuê",
      value: summary.activePatientCount,
      icon: "group",
      accentClassName: "border-[#bae6fd] bg-[#e0f2fe] text-[#075985]",
    },
    {
      key: "ecgPatients",
      label: "Bệnh nhân có quyền ECG",
      value: summary.ecgAccessPatientCount,
      icon: "monitor_heart",
      accentClassName: "border-[#86efac] bg-[#dcfce7] text-[#166534]",
    },
    {
      key: "todayAppointments",
      label: "Lịch hẹn hôm nay",
      value: summary.todayAppointmentCount,
      icon: "event_available",
      accentClassName: "border-[#fbbf24] bg-[#fef3c7] text-[#92400e]",
    },
    {
      key: "unreadNotifications",
      label: "Thông báo chưa đọc",
      value: summary.unreadNotificationCount,
      icon: "notifications",
      accentClassName: "border-[#c4b5fd] bg-[#ede9fe] text-[#5b21b6]",
    },
  ];
}

export function DoctorDashboardPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState({
    summary: {
      activePatientCount: 0,
      ecgAccessPatientCount: 0,
      todayAppointmentCount: 0,
      unreadNotificationCount: 0,
    },
    pendingHireRequests: [],
    urgentAlerts: [],
    upcomingAppointments: [],
    recentNotifications: [],
  });
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const [processingHireId, setProcessingHireId] = useState(null);

  const summaryCards = useMemo(
    () => getSummaryCards(dashboard.summary),
    [dashboard.summary],
  );

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setDashboardError("");
      const data = await getDoctorPortalDashboard();
      setDashboard(data);
    } catch (error) {
      setDashboardError(
        error?.response?.data?.message || "Không thể tải dữ liệu dashboard bác sĩ.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApproveHire = async (hireId) => {
    try {
      setProcessingHireId(hireId);
      await approveDoctorHire(hireId);
      await loadDashboard();
    } catch (error) {
      setDashboardError(
        error?.response?.data?.message || "Không thể duyệt yêu cầu thuê bác sĩ.",
      );
    } finally {
      setProcessingHireId(null);
    }
  };

  const handleRejectHire = async (hireId) => {
    try {
      setProcessingHireId(hireId);
      await rejectDoctorHire(hireId);
      await loadDashboard();
    } catch (error) {
      setDashboardError(
        error?.response?.data?.message || "Không thể từ chối yêu cầu thuê bác sĩ.",
      );
    } finally {
      setProcessingHireId(null);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {dashboardError && (
        <div className="rounded-2xl border-2 border-[#dc2626] bg-[#fff1f2] px-4 py-3 text-sm font-black text-[#991b1b]">
          {dashboardError}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-[#0f172a] bg-[#0f172a] text-white shadow-sm">
        <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#bae6fd]">Doctor command center</p>
            <h1 className="mt-2 text-3xl font-black leading-tight md:text-4xl">Dashboard bác sĩ</h1>
            <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-200">
              Ưu tiên cảnh báo khẩn cấp, lịch hẹn trong ngày và các yêu cầu cần xử lý.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[#fecaca] bg-[#fee2e2] p-4 text-[#991b1b]">
              <p className="text-3xl font-black">{dashboard.urgentAlerts.length}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest">Cảnh báo</p>
            </div>
            <div className="rounded-2xl border border-[#fbbf24] bg-[#fef3c7] p-4 text-[#92400e]">
              <p className="text-3xl font-black">{dashboard.pendingHireRequests.length}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest">Chờ duyệt</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border-2 border-[#dc2626] bg-[#fff1f2] p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#dc2626] text-white">
              <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: '"FILL" 1' }}>
                emergency
              </span>
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-[#991b1b]">Cảnh báo khẩn cấp</p>
              <h2 className="mt-1 text-2xl font-black leading-tight text-[#7f1d1d]">Cần xử lý ngay</h2>
              <p className="mt-1 text-sm font-semibold text-[#991b1b]">Dữ liệu cảnh báo thời gian thực từ bệnh nhân đang theo dõi.</p>
            </div>
          </div>
          <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-widest text-[#991b1b]">
            {dashboard.urgentAlerts.length} cảnh báo
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            <div className="rounded-xl border border-dashed border-[#fca5a5] bg-white p-5 text-sm font-bold text-[#991b1b]">
              Đang tải cảnh báo...
            </div>
          ) : dashboard.urgentAlerts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#fca5a5] bg-white p-5 text-center text-sm font-bold text-[#991b1b]">
              Không có cảnh báo mới
            </div>
          ) : (
            dashboard.urgentAlerts.slice(0, 6).map((alert) => (
              <article key={alert.alert_id} className="rounded-xl border border-[#dc2626] bg-white p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#dc2626] text-white">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>
                      warning
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-black leading-tight text-[#0f172a]">
                      {alert.patient?.name || "Bệnh nhân"}
                    </h3>
                    <p className="mt-1 text-sm font-bold leading-6 text-[#991b1b]">{alert.message}</p>
                    <p className="mt-2 text-[11px] font-black uppercase tracking-widest text-[#64748b]">
                      {formatRelativeTime(alert.timestamp)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={() =>
                      navigate(alert.user_id ? `/doctor/live?patientId=${alert.user_id}` : "/doctor/live")
                    }
                    className="rounded-xl bg-[#dc2626] px-3 py-2 text-xs font-black text-white transition-colors hover:bg-[#b91c1c]"
                    type="button"
                  >
                    Xem monitor
                  </button>
                  <button
                    onClick={() =>
                      navigate(alert.user_id ? `/doctor/messages?patientId=${alert.user_id}` : "/doctor/messages")
                    }
                    className="rounded-xl border border-[#fecaca] px-3 py-2 text-xs font-black text-[#991b1b] transition-colors hover:bg-[#fff1f2]"
                    type="button"
                  >
                    Liên hệ
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <article key={card.key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className={`rounded-xl border p-3 ${card.accentClassName}`}>
                <span className="material-symbols-outlined">{card.icon}</span>
              </div>
              <h4 className="text-4xl font-black leading-none text-[#0f172a]">
                {String(card.value || 0).padStart(2, "0")}
              </h4>
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-[#475569]">{card.label}</p>
          </article>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-7">
          <div className="mb-5 flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-black text-[#0f172a]">
                <span className="material-symbols-outlined text-[#004976]">event_available</span>
                Cuộc hẹn sắp tới
              </h2>
              <p className="mt-1 text-sm font-semibold text-[#475569]">Lịch hẹn đang chờ hoặc đã xác nhận.</p>
            </div>
            <button
              onClick={() => navigate("/doctor/appointments")}
              className="w-fit rounded-xl border border-[#cbd5e1] px-4 py-2 text-sm font-black text-[#004976] hover:bg-slate-50"
              type="button"
            >
              Xem tất cả
            </button>
          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="rounded-2xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-8 text-center text-sm font-bold text-[#64748b]">
                Đang tải lịch hẹn...
              </div>
            ) : dashboard.upcomingAppointments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-8 text-center text-sm font-bold text-[#64748b]">
                Chưa có lịch hẹn sắp tới.
              </div>
            ) : (
              dashboard.upcomingAppointments.map((appointment) => (
                <article
                  key={appointment.appointment_id}
                  className="flex flex-col justify-between gap-4 rounded-2xl border border-[#cbd5e1] bg-[#f8fafc] p-4 sm:flex-row sm:items-center"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#bae6fd] bg-[#e0f2fe] text-[#075985]">
                      <span className="material-symbols-outlined">person</span>
                    </div>
                    <div>
                      <h5 className="font-black text-[#0f172a]">{appointment.patient?.name || "Bệnh nhân"}</h5>
                      <p className="mt-1 text-xs font-semibold text-[#475569]">{appointment.reason || "Khám định kỳ"}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 sm:items-end">
                    <div className="sm:text-right">
                      <p className="text-sm font-black text-[#004976]">
                        {formatTimeRange(appointment.start_time, appointment.end_time)}
                      </p>
                      <p className="text-[11px] font-black uppercase tracking-widest text-[#166534]">
                        {getAppointmentTypeLabel(appointment.type)}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        navigate(
                          appointment.patient?.user_id
                            ? `/doctor/messages?patientId=${appointment.patient.user_id}`
                            : "/doctor/messages",
                        )
                      }
                      className="rounded-xl bg-[#004976] px-4 py-2.5 text-sm font-black text-white hover:bg-[#003d63]"
                      type="button"
                    >
                      Vào phòng khám
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-5">
          <div className="mb-5 flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-black text-[#0f172a]">
                <span className="material-symbols-outlined text-[#004976]">how_to_reg</span>
                Yêu cầu thuê bác sĩ
              </h2>
              <p className="mt-1 text-sm font-semibold text-[#475569]">Duyệt để bệnh nhân trở thành bệnh nhân đồng hành.</p>
            </div>
            <span className="w-fit rounded-full bg-[#fef3c7] px-3 py-1 text-xs font-black uppercase text-[#92400e]">
              {dashboard.pendingHireRequests.length} chờ duyệt
            </span>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="rounded-xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] px-4 py-5 text-sm font-bold text-[#64748b]">
                Đang tải yêu cầu thuê bác sĩ...
              </div>
            ) : dashboard.pendingHireRequests.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] px-4 py-5 text-sm font-bold text-[#64748b]">
                Hiện không có yêu cầu thuê mới.
              </div>
            ) : (
              dashboard.pendingHireRequests.slice(0, 4).map((request) => (
                <article key={request.hire_id} className="rounded-xl border border-[#cbd5e1] bg-[#f8fafc] p-4">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-[#0f172a]">{request.patient?.name || "Bệnh nhân"}</p>
                      <p className="mt-1 text-xs font-semibold text-[#475569]">{request.patient?.email}</p>
                      <p className="mt-2 text-[11px] font-black uppercase tracking-widest text-[#64748b]">
                        Gửi lúc {formatDateTime(request.requested_at)}
                      </p>
                    </div>
                    <span className="rounded bg-[#fef3c7] px-2 py-1 text-[10px] font-black uppercase text-[#92400e]">
                      {getHireRequestStatusLabel(request.status)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      className="rounded-xl bg-[#004976] px-3 py-2 text-xs font-black text-white disabled:bg-slate-300"
                      disabled={processingHireId === request.hire_id}
                      onClick={() => void handleApproveHire(request.hire_id)}
                      type="button"
                    >
                      Duyệt
                    </button>
                    <button
                      className="rounded-xl border border-[#fecaca] bg-white px-3 py-2 text-xs font-black text-[#b91c1c] disabled:opacity-50"
                      disabled={processingHireId === request.hire_id}
                      onClick={() => void handleRejectHire(request.hire_id)}
                      type="button"
                    >
                      Từ chối
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-black text-[#0f172a]">
              <span className="material-symbols-outlined text-[#004976]">history</span>
              Hoạt động mới nhất
            </h2>
            <p className="mt-1 text-sm font-semibold text-[#475569]">Thông báo hệ thống và thao tác gần đây.</p>
          </div>
          <button
            onClick={() => navigate("/doctor/patients")}
            className="w-fit rounded-xl border border-[#cbd5e1] px-4 py-2 text-sm font-black text-[#004976] hover:bg-slate-50"
            type="button"
          >
            Xem danh sách bệnh nhân
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            <div className="rounded-xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] px-4 py-3 text-sm font-bold text-[#64748b]">
              Đang tải hoạt động...
            </div>
          ) : dashboard.recentNotifications.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] px-4 py-3 text-sm font-bold text-[#64748b]">
              Chưa có thông báo hệ thống gần đây.
            </div>
          ) : (
            dashboard.recentNotifications.map((notification) => (
              <button
                key={notification.notificationId}
                onClick={() => navigate(resolveDoctorNotificationLink(notification))}
                className="flex w-full items-start gap-4 rounded-xl border border-[#cbd5e1] bg-[#f8fafc] p-4 text-left hover:border-[#0ea5e9]"
                type="button"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#bae6fd] bg-[#e0f2fe] text-[#075985]">
                  <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: '"FILL" 1' }}>
                    {getDoctorNotificationIcon(notification)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="leading-tight text-sm font-black text-[#0f172a]">{notification.title}</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-[#475569]">{notification.message}</p>
                  <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-[#64748b]">
                    {formatRelativeTime(notification.createdAt)}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-[#86efac] bg-[#dcfce7] p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-[#166534]">Hồ sơ công khai</p>
            <h2 className="mt-1 text-xl font-black text-[#14532d]">Cập nhật profile bác sĩ</h2>
            <p className="mt-1 max-w-2xl text-sm font-semibold text-[#166534]">
              Hồ sơ đầy đủ giúp bệnh nhân hiểu chuyên môn, phí tư vấn và trạng thái nhận bệnh nhân.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/doctor/profile")}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#166534] px-5 py-3 text-sm font-black text-white hover:bg-[#14532d]"
          >
            <span className="material-symbols-outlined text-[18px]">edit_square</span>
            Sửa hồ sơ
          </button>
        </div>
      </section>
    </div>
  );
}
