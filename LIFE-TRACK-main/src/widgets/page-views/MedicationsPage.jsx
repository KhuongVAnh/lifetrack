import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
  archiveMedicationPlan,
  getMedicationPlans,
  getMedicationLogs,
  createMedicationPlan,
  markMedicationTaken,
  skipMedicationLog,
} from "@/features/medications/api/medicationsApi";
import { useAuth } from "@/app/providers/AuthProvider";

// ─── Sub-components ─────────────────────────────────────────────────────────

/** Hiển thị badge trạng thái của một lượt nhắc thuốc */
function StatusBadge({ status }) {
  const map = {
    TAKEN:   { label: "Đã uống",  cls: "bg-emerald-100 text-emerald-700" },
    MISSED:  { label: "Bỏ lỡ",   cls: "bg-rose-100 text-rose-700" },
    SKIPPED: { label: "Bỏ qua",  cls: "bg-slate-100 text-slate-500" },
    PENDING: { label: "Chờ uống", cls: "bg-amber-100 text-amber-700" },
  };
  const { label, cls } = map[status] ?? map.PENDING;
  return <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${cls}`}>{label}</span>;
}

/** Card hiển thị một lượt nhắc thuốc trong ngày, có nút "Đã uống" */
function TodayMedCard({ log, onTake, onSkip }) {
  const [loading, setLoading] = useState(false);
  const [skipping, setSkipping] = useState(false);

  /** Gọi API xác nhận đã uống thuốc, hiển thị loading trong khi chờ */
  const handleTake = async () => {
    setLoading(true);
    try {
      await onTake(log.log_id);
    } finally {
      setLoading(false);
    }
  };

  /** Gọi API bỏ qua lượt uống thuốc và hiển thị loading riêng cho nút bỏ qua */
  const handleSkip = async () => {
    setSkipping(true);
    try {
      await onSkip(log.log_id);
    } finally {
      setSkipping(false);
    }
  };

  // Định dạng giờ từ ISO string
  const time = new Date(log.scheduled_time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className={`flex flex-col gap-3 rounded-2xl border p-4 transition-all sm:flex-row sm:items-center ${log.status === "TAKEN" ? "border-emerald-100 bg-emerald-50/50 opacity-70" : "border-slate-100 bg-white shadow-sm hover:shadow-md"}`}>
      {/* Cụm thông tin chính dùng flex-1 và break-words để tên thuốc dài không bị nút hành động che. */}
      <div className="flex min-w-0 flex-1 items-start gap-4">
        {/* Icon thuốc */}
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${log.status === "TAKEN" ? "bg-emerald-100" : "bg-amber-50"}`}>
          <span className={`material-symbols-outlined ${log.status === "TAKEN" ? "text-emerald-600" : "text-amber-500"}`}>
            {log.status === "TAKEN" ? "check_circle" : "medication"}
          </span>
        </div>

        {/* Thông tin thuốc */}
        <div className="min-w-0 flex-1">
          <p className="break-words font-bold leading-5 text-slate-800">{log.medication?.name ?? "Thuốc"}</p>
          <p className="mt-0.5 break-words text-xs text-slate-400">{log.medication?.dosage} • {time}</p>
        </div>
      </div>

      {/* Trạng thái / Nút hành động */}
      {log.status === "PENDING" ? (
        <div className="flex shrink-0 justify-end gap-2 sm:justify-start">
          <button
            onClick={handleSkip}
            disabled={skipping || loading}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            {skipping ? "..." : "Bỏ qua"}
          </button>
          <button
            onClick={handleTake}
            disabled={loading || skipping}
            className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-sky-800 transition-colors disabled:opacity-50"
          >
            {loading ? "..." : "Đã uống"}
          </button>
        </div>
      ) : (
        <div className="flex justify-end sm:justify-start">
          <StatusBadge status={log.status} />
        </div>
      )}
    </div>
  );
}

