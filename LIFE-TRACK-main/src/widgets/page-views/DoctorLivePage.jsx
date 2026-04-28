import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DoctorAlertsModal } from "@/features/warning-readings/ui/DoctorAlertsModal";
import { ReadingDetailModal } from "@/features/realtime-monitor/ui/ReadingDetailModal";
import { RealtimeEcgChart } from "@/features/realtime-monitor/ui/RealtimeEcgChart";
import { useAuth } from "@/app/providers/AuthProvider";
import { useRealtimeEcgStream } from "@/features/realtime-monitor/model/useRealtimeEcgStream";
import { useWarningReadings } from "@/features/warning-readings/model/useWarningReadings";
import { getDoctorPortalPatients } from "@/features/doctor-portal";
import { formatDateTime, getStatusTone } from "@/features/realtime-monitor/lib/ecgMonitor";
import { getUserAvatar } from "@/entities/user";
import { ImageWithFallback } from "@/shared/ui/ImageWithFallback";

const LIVE_TABS = [
  { id: "monitor", label: "Monitor", icon: "monitor_heart" },
  { id: "alerts", label: "Cảnh báo", icon: "warning" },
  { id: "patients", label: "Bệnh nhân", icon: "group" },
];

function formatRelativeTime(value) {
  if (!value) return "Chưa có";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Chưa có";

  const diffMinutes = Math.round((Date.now() - parsed.getTime()) / 60000);
  if (diffMinutes < 1) return "Vừa xong";
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;
  if (diffMinutes < 24 * 60) return `${Math.round(diffMinutes / 60)} giờ trước`;
  return parsed.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function getWarningCardTone(resolved) {
  return resolved ? "text-slate-500 bg-slate-100" : "text-error bg-error/10";
}

function StatCard({ icon, label, value, sublabel, tone = "text-primary", valueClassName = "text-slate-800" }) {
  return (
    <div className="group relative overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <div className={`rounded-2xl bg-slate-50 p-3 ${tone}`}>
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{label}</p>
      </div>
      <p className={`text-3xl font-black tracking-tight ${valueClassName}`}>{value}</p>
      <p className="mt-2 text-xs font-medium text-slate-500">{sublabel}</p>
    </div>
  );
}

export function DoctorLivePage() {
  const navigate = useNavigate();
  const { socket } = useAuth();
  const [searchParams] = useSearchParams();
  const preselectedPatientId = Number(searchParams.get("patientId")) || null;
  const [patients, setPatients] = useState([]);
  const [activePatientId, setActivePatientId] = useState(preselectedPatientId);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [patientsError, setPatientsError] = useState("");
  const [mobileTab, setMobileTab] = useState("monitor");
  const [selectedReadingId, setSelectedReadingId] = useState(null);
  const [showAlertsModal, setShowAlertsModal] = useState(false);

  useEffect(() => {
    const loadPatients = async () => {
      setLoadingPatients(true);
      try {
        const data = await getDoctorPortalPatients({ domain: "ecg" });
        setPatients(
          data.map((item) => ({
            ...item,
            user_id: item.patientId,
            name: item.patient?.name || "Bệnh nhân",
            email: item.patient?.email || "",
            unread_count: item.unreadCount,
            last_message_at: item.lastMessageAt,
            latest_reading_at: item.latestReadingAt,
          })),
        );
        setPatientsError("");
      } catch (error) {
        setPatientsError(error.response?.data?.message || "Không thể tải danh sách bệnh nhân theo dõi");
        setPatients([]);
      } finally {
        setLoadingPatients(false);
      }
    };

    void loadPatients();
  }, []);

  const preselectedAppliedRef = useRef(false);

  useEffect(() => {
    if (!patients.length) {
      setActivePatientId(null);
      preselectedAppliedRef.current = false;
      return;
    }

    // Apply URL preselection only once on initial load
    if (preselectedPatientId && !preselectedAppliedRef.current) {
      const hasPreselected = patients.some((patient) => patient.user_id === preselectedPatientId);
      if (hasPreselected) {
        setActivePatientId(preselectedPatientId);
        preselectedAppliedRef.current = true;
        return;
      }
    }

    // Auto-select first patient only when current selection is invalid
    setActivePatientId((currentId) => {
      const hasCurrent = patients.some((patient) => patient.user_id === Number(currentId));
      if (hasCurrent) return currentId;
      return patients[0].user_id;
    });
  }, [patients, preselectedPatientId]);

  useEffect(() => {
    setSelectedReadingId(null);
  }, [activePatientId]);

  const activePatient = useMemo(
    () => patients.find((patient) => patient.user_id === Number(activePatientId)) ?? patients[0] ?? null,
    [activePatientId, patients],
  );

  const {
    liveSignal,
    streamChunk,
    sampleRateHz,
    heartRate,
    latestReading,
    isStreaming,
    signalVersion,
    loading: loadingStream,
    error: streamError,
  } = useRealtimeEcgStream(activePatient?.user_id, socket, {
    enabled: Boolean(activePatient?.user_id),
    pollIntervalMs: 2000,
  });

  const {
    warningReadings,
    loading: loadingWarnings,
    error: warningsError,
  } = useWarningReadings(activePatient?.user_id, socket, {
    scope: "patient",
    enabled: Boolean(activePatient?.user_id),
    pollIntervalMs: 8000,
    limit: 5,
  });

  const combinedError = patientsError || streamError || warningsError;
  const aiSummary = latestReading?.ai_result || "Chờ kết quả AI mới nhất";
  const aiStatus = latestReading?.ai_status || "PENDING";

  return (
    <>
      <div className="mx-auto mt-4 w-full max-w-7xl flex-col gap-6 px-4 py-4 lg:flex">
        <div className="mb-4 flex rounded-xl bg-surface-container-low p-1 lg:hidden">
          {LIVE_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMobileTab(tab.id)}
              className={[
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all",
                mobileTab === tab.id ? "bg-white text-primary shadow-sm" : "text-slate-500",
              ].join(" ")}
              type="button"
            >
              <span className="material-symbols-outlined text-base">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <section className={["w-full flex-col gap-6", mobileTab === "monitor" ? "flex" : "hidden lg:flex"].join(" ")}>
          <div className="relative flex flex-col overflow-hidden rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm lg:h-[520px]">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Theo dõi trực tiếp</h3>
                <p className="flex items-center gap-3 text-2xl font-extrabold text-slate-800">
                  ECG
                  <span className="rounded-full bg-sky-50 px-3 py-1 text-sm font-bold text-primary">{activePatient?.name || "Chưa chọn bệnh nhân"}</span>
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  {isStreaming ? "Đang nhận tín hiệu realtime từ thiết bị đeo." : "Đang dùng bootstrap API để giữ màn hình không trống."}
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  onClick={() => activePatient && navigate(`/doctor/emr?patientId=${activePatient.user_id}`)}
                  className="flex items-center gap-1.5 rounded-xl bg-sky-50 px-4 py-2 font-bold text-primary shadow-sm transition-colors hover:bg-sky-100 disabled:opacity-50"
                  disabled={!activePatient}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">folder_shared</span>
                  EMR
                </button>
                <button
                  onClick={() => activePatient && navigate(`/doctor/messages?patientId=${activePatient.user_id}`)}
                  className="flex items-center gap-1.5 rounded-xl bg-error px-4 py-2 font-bold text-white shadow-sm transition-colors hover:bg-[#a51515] disabled:opacity-50"
                  disabled={!activePatient}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">chat</span>
                  Chat
                </button>
              </div>
            </div>

            {combinedError && (
              <div className="mb-2 rounded-2xl border border-error/20 bg-error/5 px-4 py-2 text-sm text-error">
                {combinedError}
              </div>
            )}

            <div className="relative flex-1 overflow-hidden rounded-3xl border border-slate-100 bg-slate-50/30 ecg-grid min-h-[320px]">
              <div className="absolute left-6 top-6 z-10 flex items-center gap-2 font-mono text-sm font-bold text-secondary">
                <span className="material-symbols-outlined">monitor_heart</span>
                ECG LIVE
              </div>

              <div className="absolute right-6 top-6 z-20 flex w-48 flex-col gap-3">
                <div className="rounded-2xl border border-white bg-white/75 p-4 shadow-sm backdrop-blur-md">
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-error">
                    <span className="material-symbols-outlined text-[14px]">favorite</span>
                    Nhịp tim
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-4xl font-black tracking-tighter text-slate-800">{heartRate || latestReading?.heart_rate || "--"}</span>
                    <span className="text-xs font-bold text-slate-500">BPM</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-white bg-white/75 p-4 shadow-sm backdrop-blur-md">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary">AI phân tích</span>
                    <span className="material-symbols-outlined text-[14px] text-primary">psychology</span>
                  </div>
                  <span className="text-sm font-bold leading-tight text-slate-800">{aiSummary}</span>
                  <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${getStatusTone(aiStatus)}`}>
                    {aiStatus}
                  </span>
                </div>
              </div>

              {loadingStream && !liveSignal.length ? (
                <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-slate-500">
                  Đang tải dữ liệu ECG realtime...
                </div>
              ) : liveSignal.length ? (
                <RealtimeEcgChart
                  height={350}
                  sampleRateHz={sampleRateHz}
                  signal={streamChunk}
                  signalVersion={signalVersion}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-slate-500">
                  {activePatient ? "Chưa có tín hiệu ECG để hiển thị." : "Chọn một bệnh nhân để bắt đầu theo dõi."}
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <section className={["lg:col-span-8 flex-col gap-6", mobileTab === "alerts" ? "flex" : "hidden lg:flex"].join(" ")}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <StatCard
                icon="favorite"
                label="Nhịp tim hiện tại"
                value={`${heartRate || latestReading?.heart_rate || "--"}`}
                sublabel={`Cập nhật ${formatRelativeTime(latestReading?.timestamp)}`}
                tone="text-error"
              />
              <StatCard
                icon="psychology"
                label="AI status"
                value={aiStatus}
                sublabel={aiSummary}
                tone="text-primary"
                valueClassName="text-slate-800 text-2xl"
              />
              <StatCard
                icon="notification_important"
                label="Cảnh báo gần đây"
                value={`${warningReadings.length}`}
                sublabel={activePatient ? "Reading bất thường đang theo dõi" : "Chọn bệnh nhân để xem cảnh báo"}
                tone="text-indigo-600"
              />
            </div>

            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white shadow-2xl">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-secondary/10 blur-3xl" />
              <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="flex-1">
                  <div className="mb-3 flex items-center gap-2 text-secondary">
                    <span className="material-symbols-outlined text-[20px]">insights</span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Tóm tắt theo dõi</span>
                  </div>
                  <h3 className="text-2xl font-bold">{activePatient?.name || "Chưa chọn bệnh nhân"}</h3>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">
                    {activePatient
                      ? `Lần reading mới nhất ${formatRelativeTime(activePatient.latest_reading_at || latestReading?.timestamp)}. ${
                          warningReadings.length
                            ? `Có ${warningReadings.length} reading cần bác sĩ rà soát thêm.`
                            : "Chưa ghi nhận reading bất thường trong danh sách gần đây."
                        }`
                      : "Chọn một bệnh nhân từ danh sách theo dõi để xem monitor realtime, AI status và cảnh báo gần đây."}
                  </p>
                </div>
                <div className="shrink-0 space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowAlertsModal(true)}
                    className="w-full rounded-2xl bg-white px-6 py-3 text-sm font-bold text-slate-900 transition-all hover:scale-[1.02]"
                  >
                    Xem tất cả cảnh báo
                  </button>
                  <p className="text-center text-[10px] text-slate-400">
                    ECG mới nhất: {formatDateTime(latestReading?.timestamp)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-800">Reading cảnh báo gần đây</h2>
                  <p className="text-sm text-slate-500">Mở modal chi tiết để xem waveform và vùng bất thường.</p>
                </div>
                <button
                  className="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 transition-colors hover:bg-slate-50"
                  onClick={() => setShowAlertsModal(true)}
                  type="button"
                >
                  Xem tất cả
                </button>
              </div>

              <div className="space-y-3">
                {loadingWarnings && !warningReadings.length && (
                  <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">
                    Đang tải cảnh báo...
                  </div>
                )}
                {!loadingWarnings && !warningReadings.length && (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                    {activePatient ? "Bệnh nhân này chưa có cảnh báo gần đây." : "Chọn bệnh nhân để xem cảnh báo."}
                  </div>
                )}
                {warningReadings.map((warning) => (
                  <button
                    key={warning.readingId}
                    onClick={() => setSelectedReadingId(warning.readingId)}
                    className="w-full rounded-2xl border border-slate-100 bg-white p-4 text-left transition-all hover:border-primary/30 hover:bg-slate-50"
                    type="button"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`rounded-2xl p-3 ${warning.resolved ? "bg-slate-100 text-slate-500" : "bg-error/10 text-error"}`}>
                        <span className="material-symbols-outlined text-[18px]">warning</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-black text-slate-800">
                            {warning.primaryAlert.label_text || warning.primaryAlert.alert_type || "Cảnh báo bất thường"}
                          </p>
                          <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${getWarningCardTone(warning.resolved)}`}>
                            {warning.resolved ? "Resolved" : "Alert"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{formatDateTime(warning.timestamp)}</p>
                        <p className="mt-2 text-xs font-medium text-slate-500">{warning.alertCount} segment bất thường · reading #{warning.readingId}</p>
                      </div>
                      <span className="material-symbols-outlined text-slate-300">chevron_right</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className={["lg:col-span-4 flex-col gap-6", mobileTab === "patients" ? "flex" : "hidden lg:flex"].join(" ")}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-800">
                Bệnh nhân đang theo dõi <span className="ml-2 text-sm font-normal text-slate-400">({patients.length})</span>
              </h2>
              <span className="material-symbols-outlined animate-pulse text-secondary" style={{ fontVariationSettings: '"FILL" 1' }}>
                fiber_manual_record
              </span>
            </div>

            {patientsError && (
              <div className="rounded-2xl border border-error/20 bg-error/5 px-4 py-3 text-sm text-error">
                {patientsError}
              </div>
            )}

            <div className="flex flex-col gap-3 lg:max-h-[720px] lg:overflow-y-auto lg:pr-2 custom-scrollbar">
              {loadingPatients && !patients.length && (
                <div className="rounded-3xl border border-slate-100 bg-white p-4 text-sm text-slate-500">
                  Đang tải danh sách bệnh nhân...
                </div>
              )}
              {!loadingPatients && !patients.length && (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  Chưa có bệnh nhân nào đang mở quyền ECG để theo dõi realtime.
                </div>
              )}

              {patients.map((patient) => {
                const isActive = activePatient?.user_id === patient.user_id;

                return (
                  <button
                    key={patient.user_id}
                    onClick={() => setActivePatientId(patient.user_id)}
                    className={[
                      "w-full rounded-[1.75rem] border p-4 text-left transition-all",
                      isActive
                        ? "border-primary bg-primary text-white shadow-lg ring-4 ring-primary/20"
                        : "border-slate-100 bg-white hover:border-primary/30",
                    ].join(" ")}
                    type="button"
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <ImageWithFallback
                        className={isActive ? "h-12 w-12 rounded-full border-2 border-white/30 object-cover" : "h-12 w-12 rounded-full border border-slate-200 object-cover"}
                        alt={patient.name}
                        src={getUserAvatar(patient)}
                      />
                      <div className="min-w-0">
                        <p className={isActive ? "truncate text-sm font-bold text-white" : "truncate text-sm font-bold text-slate-800"}>
                          {patient.name}
                        </p>
                        <p className={isActive ? "truncate text-[11px] uppercase tracking-widest text-white/70" : "truncate text-[11px] uppercase tracking-widest text-slate-400"}>
                          {patient.email}
                        </p>
                      </div>
                    </div>

                    <div className={isActive ? "grid grid-cols-2 gap-2" : "grid grid-cols-2 gap-2"}>
                      <div className={isActive ? "rounded-xl bg-white/10 p-3" : "rounded-xl bg-slate-50 p-3"}>
                        <p className={isActive ? "text-[10px] uppercase tracking-widest text-white/70" : "text-[10px] uppercase tracking-widest text-slate-400"}>
                          Tin nhắn mới
                        </p>
                        <p className={isActive ? "mt-1 text-lg font-black text-white" : "mt-1 text-lg font-black text-slate-800"}>
                          {patient.unread_count ?? 0}
                        </p>
                      </div>
                      <div className={isActive ? "rounded-xl bg-white/10 p-3" : "rounded-xl bg-slate-50 p-3"}>
                        <p className={isActive ? "text-[10px] uppercase tracking-widest text-white/70" : "text-[10px] uppercase tracking-widest text-slate-400"}>
                          Cảnh báo
                        </p>
                        <p className={isActive ? "mt-1 text-lg font-black text-white" : "mt-1 text-lg font-black text-slate-800"}>
                          {patient.latestUnresolvedAlertCount || 0}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className={isActive ? "font-bold text-white/75" : "font-bold text-slate-500"}>
                        Reading mới nhất: {formatRelativeTime(patient.latest_reading_at)}
                      </span>
                      {!isActive && <span className="material-symbols-outlined text-slate-200">chevron_right</span>}
                    </div>
                  </button>
                );
              })}

              <div className="mt-2 rounded-[1.75rem] border border-sky-100 bg-sky-50 p-5">
                <div className="mb-2 flex items-center gap-2 text-primary">
                  <span className="material-symbols-outlined text-[18px]">info</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest">Ghi chú vận hành</span>
                </div>
                <p className="text-[11px] leading-relaxed text-sky-800/80">
                  Danh sách này chỉ gồm bệnh nhân đang có quyền ECG. Khi patient đổi context, monitor, cảnh báo và shortcut EMR/chat sẽ đổi theo.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      <ReadingDetailModal
        onClose={() => setSelectedReadingId(null)}
        open={Boolean(selectedReadingId)}
        readingId={selectedReadingId}
      />
      <DoctorAlertsModal
        activePatientId={activePatient?.user_id}
        onClose={() => setShowAlertsModal(false)}
        onSelectReading={(readingId) => setSelectedReadingId(readingId)}
        open={showAlertsModal}
      />
    </>
  );
}
