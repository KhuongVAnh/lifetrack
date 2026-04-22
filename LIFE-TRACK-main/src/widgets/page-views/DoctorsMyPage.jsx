import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  cancelDoctorHire,
  doctorProfiles,
  getMyDoctorHires,
  recommendedDoctorIds,
  updateDoctorHireAccess,
} from "@/features/doctors";
import { ImageWithFallback } from "@/shared/ui/ImageWithFallback";
import { RatingStars } from "@/shared/ui/RatingStars";

const DEFAULT_DOCTOR_AVATAR = "/assets/avatars/default/avatar-default.png";

const ACCESS_ITEMS = [
  {
    key: "can_view_ehr",
    label: "Hồ sơ bệnh nhân (EHR)",
    icon: "clinical_notes",
    description: "Xem thông tin sức khỏe chi tiết"
  },
  {
    key: "can_view_medications",
    label: "Lịch sử thuốc",
    icon: "medication",
    description: "Xem danh sách thuốc đang uống"
  },
  {
    key: "can_view_ecg",
    label: "Kết quả ECG",
    icon: "monitor_heart",
    description: "Xem biểu đồ tim"
  },
];

/**
 * Lấy tên bác sĩ từ dữ liệu thuê thật để hiển thị ở danh sách bác sĩ của tôi.
 */
function getDoctorName(hire) {
  // Ưu tiên tên user bác sĩ từ API, fallback về email nếu dữ liệu thiếu tên.
  return hire?.doctor?.name || hire?.doctor?.email || "Bác sĩ";
}

/**
 * Lấy trạng thái thuê ở dạng tiếng Việt cho badge trên card.
 */
function getHireStatusLabel(status) {
  // Dịch trạng thái backend thành nhãn ngắn, dễ đọc.
  switch (status) {
    case "ACTIVE":
      return "Đang thuê";
    case "PENDING_DOCTOR_APPROVAL":
      return "Chờ bác sĩ duyệt";
    case "REJECTED":
      return "Bị từ chối";
    case "CANCELLED":
      return "Đã hủy";
    case "EXPIRED":
      return "Hết hạn";
    default:
      return "Không rõ";
  }
}

/**
 * Trang bác sĩ của tôi: bác sĩ đã thuê lấy API thật, gợi ý chuyên gia dùng mock.
 */
