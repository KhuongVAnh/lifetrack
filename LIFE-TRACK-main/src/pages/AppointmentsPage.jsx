import { useMemo, useState } from "react";
import { appointments, doctorProfiles, getDoctorById } from "../data/mockData";
import { ImageWithFallback } from "../components/ImageWithFallback";
import { RatingStars } from "../components/RatingStars";

export function AppointmentsPage() {
  const [specialtyId, setSpecialtyId] = useState(appointments.specialties[0].id);
  const [doctorId, setDoctorId] = useState(appointments.suggestedDoctorIds[0]);
  const [dayId, setDayId] = useState(appointments.slotDays[0].id);
  const [timeId, setTimeId] = useState(appointments.timeSlots[0].id);
  const [reason, setReason] = useState("Tái khám và cập nhật huyết áp cho bố.");
  const [attachment, setAttachment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const suggestedDoctors = useMemo(
    () =>
      appointments.suggestedDoctorIds
        .map((id) => getDoctorById(id))
        .filter((doctor) => doctor),
    [],
  );

  const selectedDoctor = getDoctorById(doctorId);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <section className="rounded-2xl border border-surface-variant bg-surface-container-lowest p-6">
        <div className="relative mx-auto flex max-w-2xl items-center justify-between">
          <div className="absolute left-0 top-5 h-0.5 w-full bg-surface-container-high" />
          {[
            { step: 1, label: "Bác sĩ", active: true },
            { step: 2, label: "Thời gian" },
            { step: 3, label: "Thông tin" },
          ].map((item, index) => (
            <div key={item.label} className="relative z-10 flex flex-col items-center gap-2 bg-white px-4">
              <div
                className={[
                  "flex h-10 w-10 items-center justify-center rounded-full font-bold",
                  index === 0 ? "bg-primary text-white" : "bg-surface-container-high text-outline",
                ].join(" ")}
              >
                {item.step}
              </div>
              <span className={index === 0 ? "text-sm font-bold text-primary" : "text-sm font-medium text-outline"}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-7">
          <section>
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-on-surface">
              <span className="material-symbols-outlined text-primary">medical_information</span>
              Chọn chuyên khoa
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {appointments.specialties.map((specialty) => {
                const active = specialty.id === specialtyId;

                return (
                  <button
                    key={specialty.id}
                    className={[
                      "group flex flex-col items-center gap-3 rounded-lg border bg-surface-container-lowest p-5 transition-all",
                      active ? "border-primary bg-primary/5" : "border-surface-variant hover:border-primary",
                    ].join(" ")}
                    onClick={() => setSpecialtyId(specialty.id)}
                    type="button"
                  >
                    <div
                      className={[
                        "flex h-14 w-14 items-center justify-center rounded-full transition-colors",
                        active ? "bg-primary text-white" : "bg-primary-fixed-dim text-primary",
                      ].join(" ")}
                    >
                      <span className="material-symbols-outlined text-2xl">{specialty.icon}</span>
                    </div>
                    <span className="text-sm font-bold text-on-surface-variant">{specialty.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-end justify-between">
              <h2 className="text-xl font-bold text-on-surface">Bác sĩ gợi ý</h2>
              <span className="text-sm font-bold text-primary">Tất cả</span>
            </div>
            <div className="space-y-3">
              {suggestedDoctors.map((doctor, index) => {
                const selected = doctor.id === doctorId;

                return (
                  <div
                    key={doctor.id}
                    className={[
                      "group flex flex-col items-start gap-5 rounded-lg border bg-surface-container-lowest p-5 transition-all md:flex-row md:items-center",
                      selected ? "border-primary/40 shadow-sm" : "border-surface-variant hover:border-primary/30",
                    ].join(" ")}
                  >
                    <ImageWithFallback alt={doctor.name} className="h-20 w-20 rounded-lg object-cover" src={doctor.avatar} />
                    <div className="flex-grow">
                      <div className="mb-1 flex items-center gap-2">
                        {index === 0 && (
                          <span className="rounded bg-primary-fixed px-1.5 py-0.5 text-[10px] font-bold text-primary">
                            ƯU TÚ
                          </span>
                        )}
                        <h3 className="text-lg font-bold">{doctor.name}</h3>
                      </div>
                      <p className="mb-2 text-sm text-on-surface-variant">
                        {doctor.title} • {doctor.experienceYears} năm kinh nghiệm
                      </p>
                      <div className="flex items-center gap-2">
                        <RatingStars rating={doctor.rating} />
                        <span className="text-sm font-bold text-secondary">
                          {doctor.rating} ({doctor.reviewCount})
                        </span>
                      </div>
                    </div>
                    <button
                      className={[
                        "w-full rounded-lg px-6 py-2.5 text-sm font-bold transition-colors md:w-auto",
                        selected
                          ? "bg-primary text-white"
                          : "border border-outline-variant bg-surface-container-high text-on-surface-variant",
                      ].join(" ")}
                      onClick={() => setDoctorId(doctor.id)}
                      type="button"
                    >
                      Chọn bác sĩ
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-on-surface">
                <span className="material-symbols-outlined text-primary">calendar_month</span>
                Chọn ngày khám
              </h3>
              <div className="flex gap-3 overflow-x-auto no-scrollbar">
                {appointments.slotDays.map((day) => {
                  const active = day.id === dayId;
                  return (
                    <button
                      key={day.id}
                      className={[
                        "flex h-20 w-16 flex-shrink-0 flex-col items-center justify-center rounded-lg border text-sm font-bold transition-all",
                        active
                          ? "border-primary bg-primary text-white"
                          : "border-surface-variant bg-surface-container-lowest hover:border-primary",
                      ].join(" ")}
                      onClick={() => setDayId(day.id)}
                      type="button"
                    >
                      <span>{day.label}</span>
                      <span className="text-2xl">{day.day}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-on-surface">
                <span className="material-symbols-outlined text-primary">schedule</span>
                Chọn giờ
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {appointments.timeSlots.map((slot) => {
                  const active = slot.id === timeId;
                  return (
                    <button
                      key={slot.id}
                      className={[
                        "rounded-lg py-3 text-sm transition-all",
                        !slot.available
                          ? "cursor-not-allowed border border-surface-variant bg-surface-container-high text-outline opacity-50"
                          : active
                            ? "border-2 border-primary bg-primary/5 font-bold text-primary"
                            : "border border-surface-variant bg-surface-container-lowest text-on-surface hover:border-primary",
                      ].join(" ")}
                      disabled={!slot.available}
                      onClick={() => setTimeId(slot.id)}
                      type="button"
                    >
                      {slot.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] bg-surface-container-lowest p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-on-surface">
              <span className="material-symbols-outlined text-primary">description</span>
              Thông tin cuộc hẹn
            </h3>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-on-surface">Lý do khám</label>
                <textarea
                  className="min-h-28 w-full rounded-xl border-none bg-surface-container-high p-4 focus:ring-2 focus:ring-primary/20"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-on-surface">Hình ảnh (không bắt buộc)</label>
                <input
                  className="w-full rounded-xl border-none bg-surface-container-high p-4 focus:ring-2 focus:ring-primary/20"
                  placeholder="Dán URL ảnh xét nghiệm hoặc tài liệu"
                  type="text"
                  value={attachment}
                  onChange={(event) => setAttachment(event.target.value)}
                />
              </div>
              <button
                className="flex w-full items-center justify-center gap-3 rounded-lg bg-primary py-4 text-lg font-bold text-white shadow-lg transition-all hover:bg-primary-container"
                onClick={() => setSubmitted(true)}
                type="button"
              >
                <span className="material-symbols-outlined">check_circle</span>
                Xác nhận lịch khám
              </button>
            </div>
          </section>
        </div>

        <aside className="space-y-6 lg:col-span-5">
          <div className="rounded-[2rem] bg-primary-container p-8 text-white shadow-xl shadow-primary/20">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-fixed-dim">Đặt lịch</p>
            <h2 className="mt-3 text-2xl font-bold">Tóm tắt cuộc hẹn</h2>
            {selectedDoctor && (
              <div className="mt-6 rounded-2xl bg-white/10 p-4">
                <div className="flex items-center gap-4">
                  <ImageWithFallback alt={selectedDoctor.name} className="h-16 w-16 rounded-2xl object-cover" src={selectedDoctor.avatar} />
                  <div>
                    <h3 className="font-bold">{selectedDoctor.name}</h3>
                    <p className="text-sm opacity-90">{selectedDoctor.title}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <p>Ngày khám: {appointments.slotDays.find((day) => day.id === dayId)?.day}/04/2026</p>
                  <p>Khung giờ: {appointments.timeSlots.find((slot) => slot.id === timeId)?.label}</p>
                  <p>Lý do: {reason}</p>
                </div>
              </div>
            )}
            {submitted && (
              <div className="mt-4 rounded-2xl bg-secondary px-4 py-3 text-sm font-bold text-white">
                Đã tạo lịch hẹn mock thành công. Bạn có thể tiếp tục tinh chỉnh trước khi nối API thật.
              </div>
            )}
          </div>

          <div className="rounded-[2rem] bg-surface-container-lowest p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold text-on-surface">Bác sĩ đang đồng hành</h3>
            <div className="space-y-4">
              {doctorProfiles.slice(0, 2).map((doctor) => (
                <div key={doctor.id} className="flex items-center gap-4 rounded-2xl bg-surface-container-low p-4">
                  <ImageWithFallback alt={doctor.name} className="h-14 w-14 rounded-xl object-cover" src={doctor.avatar} />
                  <div>
                    <p className="font-bold text-on-surface">{doctor.name}</p>
                    <p className="text-sm text-on-surface-variant">{doctor.specialty}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
