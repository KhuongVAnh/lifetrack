import { Navigate, useParams } from "react-router-dom";
import { patientProfiles } from "../data/mockData";
import { ImageWithFallback } from "../components/ImageWithFallback";

export function HealthRecordDetailPage() {
  const { memberId } = useParams();
  const profile = patientProfiles[memberId];

  if (!profile) {
    return <Navigate replace to="/patient/health-records" />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="grid gap-6 lg:grid-cols-12">
        <section className="rounded-[2rem] bg-surface-container-lowest p-8 lg:col-span-8">
          <div className="flex flex-col items-center gap-8 md:flex-row md:items-start">
            <div className="relative">
              <ImageWithFallback alt={profile.name} className="h-32 w-32 rounded-[1.75rem] object-cover" src={profile.avatar} />
              <div className="absolute -bottom-2 -right-2 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-white">
                {profile.status}
              </div>
            </div>
            <div className="flex-1 space-y-6 text-center md:text-left">
              <div>
                <h1 className="text-3xl font-black text-primary">{profile.name}</h1>
                <p className="font-medium tracking-wide text-outline">MÃ ĐỊNH DANH Y TẾ: {profile.healthId}</p>
              </div>
              <div className="grid gap-6 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-outline-variant">Nhóm máu</p>
                  <p className="mt-2 text-2xl font-bold">{profile.bloodType}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-outline-variant">Chỉ số BMI</p>
                  <p className="mt-2 text-2xl font-bold">{profile.bmi}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-outline-variant">Trạng thái</p>
                  <p className="mt-2 text-lg font-bold text-secondary">{profile.status}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] bg-error-container/40 p-6 ring-2 ring-error/20 lg:col-span-4">
          <div className="mb-4 flex items-center gap-3 text-error">
            <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              warning
            </span>
            <h2 className="text-lg font-black uppercase tracking-tight">Cảnh báo y tế quan trọng</h2>
          </div>
          <div className="space-y-4">
            {profile.alerts.map((alert) => (
              <div key={alert.label} className="rounded-xl bg-white/60 p-4">
                <p className="mb-1 text-xs font-bold uppercase text-error">{alert.label}</p>
                <p className="text-xl font-bold text-on-error-container">{alert.value}</p>
              </div>
            ))}
          </div>
          <button className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-error py-3 font-bold text-white">
            <span className="material-symbols-outlined text-sm">edit</span>
            Cập nhật khẩn cấp
          </button>
        </section>
      </div>

      <section className="grid gap-6 lg:grid-cols-12">
        <div className="rounded-[2rem] bg-surface-container-lowest p-8 lg:col-span-7">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-on-surface">Lịch sử khám bệnh</h2>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              {profile.visits.length} lần khám
            </span>
          </div>
          <div className="space-y-4">
            {profile.visits.map((visit) => (
              <div key={visit.id} className="rounded-2xl border border-outline-variant/20 p-5">
                <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-outline">{visit.date}</p>
                    <h3 className="mt-1 text-lg font-bold text-on-surface">{visit.diagnosis}</h3>
                  </div>
                  <div className="text-sm text-on-surface-variant">
                    {visit.doctorName} • {visit.specialty}
                  </div>
                </div>
                <p className="text-sm font-medium text-on-surface-variant">{visit.note}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6 lg:col-span-5">
          <div className="rounded-[2rem] bg-surface-container-lowest p-8">
            <h2 className="mb-6 text-xl font-bold text-on-surface">Đơn thuốc hiện tại</h2>
            <div className="space-y-4">
              {profile.prescriptions.map((prescription) => (
                <div key={prescription.name} className="rounded-2xl bg-surface-container-low p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="font-bold text-on-surface">{prescription.name}</h3>
                    <span className="rounded-full bg-secondary-container px-2 py-1 text-[10px] font-bold uppercase text-on-secondary-container">
                      {prescription.tag}
                    </span>
                  </div>
                  <p className="text-sm text-on-surface-variant">{prescription.usage}</p>
                  <p className="mt-2 text-xs font-semibold text-primary">Còn {prescription.remaining}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] bg-surface-container-lowest p-8">
            <h2 className="mb-6 text-xl font-bold text-on-surface">Kết quả xét nghiệm & hình ảnh</h2>
            <div className="space-y-4">
              {profile.labResults.map((result) => (
                <div key={result.name} className="rounded-2xl border border-outline-variant/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-bold text-on-surface">{result.name}</h3>
                    <span className="text-xs font-bold uppercase tracking-widest text-outline">{result.date}</span>
                  </div>
                  <p className="mt-2 text-sm text-on-surface-variant">{result.summary}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
