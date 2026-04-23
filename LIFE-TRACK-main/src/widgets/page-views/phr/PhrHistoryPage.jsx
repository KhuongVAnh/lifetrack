import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { useAuth } from "@/app/providers/AuthProvider";
import { getPhrVisits, createPhrVisit, updatePhrVisit, deletePhrVisit } from "@/features/phr/api/phrApi";
import { PhrVisitDetailModal } from "@/features/phr/ui/PhrVisitDetailModal";
import { PhrVisitFormModal } from "@/features/phr/ui/PhrVisitFormModal";

export function PhrHistoryPage() {
  const { user } = useAuth();
  
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [visitToEdit, setVisitToEdit] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchVisits = useCallback(async () => {
    if (!user?.user_id) return;
    try {
      setLoading(true);
      const data = await getPhrVisits(user.user_id);
      setVisits(data || []);
    } catch (error) {
      toast.error("Không thể tải lịch sử khám");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  const handleDelete = async (visitId) => {
    try {
      await deletePhrVisit(visitId);
      toast.success("Đã xóa bản ghi khám bệnh");
      setSelectedVisit(null);
      fetchVisits();
    } catch (error) {
      toast.error("Xóa thất bại");
      console.error(error);
    }
  };

  const handleSave = async (payload, visitId) => {
    try {
      if (visitId) {
        await updatePhrVisit(visitId, payload);
        toast.success("Cập nhật thành công");
      } else {
        await createPhrVisit({ ...payload, user_id: user.user_id });
        toast.success("Đã thêm lịch sử khám mới");
      }
      setIsFormOpen(false);
      setVisitToEdit(null);
      setSelectedVisit(null);
      fetchVisits();
    } catch (error) {
      toast.error("Lưu thất bại");
      console.error(error);
    }
  };

  const openAddForm = () => {
    setVisitToEdit(null);
    setIsFormOpen(true);
  };

  const openEditForm = (visit) => {
    setVisitToEdit(visit);
    setIsFormOpen(true);
  };

  if (loading && visits.length === 0) {
    return <div className="p-8 text-center text-on-surface-variant font-medium animate-pulse">Đang tải biểu đồ lịch sử...</div>;
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-on-surface">Lịch sử Y tế </h2>
        <button
          onClick={openAddForm}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90 transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Thêm lịch sử mới
        </button>
      </div>

      {visits.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-surface-variant p-12 text-center text-on-surface-variant">
          Chưa có lịch sử khám bệnh nào. Nhấn "Thêm lịch sử mới" để bắt đầu ghi chú bệnh sử.
        </div>
      ) : (
        <div className="relative border-l-2 border-[#e2e8f0] ml-4 md:ml-6 space-y-8 pb-8 mt-6">
          {visits.map((visit) => {
            const dateStr = new Date(visit.visit_date).toLocaleDateString("vi-VN", {
              day: '2-digit', month: '2-digit', year: 'numeric'
            });
            return (
            <div key={visit.visit_id} className="relative pl-6 md:pl-8">
              {/* Timeline Dot */}
              <div className="absolute left-[-9px] top-1 h-4 w-4 rounded-full bg-[#0ea5e9] ring-4 ring-white" />
              
              {/* Visit Card */}
              <div 
                onClick={() => setSelectedVisit(visit)}
                className="group cursor-pointer rounded-3xl border border-[#e2e8f0] bg-white p-5 shadow-sm transition-all hover:border-[#0ea5e9]/40 hover:shadow-md"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-[#0ea5e9]">{dateStr}</p>
                    <h3 className="mt-1 text-lg font-bold text-on-surface group-hover:text-[#0ea5e9] transition-colors">{visit.diagnosis || 'Chưa rõ chẩn đoán'}</h3>
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-[#f8fafc] border border-[#e2e8f0] px-3 py-1 w-fit text-sm font-medium text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px] text-primary">local_hospital</span>
                    {visit.facility || 'Sổ theo dõi cá nhân'}
                  </div>
                </div>
                
                <div className="mt-4 flex items-center justify-between border-t border-[#f1f5f9] pt-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-on-surface-variant">
                    <span className="material-symbols-outlined text-[18px]">stethoscope</span>
                    {visit.doctor_name || (visit.doctor ? visit.doctor.name : 'Chưa ghi nhận Bác sĩ')}
                  </div>
                  <button className="flex items-center gap-1 text-sm font-bold text-[#0ea5e9] opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
                    Xem chi tiết
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      <PhrVisitDetailModal
        visit={selectedVisit}
        onClose={() => setSelectedVisit(null)}
        onEdit={openEditForm}
        onDelete={handleDelete}
      />

      {/* Form Modal (Create / Update) */}
      {isFormOpen && (
        <PhrVisitFormModal
          visit={visitToEdit}
          onClose={() => setIsFormOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
