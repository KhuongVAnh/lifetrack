import { Link, useNavigate } from "react-router-dom";
import {
  appointments,
  communityArticles,
  communityQuestions,
  familyMembers,
  getDoctorById,
  patientProfiles,
} from "@/shared/mocks/appFixtures";
import { ImageWithFallback } from "@/shared/ui/ImageWithFallback";
import { useAuth } from "@/app/providers/AuthProvider";
import { getUserDisplayName } from "@/entities/user";

function DashboardSparkline({ data, color = "#0060A8" }) {
  if (!data || data.length < 2) return null;
  const height = 30;
  const width = 100;
  const min = Math.min(...data.map((d) => d.numeric));
  const max = Math.max(...data.map((d) => d.numeric));
  const range = (max - min) || 1;
  
  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - ((d.numeric - min) / range) * height,
  }));

  let pathData = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cpX = (p0.x + p1.x) / 2;
    pathData += ` C ${cpX},${p0.y} ${cpX},${p1.y} ${p1.x},${p1.y}`;
  }

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <path d={pathData} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function CompactVitalCard({ label, value, unit, status, data, color }) {
  return (
    <div className="flex flex-col gap-2 rounded-[2rem] bg-white p-6 shadow-sm border border-slate-100/50 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
        <span className={`h-2 w-2 rounded-full`} style={{ backgroundColor: color }} />
      </div>
      <div className="flex items-end justify-between mt-1">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-800">{value}</span>
            <span className="text-xs font-bold text-slate-400">{unit}</span>
          </div>
          <span className="text-[10px] font-bold text-slate-400">{status}</span>
        </div>
        <DashboardSparkline data={data} color={color} />
      </div>
    </div>
  );
}

const bloodPressureSeries = [
  { label: "T2", value: "128/82", numeric: 128 },
  { label: "T3", value: "126/80", numeric: 126 },
  { label: "T4", value: "124/79", numeric: 124 },
  { label: "T5", value: "129/81", numeric: 129 },
  { label: "T6", value: "122/78", numeric: 122 },
];

const glucoseSeries = [
  { label: "T2", value: "6.2", numeric: 62 },
  { label: "T3", value: "6.0", numeric: 60 },
  { label: "T4", value: "5.9", numeric: 59 },
  { label: "T5", value: "6.1", numeric: 61 },
  { label: "T6", value: "5.8", numeric: 58 },
];

