import { useState } from "react";
import { toast } from "react-toastify";
import { mockPhrOverview } from "../../data/phrMockData";

function SectionTitle({ icon, title }) {
  return (
    <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-on-surface">
      <span className="material-symbols-outlined text-primary">{icon}</span>
      {title}
    </h2>
  );
}

export function PhrOverviewPage() {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(mockPhrOverview);

  const handleSave = () => {
    // Simulate save
    setIsEditing(false);
    toast.success("Đã cập nhật hồ sơ sức khỏe");
  };

  const handleCancel = () => {
    setFormData(mockPhrOverview); // reset
    setIsEditing(false);
  };

  const handleInputChange = (section, field, value, subField = null) => {
    setFormData((prev) => {
      const newData = { ...prev };
      if (subField) {
        newData[section][field][subField] = value;
      } else {
        newData[section][field] = value;
      }
      return newData;
    });
  };

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
    const textValue = valueArray.join(", ");
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
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-on-surface">Khám sức khỏe tổng quát (Tổng quan)</h2>
        {isEditing ? (
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="rounded-xl border border-surface-variant bg-white px-4 py-2 text-sm font-bold text-on-surface hover:bg-surface-container-low"
            >
              Hủy
            </button>
            <button
              onClick={handleSave}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90"
            >
              Lưu thay đổi
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2 text-sm font-bold text-primary hover:bg-primary/20"
          >
            <span className="material-symbols-outlined text-[18px]">edit</span>
            Chỉnh sửa
          </button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 1. Thông tin hành chính */}
        <section className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm border border-surface-variant/50">
          <SectionTitle icon="badge" title="1. Hành chính & Định danh" />
          <div className="grid gap-4 sm:grid-cols-2">
            {renderField("Họ và tên", personalInfo.fullName, "personalInfo", "fullName")}
            {renderField("Ngày sinh", personalInfo.dob, "personalInfo", "dob")}
            {renderField("Giới tính", personalInfo.gender, "personalInfo", "gender")}
            {renderField("Nhóm máu", personalInfo.bloodType, "personalInfo", "bloodType")}
            {renderField("CCCD/CMND", personalInfo.idCard, "personalInfo", "idCard")}
            {renderField("Mã BHYT", personalInfo.insuranceCard, "personalInfo", "insuranceCard")}
            <div className="sm:col-span-2">
              {renderField("Địa chỉ", personalInfo.address, "personalInfo", "address")}
            </div>
            {renderField("Số điện thoại", personalInfo.phone, "personalInfo", "phone")}
            
            <div className="sm:col-span-2 mt-2 rounded-xl bg-orange-50 p-3 outline outline-1 outline-orange-100">
              <p className="mb-2 text-xs font-bold text-orange-600 uppercase tracking-widest">Liên hệ khẩn cấp</p>
              <div className="grid grid-cols-2 gap-3">
                {renderField("Người thân", personalInfo.emergencyContact.name, "personalInfo", "emergencyContact", "name")}
                {renderField("Số điện thoại", personalInfo.emergencyContact.phone, "personalInfo", "emergencyContact", "phone")}
              </div>
            </div>
          </div>
        </section>

        {/* 2. Chỉ số thể lực & Sinh tồn */}
        <section className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm border border-surface-variant/50">
          <SectionTitle icon="monitor_heart" title="2. Sinh tồn & Thể lực" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {renderField("Chiều cao (cm)", vitals.height, "vitals", "height")}
            {renderField("Cân nặng (kg)", vitals.weight, "vitals", "weight")}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">BMI</label>
              <p className="text-sm font-bold text-primary">
                {isEditing && vitals.height && vitals.weight 
                  ? (vitals.weight / ((vitals.height / 100) * (vitals.height / 100))).toFixed(1) 
                  : vitals.bmi}
              </p>
            </div>
            {renderField("Nhịp tim (bpm)", vitals.heartRate, "vitals", "heartRate")}
            {renderField("Huyết áp (mmHg)", vitals.bloodPressure, "vitals", "bloodPressure")}
            {renderField("Nhiệt độ (°C)", vitals.temperature, "vitals", "temperature")}
            {renderField("Nhịp thở (lần/p)", vitals.respiratoryRate, "vitals", "respiratoryRate")}
          </div>
        </section>

        {/* 3. Tiền sử y tế */}
        <section className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm border border-surface-variant/50">
          <SectionTitle icon="history_edu" title="3. Yếu tố nguy cơ & Tiền sử" />
          <div className="space-y-4">
            {renderArrayField("Bệnh lý cá nhân", medicalHistory.personal, "medicalHistory", "personal")}
            {renderArrayField("Bệnh lý gia đình", medicalHistory.family, "medicalHistory", "family")}
            {renderArrayField("Dị ứng", medicalHistory.allergies, "medicalHistory", "allergies")}
            <div className="grid grid-cols-2 gap-4 pt-2">
              {renderField("Hút thuốc", medicalHistory.lifestyle.smoking, "medicalHistory", "lifestyle", "smoking")}
              {renderField("Rượu bia", medicalHistory.lifestyle.alcohol, "medicalHistory", "lifestyle", "alcohol")}
              <div className="col-span-2">
                {renderField("Vận động", medicalHistory.lifestyle.exercise, "medicalHistory", "lifestyle", "exercise")}
              </div>
            </div>
          </div>
        </section>

        {/* 4. Lâm sàng & Cận lâm sàng */}
        <section className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm border border-surface-variant/50">
          <SectionTitle icon="medical_information" title="4. Khám Lâm sàng & Cận lâm" />
          <div className="space-y-4">
            <div className="space-y-3">
              <p className="text-xs font-bold text-primary uppercase tracking-widest border-b pb-1">Lâm sàng</p>
              <div className="grid grid-cols-2 gap-3">
                {renderField("Nội khoa", clinicalResults.clinical.internal, "clinicalResults", "clinical", "internal")}
                {renderField("Ngoại khoa", clinicalResults.clinical.surgical, "clinicalResults", "clinical", "surgical")}
                {renderField("Mắt", clinicalResults.clinical.eyes, "clinicalResults", "clinical", "eyes")}
                {renderField("Tai mũi họng", clinicalResults.clinical.ent, "clinicalResults", "clinical", "ent")}
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-xs font-bold text-primary uppercase tracking-widest border-b pb-1">Cận lâm sàng</p>
              {renderField("Xét nghiệm máu", clinicalResults.subclinical.bloodTest, "clinicalResults", "subclinical", "bloodTest")}
              {renderField("Chẩn đoán hình ảnh", clinicalResults.subclinical.imaging, "clinicalResults", "subclinical", "imaging")}
              {renderField("Thăm dò chức năng (ECG)", clinicalResults.subclinical.functional, "clinicalResults", "subclinical", "functional")}
            </div>
            <div className="space-y-3 rounded-xl bg-primary/5 p-4 border border-primary/10">
              <p className="text-xs font-bold text-primary uppercase tracking-widest">Kết luận</p>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-white">{clinicalResults.conclusion.healthClass}</span>
              </div>
              {renderField("Lời khuyên bác sĩ", clinicalResults.conclusion.advice, "clinicalResults", "conclusion", "advice")}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
