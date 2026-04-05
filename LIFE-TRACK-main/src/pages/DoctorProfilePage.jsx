import { Link, Navigate, useParams } from "react-router-dom";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { RatingStars } from "../components/RatingStars";
import { getDoctorById } from "../data/mockData";

function InfoMetric({ icon, label, value, accent = "text-primary" }) {
  return (
    <div className="rounded-2xl bg-surface-container-low p-4">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm">
        <span className={`material-symbols-outlined ${accent}`}>{icon}</span>
      </div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">{label}</p>
      <p className="mt-2 text-sm font-bold text-on-surface">{value}</p>
    </div>
  );
}

function SectionCard({ title, children, aside }) {
  return (
    <section className="rounded-[1.75rem] bg-surface-container-lowest p-6 shadow-soft md:p-8">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-xl font-bold text-on-surface">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function DoctorProfilePage() {
  const { doctorId } = useParams();
  const doctor = getDoctorById(doctorId);

  if (!doctor) {
    return <Navigate replace to="/patient/doctors/my" />;
  }

  const focusAreas = doctor.focusAreas ?? [];
  const careApproach = doctor.careApproach ?? [];
  const experiences = doctor.experiences ?? [];
  const reviews = doctor.reviews ?? [];
  const languages = doctor.languages ?? [];
  const skills = doctor.skills ?? [];
  const verifiedItems = doctor.verifiedItems ?? [];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] bg-surface-container-lowest shadow-soft">
        <div className="relative h-56 md:h-72">
          <ImageWithFallback alt={`Ảnh bìa của ${doctor.name}`} className="h-full w-full object-cover" src={doctor.cover} />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/80 to-primary-container/75" />
          <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
            <span className="inline-flex rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.28em] text-white backdrop-blur">
              LifeTrack Doctor
            </span>
          </div>
        </div>

        <div className="relative px-5 pb-6 md:px-8 md:pb-8">
          <div className="-mt-14 rounded-[1.75rem] bg-white/95 p-5 shadow-soft backdrop-blur md:-mt-20 md:p-7">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="flex flex-col gap-5 md:flex-row md:items-end">
                <div className="shrink-0 rounded-[1.75rem] bg-white p-1.5 shadow-soft ring-1 ring-slate-100">
                  <ImageWithFallback
                    alt={doctor.name}
                    className="h-28 w-28 rounded-[1.35rem] object-cover md:h-36 md:w-36"
                    src={doctor.avatar}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-secondary-container px-3 py-1 text-xs font-bold text-on-secondary-container">
                      Đã xác minh
                    </span>
                    <span className="rounded-full bg-surface-container-high px-3 py-1 text-xs font-semibold text-on-surface-variant">
                      {doctor.specialty}
                    </span>
                  </div>

                  <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-on-surface md:text-4xl">{doctor.name}</h1>
                    <p className="mt-1 text-lg font-semibold text-primary">{doctor.title}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-on-surface-variant">
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base text-primary">location_on</span>
                      {doctor.location}
                    </span>
                    <span className="hidden text-outline md:inline">•</span>
                    <span className="font-semibold text-secondary">{doctor.trustCount} bệnh nhân tin dùng</span>
                    <span className="hidden text-outline md:inline">•</span>
                    <span className="flex items-center gap-2 font-semibold text-on-surface">
                      <RatingStars rating={doctor.rating} />
                      {doctor.rating} ({doctor.reviewCount} đánh giá)
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[360px]">
                <Link
                  className="rounded-2xl bg-primary px-6 py-4 text-center text-base font-bold text-white shadow-lg shadow-primary/20 transition-all hover:brightness-110"
                  to="/patient/doctors/hire"
                >
                  Thuê bác sĩ này
                </Link>
                <Link
                  className="rounded-2xl bg-surface-container-high px-6 py-4 text-center text-base font-bold text-on-surface transition-colors hover:bg-surface-container"
                  to="/patient/appointments"
                >
                  Đặt lịch tư vấn
                </Link>
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <InfoMetric accent="text-primary" icon="work_history" label="Kinh nghiệm" value={`${doctor.experienceYears} năm theo dõi`} />
              <InfoMetric accent="text-secondary" icon="monitor_heart" label="Bệnh nhân tin dùng" value={doctor.trustCount} />
              <InfoMetric accent="text-tertiary" icon="apartment" label="Cơ sở chuyên môn" value={doctor.hospital} />
              <InfoMetric accent="text-primary" icon="star" label="Điểm đánh giá" value={`${doctor.rating}/5 từ ${doctor.reviewCount} lượt`} />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          <SectionCard title="Giới thiệu">
            <p className="text-base leading-8 text-on-surface-variant md:text-lg">{doctor.about}</p>
          </SectionCard>

          {focusAreas.length > 0 && (
            <SectionCard title="Lĩnh vực theo dõi chuyên sâu">
              <div className="grid gap-3 md:grid-cols-2">
                {focusAreas.map((area) => (
                  <div key={area} className="flex items-start gap-3 rounded-2xl bg-surface-container-low p-4">
                    <span className="material-symbols-outlined mt-0.5 text-primary">check_circle</span>
                    <p className="text-sm font-medium leading-6 text-on-surface">{area}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {careApproach.length > 0 && (
            <SectionCard title="Cách bác sĩ đồng hành">
              <div className="space-y-4">
                {careApproach.map((item, index) => (
                  <div key={item} className="flex gap-4 rounded-2xl bg-surface-container-low p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-sm font-bold text-white">
                      0{index + 1}
                    </div>
                    <p className="text-sm leading-7 text-on-surface-variant">{item}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          <SectionCard title="Kinh nghiệm & học vấn">
            {experiences.length > 0 ? (
              <div className="space-y-5">
                {experiences.map((experience) => (
                  <div key={`${experience.title}-${experience.time}`} className="flex gap-4 rounded-2xl bg-surface-container-low p-5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
                      <span className="material-symbols-outlined text-primary">{experience.icon}</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-on-surface">{experience.title}</h3>
                      <p className="mt-1 text-sm font-medium text-on-surface-variant">{experience.org}</p>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-outline">{experience.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl bg-surface-container-low p-5 text-sm text-on-surface-variant">
                Hồ sơ này đang được bổ sung thêm các cột mốc chuyên môn.
              </div>
            )}
          </SectionCard>

          <SectionCard
            aside={
              <div className="flex items-center gap-2 font-bold text-secondary">
                <RatingStars rating={doctor.rating} />
                <span>
                  {doctor.rating} ({doctor.reviewCount} đánh giá)
                </span>
              </div>
            }
            title="Đánh giá từ bệnh nhân"
          >
            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="rounded-2xl bg-surface-container-low p-5">
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <ImageWithFallback alt={review.author} className="h-12 w-12 rounded-full object-cover" src={review.avatar} />
                        <div>
                          <p className="font-bold text-on-surface">{review.author}</p>
                          <RatingStars rating={review.rating} />
                        </div>
                      </div>
                      <span className="text-xs font-medium text-outline">{review.date}</span>
                    </div>
                    <p className="text-sm leading-7 text-on-surface-variant">"{review.content}"</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl bg-surface-container-low p-5 text-sm text-on-surface-variant">
                Chưa có đánh giá công khai cho hồ sơ này.
              </div>
            )}
          </SectionCard>
        </div>

        <div className="space-y-6">
          <section className="rounded-[1.75rem] bg-primary p-6 text-white shadow-soft md:p-8">
            <h2 className="text-2xl font-bold">Phù hợp nếu bạn cần</h2>
            <p className="mt-3 text-sm leading-7 text-white/85">
              Theo dõi dài hạn, tư vấn định kỳ hoặc cần một bác sĩ hiểu rõ bối cảnh sức khỏe của cả gia đình.
            </p>
            <div className="mt-6 space-y-3">
              <Link
                className="block rounded-2xl bg-white px-5 py-4 text-center text-base font-bold text-primary transition-colors hover:bg-slate-100"
                to="/patient/appointments"
              >
                Đặt lịch tư vấn thử
              </Link>
              <Link
                className="block rounded-2xl border border-white/25 px-5 py-4 text-center text-base font-bold text-white transition-colors hover:bg-white/10"
                to="/patient/doctors/hire"
              >
                Xem gói thuê bác sĩ
              </Link>
            </div>
          </section>

          <SectionCard title="Kỹ năng & thế mạnh">
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-secondary-container px-4 py-2 text-sm font-semibold text-on-secondary-container"
                >
                  {skill}
                </span>
              ))}
            </div>

            {verifiedItems.length > 0 && (
              <div className="mt-8 space-y-3">
                {verifiedItems.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl bg-surface-container-low p-4">
                    <span className="material-symbols-outlined text-secondary">verified</span>
                    <span className="text-sm font-medium leading-6 text-on-surface">{item}</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Ngôn ngữ">
            <div className="space-y-3">
              {languages.map((language) => (
                <div key={language.name} className="flex items-center justify-between rounded-2xl bg-surface-container-low p-4">
                  <span className="font-medium text-on-surface">{language.name}</span>
                  <span className="text-sm font-bold text-secondary">{language.level}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
