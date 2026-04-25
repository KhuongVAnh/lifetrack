import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "@/app/providers/AuthProvider";
import {
  getDoctorPortalEmrWorkspace,
  getDoctorPortalPatients,
  createDoctorPortalConsultation,
} from "@/features/doctor-portal";
import { getPhrOverview, getPhrVisits } from "@/features/phr/api/phrApi";
import {
  archiveMedicationPlan,
  createMedicationPlan,
  getMedicationLogs,
  getMedicationPlans,
  updateMedicationPlan,
} from "@/features/medications/api/medicationsApi";
import {
  EmrHistoryPreviewPanel,
  EmrMedicationsPanel,
  EmrOverviewPanel,
  EmrPatientHeaderCard,
  EmrSubnav,
  EmrVisitsPanel,
} from "@/features/emr/ui/SharedEmrPanels";
import { extractSoapText, normalizeMedicationEntries } from "@/features/emr/lib/emrViewModel";

const ORDER_TEMPLATES = [
  "Điện tâm đồ 12 chuyển đạo",
  "Xét nghiệm công thức máu",
  "Sinh hóa máu cơ bản",
  "Amlodipine 5mg - 30 viên",
  "Hẹn tái khám sau 4 tuần",
];

const EMPTY_MEDICATION_DRAFT = {
  plan_id: null,
  title: "",
  start_date: new Date().toISOString().slice(0, 10),
  end_date: "",
  notes: "",
  medications: [{ name: "", dosage: "1 viên", timesText: "08:00" }],
};

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

function normalizeOrderList(orderInput) {
  if (!Array.isArray(orderInput)) return [];
  return orderInput.map((item) => String(item).trim()).filter(Boolean);
}

function formatMedicationForTextarea(value) {
  const entries = normalizeMedicationEntries(value);
  if (!entries.length) return String(value || "");

  return entries
    .map((item) => {
      const parts = [item.name, item.dosage, item.usage, item.quantity ? `SL ${item.quantity}` : ""].filter(Boolean);
      return `- ${parts.join(" · ")}`;
    })
    .join("\n");
}

