import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getDoctorById, hiredDoctorIds } from "@/features/doctors";
import { ImageWithFallback } from "@/shared/ui/ImageWithFallback";
import { RatingStars } from "@/shared/ui/RatingStars";

const DEFAULT_DOCTOR_AVATAR = "/assets/avatars/default/avatar-default.png";

/**
 * Tạo email fallback theo tên bác sĩ để khối liên hệ luôn có dữ liệu ổn định.
 */
function buildDoctorEmail(doctor) {
  // Chuẩn hóa tên về slug ASCII cơ bản để email nhìn giống dữ liệu thật.
  const slug = String(doctor?.name || "doctor")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, ".")
    .replace(/(^\.|\.$)/g, "")
    .toLowerCase();

  // Dùng domain nội bộ của sản phẩm cho dữ liệu mock.
  return `${slug || "doctor"}@lifetrack.vn`;
}

/**
 * Tạo danh sách học vấn fallback từ dữ liệu chuyên khoa và bệnh viện hiện có.
 */
function getEducationItems(doctor) {
  // Nếu sau này mock có education riêng thì ưu tiên dùng dữ liệu đó.
  if (Array.isArray(doctor.education) && doctor.education.length > 0) return doctor.education;

  // Fallback bám theo chuyên khoa để không phải mở rộng toàn bộ mock hiện tại.
  return [
    {
      title: `Chuyên khoa ${doctor.specialty}`,
      subtitle: doctor.hospital || "Cơ sở y tế đối tác LifeTrack",
      year: "Đã xác minh",
    },
    {
      title: "Chứng chỉ tư vấn và theo dõi từ xa",
      subtitle: "LifeTrack Care Network",
      year: "Cập nhật hằng năm",
    },
    {
      title: "Đào tạo chăm sóc bệnh nhân dài hạn",
      subtitle: "Mô hình chăm sóc liên tục tại nhà",
      year: "Thực hành lâm sàng",
    },
  ];
}

/**
 * Tạo danh sách nghiên cứu fallback từ thế mạnh chuyên môn của bác sĩ.
 */
function getResearchItems(doctor) {
  // Ưu tiên dữ liệu research nếu mock profile sau này được bổ sung.
  if (Array.isArray(doctor.research) && doctor.research.length > 0) return doctor.research;

  // Dùng kỹ năng/focus area để sinh nội dung nghiên cứu phù hợp từng bác sĩ.
  const skills = doctor.skills ?? doctor.focusAreas ?? [];
  const firstSkill = skills[0] || doctor.specialty || "chăm sóc sức khỏe";
  const secondSkill = skills[1] || "theo dõi bệnh nhân từ xa";

  return [
    {
      title: `Ứng dụng theo dõi số trong ${firstSkill}`,
      source: "LifeTrack Clinical Notes",
    },
    {
      title: `Tối ưu kế hoạch chăm sóc cá nhân hóa cho ${secondSkill}`,
      source: "Hội thảo chăm sóc sức khỏe liên tục",
    },
  ];
}

/**
 * Lấy mốc sự nghiệp từ mock experiences hoặc tạo fallback theo bệnh viện.
 */
function getCareerItems(doctor) {
  // Mock hiện có đã có experiences chi tiết cho nhiều bác sĩ.
  if (Array.isArray(doctor.experiences) && doctor.experiences.length > 0) {
    return doctor.experiences.map((item, index) => ({
      year: item.time?.match(/\d{4}/)?.[0] || (2024 - index * 3).toString(),
      title: item.title,
      org: item.org,
    }));
  }

  // Fallback ngắn cho các profile chưa có timeline riêng.
  return [
    {
      year: "2024",
      title: "Bác sĩ đồng hành trong mạng lưới LifeTrack",
      org: doctor.hospital || "LifeTrack Care",
    },
    {
      year: "2020",
      title: `Bác sĩ chuyên khoa ${doctor.specialty}`,
      org: doctor.location || "Việt Nam",
    },
    {
      year: "2016",
      title: "Bác sĩ điều trị và tư vấn dài hạn",
      org: "Cơ sở lâm sàng chuyên khoa",
    },
  ];
}

/**
 * Trang hồ sơ bác sĩ dùng mock profile vì database hồ sơ bác sĩ chưa được triển khai đầy đủ.
 */