export function DoctorsMyPage() {
  const [hires, setHires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionKey, setActionKey] = useState("");

  const activeOrPendingHires = useMemo(
    () => hires.filter((hire) => ["ACTIVE", "PENDING_DOCTOR_APPROVAL"].includes(hire.status)),
    [hires],
  );
  const recommendedDoctors = useMemo(
    () => recommendedDoctorIds.map((id) => doctorProfiles.find((doctor) => doctor.id === id)).filter(Boolean).slice(0, 3),
    [],
  );

  /**
   * Tải danh sách bác sĩ bệnh nhân đang thuê/chờ duyệt từ backend.
   */
  const loadHires = async () => {
    try {
      // Reset lỗi cũ để lần tải mới không giữ thông báo sai.
      setError("");
      setLoading(true);

      // API trả dữ liệu thật theo token bệnh nhân hiện tại.
      const data = await getMyDoctorHires();
      setHires(data);
    } catch (err) {
      // Hiển thị lỗi ngắn gọn nếu server chưa phản hồi.
      setError(err?.response?.data?.message || "Không thể tải bác sĩ của tôi.");
    } finally {
      // Tắt loading dù request thành công hay thất bại.
      setLoading(false);
    }
  };

  /**
   * Bật/tắt quyền xem hồ sơ thật cho bác sĩ đang thuê active.
   */
  const handleToggleAccess = async (hire, field) => {
    try {
      // Ghi actionKey để disable đúng nút đang gửi request.
      setActionKey(`${hire.hire_id}:${field}`);
      setError("");

      // Backend chỉ nhận field boolean cần đổi, các quyền khác giữ nguyên.
      const updated = await updateDoctorHireAccess(hire.hire_id, {
        [field]: !hire[field],
      });
      setHires((current) => current.map((item) => (item.hire_id === updated.hire_id ? updated : item)));
    } catch (err) {
      // Nếu quan hệ không active hoặc hết phiên, backend sẽ trả lỗi rõ ràng.
      setError(err?.response?.data?.message || "Không thể cập nhật quyền hồ sơ.");
    } finally {
      // Mở lại nút sau khi request kết thúc.
      setActionKey("");
    }
  };

  /**
   * Hủy yêu cầu thuê hoặc hủy bác sĩ đang thuê.
   */
  const handleCancelHire = async (hireId) => {
    try {
      // Disable nút hủy trên đúng card đang thao tác.
      setActionKey(`${hireId}:cancel`);
      setError("");

      // Backend chuyển status sang CANCELLED và tắt quyền xem.
      const updated = await cancelDoctorHire(hireId);
      setHires((current) => current.map((item) => (item.hire_id === updated.hire_id ? updated : item)));
    } catch (err) {
      // Hiển thị lỗi nếu quan hệ thuê không còn ở trạng thái có thể hủy.
      setError(err?.response?.data?.message || "Không thể hủy thuê bác sĩ.");
    } finally {
      // Reset trạng thái thao tác.
      setActionKey("");
    }
  };

  useEffect(() => {
    // Tải dữ liệu thật khi vào trang bác sĩ của tôi.
    loadHires();
  }, []);

  return (
    <div className="space-y-10">
      <section>
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-sky-900">Bác sĩ của bạn</h2>
            <p className="text-sm text-slate-500">Danh sách này lấy từ API quan hệ thuê thật.</p>
          </div>
          <Link className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white" to="/patient/doctors/hire">
            <span className="material-symbols-outlined text-base">person_add</span>
            Thuê thêm bác sĩ
          </Link>
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}

        {loading ? (
          <div className="rounded-xl bg-surface-container-low p-6 text-sm font-bold text-slate-500">Đang tải bác sĩ của bạn...</div>
        ) : activeOrPendingHires.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
            <p className="font-black text-slate-800">Bạn chưa thuê bác sĩ nào</p>
            <p className="mt-1 text-sm text-slate-500">Các bác sĩ gợi ý bên dưới hiện là dữ liệu mock giao diện.</p>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {activeOrPendingHires.map((hire) => (
              <HireCard
                key={hire.hire_id}
                actionKey={actionKey}
                hire={hire}
                onCancel={handleCancelHire}
                onToggleAccess={handleToggleAccess}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-8 flex items-center gap-4">
          <h2 className="text-2xl font-bold text-sky-900">Gợi ý chuyên gia phù hợp</h2>
          <div className="h-[2px] flex-1 bg-slate-100" />
        </div>
        <div className="space-y-6">
          {recommendedDoctors.map((doctor) => (
            <div key={doctor.id} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-5 md:flex-row">
                <ImageWithFallback alt={doctor.name} className="h-28 w-28 rounded-xl object-cover" src={doctor.avatar} />
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-black text-sky-900">{doctor.name}</h3>
                  <p className="mb-2 text-sm font-semibold text-slate-600">{doctor.title}</p>
                  <div className="mb-3 flex items-center gap-2">
                    <RatingStars rating={doctor.rating} />
                    <span className="text-sm font-bold">{doctor.rating}</span>
                  </div>
                  <p className="mb-4 line-clamp-2 text-sm text-slate-600">{doctor.about}</p>
                  <Link className="rounded-xl bg-primary px-5 py-2 text-sm font-bold text-white" to={`/patient/doctors/${doctor.id}`}>
                    Xem hồ sơ
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/**
 * Card bác sĩ đã thuê từ API thật, hồ sơ chi tiết hiện để trống vì chưa có database profile.
 */
function HireCard({ hire, actionKey, onToggleAccess, onCancel }) {
  const active = hire.status === "ACTIVE";
  const pending = hire.status === "PENDING_DOCTOR_APPROVAL";

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-5 flex gap-4">
        <ImageWithFallback alt={getDoctorName(hire)} className="h-20 w-20 shrink-0 rounded-xl object-cover" src={DEFAULT_DOCTOR_AVATAR} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="break-words font-black text-sky-900">{getDoctorName(hire)}</h3>
              <p className="text-xs font-semibold text-slate-500">Hồ sơ bác sĩ đang được cập nhật</p>
            </div>
            <span className={active ? "rounded bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase text-emerald-700" : "rounded bg-amber-50 px-2 py-1 text-[10px] font-black uppercase text-amber-700"}>
              {getHireStatusLabel(hire.status)}
            </span>
          </div>
        </div>
      </div>

      {active && (
        <>
          <div className="mb-5 border-t border-slate-100 pt-5">
            <h4 className="mb-3 text-sm font-bold text-slate-900">Quyền truy cập hồ sơ</h4>
            <div className="space-y-2">
              {ACCESS_ITEMS.map((item) => (
                <button
                  key={item.key}
                  className="group w-full rounded-lg border border-slate-200 bg-white p-3 text-left transition-all hover:border-primary hover:bg-primary/5"
                  disabled={actionKey === `${hire.hire_id}:${item.key}`}
                  onClick={() => onToggleAccess(hire, item.key)}
                  type="button"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex min-w-0 gap-3">
                      <span className={`mt-1 shrink-0 material-symbols-outlined text-lg ${hire[item.key] ? "text-emerald-600" : "text-slate-400"}`}>
                        {hire[item.key] ? "check_circle" : "circle"}
                      </span>
                      <div>
                        <p className={`text-sm font-bold ${hire[item.key] ? "text-slate-900" : "text-slate-700"}`}>
                          {item.label}
                        </p>
                        <p className="text-xs text-slate-500">{item.description}</p>
                      </div>
                    </div>
                    <div className={`mt-0.5 shrink-0 rounded-full px-2 py-1 text-xs font-bold ${hire[item.key] ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                      {hire[item.key] ? "Được phép" : "Không cho phép"}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="border-t border-slate-100 pt-4">
        <div className="flex flex-wrap gap-2">
          {active && (
            <>
              <Link className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white" to={`/patient/doctors/${hire.doctor_id}/consult`}>
                Nhắn tin
              </Link>
              <Link className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700" to="/patient/appointments">
                Đặt lịch
              </Link>
              <Link className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700" to={`/patient/doctors/${hire.doctor_id}`}>
                Hồ sơ
              </Link>
            </>
          )}
          {(active || pending) && (
            <button
              className="rounded-lg border border-red-100 px-4 py-2 text-xs font-bold text-red-600 disabled:opacity-50"
              disabled={actionKey === `${hire.hire_id}:cancel`}
              onClick={() => onCancel(hire.hire_id)}
              type="button"
            >
              {pending ? "Hủy yêu cầu" : "Hủy thuê"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
