import { calculatePhrBmi } from "../lib/phrOverviewModel";

function SectionHeader({ icon, title, color = "text-primary", bgColor = "bg-primary/10" }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${bgColor} ${color}`}>
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>
      <h2 className="text-xl font-black tracking-tight text-slate-800">{title}</h2>
    </div>
  );
}

function PhrMetricCard({ label, value, unit, status, colorClass, icon, isEditing, onChange }) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-5 transition-all hover:shadow-lg hover:shadow-slate-100">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
        <span className={`material-symbols-outlined text-[18px] ${colorClass}`}>{icon}</span>
      </div>
      <div className="flex items-end justify-between">
        <div className="flex-1">
          {isEditing ? (
            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xl font-bold focus:border-primary focus:outline-none"
              value={value || ""}
              onChange={(event) => onChange?.(event.target.value)}
            />
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-800">{value || "--"}</span>
              <span className="text-xs font-bold text-slate-400">{unit}</span>
            </div>
          )}
          {!isEditing && <p className={`mt-1 text-[10px] font-bold uppercase tracking-tighter ${colorClass}`}>{status}</p>}
        </div>
      </div>
    </div>
  );
}

function BadgeTag({ text, color = "bg-slate-100 text-slate-600", isEditing, onRemove }) {
  return (
    <div className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold ${color}`}>
      {text}
      {isEditing && onRemove ? (
        <button type="button" onClick={onRemove} className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-black/10">
          <span className="material-symbols-outlined text-[12px]">close</span>
        </button>
      ) : null}
    </div>
  );
}

