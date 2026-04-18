import { useState } from "react";
import { mockPhrVisits } from "../../data/phrMockData";
import { PhrVisitDetailModal } from "../../components/phr/PhrVisitDetailModal";

export function PhrHistoryPage() {
  const [selectedVisit, setSelectedVisit] = useState(null);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-on-surface">Lịch sử y tế (Timeline)</h2>
      </div>

      <div className="relative border-l-2 border-surface-variant/50 ml-4 md:ml-6 space-y-8 pb-8">
        {mockPhrVisits.map((visit) => (
          <div key={visit.id} className="relative pl-6 md:pl-8">
            {/* Timeline Dot */}
            <div className="absolute left-[-9px] top-1 h-4 w-4 rounded-full bg-primary ring-4 ring-white" />
            
            {/* Visit Card */}
            <div 
              onClick={() => setSelectedVisit(visit)}
              className="group cursor-pointer rounded-2xl border border-surface-variant/50 bg-surface-container-lowest p-5 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-primary">{visit.date}</p>
                  <h3 className="mt-1 text-lg font-bold text-on-surface group-hover:text-primary transition-colors">{visit.diagnosisName}</h3>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-surface-container-low px-3 py-1 w-fit text-sm font-medium text-on-surface-variant">
                  <span className="material-symbols-outlined text-[16px]">local_hospital</span>
                  {visit.facility}
                </div>
              </div>
              
              <div className="mt-4 flex items-center justify-between border-t border-surface-variant/50 pt-4">
                <div className="flex items-center gap-2 text-sm font-medium text-on-surface-variant">
                  <span className="material-symbols-outlined text-[18px]">stethoscope</span>
                  {visit.doctor}
                </div>
                <button className="flex items-center gap-1 text-sm font-bold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  Xem chi tiết
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      <PhrVisitDetailModal
        visit={selectedVisit}
        onClose={() => setSelectedVisit(null)}
      />
    </div>
  );
}
