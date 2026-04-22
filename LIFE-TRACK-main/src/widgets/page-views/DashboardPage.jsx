import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  communityArticles,
  communityQuestions,
  familyMembers,
} from "@/shared/mocks/appFixtures";
import { ImageWithFallback } from "@/shared/ui/ImageWithFallback";
import { useAuth } from "@/app/providers/AuthProvider";
import { getUserDisplayName } from "@/entities/user";
import { getAppointments } from "@/features/appointments/api/appointmentsApi";
import { getMedicationLogs, markMedicationTaken } from "@/features/medications/api/medicationsApi";

/**
 * Vẽ sparkline nhỏ cho các chỉ số sức khỏe trên dashboard.
 * Hàm chuyển dữ liệu numeric thành đường SVG bo mượt để hiển thị xu hướng nhanh.
 */
function DashboardSparkline({ data, color = "#0060A8" }) {
  // Nếu dữ liệu không đủ 2 điểm thì không thể vẽ đường xu hướng có ý nghĩa.
  if (!data || data.length < 2) return null;

  // Kích thước cố định giúp các card chỉ số không bị nhảy layout.
  const height = 30;
  const width = 100;

  // Tính min/max để chuẩn hóa dữ liệu về vùng SVG.
  const min = Math.min(...data.map((d) => d.numeric));
  const max = Math.max(...data.map((d) => d.numeric));
  const range = (max - min) || 1;
  
  // Chuyển từng điểm dữ liệu thành tọa độ x/y trong SVG.
  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - ((d.numeric - min) / range) * height,
  }));

  // Khởi tạo path từ điểm đầu tiên.
  let pathData = `M ${points[0].x},${points[0].y}`;

  // Dùng cubic bezier giữa các điểm để đường cong mềm hơn polyline thẳng.
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

/**
 * Hiển thị một card chỉ số sức khỏe nhỏ trên dashboard.
 * Card gồm nhãn, giá trị hiện tại, trạng thái và sparkline xu hướng.
 */
