import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { useAuth } from "@/app/providers/AuthProvider";
import { getPhrOverview, updatePhrOverview } from "@/features/phr/api/phrApi";
import { mockPhrOverview } from "@/features/phr/mocks/phrMockData";

function SectionHeader({ icon, title, color = "text-primary", bgColor = "bg-primary/10" }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${bgColor} ${color}`}>
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>
      <h2 className="text-xl font-black tracking-tight text-slate-800">{title}</h2>
    </div>
  );
}

function PHRMetricCard({ label, value, unit, status, colorClass, icon, isEditing, onChange }) {
  return (
    <div className={`group relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-5 transition-all hover:shadow-lg hover:shadow-slate-100`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
        <span className={`material-symbols-outlined text-[18px] ${colorClass}`}>{icon}</span>
      </div>
      <div className="flex items-end justify-between">
        <div className="flex-1">
          {isEditing ? (
            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xl font-bold focus:border-primary focus:outline-none"
              value={value || ""}
              onChange={(e) => onChange(e.target.value)}
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
      {isEditing && (
        <button onClick={onRemove} className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-black/10">
          <span className="material-symbols-outlined text-[12px]">close</span>
        </button>
      )}
    </div>
  );
}

export function PhrOverviewPage() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState(mockPhrOverview);
  
  // Lưu state gốc để có thể Cancel
  const [originalData, setOriginalData] = useState(mockPhrOverview);

  useEffect(() => {
    let active = true;
    const fetchOverview = async () => {
      if (!user?.user_id) return;
      try {
        setLoading(true);
        const data = await getPhrOverview(user.user_id);
        
        if (active && data) {
          // Merge Data to prevent undefined errors
          const mergedData = {
            personalInfo: { 
              ...mockPhrOverview.personalInfo, 
              ...(data.personal_info || {}),
              emergencyContact: {
                ...mockPhrOverview.personalInfo.emergencyContact,
                ...(data.personal_info?.emergencyContact || {})
              }
            },
            vitals: { ...mockPhrOverview.vitals, ...(data.vitals || {}) },
            medicalHistory: { 
              ...mockPhrOverview.medicalHistory, 
              ...(data.medical_history || {}),
              lifestyle: {
                ...mockPhrOverview.medicalHistory.lifestyle,
                ...(data.medical_history?.lifestyle || {})
              }
            },
            clinicalResults: { 
              ...mockPhrOverview.clinicalResults, 
              ...(data.clinical_results || {}),
              clinical: { ...mockPhrOverview.clinicalResults.clinical, ...(data.clinical_results?.clinical || {}) },
              subclinical: { ...mockPhrOverview.clinicalResults.subclinical, ...(data.clinical_results?.subclinical || {}) },
              conclusion: { ...mockPhrOverview.clinicalResults.conclusion, ...(data.clinical_results?.conclusion || {}) },
            },
          };
          
          setFormData(mergedData);
          setOriginalData(mergedData);
        }
      } catch (error) {
        toast.error("Không thể tải hồ sơ sức khỏe");
        console.error(error);
      } finally {
        if (active) setLoading(false);
      }
    };
    
    fetchOverview();
    return () => { active = false; };
  }, [user]);

  const handleSave = async () => {
    try {
      if (!user?.user_id) return;
      const payload = {
        personal_info: formData.personalInfo,
        vitals: formData.vitals,
        medical_history: formData.medicalHistory,
        clinical_results: formData.clinicalResults,
      };

      await updatePhrOverview(user.user_id, payload);
      setOriginalData(formData);
      setIsEditing(false);
      toast.success("Đã cập nhật hồ sơ sức khỏe");
    } catch (error) {
      toast.error("Lỗi khi lưu hồ sơ sức khỏe");
      console.error(error);
    }
  };

  const handleCancel = () => {
    setFormData(originalData); // reset
    setIsEditing(false);
  };

  const handleInputChange = (section, field, value, subField = null) => {
    setFormData((prev) => {
      const clonedData = structuredClone(prev);
      if (subField) {
        clonedData[section][field][subField] = value;
      } else {
        clonedData[section][field] = value;
      }
      return clonedData;
    });
  };

  const handleArrayChange = (section, field, action, value = null, index = null) => {
    setFormData((prev) => {
      const clonedData = structuredClone(prev);
      const arr = clonedData[section][field] || [];
      if (action === "add" && value) {
        clonedData[section][field] = [...arr, value];
      } else if (action === "remove" && index !== null) {
        clonedData[section][field] = arr.filter((_, i) => i !== index);
      }
      return clonedData;
    });
  };

  const promptAddTag = (section, field) => {
    const val = prompt(`Nhập nội dung mới cho ${field === 'allergies' ? 'Dị ứng' : 'Bệnh lý'}:`);
    if (val && val.trim()) {
      handleArrayChange(section, field, "add", val.trim());
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-on-surface-variant font-medium animate-pulse">Đang tải hồ sơ...</div>;
  }

  const { personalInfo, vitals, medicalHistory, clinicalResults } = formData;

  const renderField = (label, value, section, field, subField = null) => {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{label}</label>
        {isEditing ? (
          <input
            className="rounded-lg border border-surface-variant bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            value={value || ""}
            onChange={(e) => handleInputChange(section, field, e.target.value, subField)}
          />
        ) : (
          <p className="text-sm font-medium text-on-surface">{value || "--"}</p>
        )}
      </div>
    );
  };

  const renderArrayField = (label, valueArray, section, field) => {
    const arr = Array.isArray(valueArray) ? valueArray : [];
    const textValue = arr.join(", ");
    return (
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{label}</label>
        {isEditing ? (
          <input
            className="rounded-lg border border-surface-variant bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            value={textValue}
            onChange={(e) => handleInputChange(section, field, e.target.value.split(",").map((s) => s.trim()))}
            placeholder="Phân cách bằng dấu phẩy"
          />
        ) : (
          <p className="text-sm font-medium text-on-surface">{textValue || "--"}</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-12">
      {/* 1. TOP BANNER: HEALTH STATUS */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-8 md:p-12 text-white shadow-2xl">
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-primary/20 blur-[100px]" />
        <div className="absolute -left-10 -bottom-10 h-64 w-64 rounded-full bg-secondary/10 blur-[100px]" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 rounded-full bg-primary text-white text-[10px] font-bold uppercase tracking-widest">LifeTrack ID: {personalInfo.idCard || "LT-XXXX"}</span>
              <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest">Cập nhật: 12/04/2026</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black mb-3">Hồ sơ sức khỏe tổng quát</h1>
            <p className="text-slate-400 text-lg font-medium">Phân loại sức khỏe: <span className="text-secondary font-bold">{clinicalResults.conclusion.healthClass}</span></p>
          </div>
          
          <div className="flex gap-4">
            {isEditing ? (
              <>
                <button onClick={handleCancel} className="px-6 py-3 rounded-2xl bg-white/10 text-white font-bold backdrop-blur-md transition-all hover:bg-white/20">Hủy</button>
                <button onClick={handleSave} className="px-8 py-3 rounded-2xl bg-primary text-white font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform">Lưu hồ sơ</button>
              </>
            ) : (
              <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-slate-900 font-black shadow-xl hover:scale-[1.02] transition-all">
                <span className="material-symbols-outlined">edit_note</span>
                Chỉnh sửa hồ sơ
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 2. DASHBOARD BODY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: IDENTITIES & VITALS */}
        <div className="lg:col-span-12 xl:col-span-8 space-y-8">
          
          {/* IDENTITIES CARD */}
          <div className="rounded-[2.5rem] bg-white border border-slate-100 p-8 shadow-sm">
            <SectionHeader icon="person_search" title="Thông tin định danh" color="text-sky-600" bgColor="bg-sky-50" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-6">
                {renderField("Họ và tên", personalInfo.fullName, "personalInfo", "fullName")}
                {renderField("Ngày sinh", personalInfo.dob, "personalInfo", "dob")}
                {renderField("Giới tính", personalInfo.gender, "personalInfo", "gender")}
              </div>
              <div className="space-y-6">
                {renderField("CCCD / CMND", personalInfo.idCard, "personalInfo", "idCard")}
                {renderField("Số điện thoại", personalInfo.phone, "personalInfo", "phone")}
                {renderField("Địa chỉ", personalInfo.address, "personalInfo", "address")}
              </div>
              <div className="bg-orange-50/50 rounded-3xl p-6 border border-orange-100">
                <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-4">Liên hệ khẩn cấp</p>
                <div className="space-y-4">
                  {renderField("Người thân", personalInfo.emergencyContact.name, "personalInfo", "emergencyContact", "name")}
                  {renderField("Điện thoại", personalInfo.emergencyContact.phone, "personalInfo", "emergencyContact", "phone")}
                </div>
              </div>
            </div>
          </div>

          {/* VITALS GRID */}
          <div className="space-y-6">
            <SectionHeader icon="vital_signs" title="Chỉ số Sinh tồn & Thể lực" color="text-emerald-600" bgColor="bg-emerald-50" />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
               <PHRMetricCard 
                  label="Chiều cao" value={vitals.height} unit="cm" 
                  status="Ổn định" colorClass="text-sky-500" icon="straighten" 
                  isEditing={isEditing} 
                  onChange={(v) => handleInputChange("vitals", "height", v)}
               />
               <PHRMetricCard 
                  label="Cân nặng" value={vitals.weight} unit="kg" 
                  status="Bình thường" colorClass="text-emerald-500" icon="weight" 
                  isEditing={isEditing} 
                  onChange={(v) => handleInputChange("vitals", "weight", v)}
               />
               <PHRMetricCard 
                  label="Nhịp tim" value={vitals.heartRate} unit="bpm" 
                  status="Nhịp xoang đều" colorClass="text-rose-500" icon="favorite" 
                  isEditing={isEditing} 
                  onChange={(v) => handleInputChange("vitals", "heartRate", v)}
               />
               <PHRMetricCard 
                  label="Huyết áp" value={vitals.bloodPressure} unit="mmHg" 
                  status="120/80 Target" colorClass="text-indigo-500" icon="blood_pressure" 
                  isEditing={isEditing} 
                  onChange={(v) => handleInputChange("vitals", "bloodPressure", v)}
               />
            </div>
          </div>

          {/* MEDICAL HISTORY (BADGES) */}
          <div className="rounded-[2.5rem] bg-white border border-slate-100 p-8 shadow-sm">
            <SectionHeader icon="history_edu" title="Tiền sử & Yếu tố nguy cơ" color="text-amber-600" bgColor="bg-amber-50" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Dị ứng thuốc & Thực phẩm</label>
                    <div className="flex flex-wrap gap-2">
                       {(medicalHistory.allergies || []).map((item, idx) => (
                          <BadgeTag key={idx} text={item} color="bg-rose-50 text-rose-600" isEditing={isEditing} onRemove={() => handleArrayChange("medicalHistory", "allergies", "remove", null, idx)} />
                       ))}
                       {isEditing && (
                        <button onClick={() => promptAddTag("medicalHistory", "allergies")} className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-rose-100 hover:text-rose-600 transition-colors">
                          <span className="material-symbols-outlined text-[18px]">add</span>
                        </button>
                       )}
                    </div>
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Bệnh lý cá nhân</label>
                    <div className="flex flex-wrap gap-2">
                       {(medicalHistory.personal || []).map((item, idx) => (
                          <BadgeTag key={idx} text={item} color="bg-amber-50 text-amber-600" isEditing={isEditing} onRemove={() => handleArrayChange("medicalHistory", "personal", "remove", null, idx)} />
                       ))}
                       {isEditing && (
                        <button onClick={() => promptAddTag("medicalHistory", "personal")} className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-amber-100 hover:text-amber-600 transition-colors">
                          <span className="material-symbols-outlined text-[18px]">add</span>
                        </button>
                       )}
                    </div>
                 </div>
              </div>
              <div className="bg-slate-50/50 rounded-3xl p-8 border border-slate-100">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 block">Lối sống & Thói quen</label>
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

        {/* RIGHT COLUMN: CLINICAL RESULTS */}
        <div className="lg:col-span-12 xl:col-span-4 space-y-8">
           <div className="rounded-[2.5rem] bg-white border border-slate-100 p-8 shadow-sm">
              <SectionHeader icon="medical_information" title="Kết quả khám" color="text-indigo-600" bgColor="bg-indigo-50" />
              
              <div className="space-y-8">
                <div className="relative pl-6 border-l-2 border-indigo-100">
                  <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full border-4 border-white bg-indigo-500" />
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Khám lâm sàng</p>
                  <div className="grid grid-cols-2 gap-4">
                    {renderField("Nội khoa", clinicalResults.clinical.internal, "clinicalResults", "clinical", "internal")}
                    {renderField("Ngoại khoa", clinicalResults.clinical.surgical, "clinicalResults", "clinical", "surgical")}
                    {renderField("Mắt / ENT", clinicalResults.clinical.eyes, "clinicalResults", "clinical", "eyes")}
                  </div>
                </div>

                <div className="relative pl-6 border-l-2 border-indigo-100">
                  <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full border-4 border-white bg-indigo-300" />
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Cận lâm sàng</p>
                  <div className="space-y-4">
                    {renderField("Xét nghiệm máu", clinicalResults.subclinical.bloodTest, "clinicalResults", "subclinical", "bloodTest")}
                    {renderField("Hình ảnh", clinicalResults.subclinical.imaging, "clinicalResults", "subclinical", "imaging")}
                    {renderField("ECG / Chức năng", clinicalResults.subclinical.functional, "clinicalResults", "subclinical", "functional")}
                  </div>
                </div>

                <div className="mt-8 rounded-[2rem] bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 text-white shadow-xl shadow-indigo-100">
                  <div className="flex items-center gap-2 mb-4 opacity-80">
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    <p className="text-[10px] font-black uppercase tracking-widest">Kết luận bác sĩ</p>
                  </div>
                  <h4 className="text-xl font-bold mb-4">Loại sức khỏe: {clinicalResults.conclusion.healthClass}</h4>
                  <p className="text-indigo-100 text-xs leading-relaxed italic">
                    “{clinicalResults.conclusion.advice || "Tiếp tục duy trì lối sống lành mạnh và tái khám theo định kỳ."}”
                  </p>
                </div>
              </div>
           </div>
           
           {/* QUICK CHART / DECORATION CARD */}
           <div className="rounded-[2.5rem] bg-emerald-600 p-8 text-white">
              <div className="flex items-center justify-between mb-8">
                 <div>
                    <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest">Chỉ số BMI</p>
                    <p className="text-3xl font-black">{vitals.height && vitals.weight ? (vitals.weight / ((vitals.height / 100) ** 2)).toFixed(1) : "22.5"}</p>
                 </div>
                 <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-white">body_system</span>
                 </div>
              </div>
              <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden mb-2">
                 <div className="h-full bg-white w-[65%]" />
              </div>
              <p className="text-[10px] font-medium text-emerald-100 uppercase tracking-widest text-center">Ngưỡng cân bằng</p>
           </div>
        </div>
      </div>
    </div>
  );
}