export function PhrOverviewContent({
  data,
  isEditing = false,
  onFieldChange = null,
  onAddTag = null,
  onRemoveTag = null,
  headerAction = null,
}) {
  const { personalInfo, vitals, medicalHistory, clinicalResults } = data;

  const renderField = (label, value, section, field, subField = null) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">{label}</label>
      {isEditing ? (
        <input
          className="rounded-lg border border-surface-variant bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          value={value || ""}
          onChange={(event) => onFieldChange?.(section, field, event.target.value, subField)}
        />
      ) : (
        <p className="text-sm font-medium text-on-surface">{value || "--"}</p>
      )}
    </div>
  );

  const bmiValue = calculatePhrBmi(vitals.height, vitals.weight, vitals.bmi);

  return (
    <div className="space-y-8 pb-12">
      <section className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-8 text-white shadow-2xl md:p-12">
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-primary/20 blur-[100px]" />
        <div className="absolute -left-10 -bottom-10 h-64 w-64 rounded-full bg-secondary/10 blur-[100px]" />

        <div className="relative z-10 flex flex-col items-center justify-between gap-8 md:flex-row">
          <div className="flex-1">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                CCCD / CMND: {personalInfo.idCard || "Chưa cập nhật"}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-md">
                Nhóm máu: {personalInfo.bloodType || "Chưa cập nhật"}
              </span>
            </div>
            <h1 className="mb-3 text-3xl font-black md:text-5xl">Hồ sơ sức khỏe tổng quát</h1>
            <p className="text-lg font-medium text-slate-400">
              Phân loại sức khỏe:{" "}
              <span className="font-bold text-secondary">{clinicalResults.conclusion.healthClass || "Chưa cập nhật"}</span>
            </p>
          </div>

          {headerAction ? <div className="flex gap-4">{headerAction}</div> : null}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-12 xl:col-span-8">
          <div className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-sm">
            <SectionHeader icon="person_search" title="Thông tin định danh" color="text-sky-600" bgColor="bg-sky-50" />
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              <div className="space-y-6">
                {renderField("Họ và tên", personalInfo.fullName, "personalInfo", "fullName")}
                {renderField("Ngày sinh", personalInfo.dob, "personalInfo", "dob")}
                {renderField("Giới tính", personalInfo.gender, "personalInfo", "gender")}
              </div>
              <div className="space-y-6">
                {renderField("CCCD / CMND", personalInfo.idCard, "personalInfo", "idCard")}
                {renderField("Nhóm máu", personalInfo.bloodType, "personalInfo", "bloodType")}
                {renderField("Số điện thoại", personalInfo.phone, "personalInfo", "phone")}
                {renderField("Địa chỉ", personalInfo.address, "personalInfo", "address")}
              </div>
              <div className="rounded-3xl border border-orange-100 bg-orange-50/50 p-6">
                <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-orange-600">Liên hệ khẩn cấp</p>
                <div className="space-y-4">
                  {renderField("Người thân", personalInfo.emergencyContact.name, "personalInfo", "emergencyContact", "name")}
                  {renderField("Quan hệ", personalInfo.emergencyContact.relation, "personalInfo", "emergencyContact", "relation")}
                  {renderField("Điện thoại", personalInfo.emergencyContact.phone, "personalInfo", "emergencyContact", "phone")}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <SectionHeader icon="vital_signs" title="Chỉ số Sinh tồn & Thể lực" color="text-emerald-600" bgColor="bg-emerald-50" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
              <PhrMetricCard
                label="Chiều cao"
                value={vitals.height}
                unit="cm"
                status="Ổn định"
                colorClass="text-sky-500"
                icon="straighten"
                isEditing={isEditing}
                onChange={(value) => onFieldChange?.("vitals", "height", value)}
              />
              <PhrMetricCard
                label="Cân nặng"
                value={vitals.weight}
                unit="kg"
                status="Bình thường"
                colorClass="text-emerald-500"
                icon="weight"
                isEditing={isEditing}
                onChange={(value) => onFieldChange?.("vitals", "weight", value)}
              />
              <PhrMetricCard
                label="Nhịp tim"
                value={vitals.heartRate}
                unit="bpm"
                status="Nhịp xoang đều"
                colorClass="text-rose-500"
                icon="favorite"
                isEditing={isEditing}
                onChange={(value) => onFieldChange?.("vitals", "heartRate", value)}
              />
              <PhrMetricCard
                label="Huyết áp"
                value={vitals.bloodPressure}
                unit="mmHg"
                status="120/80 Target"
                colorClass="text-indigo-500"
                icon="blood_pressure"
                isEditing={isEditing}
                onChange={(value) => onFieldChange?.("vitals", "bloodPressure", value)}
              />
            </div>
          </div>

          <div className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-sm">
            <SectionHeader icon="history_edu" title="Tiền sử & Yếu tố nguy cơ" color="text-amber-600" bgColor="bg-amber-50" />
            <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
              <div className="space-y-6">
                <div>
                  <label className="mb-3 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Dị ứng thuốc & Thực phẩm
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(medicalHistory.allergies || []).map((item, index) => (
                      <BadgeTag
                        key={`${item}-${index}`}
                        text={item}
                        color="bg-rose-50 text-rose-600"
                        isEditing={isEditing}
                        onRemove={() => onRemoveTag?.("medicalHistory", "allergies", index)}
                      />
                    ))}
                    {isEditing && onAddTag ? (
                      <button
                        type="button"
                        onClick={() => onAddTag("medicalHistory", "allergies")}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-colors hover:bg-rose-100 hover:text-rose-600"
                      >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                      </button>
                    ) : null}
                  </div>
                </div>
                <div>
                  <label className="mb-3 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Bệnh lý cá nhân
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(medicalHistory.personal || []).map((item, index) => (
                      <BadgeTag
                        key={`${item}-${index}`}
                        text={item}
                        color="bg-amber-50 text-amber-600"
                        isEditing={isEditing}
                        onRemove={() => onRemoveTag?.("medicalHistory", "personal", index)}
                      />
                    ))}
                    {isEditing && onAddTag ? (
                      <button
                        type="button"
                        onClick={() => onAddTag("medicalHistory", "personal")}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-colors hover:bg-amber-100 hover:text-amber-600"
                      >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                      </button>
                    ) : null}
                  </div>
                </div>
                <div>
                  <label className="mb-3 block text-[10px] font-black uppercase tracking-widest text-slate-400">Tiền sử gia đình</label>
                  <div className="flex flex-wrap gap-2">
                    {(medicalHistory.family || []).length ? (
                      medicalHistory.family.map((item, index) => (
                        <BadgeTag key={`${item}-${index}`} text={item} color="bg-slate-100 text-slate-600" />
                      ))
                    ) : (
                      <p className="text-sm font-medium text-slate-400">Chưa cập nhật</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-slate-100 bg-slate-50/50 p-8">
                <label className="mb-6 block text-[10px] font-black uppercase tracking-widest text-slate-400">Lối sống & Thói quen</label>
                <div className="grid grid-cols-2 gap-6">
                  {renderField("Hút thuốc", medicalHistory.lifestyle.smoking, "medicalHistory", "lifestyle", "smoking")}
                  {renderField("Rượu bia", medicalHistory.lifestyle.alcohol, "medicalHistory", "lifestyle", "alcohol")}
                  <div className="col-span-2">
                    {renderField("Tần suất vận động", medicalHistory.lifestyle.exercise, "medicalHistory", "lifestyle", "exercise")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8 lg:col-span-12 xl:col-span-4">
          <div className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-sm">
            <SectionHeader icon="medical_information" title="Kết quả khám" color="text-indigo-600" bgColor="bg-indigo-50" />

            <div className="space-y-8">
              <div className="relative border-l-2 border-indigo-100 pl-6">
                <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full border-4 border-white bg-indigo-500" />
                <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-indigo-400">Khám lâm sàng</p>
                <div className="grid grid-cols-2 gap-4">
                  {renderField("Nội khoa", clinicalResults.clinical.internal, "clinicalResults", "clinical", "internal")}
                  {renderField("Ngoại khoa", clinicalResults.clinical.surgical, "clinicalResults", "clinical", "surgical")}
                  {renderField("Mắt", clinicalResults.clinical.eyes, "clinicalResults", "clinical", "eyes")}
                  {renderField("Tai mũi họng", clinicalResults.clinical.ent, "clinicalResults", "clinical", "ent")}
                </div>
              </div>

              <div className="relative border-l-2 border-indigo-100 pl-6">
                <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full border-4 border-white bg-indigo-300" />
                <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-indigo-400">Cận lâm sàng</p>
                <div className="space-y-4">
                  {renderField("Xét nghiệm máu", clinicalResults.subclinical.bloodTest, "clinicalResults", "subclinical", "bloodTest")}
                  {renderField("Hình ảnh", clinicalResults.subclinical.imaging, "clinicalResults", "subclinical", "imaging")}
                  {renderField(
                    "ECG / Chức năng",
                    clinicalResults.subclinical.functional,
                    "clinicalResults",
                    "subclinical",
                    "functional",
                  )}
                </div>
              </div>

              <div className="mt-8 rounded-[2rem] bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 text-white shadow-xl shadow-indigo-100">
                <div className="mb-4 flex items-center gap-2 opacity-80">
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  <p className="text-[10px] font-black uppercase tracking-widest">Kết luận bác sĩ</p>
                </div>
                <h4 className="mb-4 text-xl font-bold">Loại sức khỏe: {clinicalResults.conclusion.healthClass || "Chưa cập nhật"}</h4>
                <p className="text-xs italic leading-relaxed text-indigo-100">
                  “{clinicalResults.conclusion.advice || "Chưa có khuyến nghị lâm sàng gần nhất."}”
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[2.5rem] bg-emerald-600 p-8 text-white">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-100">Chỉ số BMI</p>
                <p className="text-3xl font-black">{bmiValue || "--"}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                <span className="material-symbols-outlined text-white">body_system</span>
              </div>
            </div>
            <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-white"
                style={{ width: bmiValue ? `${Math.max(20, Math.min(Number(bmiValue) * 3, 100))}%` : "0%" }}
              />
            </div>
            <p className="text-center text-[10px] font-medium uppercase tracking-widest text-emerald-100">Ngưỡng cân bằng</p>
          </div>
        </div>
      </div>
    </div>
  );
}
