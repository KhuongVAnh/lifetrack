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
      accentClassName: "bg-sky-50 text-primary",
    },
    {
      key: "ecgPatients",
      label: "Bệnh nhân có quyền ECG",
      value: summary.ecgAccessPatientCount,
      icon: "monitor_heart",
      accentClassName: "bg-emerald-50 text-secondary",
    },
    {
      key: "todayAppointments",
      label: "Lịch hẹn hôm nay",
      value: summary.todayAppointmentCount,
      icon: "event_available",
      accentClassName: "bg-orange-50 text-orange-600",
    },
    {
      key: "unreadNotifications",
      label: "Thông báo chưa đọc",
      value: summary.unreadNotificationCount,
      icon: "notifications",
      accentClassName: "bg-purple-50 text-purple-600",
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
    <>
      {dashboardError && (
        <div className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {dashboardError}
        </div>
      )}

      <section className="mb-8 overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-600 to-teal-600 p-6 text-white shadow-[0_8px_30px_rgb(16,185,129,0.18)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-emerald-100">Hồ sơ công khai</p>
            <h2 className="mt-2 text-2xl font-black">Cập nhật profile bác sĩ</h2>
            <p className="mt-1 max-w-2xl text-sm font-medium text-emerald-50">
              Hồ sơ đầy đủ giúp bệnh nhân hiểu chuyên môn, phí tư vấn và trạng thái nhận bệnh nhân của bạn.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/doctor/profile")}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-emerald-700 shadow-lg transition-transform hover:scale-[1.02]"
          >
            <span className="material-symbols-outlined text-[18px]">edit_square</span>
            Sửa hồ sơ
          </button>
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-sky-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-extrabold text-primary">
              <span className="material-symbols-outlined text-secondary">how_to_reg</span>
              Yêu cầu thuê bác sĩ
            </h2>
            <p className="text-sm font-medium text-slate-500">
              Bệnh nhân chỉ trở thành bệnh nhân đồng hành sau khi bạn duyệt.
            </p>
          </div>
          <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-primary">
            {dashboard.pendingHireRequests.length} chờ duyệt
          </span>
        </div>
        {loading ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm font-bold text-slate-500">
            Đang tải yêu cầu thuê bác sĩ...
          </div>
        ) : dashboard.pendingHireRequests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm font-bold text-slate-500">
            Hiện không có yêu cầu thuê mới.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {dashboard.pendingHireRequests.slice(0, 4).map((request) => (
              <div
                key={request.hire_id}
                className="rounded-xl border border-slate-100 bg-surface-container-lowest p-4"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-sky-900">
                      {request.patient?.name || "Bệnh nhân"}
                    </p>
                    <p className="text-xs font-semibold text-slate-500">
                      {request.patient?.email}
                    </p>
                    <p className="mt-2 text-[11px] font-bold text-slate-400">
                      Gửi lúc {formatDateTime(request.requested_at)}
                    </p>
                  </div>
                  <span className="rounded bg-amber-50 px-2 py-1 text-[10px] font-black uppercase text-amber-700">
                    {getHireRequestStatusLabel(request.status)}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white disabled:bg-slate-300"
                    disabled={processingHireId === request.hire_id}
                    onClick={() => void handleApproveHire(request.hire_id)}
                    type="button"
                  >
                    Duyệt
                  </button>
                  <button
                    className="flex-1 rounded-lg border border-red-100 px-3 py-2 text-xs font-bold text-red-600 disabled:opacity-50"
                    disabled={processingHireId === request.hire_id}
                    onClick={() => void handleRejectHire(request.hire_id)}
                    type="button"
                  >
                    Từ chối
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-extrabold text-primary">
            <span
              className="material-symbols-outlined text-error"
              style={{ fontVariationSettings: '"FILL" 1' }}
            >
              emergency
            </span>
            Cảnh báo khẩn cấp
          </h2>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Thời gian thực
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-5 text-sm font-bold text-slate-500">
              Đang tải cảnh báo...
            </div>
          ) : dashboard.urgentAlerts.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-slate-300 bg-surface-container-high/50 p-5 text-center text-sm font-medium text-slate-500">
              Không có cảnh báo mới
            </div>
          ) : (
            dashboard.urgentAlerts.slice(0, 6).map((alert) => (
              <div
                key={alert.alert_id}
                className="relative overflow-hidden rounded-xl border-l-4 border-error bg-error-container/30 p-5 transition-colors hover:bg-error-container/40"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error/10 text-error">
                    <span
                      className="material-symbols-outlined text-2xl"
                      style={{ fontVariationSettings: '"FILL" 1' }}
                    >
                      warning
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-bold leading-tight text-on-error-container">
                      {alert.patient?.name || "Bệnh nhân"}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-error">{alert.message}</p>
                    <p className="mt-2 text-[11px] text-slate-500">
                      {formatRelativeTime(alert.timestamp)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() =>
                      navigate(
                        alert.user_id
                          ? `/doctor/live?patientId=${alert.user_id}`
                          : "/doctor/live",
                      )
                    }
                    className="rounded-lg bg-white/80 px-3 py-1.5 text-xs font-bold text-error shadow-sm transition-all hover:bg-white"
                    type="button"
                  >
                    Xem monitor
                  </button>
                  <button
                    onClick={() =>
                      navigate(
                        alert.user_id
                          ? `/doctor/messages?patientId=${alert.user_id}`
                          : "/doctor/messages",
                      )
                    }
                    className="rounded-lg bg-white/60 px-3 py-1.5 text-xs font-bold text-slate-700 transition-all hover:bg-white"
                    type="button"
                  >
                    Liên hệ
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="mb-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.key}
            className="rounded-2xl border border-slate-100/50 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
          >
            <div className="mb-4 flex items-start justify-between">
              <div className={`rounded-lg p-2 ${card.accentClassName}`}>
                <span className="material-symbols-outlined">{card.icon}</span>
              </div>
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {card.label}
            </p>
            <h4 className="mt-1 text-3xl font-black text-primary">
              {String(card.value || 0).padStart(2, "0")}
            </h4>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <section className="rounded-3xl bg-white p-8 shadow-[0_8px_40px_rgb(0,0,0,0.03)] lg:col-span-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-primary">Cuộc hẹn sắp tới</h2>
              <p className="text-sm font-medium text-slate-500">
                Lấy từ lịch hẹn đang chờ hoặc đã xác nhận.
              </p>
            </div>
            <button
              onClick={() => navigate("/doctor/appointments")}
              className="text-sm font-bold text-primary hover:underline"
              type="button"
            >
              Xem tất cả
            </button>
          </div>
          <div className="space-y-4">
            {loading ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm font-bold text-slate-400">
                Đang tải lịch hẹn...
              </div>
            ) : dashboard.upcomingAppointments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm font-bold text-slate-400">
                Chưa có lịch hẹn sắp tới.
              </div>
            ) : (
              dashboard.upcomingAppointments.map((appointment) => (
                <div
                  key={appointment.appointment_id}
                  className="group flex flex-col justify-between gap-3 rounded-2xl p-4 transition-all duration-300 hover:bg-slate-50 sm:flex-row sm:items-center sm:gap-0"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-primary">
                      <span className="material-symbols-outlined">person</span>
                    </div>
                    <div>
                      <h5 className="font-bold text-primary">
                        {appointment.patient?.name || "Bệnh nhân"}
                      </h5>
                      <p className="text-xs text-slate-500">
                        {appointment.reason || "Khám định kỳ"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-sm font-black text-primary">
                        {formatTimeRange(appointment.start_time, appointment.end_time)}
                      </p>
                      <p className="text-[11px] font-bold uppercase tracking-tight text-secondary">
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
                      className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition-transform hover:scale-105"
                      type="button"
                    >
                      Vào phòng khám
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="h-full rounded-3xl bg-white p-8 shadow-[0_8px_40px_rgb(0,0,0,0.03)] lg:col-span-4">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-primary">Hoạt động mới nhất</h2>
            <span className="material-symbols-outlined text-slate-400">history</span>
          </div>
          <div className="relative space-y-6 before:absolute before:bottom-2 before:left-[19px] before:top-2 before:w-[2px] before:bg-slate-100 before:content-['']">
            {loading ? (
              <div className="relative rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500">
                Đang tải hoạt động...
              </div>
            ) : dashboard.recentNotifications.length === 0 ? (
              <div className="relative rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500">
                Chưa có thông báo hệ thống gần đây.
              </div>
            ) : (
              dashboard.recentNotifications.map((notification) => (
                <button
                  key={notification.notificationId}
                  onClick={() =>
                    navigate(resolveDoctorNotificationLink(notification))
                  }
                  className="relative flex w-full items-start gap-4 text-left group"
                  type="button"
                >
                  <div className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-primary ring-4 ring-white">
                    <span
                      className="material-symbols-outlined text-xl"
                      style={{ fontVariationSettings: '"FILL" 1' }}
                    >
                      {getDoctorNotificationIcon(notification)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="leading-tight text-sm font-bold text-primary">
                      {notification.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      {notification.message}
                    </p>
                    <p className="mt-1 text-[10px] font-medium text-slate-400">
                      {formatRelativeTime(notification.createdAt)}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
          <div className="mt-10 border-t border-slate-100 pt-6">
            <button
              onClick={() => navigate("/doctor/patients")}
              className="w-full rounded-xl bg-surface-container-low py-3 text-sm font-bold text-primary transition-colors hover:bg-surface-container"
              type="button"
            >
              Xem danh sách bệnh nhân
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