export function DoctorProfilePage() {
  const { doctorId } = useParams();
  const doctor = getDoctorById(doctorId);
  const [pending, setPending] = useState(false);

  if (!doctor) {
    return <EmptyDoctorProfile doctorId={doctorId} />;
  }

  const isHired = hiredDoctorIds.includes(doctor.id);
  const educationItems = getEducationItems(doctor);
  const researchItems = getResearchItems(doctor);
  const careerItems = getCareerItems(doctor);
  const reviews = doctor.reviews ?? [];
  const displayReviews = reviews.length > 0 ? reviews : getFallbackReviews(doctor);
  const consultationFee = doctor.consultationFee || doctor.consultation_fee || "500k";
  const patientCount = doctor.trustCount || "500+";

  /**
   * Giả lập gửi yêu cầu thuê bác sĩ trên giao diện mock.
   */
  const handleHire = () => {
    // Chỉ đổi trạng thái nút vì hồ sơ bác sĩ chưa nối database.
    setPending(true);
  };

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 lg:grid-cols-12">
      <aside className="space-y-6 lg:col-span-4">
        <section className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-sm">
          <div className="relative">
            <ImageWithFallback
              alt={doctor.name}
              className="mb-6 aspect-square w-full rounded-lg object-cover object-top"
              src={doctor.avatar || DEFAULT_DOCTOR_AVATAR}
            />
            <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 shadow-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-secondary" />
              <span className="text-sm font-semibold text-secondary">Đang trực tuyến</span>
            </div>
          </div>

          <h1 className="mb-1 text-2xl font-bold leading-tight text-primary md:text-3xl">{doctor.name}</h1>
          <p className="mb-4 font-semibold text-on-surface-variant">{doctor.title || doctor.specialty}</p>
          <div className="mb-6 flex items-center gap-2">
            <RatingStars rating={doctor.rating || 4.8} />
            <span className="text-sm text-on-surface-variant">({doctor.reviewCount || displayReviews.length} đánh giá)</span>
          </div>

          <div className="space-y-3">
            {isHired ? (
              <Link
                className="flex h-14 w-full items-center justify-center rounded-lg bg-primary text-base font-bold text-white shadow-sm transition-all hover:bg-primary-container active:scale-95"
                to={`/patient/doctors/${doctor.id}/consult`}
              >
                Nhắn tin với bác sĩ
              </Link>
            ) : (
              <button
                className="h-14 w-full rounded-lg bg-primary text-base font-bold text-white shadow-sm transition-all hover:bg-primary-container active:scale-95 disabled:bg-slate-300"
                disabled={pending}
                onClick={handleHire}
                type="button"
              >
                {pending ? "Chờ bác sĩ duyệt" : "Đăng ký theo dõi ngay"}
              </button>
            )}
            <Link
              className="flex h-14 w-full items-center justify-center rounded-lg border-2 border-primary text-base font-bold text-primary transition-colors hover:bg-primary/5"
              to="/patient/appointments"
            >
              Đặt lịch tư vấn ({consultationFee}/phiên)
            </Link>
          </div>

          <div className="mt-8 border-t border-surface-container pt-8">
            <div className="grid grid-cols-2 gap-4">
              <StatBlock label="Năm kinh nghiệm" value={`${doctor.experienceYears || 10}+`} />
              <StatBlock label="Bệnh nhân hài lòng" value={patientCount} />
            </div>
          </div>
        </section>

        <section className="rounded-xl bg-surface-container-low p-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-on-surface-variant">Thông tin liên hệ</h2>
          <ul className="space-y-4">
            <ContactItem icon="location_on">
              <span>{doctor.hospital || "Cơ sở y tế đối tác LifeTrack"}</span>
              <span className="block text-xs text-on-surface-variant">{doctor.location || "Khám trực tuyến"}</span>
            </ContactItem>
            <ContactItem icon="mail">{buildDoctorEmail(doctor)}</ContactItem>
            <ContactItem icon="schedule">
              <span className="font-bold">Giờ làm việc</span>
              <span className="block text-xs text-on-surface-variant">Thứ 2 - Thứ 6: 08:00 - 18:00</span>
              <span className="block text-xs text-on-surface-variant">Thứ 7: 08:00 - 12:00</span>
            </ContactItem>
          </ul>
        </section>
      </aside>

      <main className="space-y-8 lg:col-span-8">
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-xl bg-surface-container-lowest p-8 md:col-span-2">
            <h2 className="mb-4 text-xl font-bold text-primary md:text-2xl">Giới thiệu bản thân</h2>
            <p className="text-base leading-8 text-on-surface-variant">{doctor.about}</p>
          </div>

          <div className="rounded-xl bg-surface-container-low p-6 md:p-8">
            <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-primary">
              <span className="material-symbols-outlined">school</span>
              Học vấn & Bằng cấp
            </h3>
            <ul className="space-y-5">
              {educationItems.map((item) => (
                <li key={`${item.title}-${item.subtitle}`} className="relative pl-6 before:absolute before:left-0 before:top-2 before:h-2 before:w-2 before:rounded-full before:bg-primary">
                  <p className="font-semibold text-on-surface">{item.title}</p>
                  <p className="text-sm text-on-surface-variant">{item.subtitle}</p>
                  <p className="text-xs font-bold text-outline">{item.year}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl bg-surface-container-low p-6 md:p-8">
            <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-primary">
              <span className="material-symbols-outlined">history_edu</span>
              Nghiên cứu nổi bật
            </h3>
            <div className="space-y-4">
              {researchItems.map((item) => (
                <div key={`${item.title}-${item.source}`} className="rounded-lg bg-white p-4">
                  <p className="mb-1 text-sm font-semibold text-primary">{item.title}</p>
                  <p className="text-xs text-on-surface-variant">{item.source}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-xl bg-surface-container-lowest p-8">
          <h2 className="mb-8 text-xl font-bold text-primary md:text-2xl">Lộ trình sự nghiệp</h2>
          <div className="relative space-y-8 before:absolute before:bottom-0 before:left-4 before:top-0 before:w-0.5 before:bg-surface-container-highest">
            {careerItems.map((item, index) => (
              <div key={`${item.year}-${item.title}`} className="relative flex items-center gap-6">
                <div className={index === 0 ? "z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white ring-8 ring-white" : "z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container-highest text-primary ring-8 ring-white"}>
                  <span className="text-[10px] font-bold">{item.year}</span>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-on-surface md:text-lg">{item.title}</h3>
                  <p className="text-on-surface-variant">{item.org}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-bold text-primary md:text-2xl">Phản hồi từ bệnh nhân</h2>
            <span className="text-sm font-bold text-primary">Tổng cộng {doctor.reviewCount || displayReviews.length} đánh giá</span>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {displayReviews.slice(0, 4).map((review) => (
              <article key={review.id} className="relative overflow-hidden rounded-xl border border-surface-container-high bg-white p-6">
                <span className="material-symbols-outlined absolute -right-2 -top-2 text-8xl text-primary/5">format_quote</span>
                <div className="mb-4 flex items-center gap-3">
                  <ImageWithFallback alt={review.author} className="h-10 w-10 rounded-full object-cover" src={review.avatar || DEFAULT_DOCTOR_AVATAR} />
                  <div>
                    <p className="text-sm font-semibold text-on-surface">{review.author}</p>
                    <p className="text-xs text-on-surface-variant">{review.date || "Bệnh nhân LifeTrack"}</p>
                  </div>
                </div>
                <p className="text-sm italic leading-7 text-on-surface-variant">"{review.content}"</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-primary p-8 text-white shadow-xl shadow-primary/10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="mb-2 text-2xl font-bold md:text-3xl">Bắt đầu hành trình chăm sóc sức khỏe</h2>
              <p className="text-primary-fixed-dim">Nhận tư vấn ưu tiên và kế hoạch theo dõi cá nhân hóa cùng {doctor.name}.</p>
            </div>
            <Link
              className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-4 text-sm font-bold text-primary shadow-sm transition-all hover:bg-primary-fixed"
              to={isHired ? `/patient/doctors/${doctor.id}/consult` : "/patient/doctors/hire"}
            >
              {isHired ? "Nhắn tin ngay" : "Xem các gói đăng ký"}
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

/**
 * Hồ sơ trống cho bác sĩ đã thuê từ API nhưng chưa có dữ liệu mock/profile database.
 */
function EmptyDoctorProfile({ doctorId }) {
  // Trang này cố ý không tự bịa hồ sơ khi bác sĩ thật chưa có profile.
  return (
    <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <span className="material-symbols-outlined text-3xl">badge</span>
      </div>
      <h1 className="text-2xl font-bold text-sky-900">Hồ sơ bác sĩ đang được cập nhật</h1>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
        Bác sĩ ID {doctorId} là dữ liệu thuê thật từ hệ thống, nhưng phần hồ sơ chi tiết chưa có database nên tạm thời để trống.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white" to="/patient/doctors/my">
          Quay lại bác sĩ của tôi
        </Link>
        <Link className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700" to="/patient/doctors/hire">
          Xem gợi ý chuyên gia
        </Link>
      </div>
    </div>
  );
}

/**
 * Ô thống kê nhỏ trong sidebar hồ sơ bác sĩ.
 */
function StatBlock({ label, value }) {
  // Tách component để các chỉ số luôn cùng căn giữa và không làm vỡ card.
  return (
    <div className="text-center">
      <p className="text-2xl font-bold text-primary">{value}</p>
      <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">{label}</p>
    </div>
  );
}

/**
 * Dòng thông tin liên hệ với icon Material Symbol.
 */
function ContactItem({ icon, children }) {
  // Component nhỏ giúp icon và nội dung liên hệ thẳng hàng trên mobile/desktop.
  return (
    <li className="flex items-start gap-3">
      <span className="material-symbols-outlined text-primary">{icon}</span>
      <div className="text-sm text-on-surface">{children}</div>
    </li>
  );
}

/**
 * Tạo review fallback khi mock chưa có phản hồi bệnh nhân.
 */
function getFallbackReviews(doctor) {
  // Fallback dựa trên tên/chuyên khoa để mọi profile đều có section phản hồi như mẫu.
  return [
    {
      id: `${doctor.id}-fallback-review-1`,
      author: "Nguyễn Văn An",
      avatar: DEFAULT_DOCTOR_AVATAR,
      date: `Bệnh nhân ${doctor.specialty}`,
      content: `${doctor.name} tư vấn rõ ràng, theo dõi sát và giúp gia đình yên tâm hơn trong quá trình chăm sóc.`,
    },
    {
      id: `${doctor.id}-fallback-review-2`,
      author: "Trần Thị Hoa",
      avatar: DEFAULT_DOCTOR_AVATAR,
      date: "Người nhà bệnh nhân",
      content: "Bác sĩ giải thích dễ hiểu, đưa ra kế hoạch theo dõi cụ thể và phản hồi rất nhanh khi gia đình cần hỗ trợ.",
    },
  ];
}
