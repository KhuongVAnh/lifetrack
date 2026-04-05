import { Link } from "react-router-dom";
import { doctorProfiles, hiredDoctorIds, recommendedDoctorIds } from "../data/mockData";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { RatingStars } from "../components/RatingStars";

export function DoctorsMyPage() {
  const hiredDoctors = hiredDoctorIds.map((id) => doctorProfiles.find((doctor) => doctor.id === id)).filter(Boolean);
  const recommendedDoctors = recommendedDoctorIds
    .map((id) => doctorProfiles.find((doctor) => doctor.id === id))
    .filter(Boolean)
    .slice(0, 3);

  return (
    <div className="space-y-12">
      <section>
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-sky-900">Bác sĩ của bạn</h2>
            <p className="text-sm text-slate-500">Danh sách các chuyên gia đang trực tiếp đồng hành cùng gia đình.</p>
          </div>
          <button className="flex items-center gap-1 text-sm font-bold text-primary hover:underline">
            Xem lịch sử thuê
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {hiredDoctors.map((doctor) => (
            <div key={doctor.id} className="flex items-start gap-5 rounded-2xl bg-surface-container-low p-6">
              <ImageWithFallback alt={doctor.name} className="h-20 w-20 rounded-xl object-cover shadow-md" src={doctor.avatar} />
              <div className="flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-sky-900">{doctor.name}</h3>
                    <p className="mb-3 text-xs font-medium text-slate-500">
                      {doctor.specialty} • {doctor.experienceYears} năm KN
                    </p>
                  </div>
                  <span className="rounded bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase text-green-700">
                    Đang thuê
                  </span>
                </div>
                <div className="flex gap-2">
                  <Link
                    className="flex-1 rounded-lg border border-outline-variant bg-white py-2.5 text-center text-xs font-bold text-slate-700 transition-all hover:bg-slate-50"
                    to={`/patient/doctors/${doctor.id}`}
                  >
                    Xem hồ sơ
                  </Link>
                  <button className="flex-1 rounded-lg bg-primary py-2.5 text-xs font-bold text-white transition-all hover:bg-sky-800">
                    Nhắn tin
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-8 flex items-center gap-4">
          <h2 className="text-2xl font-bold text-sky-900">Gợi ý chuyên gia phù hợp</h2>
          <div className="h-[2px] flex-1 bg-slate-100" />
        </div>
        <div className="space-y-6">
          {recommendedDoctors.map((doctor, index) => (
            <div
              key={doctor.id}
              className="group rounded-2xl border border-transparent bg-surface-container-lowest p-6 transition-all hover:border-sky-200 hover:shadow-lg"
            >
              <div className="flex flex-col gap-6 md:flex-row">
                <div className="relative">
                  <ImageWithFallback alt={doctor.name} className="h-32 w-32 rounded-xl object-cover shadow-lg md:h-40 md:w-40" src={doctor.avatar} />
                  {index === 0 && (
                    <div className="absolute -bottom-2 -right-2 rounded-full bg-white p-1 shadow-md">
                      <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                        verified
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <h3 className="text-xl font-bold text-sky-900 transition-colors group-hover:text-primary">{doctor.name}</h3>
                        {index === 0 && (
                          <span className="rounded bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-primary">TOP CHUYÊN GIA</span>
                        )}
                      </div>
                      <p className="mb-2 text-sm font-medium text-slate-600">{doctor.title}</p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">work</span>
                          {doctor.experienceYears} năm kinh nghiệm
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">location_on</span>
                          {doctor.hospital}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="mb-1 flex items-center gap-2">
                        <RatingStars rating={doctor.rating} />
                        <span className="text-sm font-bold text-slate-900">{doctor.rating}</span>
                      </div>
                      <p className="text-[10px] font-medium text-slate-400">{doctor.reviewCount} lượt đánh giá</p>
                    </div>
                  </div>
                  <p className="mb-4 line-clamp-2 text-sm text-slate-600">{doctor.about}</p>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex gap-2">
                      {doctor.verifiedItems.slice(0, 3).map((item) => (
                        <span key={item} className="rounded-lg bg-slate-50 p-1.5" title={item}>
                          <span className="material-symbols-outlined text-sm text-slate-400">verified</span>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-3">
                      <Link
                        className="rounded-xl px-6 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100"
                        to={`/patient/doctors/${doctor.id}`}
                      >
                        Xem hồ sơ
                      </Link>
                      <Link
                        className="rounded-xl bg-primary px-6 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-sky-800"
                        to={`/patient/doctors/${doctor.id}`}
                      >
                        Thuê bác sĩ
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
