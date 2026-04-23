import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { getMyFamilyPatients, getFamilyPatientSummary } from "@/features/family";
import { getPhrOverview, getPhrVisits } from "@/features/phr/api/phrApi";
import { getMedicationLogs, getMedicationPlans } from "@/features/medications/api/medicationsApi";
import {
  EmrMedicationsPanel,
  EmrOverviewPanel,
  EmrPatientHeaderCard,
  EmrSubnav,
  EmrVisitsPanel,
} from "@/features/emr/ui/SharedEmrPanels";

function startOfTodayIso() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function endOfTodayIso() {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date.toISOString();
}

export function FamilyEmrWorkspace({ memberId = null, isFamilyRole = false }) {
  const navigate = useNavigate();
  const requestedPatientId = Number(memberId) || null;

  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(requestedPatientId);
  const [activeTab, setActiveTab] = useState("overview");
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
  const [error, setError] = useState("");

  const [overview, setOverview] = useState(null);
  const [visits, setVisits] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [plans, setPlans] = useState([]);
  const [logs, setLogs] = useState([]);

  const selectedPatientEntry = useMemo(
    () => patients.find((item) => item.patient_id === Number(selectedPatientId)) || null,
    [patients, selectedPatientId],
  );

  const selectedPatient = selectedPatientEntry?.patient || null;

  const tabs = [
    { id: "overview", label: "Tổng quát", icon: "dashboard" },
    { id: "history", label: "Lịch sử khám", icon: "history" },
    { id: "medications", label: "Nhắc thuốc", icon: "medication" },
  ];

  const loadPatients = async () => {
    setLoadingPatients(true);
    try {
      setError("");
      const data = await getMyFamilyPatients();
      setPatients(Array.isArray(data) ? data : []);
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Không thể tải danh sách thành viên gia đình.";
      setError(message);
      setPatients([]);
      toast.error(message);
    } finally {
      setLoadingPatients(false);
    }
  };

  const loadWorkspace = async (patientId) => {
    if (!patientId) {
      setOverview(null);
      setVisits([]);
      setDocuments([]);
      setPlans([]);
      setLogs([]);
      return;
    }

    setLoadingWorkspace(true);
    try {
      setError("");
      const [overviewData, visitsData, plansData, logsData, summaryData] = await Promise.all([
        getPhrOverview(patientId),
        getPhrVisits(patientId),
        getMedicationPlans({ user_id: patientId }),
        getMedicationLogs({ user_id: patientId, from: startOfTodayIso(), to: endOfTodayIso() }),
        getFamilyPatientSummary(patientId),
      ]);

      setOverview(overviewData);
      setVisits(visitsData || []);
      setPlans(plansData || []);
      setLogs(logsData || []);
      setDocuments(summaryData?.reports || []);
    } catch (requestError) {
      const status = requestError.response?.status;
      const message =
        requestError.response?.data?.message ||
        (status === 403
          ? "Bạn không có quyền xem hồ sơ thành viên này."
          : "Không thể tải hồ sơ thành viên.");
      setError(message);
      setOverview(null);
      setVisits([]);
      setDocuments([]);
      setPlans([]);
      setLogs([]);
      toast.error(message);
    } finally {
      setLoadingWorkspace(false);
    }
  };

  useEffect(() => {
    void loadPatients();
  }, []);

  useEffect(() => {
    if (!patients.length) {
      setSelectedPatientId(null);
      return;
    }

    const hasRequested = patients.some((item) => item.patient_id === requestedPatientId);
    const hasCurrent = patients.some((item) => item.patient_id === Number(selectedPatientId));

    if (hasRequested) {
      setSelectedPatientId(requestedPatientId);
      return;
    }

    if (!hasCurrent) {
      const firstPatientId = patients[0]?.patient_id ?? null;
      setSelectedPatientId(firstPatientId);
      if (isFamilyRole && !requestedPatientId && firstPatientId) {
        navigate(`/patient/health-records/${firstPatientId}`, { replace: true });
      }
    }
  }, [isFamilyRole, navigate, patients, requestedPatientId, selectedPatientId]);

  useEffect(() => {
    if (selectedPatientId) {
      void loadWorkspace(selectedPatientId);
    }
  }, [selectedPatientId]);

  const handleSelectPatient = (patientId) => {
    setSelectedPatientId(patientId);
    navigate(`/patient/health-records/${patientId}`);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-[2rem] bg-slate-900 p-8 text-white shadow-2xl">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Family EMR</p>
        <h1 className="mt-2 text-3xl font-black md:text-4xl">Hồ sơ thành viên gia đình</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
          Xem tổng quát sức khỏe, lịch sử khám và nhắc thuốc của các bệnh nhân trong gia đình theo quan hệ đã cấu hình.
        </p>
      </section>

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-3">
          <section className="rounded-[2rem] bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-primary">Thành viên</p>
            <div className="mt-4 space-y-3">
              {loadingPatients ? (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-400">
                  Đang tải thành viên...
                </div>
              ) : patients.length ? (
                patients.map((item) => {
                  const selected = Number(selectedPatientId) === item.patient_id;
                  return (
                    <button
                      key={item.relation_id || item.patient_id}
                      type="button"
                      onClick={() => handleSelectPatient(item.patient_id)}
                      className={[
                        "w-full rounded-2xl border p-4 text-left transition-all",
                        selected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-slate-100 bg-slate-50 hover:border-primary/30",
                      ].join(" ")}
                    >
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {item.relation_label || "Thành viên"}
                      </p>
                      <p className="mt-1 font-black text-slate-900">{item.patient?.name || "Bệnh nhân"}</p>
                      <p className="truncate text-xs text-slate-500">{item.patient?.email || ""}</p>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm font-bold text-slate-400">
                  Chưa có thành viên gia đình.
                </div>
              )}
            </div>
          </section>
        </aside>

        <main className="space-y-6">
          {selectedPatient && (
            <EmrPatientHeaderCard
              patient={selectedPatient}
              helperText={selectedPatientEntry?.relation_label || "Thành viên gia đình"}
            />
          )}

          <EmrSubnav tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

          {loadingWorkspace ? (
            <div className="rounded-2xl bg-white p-8 text-center text-sm font-bold text-slate-400 shadow-sm">
              Đang tải hồ sơ thành viên...
            </div>
          ) : null}

          {!loadingWorkspace && selectedPatient && activeTab === "overview" && (
            <EmrOverviewPanel overview={overview} patient={selectedPatient} />
          )}

          {!loadingWorkspace && selectedPatient && activeTab === "history" && (
            <EmrVisitsPanel
              visits={visits}
              documents={documents}
              emptyLabel="Thành viên này chưa có lịch sử khám."
            />
          )}

          {!loadingWorkspace && selectedPatient && activeTab === "medications" && (
            <EmrMedicationsPanel plans={plans} logs={logs} />
          )}

          {!loadingWorkspace && !selectedPatient && !loadingPatients && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm font-bold text-slate-400 shadow-sm">
              Chọn một thành viên để xem hồ sơ.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