const heartRateSeries = [
  { label: "T2", value: "74", numeric: 74 },
  { label: "T3", value: "76", numeric: 76 },
  { label: "T4", value: "72", numeric: 72 },
  { label: "T5", value: "78", numeric: 78 },
  { label: "T6", value: "73", numeric: 73 },
];

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userName = getUserDisplayName(user, "Bệnh nhân");
  const upcomingDoctor = getDoctorById(appointments.upcoming.doctorId);

  return (
    <div className="mx-auto max-w-7xl space-y-10 pb-10">
      {/* MODERN HERO SECTION */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-8 md:p-12 text-white shadow-2xl">
        {/* Mesh Gradient Decorations */}
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-primary/20 blur-[100px]" />
        <div className="absolute -left-20 -bottom-20 h-80 w-80 rounded-full bg-secondary/10 blur-[100px]" />
        
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-7">
            <div className="flex items-center gap-2 mb-4">
              <span className="h-1 w-8 rounded-full bg-secondary" />
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-secondary">Chào buổi sáng, {userName}</span>
            </div>
            <h1 className="mb-4 text-3xl md:text-5xl font-black leading-tight">
              Sức khỏe gia đình <br className="hidden md:block" /> nằm trong tầm tay.
            </h1>
            <p className="mb-8 text-lg text-slate-300 max-w-md font-medium leading-relaxed">
              Tất cả chỉ số, lịch khám và hỗ trợ từ bác sĩ chuyên gia được đồng bộ hóa ngay tại đây.
            </p>
            <div className="flex flex-wrap gap-4">
              <button onClick={() => navigate("/patient/appointments")} className="flex items-center gap-2 rounded-2xl bg-white px-8 py-4 font-black text-slate-900 shadow-xl transition-all hover:scale-[1.02] active:scale-95">
                <span className="material-symbols-outlined text-[20px]">calendar_add_on</span>
                Đặt lịch mới
              </button>
              <button onClick={() => navigate("/patient/doctors/hire")} className="flex items-center gap-2 rounded-2xl bg-white/10 px-8 py-4 font-black text-white backdrop-blur-md transition-all hover:bg-white/20 active:scale-95">
                <span className="material-symbols-outlined text-[20px]">medical_services</span>
                Thuê bác sĩ
              </button>
            </div>
          </div>

          <div className="md:col-span-1 hidden md:block" />

          {/* HEALTH SCORE GAUGE */}
          <div className="md:col-span-4 flex flex-col items-center justify-center p-8 rounded-[2rem] bg-white/5 backdrop-blur-xl border border-white/10">
            <div className="relative mb-4 flex h-32 w-32 items-center justify-center">
              <svg className="h-full w-full rotate-[-90deg]" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-white/5" />
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" strokeDasharray="282.7" strokeDashoffset="42.4" className="text-secondary" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black">85</span>
                <span className="text-[10px] font-bold uppercase tracking-tighter opacity-60">Score</span>
              </div>
            </div>
            <h3 className="text-xl font-bold mb-1">Tình trạng Tốt</h3>
            <p className="text-center text-xs text-slate-400 px-4">Tất cả thành viên gia đình đang ở mức an toàn.</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 items-start">
        <div className="space-y-10 lg:col-span-8">
          {/* VITALS SECTION */}
          <section>
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-6 w-1 rounded-full bg-primary" />
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Xu hướng cá nhân</h2>
              </div>
              <Link className="text-xs font-bold text-primary uppercase tracking-widest hover:underline" to="/patient/health-records">Toàn bộ hồ sơ</Link>
            </div>
            
            <div className="grid gap-4 md:grid-cols-3">
              <CompactVitalCard
                label="Huyết áp"
                value="122/78"
                unit="mmHg"
                status="Mục tiêu: 120/80"
                color="#3F51B5"
                data={bloodPressureSeries}
              />
              <CompactVitalCard
                label="Đường huyết"
                value="5.8"
                unit="mmol/L"
                status="Ổn định"
                color="#4CAF50"
                data={glucoseSeries}
              />
              <CompactVitalCard
                label="Nhịp tim"
                value="73"
                unit="BPM"
                status="Bình thường"
                color="#E91E63"
                data={heartRateSeries}
              />
            </div>
          </section>

          {/* FAMILY SECTION */}
          <section>
             <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-6 w-1 rounded-full bg-secondary" />
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Thành viên gia đình</h2>
              </div>
              <Link className="text-xs font-bold text-primary uppercase tracking-widest hover:underline" to="/patient/health-records">Tất cả</Link>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {familyMembers.slice(0, 4).map((member) => (
                <Link
                  key={member.id}
                  className="group flex items-center gap-4 rounded-3xl bg-white p-4 border border-slate-100 hover:border-primary/20 hover:shadow-xl hover:shadow-slate-200/50 transition-all"
                  to={`/patient/health-records/${member.id}`}
                >
                  <div className="relative">
                    <ImageWithFallback alt={member.name} className="h-16 w-16 rounded-[1.25rem] object-cover group-hover:scale-105 transition-transform" src={member.avatar} />
                    <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{member.relation}</p>
                    <h3 className="font-bold text-slate-800 truncate">{member.name}</h3>
                    <div className="mt-1 flex items-center gap-2">
                       <span className="text-[11px] font-bold text-primary">{member.shortStatus}</span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-slate-200 group-hover:text-primary transition-colors">chevron_right</span>
                </Link>
              ))}
            </div>
          </section>

          {/* COMMUNITY SECTION */}
          <section>
             <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-6 w-1 rounded-full bg-slate-800" />
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Cộng đồng & Kiến thức</h2>
              </div>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                {communityArticles.slice(0, 2).map((article) => (
                  <Link key={article.id} className="flex gap-4 group" to="/patient/community/knowledge">
                    <ImageWithFallback alt={article.title} className="h-20 w-24 rounded-2xl object-cover shadow-sm group-hover:brightness-90 transition-all" src={article.image} />
                    <div className="flex flex-col justify-center">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-primary mb-1">{article.category}</span>
                      <h4 className="font-bold text-slate-800 text-sm line-clamp-2 leading-relaxed">{article.title}</h4>
                    </div>
                  </Link>
                ))}
              </div>
              
              {/* Q&A Spotlight */}
              <div className="rounded-[2rem] bg-sky-50 border border-sky-100 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-primary mb-3">
                    <span className="material-symbols-outlined text-[18px]">forum</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest">Hỏi đáp nổi bật</span>
                  </div>
                  <h3 className="text-lg font-bold text-sky-900 leading-tight mb-2">{communityQuestions[0].title}</h3>
                  <p className="text-xs text-sky-800/70 line-clamp-2 italic">“{communityQuestions[0].answer}”</p>
                </div>
                <Link to="/patient/community/questions" className="mt-4 text-xs font-bold text-primary hover:underline flex items-center gap-1">
                  Xem chi tiết <span className="material-symbols-outlined text-xs">arrow_forward</span>
                </Link>
              </div>
            </div>
          </section>
        </div>

        {/* SIDEBAR: UNIFIED AGENDA */}
        <div className="lg:col-span-4 space-y-8">
           <section className="rounded-[2.5rem] bg-white p-8 border border-slate-100 shadow-sm">
            <h2 className="text-xl font-black text-slate-800 tracking-tight mb-6">Chương trình hôm nay</h2>
            
            <div className="space-y-8">
              {/* Upcoming Appointment as its own stylish component */}
              <div className="relative pl-6 border-l-2 border-primary">
                <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full border-4 border-white bg-primary shadow-sm" />
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">Lịch khám sắp tới</p>
                <div className="flex flex-col gap-3 rounded-3xl bg-slate-50 p-4 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <ImageWithFallback alt={upcomingDoctor?.name} className="h-12 w-12 rounded-xl object-cover" src={upcomingDoctor?.avatar} />
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-800 truncate">{upcomingDoctor?.name}</h4>
                      <p className="text-xs text-slate-500 truncate">{upcomingDoctor?.specialty}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-bold pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1 text-slate-600">
                      <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                      {appointments.upcoming.displayDate}
                    </div>
                    <div className="flex items-center gap-1 text-secondary">
                      <span className="material-symbols-outlined text-[14px]">alarm</span>
                      {appointments.upcoming.displayTime}
                    </div>
                  </div>
                  <button onClick={() => navigate(`/patient/doctors/${appointments.upcoming.doctorId}/consult`)} className="w-full mt-2 py-2.5 rounded-xl bg-primary text-white text-xs font-black shadow-lg shadow-primary/20 hover:brightness-110 transition-all">
                   {appointments.upcoming.roomLabel}
                  </button>
                </div>
              </div>

              {/* Today's Tasks */}
              <div className="relative pl-6 border-l-2 border-slate-200">
                <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full border-4 border-white bg-slate-200" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Việc cần làm</p>
                <div className="space-y-3">
                  {[
                    "Cập nhật huyết áp cho bố",
                    "Đọc bài viết về tim mạch",
                    "Uống Vitamin tổng hợp"
                  ].map((task, idx) => (
                    <div key={idx} className="flex items-start gap-4 group cursor-pointer">
                      <div className="mt-0.5 h-4 w-4 shrink-0 rounded border-2 border-slate-200 group-hover:border-secondary transition-colors" />
                      <p className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">{task}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
           </section>

           {/* SUPPORT CTA */}
           <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary to-blue-800 p-8 text-white shadow-xl">
             <div className="absolute right-0 top-0 h-32 w-32 translate-x-10 -translate-y-10 rounded-full bg-white/10 blur-2xl" />
             <h3 className="text-2xl font-bold mb-4 leading-tight">Gia đình bạn cần hỗ trợ y tế?</h3>
             <p className="text-sm text-white/80 mb-8 leading-relaxed">Kết nối ngay với đội ngũ bác sĩ hàng đầu để nhận kế hoạch chăm sóc cá nhân hóa.</p>
             <Link to="/patient/doctors/hire" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-primary font-black text-sm hover:scale-[1.02] transition-all">
                Khám phá chuyên gia
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
             </Link>
           </div>
        </div>
      </div>
    </div>
  );
}
