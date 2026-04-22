import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth";
import { httpClient } from "@/shared/api";

const ACCESS_ITEMS = [
  { key: "can_view_ehr", label: "EHR", icon: "clinical_notes" },
  { key: "can_view_medications", label: "Tủ thuốc", icon: "medication" },
  { key: "can_view_ecg", label: "ECG", icon: "monitor_heart" },
];

/**
 * Lấy nhãn quyền xem hồ sơ để hiển thị trạng thái khóa/mở cho bác sĩ.
 */
function getAccessSummary(hire) {
  // Đếm số nhóm dữ liệu bệnh nhân đã bật cho bác sĩ.
  const enabledCount = ACCESS_ITEMS.filter((item) => hire[item.key]).length;

  // Trả về mô tả ngắn để card bệnh nhân dễ quét.
  return enabledCount === ACCESS_ITEMS.length ? "Đã mở toàn bộ hồ sơ" : `${enabledCount}/${ACCESS_ITEMS.length} nhóm hồ sơ được mở`;
}

/**
 * Trang danh sách bệnh nhân mà bác sĩ đang được thuê active.
 */
export function DoctorPatientsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [hires, setHires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const unlockedCount = useMemo(
    () => hires.filter((hire) => hire.can_view_ehr || hire.can_view_medications || hire.can_view_ecg).length,
    [hires],
  );

  /**
   * Tải danh sách bệnh nhân active theo hợp đồng thuê bác sĩ.
   */
  const loadPatients = async () => {
    if (!user?.user_id) return;

    try {
      // Xóa lỗi cũ trước khi tải dữ liệu mới.
      setError("");
      setLoading(true);

      // Backend trả doctor_hires active thay cho access_permissions legacy.
      const { data } = await httpClient.get(`/doctor/patients/${user.user_id}`);
      setHires(Array.isArray(data) ? data : []);
    } catch (err) {
      // Lưu lỗi để bác sĩ biết danh sách chưa tải được.
      setError(err?.response?.data?.message || "Không thể tải danh sách bệnh nhân.");
    } finally {
      // Tắt loading khi request kết thúc.
      setLoading(false);
    }
  };

  useEffect(() => {
    // Tải lại khi có user từ AuthProvider.
    loadPatients();
  }, [user?.user_id]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-8">
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black text-primary">Hồ sơ bệnh nhân đang thuê</h1>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Danh sách này lấy từ hợp đồng thuê active; quyền xem hồ sơ do bệnh nhân bật từng mục.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-xl bg-sky-50 px-5 py-3">
              <p className="text-2xl font-black text-primary">{hires.length}</p>
              <p className="text-[10px] font-black uppercase text-slate-500">Đang thuê</p>
            </div>
            <div className="rounded-xl bg-emerald-50 px-5 py-3">
              <p className="text-2xl font-black text-emerald-700">{unlockedCount}</p>
              <p className="text-[10px] font-black uppercase text-slate-500">Có quyền hồ sơ</p>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl bg-surface-container-low p-6 text-sm font-bold text-slate-500">Đang tải bệnh nhân...</div>
      ) : hires.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <p className="font-black text-slate-800">Chưa có bệnh nhân thuê active</p>
          <p className="mt-1 text-sm text-slate-500">Khi bạn duyệt yêu cầu thuê, bệnh nhân sẽ xuất hiện tại đây.</p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {hires.map((hire) => (
            <PatientHireCard key={hire.hire_id} hire={hire} navigate={navigate} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Card hiển thị một bệnh nhân và các nhóm hồ sơ đang được mở cho bác sĩ.
 */
function PatientHireCard({ hire, navigate }) {
  const patient = hire.patient || {};
  const canOpenAnyRecord = hire.can_view_ehr || hire.can_view_medications || hire.can_view_ecg;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-sky-900">{patient.name || "Bệnh nhân"}</h2>
          <p className="text-sm font-semibold text-slate-500">{patient.email}</p>
          <p className="mt-2 text-xs font-bold text-secondary">{getAccessSummary(hire)}</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase text-emerald-700">
          Active
        </span>
      </div>

      <div className="mb-5 grid gap-2 sm:grid-cols-3">
        {ACCESS_ITEMS.map((item) => (
          <div
            key={item.key}
            className={hire[item.key] ? "rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-700" : "rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-400"}
          >
            <span className="material-symbols-outlined text-base">{item.icon}</span>
            <p className="mt-1 text-xs font-black">{item.label}</p>
            <p className="text-[10px] font-bold">{hire[item.key] ? "Được xem" : "Đang khóa"}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:bg-slate-300"
          disabled={!canOpenAnyRecord}
          onClick={() => navigate("/doctor/live")}
          type="button"
        >
          Xem dữ liệu
        </button>
        <button
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700"
          onClick={() => navigate("/doctor/messages")}
          type="button"
        >
          Nhắn tin
        </button>
      </div>
    </div>
  );
}
