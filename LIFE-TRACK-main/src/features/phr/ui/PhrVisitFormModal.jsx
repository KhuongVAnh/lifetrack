import { useState, useEffect } from "react";
import { toast } from "react-toastify";

export function PhrVisitFormModal({ visit, onClose, onSave }) {
  const isEditing = !!visit;

  const [formData, setFormData] = useState({
    facility: "",
    doctor_name: "",
    visit_date: new Date().toISOString().split('T')[0],
    diagnosis: "",
    diagnosis_details: "",
    reason: "",
    advice: "",
    appointment: "",
  });

  const [tests, setTests] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visit) {
      setFormData({
        facility: visit.facility || "",
        doctor_name: visit.doctor_name || "",
        visit_date: visit.visit_date ? new Date(visit.visit_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        diagnosis: visit.diagnosis || "",
        diagnosis_details: visit.diagnosis_details || "",
        reason: visit.reason || "",
        advice: visit.advice || "",
        appointment: visit.appointment || "",
      });
      setTests(Array.isArray(visit.tests) ? visit.tests : []);
      setPrescriptions(Array.isArray(visit.prescription) ? visit.prescription : []);
    } else {
      document.body.style.overflow = "hidden";
    }
    
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [visit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // --- Handlers for Tests ---
  const handleAddTest = () => {
    setTests(prev => [...prev, { name: "", type: "image", url: "" }]);
  };
  const handleRemoveTest = (index) => {
    setTests(prev => prev.filter((_, i) => i !== index));
  };
  const handleTestChange = (index, field, value) => {
    setTests(prev => {
      const newTests = [...prev];
      newTests[index][field] = value;
      return newTests;
    });
  };

  // --- Handlers for Prescriptions ---
  const handleAddPrescription = () => {
    setPrescriptions(prev => [...prev, { name: "", dosage: "", quantity: "", usage: "" }]);
  };
  const handleRemovePrescription = (index) => {
    setPrescriptions(prev => prev.filter((_, i) => i !== index));
  };
  const handlePrescriptionChange = (index, field, value) => {
    setPrescriptions(prev => {
      const newPres = [...prev];
      newPres[index][field] = value;
      return newPres;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.diagnosis.trim()) {
      toast.error("Vui lòng nhập chẩn đoán xác định!");
      return;
    }

    try {
      setLoading(true);
      // Clean up empty URLs from tests, empty names from prescriptions
      const cleanedTests = tests.filter(t => t.name.trim() || t.url.trim());
      const cleanedPrescriptions = prescriptions.filter(p => p.name.trim());

      const payload = {
        ...formData,
        visit_date: new Date(formData.visit_date).toISOString(),
        tests: cleanedTests,
        prescription: cleanedPrescriptions
      };

      await onSave(payload, isEditing ? visit.visit_id : null);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col bg-white overflow-hidden rounded-[2rem] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-variant/30 p-6 bg-[#f8fafc]">
          <h2 className="text-xl font-bold text-on-surface text-[#0f172a]">
            {isEditing ? "Chỉnh sửa Lịch sử Khám" : "Thêm mới Lịch sử Khám"}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-[#e2e8f0] text-on-surface hover:bg-[#f1f5f9] transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          <form id="phr-visit-form" onSubmit={handleSubmit} className="space-y-8">
            
            {/* THÔNG TIN CHUNG */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-[#0ea5e9] border-b border-[#f1f5f9] pb-2">Thông tin cơ sở</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-on-surface-variant">Cơ sở Y tế</label>
                  <input type="text" name="facility" value={formData.facility} onChange={handleChange} placeholder="VD: Bệnh viện Trưng Vương..." className="w-full rounded-lg border border-[#e2e8f0] p-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-on-surface-variant">Bác sĩ phụ trách</label>
                  <input type="text" name="doctor_name" value={formData.doctor_name} onChange={handleChange} placeholder="VD: BS. Nguyễn Văn A..." className="w-full rounded-lg border border-[#e2e8f0] p-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-on-surface-variant">Ngày khám</label>
                  <input type="date" name="visit_date" value={formData.visit_date} onChange={handleChange} required className="w-full rounded-lg border border-[#e2e8f0] p-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                </div>
              </div>
            </section>

            {/* CHẨN ĐOÁN & LÝ DO */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-[#0ea5e9] border-b border-[#f1f5f9] pb-2">Chẩn đoán</h3>
              <div>
                <label className="mb-1 block text-xs font-bold text-on-surface-variant">Chẩn đoán tóm tắt (Bắt buộc)</label>
                <input type="text" name="diagnosis" value={formData.diagnosis} onChange={handleChange} required placeholder="VD: Tăng huyết áp vô căn..." className="w-full rounded-lg border border-[#e2e8f0] p-2 text-sm focus:border-primary outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-on-surface-variant">Chẩn đoán chi tiết</label>
                <textarea name="diagnosis_details" value={formData.diagnosis_details} onChange={handleChange} rows={2} placeholder="Chi tiết..." className="w-full rounded-lg border border-[#e2e8f0] p-2 text-sm focus:border-primary outline-none resize-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-on-surface-variant">Lý do khám / Triệu chứng ban đầu</label>
                <textarea name="reason" value={formData.reason} onChange={handleChange} rows={2} placeholder="Người bệnh cảm thấy..." className="w-full rounded-lg border border-[#e2e8f0] p-2 text-sm focus:border-primary outline-none resize-none" />
              </div>
            </section>

            {/* TÀI LIỆU URL */}
            <section className="space-y-4">
              <div className="flex justify-between items-center border-b border-[#f1f5f9] pb-2">
                <h3 className="text-sm font-bold uppercase tracking-widest text-[#0ea5e9]">Tài liệu / URL File (Kết quả xét nghiệm)</h3>
                <button type="button" onClick={handleAddTest} className="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">add_circle</span> Thêm file
                </button>
              </div>
              {tests.length === 0 && <p className="text-xs text-on-surface-variant italic">Chưa có tài liệu đính kèm. Bạn có thể chèn link URL mở file tại đây.</p>}
              <div className="space-y-3">
                {tests.map((test, index) => (
                  <div key={index} className="flex gap-2 items-start bg-[#f8fafc] p-3 rounded-xl border border-[#e2e8f0]">
                    <div className="flex flex-col gap-2 flex-1">
                      <div className="flex gap-2">
                        <select value={test.type} onChange={(e) => handleTestChange(index, "type", e.target.value)} className="rounded-lg border border-[#e2e8f0] p-2 text-sm max-w-[100px] outline-none">
                          <option value="image">Image</option>
                          <option value="pdf">PDF</option>
                        </select>
                        <input type="text" value={test.name} onChange={(e) => handleTestChange(index, "name", e.target.value)} placeholder="Tên tệp (VD: Kết quả máu)" className="flex-1 rounded-lg border border-[#e2e8f0] p-2 text-sm outline-none" />
                      </div>
                      <input type="text" value={test.url} onChange={(e) => handleTestChange(index, "url", e.target.value)} placeholder="https://địa-chỉ-url-ảnh.com/file" className="w-full rounded-lg border border-[#e2e8f0] p-2 text-sm text-[#0284c7] outline-none font-mono" />
                    </div>
                    <button type="button" onClick={() => handleRemoveTest(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* ĐƠN THUỐC */}
            <section className="space-y-4">
              <div className="flex justify-between items-center border-b border-[#f1f5f9] pb-2">
                <h3 className="text-sm font-bold uppercase tracking-widest text-[#0ea5e9]">Đơn thuốc</h3>
                <button type="button" onClick={handleAddPrescription} className="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">add_circle</span> Thêm thuốc
                </button>
              </div>
              {prescriptions.length === 0 && <p className="text-xs text-on-surface-variant italic">Chưa có thuốc xuất đơn.</p>}
              <div className="space-y-3">
                {prescriptions.map((med, index) => (
                  <div key={index} className="grid sm:grid-cols-12 gap-2Items.start bg-[#f0fdf4] p-3 rounded-xl border border-[#bbf7d0]">
                    <div className="sm:col-span-5 relative">
                      <input type="text" value={med.name} onChange={(e) => handlePrescriptionChange(index, "name", e.target.value)} placeholder="Tên thuốc" className="w-full rounded-lg border border-[#e2e8f0] p-2 text-sm font-bold outline-none" />
                    </div>
                    <div className="sm:col-span-3">
                      <input type="text" value={med.dosage} onChange={(e) => handlePrescriptionChange(index, "dosage", e.target.value)} placeholder="Hàm lượng (VD: 5mg)" className="w-full rounded-lg border border-[#e2e8f0] p-2 text-sm outline-none" />
                    </div>
                    <div className="sm:col-span-3">
                      <input type="text" value={med.quantity} onChange={(e) => handlePrescriptionChange(index, "quantity", e.target.value)} placeholder="SL (VD: 30 viên)" className="w-full rounded-lg border border-[#e2e8f0] p-2 text-sm outline-none" />
                    </div>
                    <div className="sm:col-span-1 flex justify-end">
                      <button type="button" onClick={() => handleRemovePrescription(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                    <div className="sm:col-span-12">
                      <input type="text" value={med.usage} onChange={(e) => handlePrescriptionChange(index, "usage", e.target.value)} placeholder="Cách sử dụng (VD: Ngày 1 viên sáng sau ăn)" className="w-full rounded-lg border border-[#e2e8f0] p-2 text-sm outline-none text-[#16a34a]" />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* LỜI DẶN R TÁI KHÁM */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-[#0ea5e9] border-b border-[#f1f5f9] pb-2">Hướng dẫn thêm</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-on-surface-variant">Lời dặn bác sĩ</label>
                  <textarea name="advice" value={formData.advice} onChange={handleChange} rows={2} placeholder="Kiêng khem..." className="w-full rounded-lg border border-[#e2e8f0] p-2 text-sm focus:border-primary outline-none resize-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-on-surface-variant">Ghi chú / Ngày tái khám</label>
                  <textarea name="appointment" value={formData.appointment} onChange={handleChange} rows={2} placeholder="Tái khám lúc..." className="w-full rounded-lg border border-[#e2e8f0] p-2 text-sm focus:border-primary outline-none resize-none" />
                </div>
              </div>
            </section>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-surface-variant/30 p-6 bg-white gap-3">
          <button type="button" onClick={onClose} disabled={loading} className="px-5 py-2.5 rounded-xl font-bold text-on-surface hover:bg-surface-container-low transition-colors text-sm">
            Hủy
          </button>
          <button type="submit" form="phr-visit-form" disabled={loading} className="px-5 py-2.5 rounded-xl bg-primary font-bold text-white hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2 text-sm">
            {loading ? <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> : <span className="material-symbols-outlined text-[18px]">save</span>}
            {isEditing ? "Cập nhật" : "Lưu hồ sơ"}
          </button>
        </div>
      </div>
    </div>
  );
}