function MedicationEditor({ draft, onChange, onMedChange, onAddMed, onReset, onSave, saving, disabled }) {
  return (
    <section className="rounded-[2rem] bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900">
            {draft.plan_id ? "Sửa kế hoạch thuốc" : "Kê kế hoạch thuốc"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Nhập giờ uống cách nhau bằng dấu phẩy, ví dụ: `08:00, 20:00`.
          </p>
        </div>
        {draft.plan_id && (
          <button
            type="button"
            onClick={onReset}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600"
          >
            Tạo mới
          </button>
        )}
      </div>

      <fieldset disabled={disabled || saving} className="space-y-4 disabled:opacity-60">
        <input
          value={draft.title}
          onChange={(event) => onChange("title", event.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
          placeholder="Tên đơn thuốc"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="date"
            value={draft.start_date}
            onChange={(event) => onChange("start_date", event.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
          />
          <input
            type="date"
            value={draft.end_date}
            onChange={(event) => onChange("end_date", event.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
          />
        </div>
        {draft.medications.map((medication, index) => (
          <div key={index} className="rounded-[1.5rem] bg-slate-50 p-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                value={medication.name}
                onChange={(event) => onMedChange(index, "name", event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                placeholder="Tên thuốc"
              />
              <input
                value={medication.dosage}
                onChange={(event) => onMedChange(index, "dosage", event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                placeholder="Liều lượng"
              />
            </div>
            <input
              value={medication.timesText}
              onChange={(event) => onMedChange(index, "timesText", event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="08:00, 20:00"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={onAddMed}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700"
        >
          + Thêm thuốc
        </button>
        <textarea
          value={draft.notes}
          onChange={(event) => onChange("notes", event.target.value)}
          className="min-h-24 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
          placeholder="Ghi chú cho bệnh nhân"
        />
        <button
          type="button"
          onClick={onSave}
          disabled={disabled || saving}
          className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-black text-white disabled:opacity-60"
        >
          {saving ? "Đang lưu..." : draft.plan_id ? "Lưu thay đổi" : "Kê thuốc"}
        </button>
      </fieldset>
    </section>
  );
}

export function DoctorEmrPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const preselectedPatientId = Number(searchParams.get("patientId")) || null;

  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
  const [error, setError] = useState("");
  const [savingConsultation, setSavingConsultation] = useState(false);
  const [savingMedication, setSavingMedication] = useState(false);

  const [overview, setOverview] = useState(null);
  const [visits, setVisits] = useState([]);
  const [plans, setPlans] = useState([]);
  const [logs, setLogs] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [medicationDraft, setMedicationDraft] = useState(EMPTY_MEDICATION_DRAFT);

  const [clinicalNote, setClinicalNote] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [prescription, setPrescription] = useState("");
  const [condition, setCondition] = useState("");
  const [selectedOrders, setSelectedOrders] = useState([]);

  const selectedPatientAccess = useMemo(
    () => patients.find((item) => item.patientId === Number(selectedPatientId)) || null,
    [patients, selectedPatientId],
  );

  const selectedPatient = selectedPatientAccess?.patient || null;
  const canViewEhr = Boolean(selectedPatientAccess?.canViewEhr);
  const canViewMedications = Boolean(selectedPatientAccess?.canViewMedications);

  const availableTabs = useMemo(() => {
    const tabs = [];
    if (canViewEhr) {
      tabs.push(
        { id: "overview", label: "Tổng quát", icon: "dashboard" },
        { id: "history", label: "Lịch sử khám", icon: "history" },
      );
    }
    if (canViewMedications) {
      tabs.push({ id: "medications", label: "Nhắc thuốc", icon: "medication" });
    }
    if (canViewEhr) {
      tabs.push({ id: "consultation", label: "Ghi chú khám", icon: "note_add" });
    }
    return tabs;
  }, [canViewEhr, canViewMedications]);

  const resetMedicationDraft = () => {
    setMedicationDraft({
      ...EMPTY_MEDICATION_DRAFT,
      medications: [{ name: "", dosage: "1 viên", timesText: "08:00" }],
    });
  };

  const hydrateConsultationForm = (workspace) => {
    const latestVisit = workspace?.histories?.[0] || null;
    setClinicalNote(extractSoapText(latestVisit?.reason || latestVisit?.notes));
    setDiagnosis(latestVisit?.diagnosis || latestVisit?.doctor_diagnosis || "");
    setPrescription(formatMedicationForTextarea(latestVisit?.prescription || latestVisit?.medication));
    setCondition(latestVisit?.condition || "");
    setSelectedOrders(normalizeOrderList(latestVisit?.tests || latestVisit?.y_lenh));
  };

  const loadPatients = async () => {
    setLoadingPatients(true);
    try {
      setError("");
      const data = await getDoctorPortalPatients({ domain: "all" });
      const filtered = (Array.isArray(data) ? data : []).filter(
        (item) => item.canViewEhr || item.canViewMedications,
      );
      setPatients(filtered);
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Không thể tải danh sách bệnh nhân EMR";
      setError(message);
      setPatients([]);
      toast.error(message);
    } finally {
      setLoadingPatients(false);
    }
  };

  const loadWorkspace = async (patientId) => {
    if (!patientId || !selectedPatientAccess) {
      setOverview(null);
      setVisits([]);
      setPlans([]);
      setLogs([]);
      setDocuments([]);
      return;
    }

    setLoadingWorkspace(true);
    try {
      setError("");
      const requests = [];
      if (selectedPatientAccess.canViewEhr) {
        requests.push(getPhrOverview(patientId));
        requests.push(getPhrVisits(patientId));
        requests.push(getDoctorPortalEmrWorkspace(patientId));
      } else {
        requests.push(Promise.resolve(null), Promise.resolve([]), Promise.resolve(null));
      }

      if (selectedPatientAccess.canViewMedications) {
        requests.push(getMedicationPlans({ user_id: patientId }));
        requests.push(
          getMedicationLogs({
            user_id: patientId,
            from: startOfTodayIso(),
            to: endOfTodayIso(),
          }),
        );
      } else {
        requests.push(Promise.resolve([]), Promise.resolve([]));
      }

      const [nextOverview, nextVisits, workspace, nextPlans, nextLogs] = await Promise.all(requests);

      setOverview(nextOverview);
      setVisits(nextVisits || []);
      setDocuments(workspace?.documents || []);
      setPlans(nextPlans || []);
      setLogs(nextLogs || []);
      hydrateConsultationForm(workspace);
    } catch (requestError) {
      const status = requestError.response?.status;
      const message =
        requestError.response?.data?.message ||
        (status === 403
          ? "Bạn không có quyền xem bệnh án điện tử của bệnh nhân này"
          : "Không thể tải dữ liệu bệnh án điện tử");
      setError(message);
      setOverview(null);
      setVisits([]);
      setPlans([]);
      setLogs([]);
      setDocuments([]);
      toast.error(message);
    } finally {
      setLoadingWorkspace(false);
    }
  };

  useEffect(() => {
    void loadPatients();
  }, []);

  const preselectedAppliedRef = useRef(false);

  useEffect(() => {
    if (!patients.length) {
      setSelectedPatientId(null);
      preselectedAppliedRef.current = false;
      return;
    }

    // Apply URL preselection only once on initial load
    if (preselectedPatientId && !preselectedAppliedRef.current) {
      const hasPreselected = patients.some((item) => item.patientId === preselectedPatientId);
      if (hasPreselected) {
        setSelectedPatientId(preselectedPatientId);
        preselectedAppliedRef.current = true;
        return;
      }
    }

    // Auto-select first patient only when current selection is invalid
    setSelectedPatientId((currentId) => {
      const hasCurrent = patients.some((item) => item.patientId === Number(currentId));
      if (hasCurrent) return currentId;
      return patients[0].patientId;
    });
  }, [patients, preselectedPatientId]);

  useEffect(() => {
    if (!selectedPatientAccess) return;

    const nextDefaultTab = selectedPatientAccess.canViewEhr ? "overview" : "medications";
    const activeStillAllowed = availableTabs.some((tab) => tab.id === activeTab);
    if (!activeStillAllowed) {
      setActiveTab(nextDefaultTab);
    }
  }, [activeTab, availableTabs, selectedPatientAccess]);

  useEffect(() => {
    if (selectedPatientId && selectedPatientAccess) {
      resetMedicationDraft();
      void loadWorkspace(selectedPatientId);
    }
  }, [selectedPatientAccess, selectedPatientId]);

  const handleToggleOrder = (order) => {
    setSelectedOrders((current) =>
      current.includes(order) ? current.filter((item) => item !== order) : [...current, order],
    );
  };

  const handleSaveConsultation = async () => {
    if (!selectedPatientId || !canViewEhr) {
      toast.warn("Bệnh nhân này chưa cấp quyền EHR.");
      return;
    }

    setSavingConsultation(true);
    try {
      await createDoctorPortalConsultation({
        patient_id: selectedPatientId,
        ghi_chu_lam_sang: clinicalNote,
        chan_doan: diagnosis,
        thuoc_ke_don: prescription,
        tinh_trang: condition,
        y_lenh: selectedOrders,
      });
      toast.success("Đã lưu ghi chú khám.");
      await loadWorkspace(selectedPatientId);
      setActiveTab("history");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Không thể lưu ghi chú khám.");
    } finally {
      setSavingConsultation(false);
    }
  };

  const handleMedicationDraftChange = (field, value) => {
    setMedicationDraft((current) => ({ ...current, [field]: value }));
  };

  const handleMedicationLineChange = (index, field, value) => {
    setMedicationDraft((current) => ({
      ...current,
      medications: current.medications.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const handleEditPlan = (plan) => {
    setActiveTab("medications");
    setMedicationDraft({
      plan_id: plan.plan_id,
      title: plan.title || `Kế hoạch thuốc #${plan.plan_id}`,
      start_date: plan.start_date ? new Date(plan.start_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      end_date: plan.end_date ? new Date(plan.end_date).toISOString().slice(0, 10) : "",
      notes: plan.notes || "",
      medications: (plan.medications?.length ? plan.medications : [{ name: "", dosage: "1 viên", times: ["08:00"] }]).map((medication) => ({
        name: medication.name || "",
        dosage: medication.dosage || "1 viên",
        timesText: (medication.times || ["08:00"]).join(", "),
      })),
    });
  };

  const buildMedicationPayload = () => ({
    user_id: selectedPatientId,
    title: medicationDraft.title.trim(),
    start_date: medicationDraft.start_date,
    end_date: medicationDraft.end_date || null,
    notes: medicationDraft.notes,
    medications: medicationDraft.medications
      .map((item) => ({
        name: item.name.trim(),
        dosage: item.dosage.trim() || "Theo chỉ định",
        times: item.timesText
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      }))
      .filter((item) => item.name && item.times.length),
  });

  const handleSaveMedicationPlan = async () => {
    if (!selectedPatientId || !canViewMedications) {
      toast.warn("Bệnh nhân này chưa cấp quyền thuốc.");
      return;
    }

    const payload = buildMedicationPayload();
    if (!payload.title || !payload.medications.length) {
      toast.warn("Vui lòng nhập tên đơn thuốc và ít nhất một thuốc có giờ uống.");
      return;
    }

    setSavingMedication(true);
    try {
      if (medicationDraft.plan_id) {
        await updateMedicationPlan(medicationDraft.plan_id, payload);
        toast.success("Đã cập nhật kế hoạch thuốc.");
      } else {
        await createMedicationPlan(payload);
        toast.success("Đã kê đơn thuốc cho bệnh nhân.");
      }
      resetMedicationDraft();
      await loadWorkspace(selectedPatientId);
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Không thể lưu kế hoạch thuốc.");
    } finally {
      setSavingMedication(false);
    }
  };

  const handleArchivePlan = async (planId) => {
    try {
      await archiveMedicationPlan(planId);
      toast.success("Đã ngưng kế hoạch thuốc.");
      await loadWorkspace(selectedPatientId);
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Không thể ngưng kế hoạch thuốc.");
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-[2rem] bg-white p-6 shadow-sm">
        <label className="mb-4 block text-lg font-black text-slate-800">
          Danh sách bệnh nhân ủy quyền ({patients.length})
        </label>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {patients.map((item) => {
            const isSelected = item.patientId === selectedPatientId;
            return (
              <div
                key={item.patientId}
                onClick={() => setSelectedPatientId(item.patientId)}
                className={`cursor-pointer flex flex-col gap-2 rounded-xl border p-4 transition-all ${isSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-slate-100 bg-slate-50 hover:border-primary/30"
                  }`}
              >
                <p className={`font-bold ${isSelected ? "text-primary" : "text-slate-800"}`}>
                  {item.patient?.name || "Bệnh nhân"}
                </p>
                <div className="flex flex-wrap gap-1">
                  {item.canViewEhr && (
                    <>
                      <span className="rounded-md bg-blue-100 px-2 py-1 text-[10px] font-bold text-blue-700">EHR</span>
                      <span className="rounded-md bg-rose-100 px-2 py-1 text-[10px] font-bold text-rose-700">ECG</span>
                    </>
                  )}
                  {item.canViewMedications && (
                    <span className="rounded-md bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700">Tủ thuốc</span>
                  )}
                </div>
              </div>
            );
          })}
          {!patients.length && !loadingPatients && (
            <p className="col-span-full text-sm text-slate-500">Không có bệnh nhân khả dụng</p>
          )}
        </div>
      </section>

      {selectedPatient && (
        <EmrPatientHeaderCard
          patient={selectedPatient}
          helperText="Bệnh án điện tử của bệnh nhân đang được chia sẻ cho bác sĩ."
          rightContent={
            <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
              <div className="rounded-xl bg-sky-50 px-4 py-3">
                <p className="text-lg font-black text-primary">{visits.length}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Lịch sử</p>
              </div>
              <div className="rounded-xl bg-emerald-50 px-4 py-3">
                <p className="text-lg font-black text-emerald-700">{documents.length}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Báo cáo</p>
              </div>
              <div className="rounded-xl bg-amber-50 px-4 py-3">
                <p className="text-lg font-black text-amber-700">{plans.length}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Đơn thuốc</p>
              </div>
              <div className="rounded-xl bg-slate-100 px-4 py-3">
                <p className="text-lg font-black text-slate-700">{logs.length}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Lịch hôm nay</p>
              </div>
            </div>
          }
        />
      )}

      {!!availableTabs.length && (
        <EmrSubnav tabs={availableTabs} activeTab={activeTab} onChange={setActiveTab} />
      )}

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-700">
          {error}
        </div>
      )}

      {loadingPatients || loadingWorkspace ? (
        <div className="rounded-2xl bg-white p-8 text-center text-sm font-bold text-slate-400 shadow-sm">
          Đang tải dữ liệu bệnh án điện tử...
        </div>
      ) : null}

      {!loadingPatients && !patients.length ? (
        <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-10 text-center text-sm font-bold text-slate-400 shadow-sm">
          Chưa có bệnh nhân nào cấp quyền EHR hoặc thuốc cho bạn.
        </div>
      ) : null}

      {!loadingWorkspace && selectedPatient && activeTab === "overview" && canViewEhr && (
        <EmrOverviewPanel overview={overview} patient={selectedPatient} />
      )}

      {!loadingWorkspace && selectedPatient && activeTab === "history" && canViewEhr && (
        <EmrVisitsPanel visits={visits} documents={documents} />
      )}

      {!loadingWorkspace && selectedPatient && activeTab === "medications" && canViewMedications && (
        <EmrMedicationsPanel
          plans={plans}
          logs={logs}
          allowPlanActions
          onEditPlan={handleEditPlan}
          onArchivePlan={handleArchivePlan}
          editor={
            <MedicationEditor
              draft={medicationDraft}
              onChange={handleMedicationDraftChange}
              onMedChange={handleMedicationLineChange}
              onAddMed={() =>
                setMedicationDraft((current) => ({
                  ...current,
                  medications: [...current.medications, { name: "", dosage: "1 viên", timesText: "08:00" }],
                }))
              }
              onReset={resetMedicationDraft}
              onSave={handleSaveMedicationPlan}
              saving={savingMedication}
              disabled={!canViewMedications}
            />
          }
        />
      )}

      {!loadingWorkspace && selectedPatient && activeTab === "consultation" && canViewEhr && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <section className="rounded-[2rem] bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-black text-slate-900">
                  <span className="material-symbols-outlined text-primary">clinical_notes</span>
                  Ghi chú khám
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Form được prefill từ lần khám gần nhất nếu có. Sau khi lưu, lịch sử khám và báo cáo sẽ được làm mới.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSaveConsultation}
                disabled={savingConsultation || !selectedPatientId}
                className="rounded-2xl bg-primary px-5 py-3 text-sm font-black text-white disabled:opacity-60"
              >
                {savingConsultation ? "Đang lưu..." : "Lưu hồ sơ"}
              </button>
            </div>

            <div className="space-y-4">
              <textarea
                value={clinicalNote}
                onChange={(event) => setClinicalNote(event.target.value)}
                className="min-h-56 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7"
                placeholder="Ghi chú lâm sàng / SOAP"
              />
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  value={diagnosis}
                  onChange={(event) => setDiagnosis(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  placeholder="Chẩn đoán"
                />
                <input
                  value={condition}
                  onChange={(event) => setCondition(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  placeholder="Tình trạng"
                />
              </div>
              <textarea
                value={prescription}
                onChange={(event) => setPrescription(event.target.value)}
                className="min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7"
                placeholder="- Omeprazole · 20mg · Sáng trước ăn"
              />
              <div>
                <p className="mb-3 text-sm font-black text-slate-800">Y lệnh / chỉ định</p>
                <div className="grid gap-3 md:grid-cols-2">
                  {ORDER_TEMPLATES.map((order) => {
                    const selected = selectedOrders.includes(order);
                    return (
                      <button
                        key={order}
                        type="button"
                        onClick={() => handleToggleOrder(order)}
                        className={[
                          "rounded-xl border px-4 py-3 text-left text-sm font-bold transition-colors",
                          selected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-slate-200 bg-white text-slate-700 hover:border-primary/40",
                        ].join(" ")}
                      >
                        {order}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <EmrHistoryPreviewPanel visits={visits} documents={documents} />
        </div>
      )}
    </div>
  );
}
