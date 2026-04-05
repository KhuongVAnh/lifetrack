import { Link } from "react-router-dom";
import { doctorPackages, doctorProfiles, hiredDoctorIds, recommendedDoctorIds } from "../data/mockData";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { RatingStars } from "../components/RatingStars";

export function DoctorsHirePage() {
  const hiredDoctors = hiredDoctorIds.map((id) => doctorProfiles.find((doctor) => doctor.id === id)).filter(Boolean);
  const recommendedDoctors = recommendedDoctorIds.map((id) => doctorProfiles.find((doctor) => doctor.id === id)).filter(Boolean);

  return (
    <div className="space-y-12">
      <section>
        <div className="mb-6">
          <h2 className="text-2xl font-extrabold tracking-tight text-primary">Gói Chăm Sóc Sức Khỏe</h2>
          <p className="mt-1 text-on-surface-variant">Lựa chọn giải pháp tối ưu cho sự an tâm tuyệt đối của bạn.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {doctorPackages.map((pkg) => (
            <div
              key={pkg.id}
              className={[
                "flex flex-col rounded-xl p-8 transition-all hover:-translate-y-1 hover:shadow-xl",
                pkg.highlighted ? "bg-primary text-white shadow-primary-container/20 shadow-xl" : "bg-surface-container-low",
              ].join(" ")}
            >
              {pkg.badge && (
                <div className="mb-4 text-right">
                  <span className="rounded-full bg-secondary-container px-3 py-1 text-[10px] font-black uppercase text-on-secondary-container">
                    {pkg.badge}
                  </span>
                </div>
              )}
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <span className={pkg.highlighted ? "text-xs font-bold uppercase tracking-widest text-primary-fixed-dim" : "text-xs font-bold uppercase tracking-widest text-slate-500"}>
                    {pkg.eyebrow}
                  </span>
                  <h3 className="mt-1 text-2xl font-bold">{pkg.name}</h3>
                </div>
                <span className={`material-symbols-outlined text-3xl ${pkg.highlighted ? "text-secondary-fixed" : "text-primary"}`}>
                  {pkg.icon}
                </span>
              </div>
              <div className="mb-8">
                <span className="text-4xl font-black">{pkg.price}</span>
                <span className={pkg.highlighted ? "text-primary-fixed-dim" : "text-on-surface-variant"}>{pkg.period}</span>
              </div>
              <ul className="mb-8 flex-grow space-y-4 text-sm">
                {pkg.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3">
                    <span className={`material-symbols-outlined text-lg ${pkg.highlighted ? "text-secondary-fixed" : "text-secondary"}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                      check_circle
                    </span>
                    {benefit}
                  </li>
                ))}
              </ul>
              <button
                className={[
                  "w-full rounded-lg py-3 font-bold transition-all",
                  pkg.highlighted ? "bg-white text-primary hover:bg-slate-100" : "border-2 border-primary text-primary hover:bg-primary hover:text-white",
                ].join(" ")}
              >
                {pkg.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-primary">Bác sĩ đang thuê</h2>
            <p className="mt-1 text-on-surface-variant">Đội ngũ y tế trực tiếp chăm sóc bạn.</p>
          </div>
          <button className="flex items-center gap-1 text-sm font-bold text-primary hover:underline">
            Xem lịch trình
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
        <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-sm">
          <div className="space-y-4">
            {hiredDoctors.map((doctor) => (
              <div key={doctor.id} className="flex flex-col gap-4 rounded-2xl bg-surface-container-low p-4 md:flex-row md:items-center">
                <ImageWithFallback alt={doctor.name} className="h-24 w-24 rounded-2xl object-cover shadow-md" src={doctor.avatar} />
                <div className="flex-grow">
                  <div className="mb-1 flex flex-col gap-2 md:flex-row md:items-center">
                    <h3 className="text-xl font-bold text-on-surface">{doctor.name}</h3>
                    <span className="rounded bg-secondary-container px-2 py-0.5 text-[10px] font-bold uppercase text-on-secondary-container">
                      Đang đồng hành
                    </span>
                  </div>
                  <p className="text-sm text-on-surface-variant">{doctor.title}</p>
                  <p className="mt-1 text-sm text-on-surface-variant">{doctor.location}</p>
                </div>
                <div className="flex gap-3">
                  <Link
                    className="rounded-xl bg-white px-6 py-2 font-bold text-primary shadow-sm transition-all hover:bg-sky-50"
                    to={`/patient/doctors/${doctor.id}`}
                  >
                    Xem hồ sơ
                  </Link>
                  <button className="rounded-xl bg-primary px-6 py-2 font-bold text-white shadow-md transition-all hover:bg-sky-800">
                    Nhắn tin
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-8 flex items-center gap-4">
          <h2 className="text-2xl font-extrabold tracking-tight text-primary">Gợi ý chuyên gia</h2>
          <div className="h-[2px] flex-1 bg-slate-100" />
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          {recommendedDoctors.map((doctor, index) => (
            <div key={doctor.id} className="rounded-2xl border border-transparent bg-surface-container-lowest p-6 shadow-sm transition-all hover:border-sky-200 hover:shadow-lg">
              <div className="flex flex-col gap-6 md:flex-row">
                <ImageWithFallback alt={doctor.name} className="h-32 w-32 rounded-xl object-cover shadow-lg md:h-40 md:w-40" src={doctor.avatar} />
                <div className="flex-1">
                  <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <h3 className="text-xl font-bold text-sky-900">{doctor.name}</h3>
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
                      <div className="mb-1 flex items-center gap-1">
                        <RatingStars rating={doctor.rating} />
                        <span className="ml-1 text-sm font-bold text-slate-900">{doctor.rating}</span>
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
