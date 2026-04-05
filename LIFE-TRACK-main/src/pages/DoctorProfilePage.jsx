import { Link, Navigate, useParams } from "react-router-dom";
import { getDoctorById } from "../data/mockData";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { RatingStars } from "../components/RatingStars";

export function DoctorProfilePage() {
  const { doctorId } = useParams();
  const doctor = getDoctorById(doctorId);

  if (!doctor) {
    return <Navigate replace to="/patient/doctors/my" />;
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm">
        <div className="h-48 bg-gradient-to-r from-primary to-primary-container md:h-64">
          <ImageWithFallback alt="Doctor cover" className="h-full w-full object-cover mix-blend-overlay opacity-50" src={doctor.cover} />
        </div>
        <div className="-mt-16 flex flex-col gap-6 px-6 pb-6 md:-mt-20 md:flex-row md:items-center">
          <ImageWithFallback
            alt={doctor.name}
            className="h-32 w-32 rounded-2xl border-4 border-surface-container-lowest object-cover shadow-xl md:h-40 md:w-40"
            src={doctor.avatar}
          />
          <div className="flex-1 pt-6 md:pt-14">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-on-surface">{doctor.name}</h1>
                <p className="text-lg font-medium text-primary">{doctor.title}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                  <span className="material-symbols-outlined text-sm">location_on</span>
                  <span>{doctor.location}</span>
                  <span className="mx-2">•</span>
                  <span className="font-bold text-secondary">{doctor.trustCount} bệnh nhân tin dùng</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="rounded-xl bg-primary px-8 py-3 text-base font-bold text-white shadow-lg shadow-primary/25 transition-all hover:brightness-110">
                  Thuê bác sĩ này
                </button>
                <Link className="rounded-xl bg-surface-container-high px-4 py-3 font-semibold text-on-surface transition-all" to="/patient/appointments">
                  Đặt lịch tư vấn
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl bg-surface-container-lowest p-8 shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-on-surface">Giới thiệu</h2>
            <p className="text-lg leading-relaxed text-on-surface-variant">{doctor.about}</p>
          </section>

          <section className="rounded-2xl bg-surface-container-lowest p-8 shadow-sm">
            <h2 className="mb-6 text-xl font-bold text-on-surface">Kinh nghiệm & Học vấn</h2>
            <div className="space-y-8">
              {doctor.experiences.map((experience) => (
                <div key={experience.title} className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-container-low">
                    <span className="material-symbols-outlined text-primary">{experience.icon}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-on-surface">{experience.title}</h3>
                    <p className="text-on-surface-variant">{experience.org}</p>
                    <p className="mt-1 text-sm text-slate-500">{experience.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-surface-container-lowest p-8 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-on-surface">Đánh giá từ bệnh nhân</h2>
              <div className="flex items-center gap-2 font-bold text-secondary">
                <RatingStars rating={doctor.rating} />
                <span>
                  {doctor.rating} ({doctor.reviewCount} đánh giá)
                </span>
              </div>
            </div>
            <div className="space-y-6">
              {doctor.reviews.map((review) => (
                <div key={review.id} className="rounded-xl bg-surface-container-low p-5">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <ImageWithFallback alt={review.author} className="h-10 w-10 rounded-full object-cover" src={review.avatar} />
                      <div>
                        <p className="text-sm font-bold">{review.author}</p>
                        <RatingStars rating={review.rating} />
                      </div>
                    </div>
                    <span className="text-xs text-slate-500">{review.date}</span>
                  </div>
                  <p className="text-sm italic text-on-surface-variant">"{review.content}"</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl bg-primary-container p-8 text-white shadow-xl shadow-primary/20">
            <h2 className="mb-2 text-2xl font-bold">Chăm sóc ngay</h2>
            <p className="mb-6 text-sm opacity-90">
              Đặt lịch tư vấn trực tuyến hoặc đăng ký bác sĩ gia đình dài hạn ngay hôm nay.
            </p>
            <Link className="mb-4 block rounded-xl bg-white py-4 text-center text-lg font-extrabold text-primary shadow-sm" to="/patient/appointments">
              Đặt lịch tư vấn thử
            </Link>
            <button className="w-full rounded-xl border border-white/30 bg-primary-fixed/20 py-4 text-lg font-bold">
              Nhắn tin cho Bác sĩ
            </button>
          </section>

          <section className="rounded-2xl bg-surface-container-lowest p-8 shadow-sm">
            <h2 className="mb-6 text-xl font-bold text-on-surface">Kỹ năng & Thế mạnh</h2>
            <div className="flex flex-wrap gap-2">
              {doctor.skills.map((skill) => (
                <span key={skill} className="rounded-full bg-secondary-container px-4 py-2 text-sm font-semibold text-on-secondary-container">
                  {skill}
                </span>
              ))}
            </div>
            <div className="mt-8 space-y-4">
              {doctor.verifiedItems.map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-secondary">verified</span>
                  <span className="text-sm font-medium">{item}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-surface-container-lowest p-8 shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-on-surface">Ngôn ngữ</h2>
            <div className="space-y-3">
              {doctor.languages.map((language) => (
                <div key={language.name} className="flex items-center justify-between">
                  <span className="font-medium text-on-surface-variant">{language.name}</span>
                  <span className="text-sm font-bold text-secondary">{language.level}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
