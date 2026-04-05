import { Link } from "react-router-dom";
import { familyMembers, patientProfiles } from "../data/mockData";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { StatSparkline } from "../components/StatSparkline";

export function HealthRecordsPage() {
  const leadMember = patientProfiles[familyMembers[0].id];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="mb-2 text-4xl font-extrabold tracking-tight text-primary">Hồ sơ sức khỏe (Gia đình)</h1>
          <p className="text-lg text-on-surface-variant">
            Quản lý và theo dõi sức khỏe của những người thân yêu trong một giao diện thống nhất.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 rounded-xl bg-surface-container-high px-6 py-4 font-bold text-primary">
            <span className="material-symbols-outlined">person_add</span>
            Thêm thành viên
          </button>
          <button className="flex items-center gap-2 rounded-xl bg-primary px-8 py-4 font-bold text-white shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined">sync</span>
            Cập nhật chỉ số
          </button>
        </div>
      </div>

      <section className="mb-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-on-surface">Thành viên gia đình</h2>
          <span className="text-sm font-medium text-primary">Xem tất cả</span>
        </div>
        <div className="flex gap-6 overflow-x-auto pb-4 no-scrollbar">
          {familyMembers.map((member, index) => (
            <Link
              key={member.id}
              className={[
                "flex w-80 flex-none flex-col justify-between rounded-3xl p-6 transition-all",
                index === 0
                  ? "bg-primary text-white shadow-xl ring-4 ring-primary-container/30"
                  : "border border-outline-variant/30 bg-surface-container-lowest hover:border-primary/50",
              ].join(" ")}
              to={`/patient/health-records/${member.id}`}
            >
              <div className="mb-8 flex items-center gap-4">
                <ImageWithFallback
                  alt={member.name}
                  className="h-16 w-16 rounded-2xl object-cover"
                  src={member.avatar}
                />
                <div>
                  <p className={index === 0 ? "text-sm opacity-80" : "text-sm text-on-surface-variant"}>{member.relation}</p>
                  <h3 className={index === 0 ? "text-xl font-bold" : "text-xl font-bold text-on-surface"}>{member.name}</h3>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span
                  className={[
                    "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider",
                    index === 0 ? "bg-white/20" : "bg-surface-container-high text-on-surface-variant",
                  ].join(" ")}
                >
                  {index === 0 ? "Đang xem" : member.shortStatus}
                </span>
                <span className={index === 0 ? "font-bold" : "font-bold text-primary"}>Xem chi tiết</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-12">
        <section className="space-y-6 lg:col-span-7">
          <div>
            <h2 className="text-2xl font-bold text-on-surface">Chỉ số sức khỏe: {leadMember.relation}</h2>
            <p className="mt-2 text-on-surface-variant">Tổng hợp các chỉ số quan trọng và xu hướng gần đây của {leadMember.name}.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {leadMember.keyStats.map((stat) => (
              <div key={stat.label} className="rounded-[2rem] bg-surface-container-lowest p-6 shadow-sm">
                <p className="mb-2 text-sm font-medium text-on-surface-variant">{stat.label}</p>
                <div className="text-3xl font-black text-primary">{stat.value}</div>
                <p className="mt-3 text-sm font-semibold text-secondary">{stat.trend}</p>
              </div>
            ))}
          </div>
          <div className="rounded-[2rem] bg-surface-container-lowest p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-lg font-bold text-on-surface">Xu hướng 5 kỳ gần nhất</p>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">Bố</span>
            </div>
            <StatSparkline colorClass="bg-primary" series={leadMember.chart} />
          </div>
        </section>

        <section className="lg:col-span-5">
          <div className="rounded-[2rem] bg-surface-container-lowest p-8 shadow-sm">
            <h2 className="mb-8 text-2xl font-bold text-on-surface">Bệnh sử tóm tắt</h2>
            <div className="space-y-4">
              {leadMember.historySummary.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl bg-surface-container-low p-4">
                  <span className="material-symbols-outlined rounded-full bg-primary/10 p-2 text-primary">medical_information</span>
                  <p className="font-medium text-on-surface">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
