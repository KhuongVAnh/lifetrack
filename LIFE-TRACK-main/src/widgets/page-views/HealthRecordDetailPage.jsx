import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ImageWithFallback } from "@/shared/ui/ImageWithFallback";
import { ReadingDetailModal } from "@/features/realtime-monitor/ui/ReadingDetailModal";
import { RealtimeEcgChart } from "@/features/realtime-monitor/ui/RealtimeEcgChart";
import { useAuth } from "@/app/providers/AuthProvider";
import { familyMembers, patientProfiles } from "@/shared/mocks/appFixtures";
import { useRealtimeEcgStream } from "@/features/realtime-monitor/model/useRealtimeEcgStream";
import { useWarningReadings } from "@/features/warning-readings/model/useWarningReadings";
import { formatDateTime, getStatusTone } from "@/features/realtime-monitor/lib/ecgMonitor";
import { getUserAvatar, getUserDisplayName, normalizeRole } from "@/entities/user";
import { getFamilyPatientSummary, getMyFamilyPatients } from "@/features/family";
import { FamilyEmrWorkspace } from "@/widgets/page-views/family/FamilyEmrWorkspace";

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

function SparklineChart({ data, color = "#0060A8", height = 40 }) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data.map((d) => d.numeric));
  const max = Math.max(...data.map((d) => d.numeric));
  const range = max - min || 1;
  const padding = range * 0.1;
  
  const width = 120;
  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - ((d.numeric - min + padding) / (range + padding * 2)) * height,
  }));

  let pathData = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cpX = (p0.x + p1.x) / 2;
    pathData += ` C ${cpX},${p0.y} ${cpX},${p1.y} ${p1.x},${p1.y}`;
  }

  return (
    <div className="relative group">
      <svg className="overflow-visible" height={height} width={width} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id={`grad-${color}`} x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`${pathData} L ${width},${height} L 0,${height} Z`}
          fill={`url(#grad-${color})`}
          className="transition-all duration-700 ease-out"
        />
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-all duration-700 ease-out"
        />
        {/* Glow effect on hover */}
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeOpacity="0"
          className="group-hover:stroke-opacity-10 transition-opacity"
        />
      </svg>
    </div>
  );
}

