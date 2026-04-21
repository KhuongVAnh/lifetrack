import { useEffect } from "react";

export function PhrVisitDetailModal({ visit, onClose, onEdit, onDelete }) {
  // Prevent scrolling on background when modal is open
  useEffect(() => {
    if (visit) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [visit]);

  if (!visit) return null;

  const dateStr = new Date(visit.visit_date).toLocaleDateString("vi-VN", {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
  
  const facilityName = visit.facility || 'Không ghi nhận CSYT';
  const doctorName = visit.doctor_name || (visit.doctor ? visit.doctor.name : 'Bác sĩ phụ trách');

  const attachments = Array.isArray(visit.tests) ? visit.tests : [];
  
  let prescriptions = [];
  if (Array.isArray(visit.prescription)) {
    prescriptions = visit.prescription;
  } else if (visit.prescription) {
    if (visit.prescription.notes) {
      prescriptions = [{ name: "Lời dặn thêm", dosage: "", quantity: 1, usage: visit.prescription.notes }];
    } else if (visit.prescription.morning || visit.prescription.evening) {
      prescriptions = [{ name: "Đơn tự quản", dosage: "Chi tiết DB", quantity: 1, usage: JSON.stringify(visit.prescription) }];
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-variant/30 p-6 bg-white">
          <div>
            <h2 className="text-2xl font-bold text-on-surface">Chi tiết khám bệnh</h2>
            <p className="text-sm font-medium text-on-surface-variant flex items-center gap-2 mt-1">
              <span className="material-symbols-outlined text-[16px]">calendar_today</span>
              {dateStr} • {facilityName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <button onClick={() => onEdit(visit)} className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors" title="Chỉnh sửa">
                <span className="material-symbols-outlined text-[20px]">edit</span>
              </button>
            )}
            {onDelete && (
              <button onClick={() => {
                if(window.confirm("Bạn có thật sự muốn xóa bản ghi khám bệnh này không? Hành động này không thể hoàn tác.")) {
                  onDelete(visit.visit_id);
                }
              }} className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition-colors" title="Xóa">
                <span className="material-symbols-outlined text-[20px]">delete</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-low text-on-surface hover:bg-surface-variant/50 transition-colors"
              title="Đóng"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Info Section */}
          <section className="space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Bác sĩ phụ trách</p>
              <p className="mt-1 font-bold text-lg text-on-surface">{doctorName}</p>
            </div>
            
            <div className="rounded-xl bg-[#f4f7f8] p-4 border border-[#e2e8f0]">
              <p className="text-xs font-bold uppercase tracking-widest text-[#0ea5e9]">Chẩn đoán xác định</p>
              <p className="mt-1 text-sm font-bold text-on-surface">
                {visit.diagnosis_details || visit.diagnosis || "Chưa có chẩn đoán chi tiết"}
              </p>
            </div>

            {visit.reason && (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Lý do khám / Triệu chứng ban đầu</p>
                <p className="mt-1 text-sm text-on-surface font-medium">{visit.reason}</p>
              </div>
            )}
          </section>

          {/* Attachments Section */}
          {attachments.length > 0 && (
            <section>
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Kết quả xét nghiệm / Chụp chiếu</p>
              <div className="flex flex-wrap gap-2">
                {attachments.map((att, index) => (
                  <button 
                    key={att.id || index} 
                    onClick={() => att.url && att.url !== '#' && window.open(att.url, '_blank')}
                    className="flex items-center gap-2 rounded-xl border border-[#e2e8f0] bg-white px-3 py-2 text-sm font-bold text-[#16a34a] hover:bg-[#f0fdf4] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {att.type === 'pdf' ? 'picture_as_pdf' : 'image'}
                    </span>
                    {att.name || "Tệp đính kèm"}
                  </button>
                ))}
              </div>
            </section>
          )}

          <div className="h-[1px] w-full bg-surface-variant/30"></div>

          {/* Prescriptions Section */}
          <section className="pt-2">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-bold uppercase tracking-widest text-[#0369a1]">
                <span className="material-symbols-outlined text-[20px]">vaccines</span>
                Đơn thuốc
              </h3>
            </div>
            {prescriptions.length > 0 ? (
              <div className="space-y-3">
                {prescriptions.map((med, idx) => (
                  <div key={idx} className="rounded-xl bg-[#f4f7f8] p-4 flex justify-between items-center border border-[#e2e8f0]">
                    <div>
                      <p className="font-bold text-base text-on-surface">
                        {med.name} {med.dosage && <span className="font-medium text-on-surface-variant text-sm border-l border-surface-variant ml-2 pl-2">{med.dosage}</span>}
                      </p>
                      <p className="text-sm font-medium text-on-surface-variant mt-1.5">{med.usage}</p>
                    </div>
                    {med.quantity && (
                      <div className="rounded-full bg-white px-4 py-1.5 text-sm font-bold shadow-sm border border-[#e2e8f0] text-[#0369a1]">
                        SL: {med.quantity}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-on-surface-variant font-medium">Không có đơn thuốc cụ thể hoặc chưa được kê.</p>
            )}
          </section>

          {/* Lời khuyên & Tái khám */}
          <div className="grid sm:grid-cols-2 gap-4 pt-2">
            <section className="rounded-2xl border border-[#0ea5e9]/20 bg-[#f0f9ff] p-5">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-[#0284c7]">Lời dặn bác sĩ</h3>
              <p className="text-sm leading-relaxed text-on-surface font-medium whitespace-pre-line">
                {visit.advice || "Không có lời dặn nào thêm."}
              </p>
            </section>
            
            <section className="rounded-2xl border border-[#16a34a]/20 bg-[#f0fdf4] p-5">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-[#16a34a]">Tái khám</h3>
              <p className="text-sm font-bold text-on-surface whitespace-pre-line">
                {visit.appointment || "Khi có triệu chứng bất thường"}
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
