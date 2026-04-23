import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { doctorPackages, getMyDoctorHires, getDoctorCatalog, requestDoctorHire } from "@/features/doctors";
import { ImageWithFallback } from "@/shared/ui/ImageWithFallback";
import { RatingStars } from "@/shared/ui/RatingStars";

/**
 * Trang thuê bác sĩ: phần đang thuê lấy API thật, phần gợi ý lấy từ catalog hệ thống.
 */
export function DoctorsHirePage() {
  const [hires, setHires] = useState([]);
  const [loadingHires, setLoadingHires] = useState(true);
  const [allDoctors, setAllDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [hiringDoctorId, setHiringDoctorId] = useState(null);

  const DOCTORS_PER_PAGE = 6;

  const activeOrPendingHires = useMemo(
    () => hires.filter((hire) => ["ACTIVE", "PENDING_DOCTOR_APPROVAL"].includes(hire.status)),
    [hires],
  );

  /**
   * Lấy danh sách chuyên khoa duy nhất từ các bác sĩ.
   */
  const specialties = useMemo(() => {
    const uniqueSpecialties = new Set();
    allDoctors.forEach((doctor) => {
      if (doctor.specialty) uniqueSpecialties.add(doctor.specialty);
    });
    return Array.from(uniqueSpecialties).sort();
  }, [allDoctors]);

  /**
   * Lọc bác sĩ theo chuyên khoa và tìm kiếm.
   */
  const filteredDoctors = useMemo(() => {
    let filtered = allDoctors;

    if (selectedSpecialty !== "all") {
      filtered = filtered.filter((doctor) => doctor.specialty === selectedSpecialty);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (doctor) =>
          doctor.name?.toLowerCase().includes(query) ||
          doctor.hospital?.toLowerCase().includes(query) ||
          doctor.specialty?.toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [allDoctors, selectedSpecialty, searchQuery]);

  /**
   * Phân trang bác sĩ đã lọc.
   */
  const paginatedDoctors = useMemo(() => {
    const startIndex = (currentPage - 1) * DOCTORS_PER_PAGE;
    return filteredDoctors.slice(startIndex, startIndex + DOCTORS_PER_PAGE);
  }, [filteredDoctors, currentPage]);

  const totalPages = Math.ceil(filteredDoctors.length / DOCTORS_PER_PAGE);

  /**
   * Tải danh sách bác sĩ thật đang thuê/chờ duyệt từ API.
   */
  const loadHires = async () => {
    try {
      setLoadingHires(true);
      const data = await getMyDoctorHires();
      setHires(data);
    } catch (_error) {
      setHires([]);
    } finally {
      setLoadingHires(false);
    }
  };

  /**
   * Tải danh sách tất cả bác sĩ từ hệ thống.
   */
  const loadAllDoctors = async () => {
    try {
      setLoadingDoctors(true);
      const data = await getDoctorCatalog();
      setAllDoctors(data);
      setCurrentPage(1);
    } catch (_error) {
      setAllDoctors([]);
    } finally {
      setLoadingDoctors(false);
    }
  };

  /**
   * Gửi yêu cầu thuê bác sĩ.
   */
  const handleHireDoctor = async (doctorId) => {
    try {
      setHiringDoctorId(doctorId);
      const hire = await requestDoctorHire(doctorId);
      // Cập nhật danh sách bác sĩ đang thuê
      setHires((current) => [...current, hire]);
    } catch (_error) {
      console.error("Không thể gửi yêu cầu thuê bác sĩ.");
    } finally {
      setHiringDoctorId(null);
    }
  };

  useEffect(() => {
    loadHires();
    loadAllDoctors();
  }, []);

  return (
    <div className="space-y-10">
      <section>
        <div className="mb-6">
          <h2 className="text-2xl font-extrabold tracking-tight text-primary">Gói Chăm Sóc Sức Khỏe</h2>
          <p className="mt-1 text-on-surface-variant">Lựa chọn gói chăm sóc và gửi yêu cầu thuê bác sĩ phù hợp</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {doctorPackages.map((pkg) => (
            <div
              key={pkg.id}
              className={[
                "flex flex-col rounded-xl p-6 transition-all hover:-translate-y-1 hover:shadow-xl",
                pkg.highlighted ? "bg-primary text-white shadow-primary-container/20 shadow-xl" : "bg-surface-container-low",
              ].join(" ")}
            >
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <span className={pkg.highlighted ? "text-xs font-bold uppercase text-primary-fixed-dim" : "text-xs font-bold uppercase text-slate-500"}>
                    {pkg.eyebrow}
                  </span>
                  <h3 className="mt-1 text-xl font-bold">{pkg.name}</h3>
                </div>
                <span className={`material-symbols-outlined text-3xl ${pkg.highlighted ? "text-secondary-fixed" : "text-primary"}`}>
                  {pkg.icon}
                </span>
              </div>
              <div className="mb-5">
                <span className="text-3xl font-black">{pkg.price}</span>
                <span className={pkg.highlighted ? "text-primary-fixed-dim" : "text-on-surface-variant"}>{pkg.period}</span>
              </div>
              <ul className="flex-grow space-y-3 text-sm">
                {pkg.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3">
                    <span className={`material-symbols-outlined text-lg ${pkg.highlighted ? "text-secondary-fixed" : "text-secondary"}`}>
                      check_circle
                    </span>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-primary">Bác sĩ đang thuê</h2>
            <p className="mt-1 text-on-surface-variant">Danh sách bác sĩ đang được quản lý; hồ sơ chi tiết đang được cập nhật.</p>
          </div>
          <Link className="text-sm font-bold text-primary hover:underline" to="/patient/doctors/my">
            Quản lý quyền hồ sơ
          </Link>
        </div>
        {loadingHires ? (
          <div className="rounded-xl bg-surface-container-low p-5 text-sm font-bold text-slate-500">Đang tải bác sĩ đang thuê...</div>
        ) : activeOrPendingHires.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-5 text-sm font-bold text-slate-500">
            Bạn chưa thuê bác sĩ nào từ hệ thống.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {activeOrPendingHires.map((hire) => (
              <RealHireCard key={hire.hire_id} hire={hire} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-8">
          <h2 className="text-2xl font-extrabold tracking-tight text-primary">Danh sách tất cả bác sĩ</h2>
          <p className="mt-1 text-on-surface-variant">Tìm kiếm và thuê bác sĩ phù hợp với nhu cầu của bạn.</p>
        </div>

        <div className="mb-6 space-y-4">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 transform text-slate-400 material-symbols-outlined">search</span>
            <input
              className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm placeholder-slate-400 focus:border-primary focus:outline-none"
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm kiếm bác sĩ theo tên, bệnh viện hoặc chuyên khoa..."
              type="text"
              value={searchQuery}
            />
          </div>

          {specialties.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${selectedSpecialty === "all" ? "bg-primary text-white" : "border border-slate-200 bg-white text-slate-700 hover:border-primary"}`}
                onClick={() => {
                  setSelectedSpecialty("all");
                  setCurrentPage(1);
                }}
              >
                Tất cả chuyên khoa
              </button>
              {specialties.map((specialty) => (
                <button
                  key={specialty}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${selectedSpecialty === specialty ? "bg-primary text-white" : "border border-slate-200 bg-white text-slate-700 hover:border-primary"}`}
                  onClick={() => {
                    setSelectedSpecialty(specialty);
                    setCurrentPage(1);
                  }}
                >
                  {specialty}
                </button>
              ))}
            </div>
          )}
        </div>

        {loadingDoctors ? (
          <div className="rounded-xl bg-surface-container-low p-5 text-sm font-bold text-slate-500">Đang tải danh sách bác sĩ...</div>
        ) : filteredDoctors.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
            <p className="font-black text-slate-800">Không tìm thấy bác sĩ</p>
            <p className="mt-1 text-sm text-slate-500">Vui lòng thử tìm kiếm với từ khóa khác hoặc chọn chuyên khoa khác.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {paginatedDoctors.map((doctor) => {
                const hireStatus = doctor.viewerState?.hire_status || null;
                const isAlreadyHired =
                  activeOrPendingHires.some((hire) => hire.doctor_id === doctor.user_id) ||
                  ["ACTIVE", "PENDING_DOCTOR_APPROVAL"].includes(hireStatus);
                return (
                  <CatalogDoctorCard
                    key={doctor.user_id}
                    doctor={doctor}
                    isAlreadyHired={isAlreadyHired}
                    hireStatus={hireStatus}
                    isLoading={hiringDoctorId === doctor.user_id}
                    onHire={() => handleHireDoctor(doctor.user_id)}
                  />
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  ← Trước
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      className={`rounded-lg px-3 py-2 text-sm font-bold ${currentPage === page ? "bg-primary text-white" : "border border-slate-200 bg-white text-slate-700 hover:border-primary"}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  Sau →
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

/**
 * Card bác sĩ đã thuê thật, chưa có hồ sơ profile nên chỉ hiển thị thông tin user cơ bản.
 */
function RealHireCard({ hire }) {
  const active = hire.status === "ACTIVE";
  const profile = hire.doctor?.profile || null;
  const doctorName = hire.doctor?.name || "Bác sĩ";
  const doctorTitle = profile?.title || profile?.specialty || "Hồ sơ bác sĩ đang được cập nhật";
  const doctorAvatar = profile?.avatar_url || "/assets/avatars/default/avatar-default.png";

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex gap-4">
        <ImageWithFallback alt={doctorName} className="h-20 w-20 shrink-0 rounded-xl object-cover" src={doctorAvatar} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="break-words font-black text-sky-900">{doctorName}</h3>
              <p className="text-xs font-semibold text-slate-500">{doctorTitle}</p>
            </div>
            <span className={active ? "rounded bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase text-emerald-700" : "rounded bg-amber-50 px-2 py-1 text-[10px] font-black uppercase text-amber-700"}>
              {active ? "Đang thuê" : "Chờ bác sĩ duyệt"}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {active && (
              <Link className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white" to={`/patient/doctors/${hire.doctor_id}/consult`}>
                Nhắn tin
              </Link>
            )}
            <Link className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700" to={`/patient/doctors/${hire.doctor_id}`}>
              Hồ sơ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Card bác sĩ từ catalog hệ thống với thông tin chi tiết và nút thuê.
 */
function CatalogDoctorCard({ doctor, isAlreadyHired, hireStatus, isLoading, onHire }) {
  const isPending = hireStatus === "PENDING_DOCTOR_APPROVAL";

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:border-primary hover:shadow-md">
      <div className="mb-4">
        <ImageWithFallback
          alt={doctor.name}
          className="mb-4 h-40 w-full rounded-lg object-cover"
          src={doctor.avatar || "/assets/avatars/default/avatar-default.png"}
        />
        <h3 className="mb-1 break-words text-lg font-black text-sky-900">{doctor.name}</h3>
        <p className="mb-2 text-sm font-semibold text-slate-600">{doctor.title || "Bác sĩ"}</p>

        {doctor.specialty && (
          <p className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
            <span className="material-symbols-outlined text-sm">medical_services</span>
            {doctor.specialty}
          </p>
        )}

        {doctor.hospital && (
          <p className="mb-3 text-xs font-semibold text-slate-500">
            <span className="material-symbols-outlined text-sm align-middle">apartment</span> {doctor.hospital}
          </p>
        )}

        {doctor.reviewCount > 0 && (
          <div className="mb-3 flex items-center gap-2">
            <RatingStars rating={doctor.rating} />
            <span className="text-xs font-bold text-slate-600">
              {doctor.rating.toFixed(1)} • {doctor.reviewCount} đánh giá
            </span>
          </div>
        )}

        {doctor.bio && <p className="mb-3 line-clamp-2 text-xs text-slate-600">{doctor.bio}</p>}
        {doctor.experienceYears ? (
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
            {doctor.experienceYears}+ năm kinh nghiệm
          </p>
        ) : null}
      </div>

      <div className="flex gap-2 border-t border-slate-100 pt-4">
        <Link className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-center text-xs font-bold text-slate-700 hover:bg-slate-50" to={`/patient/doctors/${doctor.user_id}`}>
          Hồ sơ
        </Link>
        {!isAlreadyHired ? (
          <button
            className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
            disabled={isLoading}
            onClick={onHire}
            type="button"
          >
            {isLoading ? "Đang gửi..." : "Thuê"}
          </button>
        ) : (
          <button
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold ${isPending ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}
            disabled
            type="button"
          >
            {isPending ? "Đã gửi yêu cầu" : "Đã thuê"}
          </button>
        )}
      </div>
    </div>
  );
}
