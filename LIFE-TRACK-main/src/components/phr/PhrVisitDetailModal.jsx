import { useEffect } from "react";

export function PhrVisitDetailModal({ visit, onClose }) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] bg-surface-container-lowest shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-variant/50 p-6">
          <div>
            <h2 className="text-xl font-bold text-on-surface">Chi tiết khám bệnh</h2>
            <p className="text-sm font-medium text-on-surface-variant flex items-center gap-2 mt-1">
              <span className="material-symbols-outlined text-[16px]">calendar_today</span>
              {visit.date} • {visit.facility}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-low text-on-surface hover:bg-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Info Section */}
          <section className="space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Bác sĩ phụ trách</p>
              <p className="mt-1 font-bold text-on-surface">{visit.doctor}</p>
            </div>
            
            <div className="rounded-xl border border-surface-variant/50 bg-primary/5 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Chẩn đoán xác định</p>
              <p className="mt-1 text-sm font-bold text-on-surface">{visit.diagnosisDetail}</p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Lý do khám / Triệu chứng ban đầu</p>
              <p className="mt-1 text-sm text-on-surface">{visit.reason}</p>
            </div>
          </section>

          {/* Attachments Section */}
          {visit.attachments && visit.attachments.length > 0 && (
            <section>
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Kết quả xét nghiệm / Chụp chiếu</p>
              <div className="flex flex-wrap gap-2">
                {visit.attachments.map(att => (
                  <button key={att.id} className="flex items-center gap-2 rounded-lg border border-surface-variant bg-white px-3 py-2 text-sm font-medium transition-colors hover:bg-surface-container-low text-secondary">
                    <span className="material-symbols-outlined text-[18px]">
                      {att.type === 'pdf' ? 'picture_as_pdf' : 'image'}
                    </span>
                    {att.name}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Prescriptions Section */}
          <section className="border-t border-surface-variant/50 pt-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-primary">
                <span className="material-symbols-outlined text-[18px]">vaccines</span>
                Đơn thuốc
              </h3>
            </div>
            {visit.prescriptions.length > 0 ? (
              <div className="space-y-3">
                {visit.prescriptions.map((med, idx) => (
                  <div key={idx} className="rounded-xl bg-surface-container-low p-3 flex justify-between items-center border border-surface-variant/30">
                    <div>
                      <p className="font-bold text-on-surface">{med.name} <span className="font-normal text-on-surface-variant text-sm">- {med.dosage}</span></p>
                      <p className="text-sm text-on-surface-variant mt-1">{med.usage}</p>
                    </div>
                    <div className="rounded-lg bg-white px-3 py-1 text-sm font-bold shadow-sm border border-surface-variant/50 text-primary">
                      SL: {med.quantity}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-on-surface-variant">Không có đơn thuốc.</p>
            )}
          </section>

          {/* Lời khuyên & Tái khám */}
          <div className="grid sm:grid-cols-2 gap-4">
            <section className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">Lời dặn bác sĩ</h3>
              <p className="text-sm leading-relaxed text-on-surface font-medium">{visit.advice || "Không có lời dặn nào thêm."}</p>
            </section>
            <section className="rounded-2xl border border-secondary/20 bg-secondary/5 p-4">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-secondary">Tái khám</h3>
              <p className="text-sm font-bold text-on-surface">{visit.followUp || "Khi có triệu chứng bất thường"}</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