function VitalTrendCard({ 
  label, 
  value, 
  unit, 
  trend, 
  data, 
  color = "#0060A8", 
  icon,
  avg
}) {
  return (
    <div className="group relative overflow-hidden rounded-[2rem] border border-slate-100 bg-white p-5 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50">
      <div className="flex items-start justify-between mb-2">
        <div className={`p-2.5 rounded-2xl bg-slate-50 text-[${color}] group-hover:scale-110 transition-transform`} style={{ color }}>
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
          <p className="text-sm font-medium text-secondary">{trend}</p>
        </div>
      </div>
      
      <div className="flex items-end justify-between mt-4">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black tracking-tight text-slate-800">{value}</span>
            <span className="text-xs font-bold text-slate-400">{unit}</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Trung bình:</span>
            <span className="text-[11px] font-bold text-slate-600">{avg} {unit}</span>
          </div>
        </div>
        <SparklineChart data={data} color={color} />
      </div>
    </div>
  );
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

      {/* TOP SECTION: ECG Live with embedded Vitals */}
      <section className={["w-full flex-col gap-6", mobileTab === "monitor" ? "flex" : "hidden lg:flex"].join(" ")}>
        <div className="relative flex flex-col overflow-hidden rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm lg:h-[500px]">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Giám sát dạng sóng</h3>
              <p className="flex items-center gap-3 text-2xl font-extrabold text-slate-800">
                ECG Lead II
                <span className="rounded-full bg-sky-50 px-3 py-1 text-sm font-bold text-primary">{activeMember.name}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-tighter text-slate-500">X25.0 mm/s</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-tighter text-slate-500">10 mm/mV</span>
              </div>
              <button onClick={() => navigate("/patient/doctors/my")} className="flex items-center gap-1.5 rounded-xl bg-error px-4 py-2 font-bold text-white shadow-sm transition-colors hover:bg-[#a51515]" type="button">
                Gọi bác sĩ
                <span className="material-symbols-outlined text-[18px]">emergency_call</span>
              </button>
            </div>
          </div>
          <div className="relative flex-1 overflow-hidden rounded-3xl border border-slate-100 bg-slate-50/30 ecg-grid min-h-[300px]">
            <div className="absolute left-6 top-6 z-10 flex items-center gap-2 font-mono text-sm font-bold text-secondary">
              <span className="material-symbols-outlined">monitor_heart</span>
              ECG
            </div>

            {/* Embedded Floating Vitals */}
            <div className="absolute right-6 top-6 z-20 flex flex-col gap-3 w-40">
              <div className="rounded-2xl bg-white/70 backdrop-blur-md p-4 shadow-sm border border-white flex flex-col items-end">
                <div className="flex items-center gap-1 text-error text-[10px] uppercase font-bold tracking-widest">
                  <span className="material-symbols-outlined text-[14px]">favorite</span> Nhịp tim
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-4xl font-black tracking-tighter text-slate-800">{getMockHR(activeMember.id)}</span>
                  <span className="text-xs font-bold text-slate-500">BPM</span>
                </div>
              </div>
            </div>

            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 200" preserveAspectRatio="none">
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
      </section>

      {/* BOTTOM SECTION */}
      <section className={["flex w-full flex-col gap-4 max-w-2xl mx-auto", mobileTab === "patients" ? "flex" : "hidden lg:flex"].join(" ")}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-slate-800">Cá nhân hóa <span className="ml-2 text-sm font-normal text-slate-400">({familyMembers.length})</span></h2>
          <span className="material-symbols-outlined animate-pulse text-secondary" style={{ fontVariationSettings: '"FILL" 1' }}>fiber_manual_record</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {familyMembers.map((member) => {
            const isActive = activeMember.id === member.id;
            const hr = getMockHR(member.id);

            if (isActive) {
              return (
                <div key={member.id} className="transform cursor-pointer rounded-3xl bg-primary p-4 text-white shadow-lg ring-4 ring-primary/20 transition-all scale-[1.02]">
                  <div className="mb-4 flex items-center gap-3">
                    <ImageWithFallback className="h-10 w-10 rounded-full border-2 border-white/30 object-cover" alt={member.name} src={member.avatar} />
                    <div>
                      <p className="text-sm font-bold line-clamp-1">{member.name}</p>
                      <p className="text-[10px] uppercase tracking-widest opacity-80">{member.relation}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-2 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Nhịp tim</p>
                    <p className="text-lg font-bold">{hr}</p>
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
                    <p className="text-sm font-bold text-slate-800 line-clamp-1">{member.name}</p>
                    <p className="text-[10px] uppercase tracking-widest text-slate-400">{member.relation}</p>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nhịp tim</p>
                    <p className="text-base font-bold text-slate-700">{hr}</p>
                  </div>
                  <span className="material-symbols-outlined text-slate-200">chevron_right</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function FamilyHealthRecordsView({ memberId }) {
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(Number(memberId) || null);
  const [summary, setSummary] = useState(null);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoadingPatients(true);
    getMyFamilyPatients()
      .then((items) => {
        if (!mounted) return;
        setPatients(items);
        const routePatientId = Number(memberId) || null;
        const hasRoutePatient = items.some((item) => item.patient_id === routePatientId);
        setSelectedPatientId(hasRoutePatient ? routePatientId : items[0]?.patient_id ?? null);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.response?.data?.message || "Không thể tải danh sách thành viên gia đình.");
      })
      .finally(() => {
        if (mounted) setLoadingPatients(false);
      });

    return () => {
      mounted = false;
    };
  }, [memberId]);

  useEffect(() => {
    if (!selectedPatientId) {
      setSummary(null);
      return;
    }

    let mounted = true;
    setLoadingSummary(true);
    setError("");
    getFamilyPatientSummary(selectedPatientId)
      .then((data) => {
        if (mounted) setSummary(data);
      })
      .catch((err) => {
        if (mounted) setError(err.response?.data?.message || "Không thể tải hồ sơ thành viên.");
      })
      .finally(() => {
        if (mounted) setLoadingSummary(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedPatientId]);

  const patient = summary?.patient || patients.find((item) => item.patient_id === selectedPatientId)?.patient;

  return (
    <div className="mx-auto mt-4 w-full max-w-7xl space-y-6 px-4 py-4">
      <section className="rounded-[2rem] bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-primary">Family view</p>
        <h1 className="mt-2 text-3xl font-black text-slate-900">Hồ sơ sức khỏe thành viên gia đình</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Người nhà xem mặc định toàn bộ EHR, thuốc, bệnh sử và lịch sử khám của các quyền đã được chấp nhận.
        </p>
      </section>

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-3">
          {loadingPatients ? (
            <div className="rounded-2xl bg-white p-5 text-sm font-bold text-slate-400 shadow-sm">Đang tải thành viên...</div>
          ) : patients.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm font-bold text-slate-400">
              Chưa có bệnh nhân nào cấp quyền gia đình.
            </div>
          ) : (
            patients.map((item) => {
              const selected = selectedPatientId === item.patient_id;
              return (
                <button
                  key={item.access_id || item.patient_id}
                  type="button"
                  onClick={() => setSelectedPatientId(item.patient_id)}
                  className={[
                    "flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-all",
                    selected ? "border-primary bg-primary/5 shadow-sm" : "border-slate-100 bg-white hover:border-primary/30",
                  ].join(" ")}
                >
                  <ImageWithFallback
                    alt={item.patient?.name || "Bệnh nhân"}
                    className="h-12 w-12 rounded-2xl object-cover"
                    src={getUserAvatar(item.patient)}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-black text-slate-800">{item.patient?.name || "Bệnh nhân"}</p>
                    <p className="truncate text-xs text-slate-500">{item.patient?.email || item.relationship || "Thành viên"}</p>
                  </div>
                </button>
              );
            })
          )}
        </aside>

        <main className="space-y-6">
          {loadingSummary ? (
            <div className="rounded-2xl bg-white p-8 text-center text-sm font-bold text-slate-400 shadow-sm">Đang tải hồ sơ...</div>
          ) : patient ? (
            <>
              <section className="rounded-[2rem] bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <ImageWithFallback alt={patient.name} className="h-16 w-16 rounded-2xl object-cover" src={getUserAvatar(patient)} />
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">{patient.name}</h2>
                      <p className="text-sm text-slate-500">{patient.email}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-sky-50 px-4 py-3">
                      <p className="text-xl font-black text-primary">{summary?.visits?.length || 0}</p>
                      <p className="text-[10px] font-black uppercase text-primary">Lần khám</p>
                    </div>
                    <div className="rounded-xl bg-emerald-50 px-4 py-3">
                      <p className="text-xl font-black text-emerald-700">{summary?.medication_plans?.length || 0}</p>
                      <p className="text-[10px] font-black uppercase text-emerald-700">Đơn thuốc</p>
                    </div>
                    <div className="rounded-xl bg-amber-50 px-4 py-3">
                      <p className="text-xl font-black text-amber-700">{summary?.alerts?.length || 0}</p>
                      <p className="text-[10px] font-black uppercase text-amber-700">Cảnh báo</p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-black text-slate-900">Lịch sử khám / bệnh sử</h3>
                  <div className="mt-4 space-y-3">
                    {(summary?.visits || []).map((visit) => (
                      <article key={visit.visit_id || visit.history_id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <p className="font-black text-slate-800">{visit.doctor_diagnosis || visit.diagnosis || "Bản ghi khám"}</p>
                        <p className="mt-1 text-xs font-bold text-slate-400">{formatDateTime(visit.visit_date || visit.created_at)}</p>
                        <p className="mt-2 text-sm text-slate-600">{visit.notes || visit.condition || visit.reason || visit.diagnosis_details || visit.advice || "Không có mô tả"}</p>
                      </article>
                    ))}
                    {!(summary?.visits || []).length && <p className="text-sm font-bold text-slate-400">Chưa có lịch sử khám.</p>}
                  </div>
                </div>

                <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-black text-slate-900">Tủ thuốc</h3>
                  <div className="mt-4 space-y-3">
                    {(summary?.medication_plans || []).map((plan) => (
                      <article key={plan.plan_id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <p className="font-black text-slate-800">{plan.title || `Đơn thuốc #${plan.plan_id}`}</p>
                        <div className="mt-2 space-y-1">
                          {(plan.medications || []).map((med) => (
                            <p key={med.medication_id} className="text-sm text-slate-600">
                              <span className="font-bold">{med.name}</span> · {med.dosage} · {(med.times || []).join(", ")}
                            </p>
                          ))}
                        </div>
                      </article>
                    ))}
                    {!(summary?.medication_plans || []).length && <p className="text-sm font-bold text-slate-400">Chưa có đơn thuốc.</p>}
                  </div>
                </div>
              </section>

              <section className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-black text-slate-900">Báo cáo</h3>
                  <div className="mt-4 space-y-3">
                    {(summary?.reports || []).map((report) => (
                      <article key={report.report_id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <p className="font-black text-slate-800">{report.title || `Báo cáo #${report.report_id}`}</p>
                        <p className="mt-2 text-sm text-slate-600">
                          {typeof report.summary === "string" ? report.summary : report.summary?.tom_tat || "Báo cáo y khoa"}
                        </p>
                      </article>
                    ))}
                    {!(summary?.reports || []).length && <p className="text-sm font-bold text-slate-400">Chưa có báo cáo.</p>}
                  </div>
                </div>

                <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-black text-slate-900">Lịch thuốc hôm nay</h3>
                  <div className="mt-4 space-y-3">
                    {(summary?.medication_logs_today || []).map((log) => (
                      <div key={log.log_id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4">
                        <div>
                          <p className="font-bold text-slate-800">{log.medication?.name || "Thuốc"}</p>
                          <p className="text-xs text-slate-500">{formatDateTime(log.scheduled_time)}</p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase text-slate-500">{log.status}</span>
                      </div>
                    ))}
                    {!(summary?.medication_logs_today || []).length && <p className="text-sm font-bold text-slate-400">Hôm nay chưa có lịch thuốc.</p>}
                  </div>
                </div>
              </section>
            </>
          ) : (
            <div className="rounded-2xl bg-white p-8 text-center text-sm font-bold text-slate-400 shadow-sm">
              Chọn một thành viên để xem hồ sơ.
            </div>
          )}
        </main>
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
  const isFamilyRole = normalizeRole(user?.normalizedRole ?? user?.role) === "family";
  const numericMemberId = Number(memberId);
  const hasNumericMemberId = Number.isInteger(numericMemberId) && numericMemberId > 0;
  const isSelfView = !memberId;
  const activeMember = memberId ? familyMembers.find((member) => member.id === memberId) || familyMembers[0] : null;

  const {
    liveSignal,
    streamChunk,
    sampleRateHz,
    heartRate,
    aiState,
    latestReading,
    isStreaming,
    signalVersion,
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

  if (isFamilyRole || hasNumericMemberId) {
    return <FamilyEmrWorkspace memberId={hasNumericMemberId ? memberId : null} isFamilyRole={isFamilyRole} />;
  }

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

        {/* TOP SECTION: ECG Live */}
        <section className={["w-full flex-col gap-6", mobileTab === "monitor" ? "flex" : "hidden lg:flex"].join(" ")}>
          <div className="relative flex flex-col overflow-hidden rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm lg:h-[500px]">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Giám sát nhịp tim </h3>
                <p className="flex items-center gap-3 text-2xl font-extrabold text-slate-800">
                  ECG
                  <span className="rounded-full bg-sky-50 px-3 py-1 text-sm font-bold text-primary">{selfName}</span>
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  {isStreaming ? "Đang trực tiếp từ thiết bị đeo." : "Đang dùng bản mô phỏng."} {aiSummaryError && <span className="text-error ml-1">{aiSummaryError}</span>}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end gap-1">
                  <p className="text-[10px] font-bold text-slate-400">Đo lần cuối: {formatDateTime(latestReading?.timestamp)}</p>
                </div>
                <div className="flex gap-2 ml-4">
                  <button onClick={() => navigate("/patient/doctors/chat")} className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 font-bold text-white shadow-sm transition-colors hover:bg-[#003d63]" type="button">
                    <span className="material-symbols-outlined text-[18px]">chat</span> Chat bác sĩ
                  </button>
                  <button onClick={() => navigate("/patient/doctors/my")} className="flex items-center gap-1.5 rounded-xl bg-error px-4 py-2 font-bold text-white shadow-sm transition-colors hover:bg-[#a51515]" type="button">
                    <span className="material-symbols-outlined text-[18px]">medical_services</span> Khẩn cấp
                  </button>
                </div>
              </div>
            </div>

            {combinedError && (
              <div className="mb-2 rounded-2xl border border-error/20 bg-error/5 px-4 py-2 text-sm text-error">
                {combinedError}
              </div>
            )}

            <div className="relative flex-1 overflow-hidden rounded-3xl border border-slate-100 bg-slate-50/30 ecg-grid min-h-[300px]">
              <div className="absolute left-6 top-6 z-10 flex items-center gap-2 font-mono text-sm font-bold text-secondary">
                <span className="material-symbols-outlined">monitor_heart</span>
                ECG LIVE
              </div>

              {/* Embedded Floating Vitals */}
              <div className="absolute right-6 top-6 z-20 flex flex-col gap-3 w-48">
                {/* BPM Card */}
                <div className="rounded-2xl bg-white/70 backdrop-blur-md p-4 shadow-sm border border-white flex flex-col items-end">
                  <div className="flex items-center gap-1 text-error text-[10px] uppercase font-bold tracking-widest">
                    <span className="material-symbols-outlined text-[14px]">favorite</span> Nhịp tim
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-4xl font-black tracking-tighter text-slate-800">{heartRate || latestReading?.heart_rate || "--"}</span>
                    <span className="text-xs font-bold text-slate-500">BPM</span>
                  </div>
                </div>

                {/* AI Result Card */}
                <div className="rounded-2xl bg-white/70 backdrop-blur-md p-4 shadow-sm border border-white flex flex-col">
                  <div className="flex items-center justify-between text-secondary mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#0060A8]">AI Phân Tích</span>
                    <span className="material-symbols-outlined text-[14px] text-[#0060A8]">psychology</span>
                  </div>
                  <span className="text-sm font-bold text-slate-800 leading-tight">
                    {aiState.result || aiState.status || "PENDING"}
                  </span>
                  <span className={`mt-2 rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-tighter w-fit ${getStatusTone(aiState.status)}`}>
                    {aiState.status || "PENDING"}
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
                  Chưa có tín hiệu ECG để hiển thị.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* BOTTOM SECTION: Trends & Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full max-w-7xl mx-auto items-start">
          
          {/* Trend Section */}
          <section className={["lg:col-span-8 flex flex-col gap-6", mobileTab === "vitals" ? "flex" : "hidden lg:flex"].join(" ")}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-1 rounded-full bg-primary" />
                <h2 className="text-xl font-black tracking-tight text-slate-800">Sức khỏe của tôi </h2>
              </div>
              <div className="flex gap-2">
                <span className="px-3 py-1 rounded-full bg-sky-50 text-primary text-[10px] font-bold uppercase tracking-widest">7 ngày qua</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <VitalTrendCard
                label="Nhịp tim"
                value={heartRate || latestReading?.heart_rate || "72"}
                unit="BPM"
                trend="+2.4% so với T2"
                avg="74"
                data={patientProfiles[user?.user_id]?.chart || []}
                color="#E91E63"
                icon="favorite"
              />
              <VitalTrendCard
                label="Huyết áp"
                value="122/78"
                unit="mmHg"
                trend="Giảm nhẹ"
                avg="124/80"
                data={[
                  { numeric: 128 }, { numeric: 126 }, { numeric: 124 }, 
                  { numeric: 129 }, { numeric: 122 }, { numeric: 123 }, { numeric: 122 }
                ]}
                color="#3F51B5"
                icon="blood_pressure"
              />
              <VitalTrendCard
                label="Nồng độ Oxy (SpO2)"
                value="98"
                unit="%"
                trend="Ổn định"
                avg="98.2"
                data={[
                  { numeric: 98 }, { numeric: 97 }, { numeric: 98 }, 
                  { numeric: 99 }, { numeric: 98 }, { numeric: 98 }, { numeric: 98 }
                ]}
                color="#00BCD4"
                icon="air"
              />
              <VitalTrendCard
                label="Chỉ số BMI"
                value={patientProfiles[user?.user_id]?.bmi || "23.1"}
                unit="kg/m²"
                trend="Bình thường"
                avg="23.1"
                data={[
                  { numeric: 23.1 }, { numeric: 23.1 }, { numeric: 23.2 }, 
                  { numeric: 23.1 }, { numeric: 23.1 }, { numeric: 23.1 }, { numeric: 23.1 }
                ]}
                color="#4CAF50"
                icon="weight"
              />
            </div>
            
            {/* Quick Summary Card */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white shadow-2xl">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-secondary/10 blur-3xl" />
              <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-secondary mb-3">
                    <span className="material-symbols-outlined text-[20px]">verified</span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Tóm tắt từ AI LifeTrack</span>
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Tình trạng tim mạch ổn định</h3>
                  <p className="text-slate-300 text-sm leading-relaxed max-w-xl">
                    Dựa trên dữ liệu 7 ngày qua, nhịp tim của bạn duy trì ở mức <span className="text-white font-bold">72-78 BPM</span>. 
                    Chưa phát hiện dấu hiệu rối loạn nhịp hoặc thay đổi đột ngột. Hãy duy trì lịch sinh hoạt hiện tại.
                  </p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button onClick={() => navigate("/patient/doctors/chat")} className="px-6 py-3 rounded-2xl bg-white text-slate-900 font-bold text-sm hover:scale-[1.02] transition-all">
                    Tư vấn ngay
                  </button>
                  <p className="text-[10px] text-slate-400 text-center">Cập nhật lúc 10:30 Hôm nay</p>
                </div>
              </div>
            </div>
          </section>

          {/* Alerts Section */}
          <section className={["lg:col-span-4 flex flex-col gap-6", mobileTab === "patients" ? "flex" : "hidden lg:flex"].join(" ")}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-800">Gần đây <span className="ml-2 text-sm font-normal text-slate-400">({warningReadings.length})</span></h2>
              <span className="material-symbols-outlined animate-pulse text-secondary" style={{ fontVariationSettings: '"FILL" 1' }}>fiber_manual_record</span>
            </div>
            
            <div className="flex flex-col gap-3 lg:max-h-[600px] lg:overflow-y-auto lg:pr-2 custom-scrollbar">
              {loadingWarnings && !warningReadings.length && (
                <div className="rounded-3xl border border-slate-100 bg-white p-4 text-sm text-slate-500">
                  Đang tải...
                </div>
              )}
              {!loadingWarnings && !warningReadings.length && (
                <div className="rounded-3xl border border-slate-100 bg-white p-6 text-sm text-slate-500 text-center bg-slate-50 border-dashed">
                  Không có cảnh báo.
                </div>
              )}
              {warningReadings.map((warning) => (
                <button
                  key={warning.readingId}
                  onClick={() => setSelectedReadingId(warning.readingId)}
                  className="w-full rounded-2xl border border-slate-100 bg-white p-3 text-left transition-all hover:bg-slate-50"
                  type="button"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${warning.resolved ? "bg-slate-100" : "bg-error/10 text-error"}`}>
                      <span className="material-symbols-outlined text-[18px]">warning</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate mb-0.5">{warning.primaryAlert.label_text || "Cảnh báo"}</p>
                      <p className="text-[9px] uppercase tracking-widest text-slate-400 font-medium">{formatDateTime(warning.timestamp)}</p>
                    </div>
                    <span className="material-symbols-outlined text-slate-300 text-base">chevron_right</span>
                  </div>
                </button>
              ))}
              
              <div className="mt-4 p-5 rounded-[2rem] bg-sky-50 border border-sky-100">
                <div className="flex items-center gap-2 text-primary mb-2">
                  <span className="material-symbols-outlined text-[18px]">info</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest">Ghi chú y khoa</span>
                </div>
                <p className="text-[11px] text-sky-800/70 leading-relaxed italic">
                  "Hệ thống sẽ tự động gửi cảnh báo đến bác sĩ nếu nhịp tim vượt ngưỡng an toàn trong hơn 30 giây liên tục."
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
    </>
  );
}