function CompactVitalCard({ label, value, unit, status, data, color }) {
  // Component chỉ nhận props đã chuẩn hóa từ dashboard nên không cần state nội bộ.
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

/**
 * Format ngày giờ lịch khám cho dashboard bệnh nhân.
 * Hàm trả fallback ngắn nếu dữ liệu backend chưa sẵn sàng.
 */
function formatAppointmentDateTime(value) {
  // Parse ISO string từ API lịch hẹn.
  const date = new Date(value);

  // Tránh render Invalid Date nếu response có lỗi dữ liệu.
  if (Number.isNaN(date.getTime())) return "Chưa có thời gian";

  // Hiển thị dạng ngày/giờ ngắn để vừa card sidebar.
  return date.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

/**
 * Format giờ uống thuốc để hiển thị gọn trong widget dashboard.
 * Hàm chỉ lấy giờ/phút vì widget đã nằm trong ngữ cảnh "hôm nay".
 */
function formatMedicationTime(value) {
  // Parse ISO string scheduled_time từ API medication logs.
  const date = new Date(value);

  // Trả fallback ngắn nếu dữ liệu ngày giờ không hợp lệ.
  if (Number.isNaN(date.getTime())) return "--:--";

  // Hiển thị giờ 24h theo locale Việt Nam.
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Lấy cấu hình hiển thị cho trạng thái uống thuốc.
 * Hàm gom label, màu và icon để JSX danh sách thuốc không phải rẽ nhánh nhiều.
 */
function getMedicationStatusMeta(status) {
  // Map trạng thái backend sang text và màu phù hợp trên nền xanh của widget.
  const map = {
    PENDING: { label: "Chờ uống", icon: "schedule", className: "bg-amber-300/25 text-amber-50" },
    TAKEN: { label: "Đã uống", icon: "check_circle", className: "bg-white/20 text-white" },
    MISSED: { label: "Bỏ lỡ", icon: "error", className: "bg-rose-300/25 text-rose-50" },
    SKIPPED: { label: "Bỏ qua", icon: "remove_circle", className: "bg-slate-200/20 text-slate-50" },
  };

  // Fallback về PENDING để UI không vỡ khi backend thêm trạng thái mới.
  return map[status] ?? map.PENDING;
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
  const [appointmentItems, setAppointmentItems] = useState([]);
  const [medicationLogs, setMedicationLogs] = useState([]);

  /**
   * Tải dữ liệu agenda thật cho dashboard.
   * Hàm lấy lịch hẹn đang hoạt động và log thuốc hôm nay để thay thế mock cũ.
   */
  const fetchDashboardAgenda = async () => {
    try {
      // Tạo khoảng ngày hôm nay cho API logs.
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      // Gọi song song lịch khám và nhắc thuốc để dashboard không chờ tuần tự.
      const [appointmentsData, logsData] = await Promise.all([
        getAppointments(),
        getMedicationLogs({ from: todayStart.toISOString(), to: todayEnd.toISOString() }),
      ]);

      // Lưu state; component sẽ tự chọn lịch sắp tới gần nhất bằng useMemo.
      setAppointmentItems(appointmentsData);
      setMedicationLogs(logsData);
    } catch {
      // Dashboard không toast lỗi để tránh làm phiền khi người dùng vừa vào app.
      setAppointmentItems([]);
      setMedicationLogs([]);
    }
  };

  // Tải dữ liệu agenda khi dashboard mount.
  useEffect(() => {
    fetchDashboardAgenda();
  }, []);

  const nextAppointment = useMemo(
    () =>
      appointmentItems
        .filter((appointment) => ["PENDING", "APPROVED"].includes(appointment.status))
        .sort((left, right) => new Date(left.start_time) - new Date(right.start_time))[0],
    [appointmentItems],
  );

  const pendingMedicationCount = medicationLogs.filter((log) => log.status === "PENDING").length;
  const takenMedicationCount = medicationLogs.filter((log) => log.status === "TAKEN").length;
  const sortedMedicationLogs = useMemo(
    () =>
      [...medicationLogs].sort(
        (left, right) => new Date(left.scheduled_time) - new Date(right.scheduled_time),
      ),
    [medicationLogs],
  );

  /**
   * Xác nhận đã uống thuốc ngay trên dashboard.
   * Hàm gọi API cập nhật log và sửa state local để widget phản hồi tức thì.
   */
  const handleDashboardMedicationTaken = async (event, logId) => {
    // Chặn click lan ra các vùng điều hướng khác trong widget.
    event.preventDefault();
    event.stopPropagation();

    try {
      // Gọi API dùng chung với trang tủ thuốc để đảm bảo quyền và dữ liệu nhất quán.
      await markMedicationTaken(logId);

      // Cập nhật state local, ghi nhận thời điểm uống ngay tại client.
      setMedicationLogs((current) =>
        current.map((log) =>
          log.log_id === logId
            ? { ...log, status: "TAKEN", taken_at: new Date().toISOString() }
            : log,
        ),
      );
    } catch {
      // Dashboard giữ yên lặng để không làm gián đoạn trải nghiệm; trang tủ thuốc vẫn có xử lý đầy đủ.
    }
  };

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

      {/* Lịch uống thuốc hôm nay được đặt ngay đầu dashboard vì đây là tác vụ cần bệnh nhân xử lý nhanh nhất. */}
      <section className="rounded-2xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-500 p-4 text-white shadow-lg shadow-emerald-100 md:p-5">
        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-emerald-100">medication</span>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-emerald-100">Nhắc thuốc hôm nay</p>
            </div>
            <h2 className="mt-1 text-xl font-black">Lịch uống thuốc hôm nay</h2>
            <p className="mt-0.5 text-xs font-medium text-emerald-100">
              {medicationLogs.length
                ? `${takenMedicationCount}/${medicationLogs.length} lượt đã hoàn tất, ${pendingMedicationCount} lượt đang chờ.`
                : "Chưa có lịch uống thuốc nào hôm nay."}
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/patient/medications")}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-black text-emerald-700 shadow-lg transition-colors hover:bg-emerald-50"
          >
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
            Mở tủ thuốc
          </button>
        </div>

        {sortedMedicationLogs.length === 0 ? (
          <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-center">
            <span className="material-symbols-outlined text-2xl text-emerald-100">event_available</span>
            <p className="mt-1 text-xs font-bold text-emerald-50">Không có lượt uống thuốc hôm nay</p>
          </div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {sortedMedicationLogs.slice(0, 6).map((log) => {
              const statusMeta = getMedicationStatusMeta(log.status);

              return (
                <div key={log.log_id} className="rounded-xl bg-white/12 p-3 ring-1 ring-white/10">
                  {/* Tên thuốc chiếm hàng riêng để không bị badge hoặc nút thao tác che mất. */}
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
                      <span className="material-symbols-outlined text-[19px] text-emerald-50">medication</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-black leading-4 text-white">{log.medication?.name ?? "Thuốc"}</p>
                      <p className="mt-0.5 break-words text-[11px] font-bold leading-4 text-emerald-100">
                        {formatMedicationTime(log.scheduled_time)}
                        {log.medication?.dosage ? ` · ${log.medication.dosage}` : ""}
                      </p>
                    </div>
                  </div>

                  {/* Hàng trạng thái và hành động đặt bên dưới để card ngang vẫn gọn trên desktop/mobile. */}
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black ${statusMeta.className}`}>
                      <span className="material-symbols-outlined text-[12px]">{statusMeta.icon}</span>
                      {statusMeta.label}
                    </span>
                    {log.status === "PENDING" && (
                      <button
                        type="button"
                        onClick={(event) => handleDashboardMedicationTaken(event, log.log_id)}
                        className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-emerald-700 shadow-sm transition-colors hover:bg-emerald-50"
                      >
                        Đánh dấu đã uống
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {sortedMedicationLogs.length > 6 && (
          <button
            type="button"
            onClick={() => navigate("/patient/medications")}
            className="mt-2 w-full rounded-xl bg-white/10 px-4 py-1.5 text-center text-xs font-black text-emerald-50 transition-colors hover:bg-white/15"
          >
            +{sortedMedicationLogs.length - 6} lượt khác trong hôm nay
          </button>
        )}
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
                  {nextAppointment ? (
                    <>
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-primary">
                        <span className="material-symbols-outlined">stethoscope</span>
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-800 truncate">{nextAppointment.doctor?.name || "Bác sĩ"}</h4>
                        <p className="text-xs text-slate-500 truncate">{nextAppointment.status === "APPROVED" ? "Đã xác nhận" : "Chờ xác nhận"}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-bold pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-1 text-slate-600">
                        <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                        {formatAppointmentDateTime(nextAppointment.start_time)}
                      </div>
                      <div className="flex items-center gap-1 text-secondary">
                        <span className="material-symbols-outlined text-[14px]">videocam</span>
                        {nextAppointment.type === "ONLINE" ? "Online" : "Trực tiếp"}
                      </div>
                    </div>
                    <button onClick={() => navigate("/patient/appointments")} className="w-full mt-2 py-2.5 rounded-xl bg-primary text-white text-xs font-black shadow-lg shadow-primary/20 hover:brightness-110 transition-all">
                     Xem lịch hẹn
                    </button>
                    </>
                  ) : (
                    <div className="py-4 text-center">
                      <span className="material-symbols-outlined text-3xl text-slate-300">event_busy</span>
                      <p className="mt-2 text-xs font-bold text-slate-400">Chưa có lịch hẹn sắp tới.</p>
                      <button onClick={() => navigate("/patient/appointments")} className="mt-3 rounded-xl bg-primary px-4 py-2 text-xs font-black text-white">
                        Đặt lịch mới
                      </button>
                    </div>
                  )}
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
