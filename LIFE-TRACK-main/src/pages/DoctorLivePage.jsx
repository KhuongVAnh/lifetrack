import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DoctorAlertsModal } from "../components/DoctorAlertsModal";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { ReadingDetailModal } from "../components/ReadingDetailModal";
import { RealtimeEcgChart } from "../components/RealtimeEcgChart";
import { useAuth } from "../contexts/AuthContext";
import { useRealtimeEcgStream } from "../hooks/useRealtimeEcgStream";
import { useWarningReadings } from "../hooks/useWarningReadings";
import { getContacts } from "../services/chatService";
import { formatDateTime } from "../utils/ecgMonitor";
import { getUserAvatar } from "../utils/auth";

const LIVE_TABS = [
  { id: "patients", label: "Bệnh nhân", icon: "group" },
  { id: "monitor", label: "Monitor", icon: "ecg" },
  { id: "vitals", label: "Chỉ số", icon: "analytics" },
];

function getWarningCardTone(resolved) {
  return resolved
    ? "text-slate-500 bg-slate-100"
    : "text-error bg-error/10";
}

export function DoctorLivePage() {
  const navigate = useNavigate();
  const { socket } = useAuth();
  const [searchParams] = useSearchParams();
  const preselectedPatientId = Number(searchParams.get("patientId")) || null;
  const [patients, setPatients] = useState([]);
  const [activePatientId, setActivePatientId] = useState(preselectedPatientId);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [contactsError, setContactsError] = useState("");
  const [mobileTab, setMobileTab] = useState("monitor");
  const [selectedReadingId, setSelectedReadingId] = useState(null);
  const [showAlertsModal, setShowAlertsModal] = useState(false);

  useEffect(() => {
    const loadPatients = async () => {
      setLoadingPatients(true);
      try {
        const data = await getContacts();
        const patientContacts = (data.contacts ?? []).filter((contact) => contact.normalizedRole === "patient");
        setPatients(patientContacts);
        setContactsError("");
      } catch (error) {
        setContactsError(error.response?.data?.message || "Không thể tải danh sách bệnh nhân theo dõi");
        setPatients([]);
      } finally {
        setLoadingPatients(false);
      }
    };

    void loadPatients();
  }, []);

  useEffect(() => {
    if (!patients.length) {
      setActivePatientId(null);
      return;
    }

    const hasPreselected = patients.some((patient) => patient.user_id === preselectedPatientId);
    const hasCurrent = patients.some((patient) => patient.user_id === Number(activePatientId));

    if (hasPreselected) {
      setActivePatientId(preselectedPatientId);
      return;
    }

    if (!hasCurrent) {
      setActivePatientId(patients[0].user_id);
    }
  }, [activePatientId, patients, preselectedPatientId]);

  useEffect(() => {
    setSelectedReadingId(null);
  }, [activePatientId]);

  const activePatient = useMemo(
    () => patients.find((patient) => patient.user_id === Number(activePatientId)) ?? patients[0] ?? null,
    [activePatientId, patients],
  );

  const {
    liveSignal,
    heartRate,
    latestReading,
    isStreaming,
    signalVersion,
    transitionDurationMs,
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
    scope: "system",
    enabled: Boolean(activePatient?.user_id),
    pollIntervalMs: 8000,
    limit: 5,
  });

  const combinedError = contactsError || streamError || warningsError;

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex rounded-xl bg-surface-container-low p-1 lg:hidden">
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

        <div className="lg:flex lg:h-[calc(100vh-180px)] lg:gap-6">
          <section className={["flex w-full flex-col gap-4 lg:w-72", mobileTab === "patients" ? "flex" : "hidden lg:flex"].join(" ")}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-800">Theo dõi trực tiếp <span className="ml-2 text-sm font-normal text-slate-400">({patients.length})</span></h2>
              <span className="material-symbols-outlined animate-pulse text-secondary" style={{ fontVariationSettings: '"FILL" 1' }}>fiber_manual_record</span>
            </div>

            {contactsError && (
              <div className="rounded-2xl border border-error/20 bg-error/5 px-4 py-3 text-sm text-error">
                {contactsError}
              </div>
            )}

            <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
              {loadingPatients && !patients.length && (
                <div className="rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-500">
                  Đang tải danh sách bệnh nhân...
                </div>
              )}
              {!loadingPatients && !patients.length && (
                <div className="rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-500">
                  Chưa có bệnh nhân nào khả dụng trong danh sách direct chat.
                </div>
              )}
              {patients.map((patient) => {
                const isActive = activePatient?.user_id === patient.user_id;
                const avatar = getUserAvatar(patient);

                if (isActive) {
                  return (
                    <button
                      key={patient.user_id}
                      className="w-full transform rounded-2xl bg-primary p-4 text-left text-white shadow-lg ring-4 ring-primary/20 transition-all scale-[1.02]"
                      onClick={() => setActivePatientId(patient.user_id)}
                      type="button"
                    >
                      <div className="mb-3 flex items-center gap-3">
                        <ImageWithFallback className="h-10 w-10 rounded-full border-2 border-white/30 object-cover" alt={patient.name} src={avatar} />
                        <div>
                          <p className="text-sm font-bold">{patient.name}</p>
                          <p className="text-[11px] uppercase tracking-widest opacity-80">{patient.email}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-white/10 p-2 text-center">
                          <p className="text-[10px] uppercase opacity-70">Cảnh báo</p>
                          <p className="text-base font-bold">{warningReadings.length || "--"}</p>
                        </div>
                        <div className="rounded-lg bg-white/10 p-2 text-center">
                          <p className="text-[10px] uppercase opacity-70">Unread</p>
                          <p className="text-base font-bold">{patient.unread_count ?? 0}</p>
                        </div>
                      </div>
                    </button>
                  );
                }

                return (
                  <button
                    key={patient.user_id}
                    onClick={() => setActivePatientId(patient.user_id)}
                    className="w-full rounded-2xl border border-slate-100 bg-white p-4 text-left transition-all hover:border-primary/30"
                    type="button"
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <ImageWithFallback className="h-10 w-10 rounded-full border border-slate-200 object-cover" alt={patient.name} src={avatar} />
                      <div>
                        <p className="text-sm font-bold text-slate-800">{patient.name}</p>
                        <p className="text-[11px] uppercase tracking-widest text-slate-400">{patient.email}</p>
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <div className="flex gap-4">
                        <div>
                          <p className="text-[10px] text-slate-400">Tin nhắn mới</p>
                          <p className="font-bold text-slate-700">{patient.unread_count ?? 0}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">Chat cuối</p>
                          <p className="font-bold text-slate-700">{patient.last_message_at ? formatDateTime(patient.last_message_at) : "--"}</p>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-slate-200">chevron_right</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className={["flex-1 flex-col gap-6", mobileTab === "monitor" ? "flex" : "hidden lg:flex"].join(" ")}>
            <div className="relative flex flex-1 flex-col overflow-visible rounded-[2rem] bg-white p-8 shadow-sm">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Giám sát dạng sóng</h3>
                  <p className="flex items-center gap-3 text-2xl font-extrabold text-slate-800">
                    ECG Lead II
                    <span className="rounded-full bg-sky-50 px-3 py-1 text-sm font-bold text-primary">{activePatient?.name || "Chưa chọn bệnh nhân"}</span>
                  </p>
                  <p className="mt-2 text-xs font-medium text-slate-500">Chart lớn ưu tiên dòng ECG realtime qua `reading-update`, vẫn có bootstrap API để màn bác sĩ không trống khi socket chưa có chunk.</p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-tighter text-slate-500">
                    HR {heartRate || latestReading?.heart_rate || "--"} BPM
                  </span>
                  <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-tighter ${isStreaming ? "bg-secondary/10 text-secondary" : "bg-slate-100 text-slate-500"}`}>
                    {isStreaming ? "Live socket" : "Bootstrap API"}
                  </span>
                </div>
              </div>

              {combinedError && (
                <div className="mb-4 rounded-2xl border border-error/20 bg-error/5 px-4 py-3 text-sm text-error">
                  {combinedError}
                </div>
              )}

              <div className="mb-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Thời điểm đo</p>
                  <p className="mt-1 text-sm font-bold text-slate-700">{formatDateTime(latestReading?.timestamp)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Thiết bị</p>
                  <p className="mt-1 text-sm font-bold text-slate-700">{latestReading?.device?.serial_number || "Chưa rõ"}</p>
                </div>
                <button
                  className="rounded-2xl bg-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-100"
                  onClick={() => setShowAlertsModal(true)}
                  type="button"
                >
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Cảnh báo hệ thống</p>
                  <p className="mt-1 text-sm font-bold text-slate-700">Mở danh sách có phân trang</p>
                </button>
              </div>

              <div className="flex flex-1 flex-col gap-4">
                <div className="relative flex-[2] overflow-hidden rounded-xl border border-slate-100 bg-slate-50/30 ecg-grid">
                  <div className="absolute left-4 top-4 z-10 font-mono text-xs font-bold text-secondary">ECG LIVE</div>
                  {loadingStream && !liveSignal.length ? (
                    <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-slate-500">
                      Đang tải dữ liệu ECG...
                    </div>
                  ) : liveSignal.length ? (
                    <RealtimeEcgChart
                      durationMs={transitionDurationMs}
                      height={200}
                      signal={liveSignal}
                      signalVersion={signalVersion}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-slate-500">
                      {activePatient ? "Chưa có tín hiệu ECG để hiển thị." : "Chọn một bệnh nhân để bắt đầu theo dõi."}
                    </div>
                  )}
                </div>

                <div className="relative flex-1 overflow-hidden rounded-xl border border-slate-100 bg-slate-50/30 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-primary">5 reading cảnh báo gần nhất</p>
                      <p className="text-sm text-slate-500">Click để mở popup chi tiết ECG và xem vùng bất thường.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{warningReadings.length} reading</span>
                      <button
                        className="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 transition-colors hover:bg-white"
                        onClick={() => setShowAlertsModal(true)}
                        type="button"
                      >
                        Xem tất cả
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {loadingWarnings && !warningReadings.length && (
                      <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-500">
                        Đang tải danh sách cảnh báo...
                      </div>
                    )}
                    {!loadingWarnings && !warningReadings.length && (
                      <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-500">
                        {activePatient ? "Bệnh nhân này chưa có cảnh báo gần đây." : "Chọn bệnh nhân để xem cảnh báo."}
                      </div>
                    )}
                    {warningReadings.map((warning) => (
                      <button
                        key={warning.readingId}
                        onClick={() => setSelectedReadingId(warning.readingId)}
                        className="rounded-xl border border-slate-100 bg-white px-4 py-3 text-left transition-all hover:border-primary/30"
                        type="button"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-bold text-slate-800">#{warning.readingId}</span>
                          <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${getWarningCardTone(warning.resolved)}`}>
                            {warning.resolved ? "Resolved" : "Alert"}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">{formatDateTime(warning.timestamp)}</p>
                        <p className="mt-2 text-sm font-bold text-error">{warning.primaryAlert.label_text || warning.primaryAlert.alert_type || "Cảnh báo bất thường"}</p>
                        <p className="mt-2 text-xs font-medium text-slate-500">{warning.alertCount} segment bất thường</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50">
                  <span className="material-symbols-outlined text-indigo-600" style={{ fontVariationSettings: '"FILL" 1' }}>monitor_heart</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Monitor realtime</p>
                  <p className="text-[10px] uppercase text-slate-500">{activePatient?.email || "Chưa chọn bệnh nhân"}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase text-slate-500">
                  {latestReading?.patient?.name || activePatient?.name || "Bệnh nhân"}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase text-slate-500">
                  {latestReading?.device?.serial_number || "Thiết bị chưa rõ"}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase text-slate-500">
                  Window 5s
                </span>
              </div>
            </div>
          </section>

          <section className={["flex w-full flex-col gap-4 lg:w-80", mobileTab === "vitals" ? "flex" : "hidden lg:flex"].join(" ")}>
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-800">
              <span className="material-symbols-outlined text-primary">analytics</span>
              Chỉ số thời gian thực
            </h2>
            <div className="flex-1 space-y-4">
              <div className="flex flex-col gap-1 rounded-2xl border border-slate-50 bg-white p-5 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center justify-between text-error">
                  <span className="text-xs font-bold uppercase tracking-widest">Nhịp tim</span>
                  <span className="material-symbols-outlined animate-pulse" style={{ fontVariationSettings: '"FILL" 1' }}>favorite</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black tracking-tighter text-slate-800">{heartRate || latestReading?.heart_rate || "--"}</span>
                  <span className="text-sm font-bold text-slate-400">BPM</span>
                </div>
              </div>

              <div className="flex flex-col gap-1 rounded-2xl border border-slate-50 bg-white p-5 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center justify-between text-primary">
                  <span className="text-xs font-bold uppercase tracking-widest">SpO2</span>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>water_drop</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black tracking-tighter text-slate-800">98</span>
                  <span className="text-sm font-bold text-slate-400">%</span>
                </div>
                <p className="text-[10px] uppercase text-slate-400">Dữ liệu demo</p>
              </div>

              <button
                className="flex w-full flex-col gap-1 rounded-2xl border border-slate-50 bg-white p-5 text-left shadow-sm transition-all hover:shadow-md"
                onClick={() => setShowAlertsModal(true)}
                type="button"
              >
                <div className="flex items-center justify-between text-indigo-600">
                  <span className="text-xs font-bold uppercase tracking-widest">Cảnh báo</span>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>notification_important</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black tracking-tighter text-slate-800">{warningReadings.length}</span>
                  <span className="text-sm font-bold text-slate-400">readings</span>
                </div>
                <p className="text-[10px] uppercase text-slate-400">Click để xem toàn bộ cảnh báo có phân trang</p>
              </button>

              <div className="mt-auto space-y-3 pt-4">
                <button onClick={() => navigate("/doctor/patients")} className="flex w-full items-center justify-between rounded-xl border border-sky-100 bg-sky-50 p-4 font-bold text-primary shadow-sm transition-colors hover:bg-sky-100" type="button">
                  Xem hồ sơ chi tiết
                  <span className="material-symbols-outlined">folder_shared</span>
                </button>
                <button onClick={() => navigate("/doctor/messages")} className="flex w-full items-center justify-between rounded-xl bg-error p-4 font-bold text-white shadow-sm transition-colors hover:bg-[#a51515]" type="button">
                  Mở màn chat văn bản
                  <span className="material-symbols-outlined">chat</span>
                </button>
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
