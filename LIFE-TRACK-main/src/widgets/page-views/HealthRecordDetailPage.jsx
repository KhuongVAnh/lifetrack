import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ImageWithFallback } from "@/shared/ui/ImageWithFallback";
import { ReadingDetailModal } from "@/features/realtime-monitor/ui/ReadingDetailModal";
import { RealtimeEcgChart } from "@/features/realtime-monitor/ui/RealtimeEcgChart";
import { useAuth } from "@/app/providers/AuthProvider";
import { familyMembers, patientProfiles } from "@/shared/mocks/appFixtures";
import { useRealtimeEcgStream } from "@/features/realtime-monitor/model/useRealtimeEcgStream";
import { useWarningReadings } from "@/features/warning-readings/model/useWarningReadings";
import { formatDateTime, getStatusTone } from "@/features/realtime-monitor/lib/ecgMonitor";
import { getUserAvatar, getUserDisplayName } from "@/entities/user";

const LIVE_TABS = [
  { id: "patients", label: "Thành viên", icon: "group" },
  { id: "monitor", label: "Monitor", icon: "ecg" },
  { id: "vitals", label: "Chỉ số", icon: "analytics" },
];

function getWarningCardTone(resolved) {
  return resolved
    ? "text-slate-500 bg-slate-100"
    : "text-error bg-error/10";
}