/** Card hiển thị một đơn thuốc trong tủ thuốc cá nhân */
function PlanCard({ plan, onArchive }) {
  const isActive = plan.is_active;
  return (
    <div className={`rounded-2xl border p-5 transition-all ${isActive ? "border-emerald-200 bg-white shadow-sm" : "border-slate-100 bg-slate-50 opacity-60"}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-black text-slate-800 leading-tight">{plan.title}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {new Date(plan.start_date).toLocaleDateString("vi-VN")}
            {plan.end_date ? ` → ${new Date(plan.end_date).toLocaleDateString("vi-VN")}` : " (Không thời hạn)"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>
            {isActive ? "Đang dùng" : "Đã hết"}
          </span>
          {isActive && (
            <button
              type="button"
              onClick={() => onArchive(plan.plan_id)}
              className="rounded-lg border border-rose-100 px-2 py-1 text-[10px] font-black text-rose-500 hover:bg-rose-50"
            >
              Ngưng
            </button>
          )}
        </div>
      </div>

      {/* Danh sách các loại thuốc trong đơn */}
      <div className="space-y-2">
        {(plan.medications ?? []).map((med) => (
          <div key={med.medication_id} className="flex flex-col gap-2 rounded-xl bg-slate-50 px-3 py-2 sm:flex-row sm:items-center">
            {/* Tên thuốc và liều dùng được phép xuống dòng để không bị dãy giờ uống lấn lên. */}
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span className="material-symbols-outlined text-emerald-500 text-[18px]">medication_liquid</span>
              <div className="min-w-0 flex-1">
                <span className="break-words text-xs font-bold text-slate-700">{med.name}</span>
                <span className="break-words text-xs text-slate-400"> · {med.dosage}</span>
              </div>
            </div>
            {/* Hiển thị các giờ uống */}
            <div className="flex shrink-0 flex-wrap gap-1 sm:justify-end">
              {(med.times ?? []).map((t) => (
                <span key={t} className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">{t}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Modal thêm đơn thuốc mới — dạng glassmorphism overlay */
function AddMedicationModal({ onClose, onSave }) {
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  // Danh sách thuốc: [{name, dosage, times: [...]}]
  const [meds, setMeds] = useState([{ name: "", dosage: "1 viên", times: ["08:00"] }]);
  const [saving, setSaving] = useState(false);

  /** Thêm một dòng thuốc mới vào danh sách */
  const addMedRow = () => setMeds((p) => [...p, { name: "", dosage: "1 viên", times: ["08:00"] }]);

  /** Cập nhật một field của một dòng thuốc theo index */
  const updateMed = (idx, field, value) =>
    setMeds((p) => p.map((m, i) => (i === idx ? { ...m, [field]: value } : m)));

  /** Thêm khung giờ uống cho một loại thuốc */
  const addTime = (idx) =>
    setMeds((p) => p.map((m, i) => (i === idx ? { ...m, times: [...m.times, "12:00"] } : m)));

  /** Cập nhật một giờ uống cụ thể */
  const updateTime = (idx, tIdx, val) =>
    setMeds((p) => p.map((m, i) => i !== idx ? m : { ...m, times: m.times.map((t, j) => j === tIdx ? val : t) }));

  /** Submit form: validate → gọi onSave (sẽ gọi API bên ngoài) */
  const handleSubmit = async () => {
    if (!title.trim() || meds.some((m) => !m.name.trim())) {
      toast.warning("Vui lòng điền đầy đủ tên đơn thuốc và tên từng loại thuốc.");
      return;
    }
    setSaving(true);
    try {
      await onSave({ title, start_date: startDate, end_date: endDate || null, notes, medications: meds });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    // Overlay mờ phía sau modal
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header của modal */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 pt-6 pb-8 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-200">Tủ thuốc cá nhân</p>
              <h3 className="text-xl font-black mt-1">Thêm đơn thuốc mới</h3>
            </div>
            <button onClick={onClose} className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
              <span className="material-symbols-outlined text-white text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Body có thể scroll */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5 -mt-4 bg-white rounded-t-3xl">
          {/* Tên đơn thuốc */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Tên đơn thuốc *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="vd: Đơn trị viêm họng" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none" />
          </div>

          {/* Ngày bắt đầu & kết thúc */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Bắt đầu *</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-emerald-400" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Kết thúc</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-emerald-400" />
            </div>
          </div>

          {/* Danh sách thuốc */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Các loại thuốc *</label>
              <button onClick={addMedRow} className="text-[10px] font-bold text-emerald-600 hover:underline flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">add</span> Thêm thuốc
              </button>
            </div>
            <div className="space-y-3">
              {meds.map((med, idx) => (
                <div key={idx} className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input value={med.name} onChange={(e) => updateMed(idx, "name", e.target.value)} placeholder="Tên thuốc *" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-400" />
                    <input value={med.dosage} onChange={(e) => updateMed(idx, "dosage", e.target.value)} placeholder="Liều lượng" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-400" />
                  </div>
                  {/* Các khung giờ uống */}
                  <div className="flex flex-wrap gap-2 items-center">
                    {med.times.map((t, tIdx) => (
                      <input key={tIdx} type="time" value={t} onChange={(e) => updateTime(idx, tIdx, e.target.value)} className="rounded-lg border border-emerald-200 bg-white px-2 py-1 text-xs font-bold text-emerald-700 outline-none" />
                    ))}
                    <button onClick={() => addTime(idx)} className="text-emerald-500 hover:text-emerald-700 text-[11px] font-bold flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[14px]">add_circle</span> Giờ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ghi chú */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Ghi chú</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Lưu ý đặc biệt của bác sĩ..." className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-emerald-400 resize-none" />
          </div>
        </div>

        {/* Footer với nút lưu */}
        <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">Hủy</button>
          <button onClick={handleSubmit} disabled={saving} className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-lg hover:bg-emerald-700 transition-colors disabled:opacity-50">
            {saving ? "Đang lưu..." : "Lưu đơn thuốc"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

/**
 * Trang quản lý tủ thuốc cá nhân và lịch uống thuốc trong ngày.
 * Cho phép bệnh nhân xem, thêm đơn thuốc và xác nhận đã uống.
 */
export function MedicationsPage() {
  const { socket } = useAuth();
  const [plans, setPlans] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState("today"); // "today" | "plans"

  /** Tải dữ liệu đơn thuốc và lịch sử uống thuốc từ API */
  const fetchData = async () => {
    try {
      // Gọi song song hai API để tối ưu thời gian tải
      const from = new Date();
      const to = new Date();
      to.setDate(to.getDate() + 7);
      const [plansData, logsData] = await Promise.all([
        getMedicationPlans(),
        getMedicationLogs({ from: from.toISOString(), to: to.toISOString() }),
      ]);
      setPlans(plansData);
      setLogs(logsData);
    } catch {
      toast.error("Không thể tải thông tin thuốc.");
    } finally {
      setLoading(false);
    }
  };

  // Tải dữ liệu khi component mount
  useEffect(() => { fetchData(); }, []);

  /** Lắng nghe notification realtime để làm mới lịch uống thuốc khi cron gửi nhắc */
  useEffect(() => {
    if (!socket) return undefined;

    // Khi backend emit notification nhắc thuốc, tải lại logs để trạng thái mới nhất hiển thị ngay.
    const handleNotification = (notification) => {
      if (notification?.type === "MEDICATION_REMINDER") {
        fetchData();
      }
    };

    socket.on("notification:new", handleNotification);

    // Cleanup listener khi rời trang hoặc socket thay đổi.
    return () => socket.off("notification:new", handleNotification);
  }, [socket]);

  /** Xác nhận đã uống một lượt nhắc thuốc → cập nhật lại danh sách logs */
  const handleMarkTaken = async (logId) => {
    try {
      await markMedicationTaken(logId);
      // Cập nhật state local tránh fetch lại toàn bộ
      setLogs((prev) => prev.map((l) => l.log_id === logId ? { ...l, status: "TAKEN", taken_at: new Date().toISOString() } : l));
      toast.success("Đã xác nhận uống thuốc!");
    } catch {
      toast.error("Không thể xác nhận. Vui lòng thử lại.");
    }
  };

  /** Bỏ qua một lượt uống thuốc → cập nhật state local theo trạng thái SKIPPED */
  const handleSkipLog = async (logId) => {
    try {
      await skipMedicationLog(logId);
      // Cập nhật local để UI phản hồi ngay, không cần fetch toàn bộ.
      setLogs((prev) => prev.map((l) => l.log_id === logId ? { ...l, status: "SKIPPED" } : l));
      toast.info("Đã bỏ qua lượt uống thuốc.");
    } catch {
      toast.error("Không thể bỏ qua lượt uống thuốc.");
    }
  };

  /** Tạo đơn thuốc mới → tải lại danh sách sau khi lưu */
  const handleCreatePlan = async (payload) => {
    try {
      await createMedicationPlan(payload);
      toast.success("Đã thêm đơn thuốc mới!");
      // Reload để lấy dữ liệu mới nhất từ server
      await fetchData();
    } catch {
      toast.error("Không thể thêm đơn thuốc. Vui lòng thử lại.");
      throw new Error("save failed"); // Ném lỗi để modal biết không đóng
    }
  };

  /** Ngưng một đơn thuốc đang hoạt động và tải lại dữ liệu */
  const handleArchivePlan = async (planId) => {
    try {
      await archiveMedicationPlan(planId);
      // Cập nhật plan trong state để badge chuyển sang đã hết ngay.
      setPlans((prev) => prev.map((plan) => plan.plan_id === planId ? { ...plan, is_active: false } : plan));
      toast.success("Đã ngưng đơn thuốc.");
    } catch {
      toast.error("Không thể ngưng đơn thuốc.");
    }
  };

  // Lọc log của hôm nay
  const todayStr = new Date().toDateString();
  const todayLogs = logs.filter((l) => new Date(l.scheduled_time).toDateString() === todayStr);
  const pendingCount = todayLogs.filter((l) => l.status === "PENDING").length;
  const activePlans = plans.filter((p) => p.is_active);

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-10">
      {/* Modal thêm thuốc */}
      {showModal && <AddMedicationModal onClose={() => setShowModal(false)} onSave={handleCreatePlan} />}

      {/* ── HEADER ── */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-500 p-8 text-white shadow-xl shadow-emerald-200">
        {/* Trang trí nền */}
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/5" />
        <div className="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-teal-400/20" />

        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-200">Sức khoẻ mỗi ngày</p>
            <h1 className="mt-2 text-3xl font-black leading-tight">Tủ thuốc cá nhân</h1>
            <p className="mt-2 text-sm text-emerald-100">
              {pendingCount > 0 ? `Bạn có ${pendingCount} lượt uống thuốc đang chờ hôm nay.` : "Tuyệt vời! Bạn đã uống đủ thuốc hôm nay."}
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3 font-black text-emerald-700 shadow-lg hover:scale-[1.03] transition-transform text-sm shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Thêm đơn
          </button>
        </div>

        {/* Stats bar */}
        <div className="relative z-10 mt-6 flex gap-6">
          <div className="text-center">
            <p className="text-2xl font-black">{activePlans.length}</p>
            <p className="text-[10px] text-emerald-200 font-bold uppercase tracking-widest">Đơn đang dùng</p>
          </div>
          <div className="w-px bg-white/20" />
          <div className="text-center">
            <p className="text-2xl font-black">{todayLogs.filter((l) => l.status === "TAKEN").length}/{todayLogs.length}</p>
            <p className="text-[10px] text-emerald-200 font-bold uppercase tracking-widest">Hôm nay</p>
          </div>
          <div className="w-px bg-white/20" />
          <div className="text-center">
            <p className="text-2xl font-black">{pendingCount}</p>
            <p className="text-[10px] text-emerald-200 font-bold uppercase tracking-widest">Đang chờ</p>
          </div>
        </div>
      </div>

      {/* ── TAB SWITCHER ── */}
      <div className="flex rounded-2xl bg-slate-100 p-1">
        {[{ id: "today", label: "Lịch hôm nay", icon: "today" }, { id: "plans", label: "Tủ thuốc", icon: "medication" }].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all ${activeTab === tab.id ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {tab.label}
            {tab.id === "today" && pendingCount > 0 && (
              <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── CONTENT ── */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 font-medium animate-pulse">Đang tải thông tin thuốc...</div>
      ) : activeTab === "today" ? (
        // Tab lịch hôm nay
        <div className="space-y-4">
          {todayLogs.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
              <span className="material-symbols-outlined text-5xl text-slate-300">medication</span>
              <p className="mt-3 font-bold text-slate-400">Không có lịch uống thuốc nào hôm nay.</p>
              <p className="text-sm text-slate-300">Nhắc nhở sẽ xuất hiện ở đây khi hệ thống quét lịch.</p>
            </div>
          ) : (
            todayLogs.map((log) => <TodayMedCard key={log.log_id} log={log} onTake={handleMarkTaken} onSkip={handleSkipLog} />)
          )}
        </div>
      ) : (
        // Tab tủ thuốc
        <div className="space-y-4">
          {plans.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
              <span className="material-symbols-outlined text-5xl text-slate-300">medication</span>
              <p className="mt-3 font-bold text-slate-400">Tủ thuốc đang trống.</p>
              <button onClick={() => setShowModal(true)} className="mt-4 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition-colors">
                Thêm đơn thuốc đầu tiên
              </button>
            </div>
          ) : (
            plans.map((plan) => <PlanCard key={plan.plan_id} plan={plan} onArchive={handleArchivePlan} />)
          )}
        </div>
      )}
    </div>
  );
}
