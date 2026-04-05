import { Link } from "react-router-dom";
import {
  appointments,
  communityArticles,
  communityQuestions,
  familyMembers,
  getDoctorById,
} from "../data/mockData";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { StatSparkline } from "../components/StatSparkline";

export function DashboardPage() {
  const upcomingDoctor = getDoctorById(appointments.upcoming.doctorId);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="relative overflow-hidden rounded-[2rem]">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/95 to-primary/35" />
        <ImageWithFallback
          alt="Gia đình khỏe mạnh"
          className="h-[320px] w-full object-cover"
          src="https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=1600&q=80"
        />
        <div className="absolute inset-0 z-10 flex max-w-xl flex-col justify-center px-8 text-white md:px-12">
          <h1 className="mb-4 text-4xl font-extrabold leading-tight">Chăm sóc sức khỏe gia đình trọn vẹn</h1>
          <p className="mb-8 text-lg opacity-90">
            Kết nối với chuyên gia phù hợp, theo dõi hồ sơ số hóa và chủ động xử lý lịch hẹn của cả nhà.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              className="flex items-center gap-2 rounded-xl bg-primary-container px-8 py-4 font-bold shadow-lg transition-all hover:brightness-110"
              to="/patient/appointments"
            >
              <span className="material-symbols-outlined">calendar_month</span>
              Đặt lịch khám
            </Link>
            <Link
              className="flex items-center gap-2 rounded-xl bg-error px-8 py-4 font-bold shadow-lg transition-all hover:bg-red-700"
              to="/patient/doctors/hire"
            >
              <span className="material-symbols-outlined">medical_services</span>
              Thuê bác sĩ
            </Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-8">
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-sky-900">
              <span className="material-symbols-outlined">schedule</span>
              Lịch hẹn sắp tới
            </h2>
            <div className="flex flex-col gap-6 rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-sm md:flex-row md:items-center">
              <div className="flex-shrink-0">
                <div className="h-20 w-20 overflow-hidden rounded-2xl bg-sky-50">
                  <ImageWithFallback
                    alt={upcomingDoctor?.name}
                    className="h-full w-full object-cover"
                    src={upcomingDoctor?.avatar}
                  />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-on-surface">{upcomingDoctor?.name}</h3>
                <p className="font-medium text-slate-500">{upcomingDoctor?.title}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold text-sky-800">
                  <span className="flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1">
                    <span className="material-symbols-outlined text-sm">event</span>
                    {appointments.upcoming.displayDate}
                  </span>
                  <span className="flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1">
                    <span className="material-symbols-outlined text-sm">alarm</span>
                    {appointments.upcoming.displayTime}
                  </span>
                  <span className="flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1">
                    <span className="material-symbols-outlined text-sm">note_alt</span>
                    {appointments.upcoming.reason}
                  </span>
                </div>
              </div>
              <Link
                className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-white transition-all hover:bg-primary/90"
                to="/patient/appointments"
              >
                <span className="material-symbols-outlined">video_call</span>
                {appointments.upcoming.roomLabel}
              </Link>
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xl font-bold text-sky-900">
                <span className="material-symbols-outlined text-primary">analytics</span>
                Xu hướng chỉ số sinh tồn
              </h2>
              <Link className="text-sm font-bold text-primary hover:underline" to="/patient/health-records">
                Xem hồ sơ
              </Link>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-[2rem] bg-surface-container-lowest p-6 shadow-sm">
                <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-outline">Huyết áp</p>
                <div className="mb-4 flex items-end justify-between">
                  <span className="text-3xl font-black text-primary">122/78</span>
                  <span className="rounded-full bg-secondary-container px-3 py-1 text-xs font-bold text-on-secondary-container">
                    Ổn định
                  </span>
                </div>
                <StatSparkline colorClass="bg-primary" series={familyMembers[0] ? [
                  { label: "T2", value: "128/82", numeric: 128 },
                  { label: "T3", value: "126/80", numeric: 126 },
                  { label: "T4", value: "124/79", numeric: 124 },
                  { label: "T5", value: "129/81", numeric: 129 },
                  { label: "T6", value: "122/78", numeric: 122 },
                ] : []} />
              </div>
              <div className="rounded-[2rem] bg-surface-container-lowest p-6 shadow-sm">
                <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-outline">Đường huyết</p>
                <div className="mb-4 flex items-end justify-between">
                  <span className="text-3xl font-black text-primary">5.8</span>
                  <span className="rounded-full bg-secondary-container px-3 py-1 text-xs font-bold text-on-secondary-container">
                    Tốt
                  </span>
                </div>
                <StatSparkline
                  colorClass="bg-secondary"
                  series={[
                    { label: "T2", value: "6.2", numeric: 62 },
                    { label: "T3", value: "6.0", numeric: 60 },
                    { label: "T4", value: "5.9", numeric: 59 },
                    { label: "T5", value: "6.1", numeric: 61 },
                    { label: "T6", value: "5.8", numeric: 58 },
                  ]}
                />
              </div>
              <div className="rounded-[2rem] bg-surface-container-lowest p-6 shadow-sm">
                <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-outline">Nhịp tim</p>
                <div className="mb-4 flex items-end justify-between">
                  <span className="text-3xl font-black text-primary">73 bpm</span>
                  <span className="rounded-full bg-secondary-container px-3 py-1 text-xs font-bold text-on-secondary-container">
                    Cân bằng
                  </span>
                </div>
                <StatSparkline
                  colorClass="bg-tertiary"
                  series={[
                    { label: "T2", value: "74", numeric: 74 },
                    { label: "T3", value: "76", numeric: 76 },
                    { label: "T4", value: "72", numeric: 72 },
                    { label: "T5", value: "78", numeric: 78 },
                    { label: "T6", value: "73", numeric: 73 },
                  ]}
                />
              </div>
            </div>
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <div className="rounded-[2rem] bg-surface-container-lowest p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-sky-900">Thành viên gia đình</h2>
                <Link className="text-sm font-bold text-primary" to="/patient/health-records">
                  Xem tất cả
                </Link>
              </div>
              <div className="space-y-4">
                {familyMembers.map((member) => (
                  <Link
                    key={member.id}
                    className="flex items-center gap-4 rounded-2xl border border-outline-variant/20 p-4 transition-all hover:border-primary/30 hover:bg-sky-50/50"
                    to={`/patient/health-records/${member.id}`}
                  >
                    <ImageWithFallback alt={member.name} className="h-14 w-14 rounded-2xl object-cover" src={member.avatar} />
                    <div className="flex-1">
                      <p className="text-sm text-on-surface-variant">{member.relation}</p>
                      <h3 className="font-bold text-on-surface">{member.name}</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-outline">{member.metricFocus}</p>
                      <p className="text-sm font-semibold text-primary">{member.shortStatus}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] bg-surface-container-lowest p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-sky-900">Cộng đồng nổi bật</h2>
                <Link className="text-sm font-bold text-primary" to="/patient/community/knowledge">
                  Xem thêm
                </Link>
              </div>
              <div className="space-y-4">
                {communityArticles.slice(0, 2).map((article) => (
                  <Link
                    key={article.id}
                    className="flex gap-4 rounded-2xl border border-outline-variant/20 p-4 transition-all hover:border-primary/30 hover:bg-sky-50/50"
                    to="/patient/community/knowledge"
                  >
                    <ImageWithFallback alt={article.title} className="h-20 w-24 rounded-xl object-cover" src={article.image} />
                    <div className="min-w-0">
                      <p className="mb-1 text-[11px] font-black uppercase tracking-[0.2em] text-primary">{article.category}</p>
                      <h3 className="line-clamp-2 font-bold text-on-surface">{article.title}</h3>
                      <p className="mt-2 text-sm text-on-surface-variant">{article.author}</p>
                    </div>
                  </Link>
                ))}
                <div className="rounded-2xl bg-primary-container p-5 text-white">
                  <p className="mb-3 text-sm font-bold">Q&A mới nhất</p>
                  <h3 className="mb-2 text-xl font-extrabold">{communityQuestions[0].title}</h3>
                  <p className="mb-4 text-sm opacity-90">{communityQuestions[0].answer}</p>
                  <Link className="font-bold underline" to="/patient/community/questions">
                    Xem hỏi đáp
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6 lg:col-span-4">
          <div className="rounded-[2rem] bg-surface-container-lowest p-6 shadow-sm">
            <h2 className="mb-6 text-lg font-bold text-sky-900">Việc cần làm hôm nay</h2>
            <div className="space-y-4">
              {[
                "Cập nhật huyết áp cho bố",
                "Xác nhận lịch khám ngày 12/04",
                "Đọc bài viết về chế độ ăn tim mạch",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl bg-surface-container-low p-4">
                  <span className="material-symbols-outlined rounded-full bg-primary/10 p-2 text-primary">task_alt</span>
                  <p className="font-medium text-on-surface">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] bg-primary text-white shadow-xl shadow-primary/20">
            <div className="p-6">
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-primary-fixed-dim">Hỗ trợ CSKH</p>
              <h2 className="mt-2 text-2xl font-extrabold">Cần bác sĩ tư vấn ngay?</h2>
              <p className="mt-3 text-sm opacity-90">
                Đội ngũ LifeTrack sẵn sàng hỗ trợ chọn bác sĩ phù hợp và đồng bộ hồ sơ cho cả gia đình.
              </p>
              <div className="mt-6 flex gap-3">
                <Link className="rounded-xl bg-white px-5 py-3 font-bold text-primary" to="/patient/doctors/hire">
                  Xem bác sĩ
                </Link>
                <Link className="rounded-xl border border-white/30 px-5 py-3 font-bold" to="/patient/settings">
                  Hỗ trợ
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