function renderFamilyView(activeMember, mobileTab, setMobileTab, navigate) {
  const profile = patientProfiles[activeMember.id];

  if (!profile) {
    return <Navigate replace to="/patient/health-records" />;
  }

  const getMockHR = (id) => {
    if (id === "nguyen-van-a") return 72;
    if (id === "tran-thi-b") return 68;
    if (id === "nguyen-anh-tuan") return 75;
    return 82;
  };

  return (
    <div className="mt-4 flex w-full max-w-[1600px] flex-col gap-4 px-0 py-4">
      <div className="mx-4 flex rounded-xl bg-surface-container-low p-1 lg:hidden">
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

      <div className="px-4 lg:flex lg:h-[calc(100vh-160px)] lg:gap-6">
        <section className={["flex w-full flex-col gap-4 lg:w-72", mobileTab === "patients" ? "flex" : "hidden lg:flex"].join(" ")}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-slate-800">Cá nhân hóa <span className="ml-2 text-sm font-normal text-slate-400">({familyMembers.length})</span></h2>
            <span className="material-symbols-outlined animate-pulse text-secondary" style={{ fontVariationSettings: '"FILL" 1' }}>fiber_manual_record</span>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
            {familyMembers.map((member) => {
              const isActive = activeMember.id === member.id;
              const hr = getMockHR(member.id);

              if (isActive) {
                return (
                  <div key={member.id} className="transform cursor-pointer rounded-3xl bg-primary p-4 text-white shadow-lg ring-4 ring-primary/20 transition-all scale-[1.02]">
                    <div className="mb-4 flex items-center gap-3">
                      <ImageWithFallback className="h-12 w-12 rounded-full border-2 border-white/30 object-cover" alt={member.name} src={member.avatar} />
                      <div>
                        <p className="text-sm font-bold">{member.name}</p>
                        <p className="text-[11px] uppercase tracking-widest opacity-80">{member.relation}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 text-center">
                        <p className="text-xs font-bold uppercase tracking-widest opacity-70">Nhịp tim</p>
                        <p className="text-2xl font-bold">{hr} <span className="text-xs font-medium">BPM</span></p>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <Link
                  key={member.id}
                  to={`/patient/health-records/${member.id}`}
                  className="block cursor-pointer rounded-3xl border border-slate-100 bg-white p-4 transition-all hover:border-primary/30"
                >
                  <div className="mb-3 flex items-center gap-3">
                    <ImageWithFallback className="h-10 w-10 rounded-full border border-slate-200 object-cover" alt={member.name} src={member.avatar} />
                    <div>
                      <p className="text-sm font-bold text-slate-800">{member.name}</p>
                      <p className="text-[11px] uppercase tracking-widest text-slate-400">{member.relation}</p>
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="flex gap-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nhịp tim</p>
                        <p className="text-lg font-bold text-slate-700">{hr}</p>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-slate-200">chevron_right</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className={["flex-1 flex-col gap-6", mobileTab === "monitor" ? "flex" : "hidden lg:flex"].join(" ")}>
          <div className="relative flex flex-1 flex-col overflow-hidden rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Giám sát dạng sóng</h3>
                <p className="flex items-center gap-3 text-2xl font-extrabold text-slate-800">
                  ECG Lead II
                  <span className="rounded-full bg-sky-50 px-3 py-1 text-sm font-bold text-primary">{activeMember.name}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-tighter text-slate-500">X25.0 mm/s</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-tighter text-slate-500">10 mm/mV</span>
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-4">
              <div className="relative flex-1 overflow-hidden rounded-3xl border border-slate-100 bg-slate-50/30 ecg-grid">
                <div className="absolute left-6 top-6 z-10 flex items-center gap-2 font-mono text-sm font-bold text-secondary">
                  <span className="material-symbols-outlined">monitor_heart</span>
                  ECG
                </div>
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 200">
                  <path
                    className="ecg-line"
                    d="M0,100 L20,100 L25,90 L30,110 L35,100 L50,100 L60,30 L70,170 L80,100 L110,100 L125,85 L140,100 L180,100 L185,90 L190,110 L195,100 L210,100 L220,30 L230,170 L240,100 L270,100 L285,85 L300,100 L340,100 L345,90 L350,110 L355,100 L370,100 L380,30 L390,170 L400,100 L430,100 L445,85 L460,100 L500,100 L505,90 L510,110 L515,100 L530,100 L540,30 L550,170 L560,100 L590,100 L605,85 L620,100 L660,100 L665,90 L670,110 L675,100 L690,100 L700,30 L710,170 L720,100 L750,100 L765,85 L780,100 L820,100 L825,90 L830,110 L835,100 L850,100 L860,30 L870,170 L880,100 L910,100 L925,85 L940,100 L980,100 L985,90 L990,110 L1000,100"
                    fill="none"
                    stroke="#1b6d24"
                    strokeWidth="2.5"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              </div>
            </div>
          </div>
        </section>

        <section className={["flex w-full flex-col gap-4 lg:w-80", mobileTab === "vitals" ? "flex" : "hidden lg:flex"].join(" ")}>
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-800">
            <span className="material-symbols-outlined text-primary">analytics</span>
            Chỉ số thời gian thực
          </h2>
          <div className="flex flex-1 flex-col space-y-4">
            <div className="flex flex-col gap-4 rounded-[2rem] border border-slate-50 bg-white p-8 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 text-error">
                <span className="text-sm font-bold uppercase tracking-widest text-slate-500">Nhịp tim</span>
                <span className="material-symbols-outlined animate-pulse" style={{ fontVariationSettings: '"FILL" 1' }}>favorite</span>
              </div>
              <div className="flex items-baseline gap-2 pt-2">
                <span className="text-7xl font-black tracking-tighter text-slate-800">{getMockHR(activeMember.id)}</span>
                <span className="text-xl font-bold text-slate-400">BPM</span>
              </div>
            </div>

            <div className="mt-auto space-y-3 pt-4">
              <button onClick={() => navigate("/patient/doctors/my")} className="flex w-full items-center justify-between rounded-xl bg-error p-4 font-bold text-white shadow-sm transition-colors hover:bg-[#a51515]" type="button">
                Gọi khẩn cấp
                <span className="material-symbols-outlined">emergency_call</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export function HealthRecordDetailPage() {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const [mobileTab, setMobileTab] = useState("monitor");
  const [selectedReadingId, setSelectedReadingId] = useState(null);
  const { user, socket } = useAuth();
  const isSelfView = !memberId;
  const activeMember = memberId ? familyMembers.find((member) => member.id === memberId) || familyMembers[0] : null;

  const {
    liveSignal,
    heartRate,
    aiState,
    latestReading,
    isStreaming,
    signalVersion,
    transitionDurationMs,
    loading: loadingStream,
    error: streamError,
  } = useRealtimeEcgStream(user?.user_id, socket, {
    enabled: isSelfView && Boolean(user?.user_id),
    pollIntervalMs: 2000,
  });

  const {
    warningReadings,
    loading: loadingWarnings,
    error: warningsError,
  } = useWarningReadings(user?.user_id, socket, {
    scope: "patient",
    enabled: isSelfView && Boolean(user?.user_id),
    pollIntervalMs: 8000,
    limit: 5,
  });

  if (!isSelfView) {
    return renderFamilyView(activeMember, mobileTab, setMobileTab, navigate);
  }

  const selfName = getUserDisplayName(user, "Bệnh nhân");
  const selfAvatar = getUserAvatar(user);
  const combinedError = streamError || warningsError;
  const aiSummary = aiState.result || latestReading?.ai_result || "Đang phân tích";
  const aiSummaryError = aiState.error || latestReading?.ai_error || "";

  return (
    <>
      <div className="mt-4 flex w-full max-w-[1600px] flex-col gap-4 px-0 py-4">
        <div className="mx-4 flex rounded-xl bg-surface-container-low p-1 lg:hidden">
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

        <div className="px-4 lg:flex lg:h-[calc(100vh-160px)] lg:gap-6">
          <section className={["flex w-full flex-col gap-4 lg:w-80", mobileTab === "patients" ? "flex" : "hidden lg:flex"].join(" ")}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-800">5 cảnh báo gần nhất <span className="ml-2 text-sm font-normal text-slate-400">({warningReadings.length})</span></h2>
              <span className="material-symbols-outlined animate-pulse text-secondary" style={{ fontVariationSettings: '"FILL" 1' }}>fiber_manual_record</span>
            </div>
            <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <ImageWithFallback className="h-12 w-12 rounded-full border border-slate-200 object-cover" alt={selfName} src={selfAvatar} />
                <div>
                  <p className="font-bold text-slate-800">{selfName}</p>
                  <p className="text-[11px] uppercase tracking-widest text-slate-400">{user?.email || "Tài khoản bệnh nhân"}</p>
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
              {loadingWarnings && !warningReadings.length && (
                <div className="rounded-3xl border border-slate-100 bg-white p-4 text-sm text-slate-500">
                  Đang tải các bản ghi cảnh báo...
                </div>
              )}
              {!loadingWarnings && !warningReadings.length && (
                <div className="rounded-3xl border border-slate-100 bg-white p-4 text-sm text-slate-500">
                  Chưa có bản ghi cảnh báo nào gần đây.
                </div>
              )}
              {warningReadings.map((warning) => (
                <button
                  key={warning.readingId}
                  onClick={() => setSelectedReadingId(warning.readingId)}
                  className="w-full rounded-3xl border border-slate-100 bg-white p-4 text-left transition-all hover:border-primary/30 hover:shadow-sm"
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-800">Reading #{warning.readingId}</p>
                      <p className="text-[11px] uppercase tracking-widest text-slate-400">{formatDateTime(warning.timestamp)}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${getWarningCardTone(warning.resolved)}`}>
                      {warning.resolved ? "Resolved" : "Cảnh báo"}
                    </span>
                  </div>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Loại chính</p>
                      <p className="mt-1 text-sm font-bold text-error">
                        {warning.primaryAlert.label_text || warning.primaryAlert.alert_type || "Cảnh báo bất thường"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Segments</p>
                      <p className="mt-1 text-lg font-black text-slate-800">{warning.alertCount}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className={["flex-1 flex-col gap-6", mobileTab === "monitor" ? "flex" : "hidden lg:flex"].join(" ")}>
            <div className="relative flex flex-1 flex-col overflow-hidden rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Giám sát dạng sóng</h3>
                  <p className="flex items-center gap-3 text-2xl font-extrabold text-slate-800">
                    ECG Lead II
                    <span className="rounded-full bg-sky-50 px-3 py-1 text-sm font-bold text-primary">{selfName}</span>
                  </p>
                  <p className="mt-2 text-xs font-medium text-slate-500">Chart lớn luôn bám dòng ECG live mới nhất. Click một cảnh báo để mở popup xem chi tiết và highlight vùng bất thường.</p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-tighter text-slate-500">
                    HR {heartRate || latestReading?.heart_rate || "--"} BPM
                  </span>
                  <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-tighter ${getStatusTone(aiState.status)}`}>
                    {aiState.status || "PENDING"}
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
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Kết quả AI</p>
                  <p className="mt-1 text-sm font-bold text-slate-700">{aiSummary}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Thiết bị</p>
                  <p className="mt-1 text-sm font-bold text-slate-700">{latestReading?.device?.serial_number || "Chưa rõ"}</p>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-4">
                <div className="relative flex-1 overflow-hidden rounded-3xl border border-slate-100 bg-slate-50/30 ecg-grid">
                  <div className="absolute left-6 top-6 z-10 flex items-center gap-2 font-mono text-sm font-bold text-secondary">
                    <span className="material-symbols-outlined">monitor_heart</span>
                    ECG LIVE
                  </div>
                  {loadingStream && !liveSignal.length ? (
                    <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-slate-500">
                      Đang tải dữ liệu ECG realtime...
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
                      Chưa có tín hiệu ECG để hiển thị.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className={["flex w-full flex-col gap-4 lg:w-80", mobileTab === "vitals" ? "flex" : "hidden lg:flex"].join(" ")}>
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-800">
              <span className="material-symbols-outlined text-primary">analytics</span>
              Chỉ số thời gian thực
            </h2>
            <div className="flex flex-1 flex-col space-y-4">
              <div className="flex flex-col gap-4 rounded-[2rem] border border-slate-50 bg-white p-8 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 text-error">
                  <span className="text-sm font-bold uppercase tracking-widest text-slate-500">Nhịp tim</span>
                  <span className="material-symbols-outlined animate-pulse" style={{ fontVariationSettings: '"FILL" 1' }}>favorite</span>
                </div>
                <div className="flex items-baseline gap-2 pt-2">
                  <span className="text-7xl font-black tracking-tighter text-slate-800">{heartRate || latestReading?.heart_rate || "--"}</span>
                  <span className="text-xl font-bold text-slate-400">BPM</span>
                </div>
                <p className="text-xs font-medium text-slate-500">
                  {aiSummaryError || aiSummary || "Theo dõi theo dữ liệu ECG mới nhất từ thiết bị của bạn."}
                </p>
              </div>

              <div className="flex flex-col gap-1 rounded-[2rem] border border-slate-50 bg-white p-5 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center justify-between text-secondary">
                  <span className="text-xs font-bold uppercase tracking-widest">AI</span>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>psychology</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-black tracking-tight text-slate-800">{aiState.result || aiState.status || "PENDING"}</span>
                </div>
                <p className="text-[10px] uppercase text-slate-400">{aiSummaryError || "Trạng thái phân tích gần nhất"}</p>
              </div>

              <div className="mt-auto space-y-3 pt-4">
                <button onClick={() => navigate("/patient/doctors")} className="flex w-full items-center justify-between rounded-xl bg-primary p-4 font-bold text-white shadow-sm transition-colors hover:bg-[#003d63]" type="button">
                  Chat với bác sĩ
                  <span className="material-symbols-outlined">chat</span>
                </button>
                <button onClick={() => navigate("/patient/doctors/my")} className="flex w-full items-center justify-between rounded-xl bg-error p-4 font-bold text-white shadow-sm transition-colors hover:bg-[#a51515]" type="button">
                  Gọi khẩn cấp
                  <span className="material-symbols-outlined">emergency_call</span>
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
    </>
  );
}
